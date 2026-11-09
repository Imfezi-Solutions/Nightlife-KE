import { NextResponse } from 'next/server'
import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/lib/supabase/database.types'

export const runtime = 'nodejs'

type CreditPackage = { id: string; amountKes: number; credits: number }

function getPackages(): CreditPackage[] {
  try {
    const value: unknown = JSON.parse(process.env.NIGHTLIFE_CREDIT_PACKAGES_JSON ?? '[]')
    if (!Array.isArray(value)) return []
    return value.filter((item): item is CreditPackage =>
      item && typeof item.id === 'string' && item.id.length > 0 &&
      Number.isSafeInteger(item.amountKes) && item.amountKes > 0 &&
      Number.isSafeInteger(item.credits) && item.credits > 0
    )
  } catch {
    return []
  }
}

function normalizeKenyanPhone(value: string): string | null {
  const digits = value.replace(/[\s()+-]/g, '')
  if (/^0[17]\d{8}$/.test(digits)) return '254' + digits.slice(1)
  if (/^254[17]\d{8}$/.test(digits)) return digits
  return null
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in before purchasing credits.' }, { status: 401 })

  const username = process.env.PAYHERO_USERNAME
  const password = process.env.PAYHERO_PASSWORD
  const channelId = Number(process.env.PAYHERO_CHANNEL_ID)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!username || !password || !Number.isInteger(channelId) || channelId <= 0 || !siteUrl) {
    return NextResponse.json({ error: 'Payments are not configured yet. Please try again later.' }, { status: 503 })
  }

  const body = await request.json().catch(() => null) as { packageId?: unknown; phoneNumber?: unknown } | null
  if (!body || typeof body.packageId !== 'string' || typeof body.phoneNumber !== 'string') {
    return NextResponse.json({ error: 'Choose a credit package and enter your M-Pesa phone number.' }, { status: 400 })
  }
  const selected = getPackages().find((item) => item.id === body.packageId)
  const phone = normalizeKenyanPhone(body.phoneNumber)
  if (!selected || !phone) {
    return NextResponse.json({ error: !selected ? 'That credit package is unavailable.' : 'Enter a valid Kenyan M-Pesa number.' }, { status: 400 })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return NextResponse.json({ error: 'Payment service is not configured on the server.' }, { status: 503 })
  }

  const externalReference = 'NLK-' + randomUUID()
  const { data: intent, error: insertError } = await admin.from('payment_intents').insert({
    user_id: user.id,
    package_id: selected.id,
    amount_kes: selected.amountKes,
    credits: selected.credits,
    external_reference: externalReference,
    status: 'pending',
  }).select('id').single()

  if (insertError || !intent) {
    return NextResponse.json({ error: 'Could not create a payment request.' }, { status: 500 })
  }

  const auth = 'Basic ' + Buffer.from(username + ':' + password).toString('base64')
  let providerResponse: Response
  let providerData: Record<string, unknown>
  try {
    providerResponse = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        amount: selected.amountKes,
        phone_number: phone,
        channel_id: channelId,
        provider: 'm-pesa',
        external_reference: externalReference,
        callback_url: siteUrl.replace(/\/$/, '') + '/api/payments/payhero/callback',
      }),
    })
    providerData = await providerResponse.json() as Record<string, unknown>
  } catch {
    await admin.from('payment_intents').update({ status: 'failed' }).eq('id', intent.id)
    return NextResponse.json({ error: 'PayHero could not be reached. No credits were added.' }, { status: 502 })
  }

  const payheroReference = typeof providerData.reference === 'string' ? providerData.reference : ''
  const checkoutRequestId = typeof providerData.CheckoutRequestID === 'string' ? providerData.CheckoutRequestID : ''
  if (!providerResponse.ok || providerData.success !== true || !payheroReference || !checkoutRequestId) {
    await admin.from('payment_intents').update({
      status: 'failed',
      provider_payload: providerData as unknown as Json,
    }).eq('id', intent.id)
    return NextResponse.json({ error: 'PayHero did not accept the payment request. No credits were added.' }, { status: 502 })
  }

  const { error: updateError } = await admin.from('payment_intents').update({
    status: 'queued',
    payhero_reference: payheroReference,
    checkout_request_id: checkoutRequestId,
    provider_payload: providerData as unknown as Json,
  }).eq('id', intent.id)

  if (updateError) {
    return NextResponse.json({ error: 'Payment was initiated but could not be recorded. Contact support with reference ' + externalReference }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    status: 'queued',
    message: 'Check your phone and complete the M-Pesa prompt. Credits are added only after PayHero confirms payment.',
    paymentIntentId: intent.id,
    externalReference,
  })
}
