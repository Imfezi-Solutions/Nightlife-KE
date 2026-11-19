import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const DIDIT_CONFIG = {
  sandbox: {
    workflowId: '604e2b8e-549a-4036-8611-d4b99c775e49',
    applicationId: 'c4f100b9-b5b0-4ebd-b354-d0e0c385c1a5',
  },
  live: {
    workflowId: 'bf5aa0b0-3bce-49b7-ab72-6611c1b53c6e',
    applicationId: 'fde8a3cb-ace2-4a00-9d0d-e0f13d60b87b',
  },
} as const

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    const encoded = JSON.stringify(value)
    if (encoded === undefined) throw new Error('Unsupported JSON value')
    return encoded
  }

  if (Array.isArray(value)) {
    return '[' + value.map(canonicalJson).join(',') + ']'
  }

  const object = value as Record<string, unknown>
  return '{' + Object.keys(object).sort()
    .map((key) => JSON.stringify(key) + ':' + canonicalJson(object[key]))
    .join(',') + '}'
}

function validDigest(supplied: string, expected: Buffer) {
  if (!/^[a-f0-9]{64}$/i.test(supplied)) return false
  const actual = Buffer.from(supplied, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function validSignature(
  payload: Record<string, unknown>,
  rawBody: string,
  headers: Headers,
  secret: string,
) {
  const headerTimestamp = headers.get('x-timestamp') ?? ''
  if (!/^\d+$/.test(headerTimestamp)) return false

  const bodyTimestamp = payload.timestamp
  if (typeof bodyTimestamp !== 'number' || !Number.isSafeInteger(bodyTimestamp)) return false
  if (String(bodyTimestamp) !== headerTimestamp) return false
  if (Math.abs(Math.floor(Date.now() / 1000) - bodyTimestamp) > 300) return false

  // Didit V2 signs canonical JSON; the original signature signs exact request bytes.
  // Accept either documented signature so harmless transport/body formatting does not
  // cause valid deliveries to fail.
  const v2 = headers.get('x-signature-v2') ?? ''
  const raw = headers.get('x-signature') ?? ''
  let canonical: string
  try {
    canonical = canonicalJson(payload)
  } catch {
    canonical = ''
  }
  const expectedV2 = createHmac('sha256', secret).update(canonical, 'utf8').digest()
  const expectedRaw = createHmac('sha256', secret).update(rawBody, 'utf8').digest()
  return validDigest(v2, expectedV2) || validDigest(raw, expectedRaw)
}

export async function POST(request: Request) {
  const secret = process.env.DIDIT_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 503 })

  const rawBody = await request.text()
  let payload: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(rawBody)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Invalid webhook payload.' }, { status: 400 })
    }
    payload = parsed as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid webhook payload.' }, { status: 400 })
  }

  if (!validSignature(payload, rawBody, request.headers, secret)) {
    console.warn('[didit-webhook] signature_or_timestamp_rejected')
    return NextResponse.json({ error: 'Invalid or expired webhook signature.' }, { status: 401 })
  }

  const environment = process.env.DIDIT_ENVIRONMENT
  const expected = environment === 'sandbox' || environment === 'live'
    ? DIDIT_CONFIG[environment]
    : null

  if (
    !expected ||
    payload.application_id !== expected.applicationId ||
    payload.environment !== environment ||
    payload.workflow_id !== expected.workflowId
  ) {
    return NextResponse.json({ error: 'Webhook does not belong to the configured Didit application and workflow.' }, { status: 403 })
  }

  if (payload.webhook_type !== 'status.updated') {
    return NextResponse.json({ received: true, ignored: true })
  }

  const sessionId = typeof payload.session_id === 'string' ? payload.session_id : null
  const userId = typeof payload.vendor_data === 'string' ? payload.vendor_data : null
  const status = typeof payload.status === 'string' ? payload.status : null
  if (!sessionId || !userId || !status) {
    return NextResponse.json({ error: 'Webhook is missing its session, user or status.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: record, error: lookupError } = await admin
    .from('age_verifications')
    .select('id,status')
    .eq('provider', 'didit')
    .eq('provider_reference', sessionId)
    .eq('user_id', userId)
    .maybeSingle()

  if (lookupError) {
    console.error('[didit-webhook] verification_record_lookup_failed', lookupError.message)
    return NextResponse.json({ error: 'Could not locate the verification record.' }, { status: 500 })
  }
  if (!record) {
    console.warn('[didit-webhook] verification_record_not_found')
    return NextResponse.json({ error: 'Verification session was not found.' }, { status: 404 })
  }

  // The published Live workflow enforces Kenya's minimum age of 18 itself.
  // Its response_attributes intentionally return no identity-document data,
  // so a signed Approved verdict from that exact workflow is the age decision.
  // Keep the stricter document-result check for the Sandbox integration.
  if (status === 'Approved') {
    if (environment === 'sandbox') {
      const decision = payload.decision
      const idChecks = decision && typeof decision === 'object'
        ? (decision as Record<string, unknown>).id_verifications
        : null
      const hasApprovedDocument = Array.isArray(idChecks) &&
        idChecks.some((item) =>
          item && typeof item === 'object' &&
          (item as Record<string, unknown>).status === 'Approved',
        )

      if (!hasApprovedDocument) {
        return NextResponse.json({ received: true, pending: true })
      }
    }

    if (record.status !== 'pending') return NextResponse.json({ received: true, duplicate: true })

    const now = new Date()
    const { error } = await admin
      .from('age_verifications')
      .update({
        status: 'verified',
        verified_at: now.toISOString(),
        expires_at: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', record.id)
      .eq('status', 'pending')
    if (error) return NextResponse.json({ error: 'Could not record the approved age check.' }, { status: 500 })
    return NextResponse.json({ received: true })
  }

  if (status === 'Declined') {
    if (record.status !== 'pending') return NextResponse.json({ received: true, duplicate: true })
    const { error } = await admin
      .from('age_verifications')
      .update({ status: 'rejected', verified_at: null, expires_at: null })
      .eq('id', record.id)
      .eq('status', 'pending')
    if (error) return NextResponse.json({ error: 'Could not record the declined age check.' }, { status: 500 })
    return NextResponse.json({ received: true })
  }

  if (status === 'Expired' || status === 'Kyc Expired' || status === 'Abandoned') {
    if (record.status !== 'pending') return NextResponse.json({ received: true, duplicate: true })
    const { error } = await admin
      .from('age_verifications')
      .update({ status: 'expired', verified_at: null, expires_at: null })
      .eq('id', record.id)
      .eq('status', 'pending')
    if (error) return NextResponse.json({ error: 'Could not record the expired age check.' }, { status: 500 })
  }

  // Not Started, In Progress, In Review, Resubmitted and unknown states remain locked.
  return NextResponse.json({ received: true, pending: true })
}
