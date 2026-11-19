import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const DIDIT_API_URL = 'https://verification.didit.me/v3/session/'
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

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in before verifying your age.' }, { status: 401 })

  const { data: declaration, error: declarationError } = await supabase
    .from('age_declarations')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (declarationError || !declaration) {
    return NextResponse.json({ error: 'Complete the 18+ declaration before starting verification.' }, { status: 403 })
  }

  const apiKey = process.env.DIDIT_API_KEY
  const workflowId = process.env.DIDIT_WORKFLOW_ID
  const applicationId = process.env.DIDIT_APPLICATION_ID
  const environment = process.env.DIDIT_ENVIRONMENT

  const expected = environment === 'sandbox' || environment === 'live'
    ? DIDIT_CONFIG[environment]
    : null

  // Each Vercel environment must use its matching Didit application and workflow.
  if (
    !apiKey ||
    !expected ||
    workflowId !== expected.workflowId ||
    applicationId !== expected.applicationId
  ) {
    return NextResponse.json({ error: 'Sandbox age verification is not fully configured. Please try again later.' }, { status: 503 })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return NextResponse.json({ error: 'Age verification service is not configured on the server.' }, { status: 503 })
  }

  const { data: existing } = await supabase
    .from('age_verifications')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'verified')
    .not('verified_at', 'is', null)
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'Your age is already verified.' }, { status: 409 })
  }

  const origin = new URL(request.url).origin
  const { data: record, error: insertError } = await admin
    .from('age_verifications')
    .insert({ user_id: user.id, provider: 'didit', status: 'pending' })
    .select('id')
    .single()

  if (insertError || !record) {
    return NextResponse.json({ error: 'Could not start your age verification. Please try again.' }, { status: 500 })
  }

  try {
    const response = await fetch(DIDIT_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify({
        workflow_id: workflowId,
        vendor_data: user.id,
        callback: origin + '/verify-age?returned=1',
        callback_method: 'completer',
        language: 'en',
        metadata: { product: 'nightlife-ke', purpose: 'age_18_plus' },
      }),
    })

    const payload = await response.json().catch(() => null) as {
      session_id?: unknown
      url?: unknown
    } | null

    if (
      !response.ok ||
      !payload ||
      typeof payload.session_id !== 'string' ||
      typeof payload.url !== 'string'
    ) {
      await admin.from('age_verifications').update({ status: 'expired' }).eq('id', record.id)
      return NextResponse.json({ error: 'Didit could not create a valid age-verification session. Please try again.' }, { status: 502 })
    }

    const verificationUrl = payload.url.startsWith('https://')
      ? payload.url
      : 'https://' + payload.url.replace(/^\/+/, '')

    if (!verificationUrl.startsWith('https://verify.didit.me/')) {
      await admin.from('age_verifications').update({ status: 'expired' }).eq('id', record.id)
      return NextResponse.json({ error: 'Didit returned an unexpected verification link.' }, { status: 502 })
    }

    const { error: updateError } = await admin
      .from('age_verifications')
      .update({ provider_reference: payload.session_id })
      .eq('id', record.id)

    if (updateError) {
      await admin.from('age_verifications').update({ status: 'expired' }).eq('id', record.id)
      return NextResponse.json({ error: 'Could not save your verification session. Please contact support.' }, { status: 500 })
    }

    return NextResponse.json({ verificationUrl })
  } catch {
    await admin.from('age_verifications').update({ status: 'expired' }).eq('id', record.id)
    return NextResponse.json({ error: 'Didit could not be reached. Please try again.' }, { status: 502 })
  }
}
