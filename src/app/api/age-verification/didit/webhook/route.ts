import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

function validSignature(rawBody: string, supplied: string, secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(supplied)) return false
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest()
  const actual = Buffer.from(supplied, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export async function POST(request: Request) {
  const secret = process.env.DIDIT_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 503 })

  // Verify the exact bytes Didit sent before parsing or trusting the payload.
  const rawBody = await request.text()
  const signature = request.headers.get('x-signature-v2') ?? ''
  if (!validSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody) as {
    session_id?: unknown
    status?: unknown
    vendor_data?: unknown
    data?: { session_id?: unknown; status?: unknown; vendor_data?: unknown }
  }
  const sessionId = typeof payload.session_id === 'string'
    ? payload.session_id
    : typeof payload.data?.session_id === 'string' ? payload.data.session_id : null
  const status = typeof payload.status === 'string'
    ? payload.status
    : typeof payload.data?.status === 'string' ? payload.data.status : null

  if (!sessionId || !status) {
    return NextResponse.json({ error: 'Webhook is missing its session or status.' }, { status: 400 })
  }

  const normalizedStatus = status.toLowerCase()
  const now = new Date()
  let update: {
    status: 'pending' | 'verified' | 'rejected' | 'expired'
    verified_at: string | null
    expires_at: string | null
  }

  if (status === 'Approved') {
    update = {
      status: 'verified',
      verified_at: now.toISOString(),
      // Reverification is required after one year.
      expires_at: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    }
  } else if (status === 'Declined' || normalizedStatus === 'declined') {
    update = { status: 'rejected', verified_at: null, expires_at: null }
  } else if (status === 'Expired' || normalizedStatus === 'expired' || status === 'Abandoned') {
    update = { status: 'expired', verified_at: null, expires_at: null }
  } else {
    // In Review, In Progress, Resubmitted and unknown states never unlock access.
    update = { status: 'pending', verified_at: null, expires_at: null }
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('age_verifications')
    .update(update)
    .eq('provider', 'didit')
    .eq('provider_reference', sessionId)
    .select('id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Could not record verification result.' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Verification session was not found.' }, { status: 404 })

  return NextResponse.json({ received: true })
}
