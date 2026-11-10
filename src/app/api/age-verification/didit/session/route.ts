import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const DIDIT_API_URL = 'https://verification.didit.me/v3/session/'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in before verifying your age.' }, { status: 401 })

  const apiKey = process.env.DIDIT_API_KEY
  const workflowId = process.env.DIDIT_WORKFLOW_ID
  if (!apiKey || !workflowId) {
    return NextResponse.json({ error: 'Age verification is not configured yet. Please try again later.' }, { status: 503 })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return NextResponse.json({ error: 'Age verification service is not configured on the server.' }, { status: 503 })
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
      }),
    })

    const payload = await response.json().catch(() => null) as { session_id?: unknown; url?: unknown } | null
    if (!response.ok || !payload || typeof payload.session_id !== 'string' || typeof payload.url !== 'string') {
      await admin.from('age_verifications').update({ status: 'expired' }).eq('id', record.id)
      return NextResponse.json({ error: 'Didit could not create a verification session. Please try again.' }, { status: 502 })
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
