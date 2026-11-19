import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })

  const [{ data: assignment }, { data: assurance }] = await Promise.all([
    supabase.from('platform_admins').select('role').eq('user_id', userId).maybeSingle(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ])
  if (assignment?.role !== 'super_admin') return NextResponse.json({ error: 'Super Admin access required.' }, { status: 403 })
  if (assurance?.currentLevel !== 'aal2') return NextResponse.json({ error: 'Complete MFA verification before managing clubs.' }, { status: 403 })

  let body: { clubId?: string; status?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }) }
  if (!body.clubId || !/^[0-9a-f-]{36}$/i.test(body.clubId) || !['active', 'suspended', 'archived'].includes(body.status ?? '')) {
    return NextResponse.json({ error: 'Provide a valid club and status.' }, { status: 400 })
  }

  const { data, error } = await (supabase as any).rpc('admin_set_club_status', {
    p_club_id: body.clubId,
    p_status: body.status,
  })
  if (error) return NextResponse.json({ error: error.message || 'Club update failed.' }, { status: 400 })
  return NextResponse.json(data)
}
