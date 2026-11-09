import { NextResponse } from 'next/server'
import { Buffer } from 'node:buffer'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/lib/supabase/database.types'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const root = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!root) return NextResponse.json({ error: 'Invalid callback payload.' }, { status: 400 })
  const payload = root.response && typeof root.response === 'object'
    ? root.response as Record<string, unknown>
    : root

  const externalReference = String(payload.ExternalReference ?? payload.external_reference ?? '')
  const checkoutRequestId = String(payload.CheckoutRequestID ?? payload.checkout_request_id ?? '')
  const amount = Number(payload.Amount ?? payload.amount)
  const status = String(payload.Status ?? payload.status ?? '').toLowerCase()
  const resultCode = Number(payload.ResultCode ?? payload.result_code)
  const receipt = String(payload.MpesaReceiptNumber ?? payload.provider_reference ?? '')

  if (!externalReference || !checkoutRequestId || !Number.isFinite(amount)) {
    return NextResponse.json({ error: 'Required payment reference fields are missing.' }, { status: 400 })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return NextResponse.json({ error: 'Payment settlement is temporarily unavailable.' }, { status: 503 })
  }

  const { data: intent, error } = await admin.from('payment_intents')
    .select('id,user_id,amount_kes,credits,status,external_reference,payhero_reference,checkout_request_id')
    .eq('external_reference', externalReference)
    .maybeSingle()

  if (error || !intent) return NextResponse.json({ error: 'Unknown payment reference.' }, { status: 404 })
  if (intent.status === 'success') return NextResponse.json({ success: true, duplicate: true })
  if (intent.checkout_request_id !== checkoutRequestId || intent.amount_kes !== amount) {
    return NextResponse.json({ error: 'Payment callback does not match the stored intent.' }, { status: 409 })
  }

  const failed = status === 'failed' || (Number.isFinite(resultCode) && resultCode > 0) || root.status === false
  const succeeded = status === 'success' || resultCode === 0 || root.success === true
  if (failed) {
    await admin.from('payment_intents').update({
      status: 'failed',
      provider_payload: root as unknown as Json,
      updated_at: new Date().toISOString(),
    }).eq('id', intent.id).neq('status', 'success')
    return NextResponse.json({ success: true, settled: false })
  }
  if (!succeeded) return NextResponse.json({ error: 'Payment is not in a final state.' }, { status: 202 })
  if (!intent.payhero_reference) return NextResponse.json({ error: 'Provider reference is not recorded yet.' }, { status: 409 })

  const username = process.env.PAYHERO_USERNAME
  const password = process.env.PAYHERO_PASSWORD
  if (!username || !password) return NextResponse.json({ error: 'Provider verification is not configured.' }, { status: 503 })

  let verification: Record<string, unknown>
  try {
    const auth = 'Basic ' + Buffer.from(username + ':' + password).toString('base64')
    const url = 'https://backend.payhero.co.ke/api/v2/transaction-status?reference=' + encodeURIComponent(intent.payhero_reference)
    const response = await fetch(url, { headers: { Authorization: auth }, cache: 'no-store' })
    if (!response.ok) return NextResponse.json({ error: 'Could not verify payment with PayHero.' }, { status: 503 })
    verification = await response.json() as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Could not verify payment with PayHero.' }, { status: 503 })
  }

  if (String(verification.status).toUpperCase() !== 'SUCCESS' || verification.success !== true) {
    return NextResponse.json({ error: 'PayHero has not confirmed this payment as successful.' }, { status: 409 })
  }

  const { error: settleError } = await admin.rpc('settle_payhero_payment', {
    p_external_reference: externalReference,
    p_payhero_reference: intent.payhero_reference,
    p_amount_kes: intent.amount_kes,
    p_mpesa_receipt: receipt,
    p_provider_payload: { callback: root, verification } as unknown as Json,
  })
  if (settleError) return NextResponse.json({ error: 'Payment verification succeeded but wallet settlement failed.' }, { status: 500 })
  return NextResponse.json({ success: true, settled: true })
}
