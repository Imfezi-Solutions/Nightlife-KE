import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const EXPECTED_WORKFLOW_ID = '604e2b8e-549a-4036-8611-d4b99c775e49'
const EXPECTED_APPLICATION_ID = 'c4f100b9-b5b0-4ebd-b354-d0e0c385c1a5'

function normalizeNumbers(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeNumbers)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, normalizeNumbers(child)]),
    )
  }
  if (typeof value === 'number' && Number.isInteger(value)) return Math.trunc(value)
  return value
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [key, sortKeys((value as Record<string, unknown>)[key])]),
    )
  }
  return value
}

function validSignature(
  payload: Record<string, unknown>,
  supplied: string,
  timestamp: string,
  secret: string,
) {
  if (!/^[a-f0-9]{64}$/i.test(supplied) || !/^\d+$/.test(timestamp)) return false
  const timestampSeconds = Number(timestamp)
  if (!Number.isSafeInteger(timestampSeconds) || Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) > 300) {
    return false
  }

  // Didit V3 X-Signature-V2 signs compact JSON with recursively sorted keys.\n  // Never replace this with raw-body hashing: that is the legacy X-Signature algorithm.
  const canonical = JSON.stringify(sortKeys(normalizeNumbers(payload)))
  const expected = createHmac('sha256', secret).update(canonical, 'utf8').digest()
  const actual = Buffer.from(supplied, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
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

  const signature = request.headers.get('x-signature-v2') ?? ''
  const timestamp = request.headers.get('x-timestamp') ?? ''
  if (!validSignature(payload, signature, timestamp, secret)) {
    return NextResponse.json({ error: 'Invalid or expired webhook signature.' }, { status: 401 })
  }

  if (
    payload.application_id !== EXPECTED_APPLICATION_ID ||
    payload.environment !== 'sandbox' ||
    payload.workflow_id !== EXPECTED_WORKFLOW_ID
  ) {
    return NextResponse.json({ error: 'Webhook does not belong to the configured Didit Sandbox workflow.' }, { status: 403 })
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

  if (lookupError) return NextResponse.json({ error: 'Could not locate the verification record.' }, { status: 500 })
  if (!record) return NextResponse.json({ error: 'Verification session was not found.' }, { status: 404 })

  // A verified result is trusted only when Didit's approved decision includes
  // an approved ID-document check. The published workflow enforces minimum age 18.
  if (status === 'Approved') {
    const decision = payload.decision
    const idChecks = decision && typeof decision === 'object'
      ? (decision as Record<string, unknown>).id_verifications
      : null
    const hasApprovedDocument = Array.isArray(idChecks) &&
      idChecks.some((item) => item && typeof item === 'object' && (item as Record<string, unknown>).status === 'Approved')

    if (!hasApprovedDocument) {
      return NextResponse.json({ received: true, pending: true })
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

  // In Review, In Progress, Resubmitted and unknown states remain locked.
  return NextResponse.json({ received: true, pending: true })
}
