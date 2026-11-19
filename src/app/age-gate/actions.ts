'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const POLICY_VERSION = '2026-11-09-v1'

function safeNext(value: FormDataEntryValue | null): string {
  const path = typeof value === 'string' ? value : '/discover'
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/age-gate')) return '/discover'
  if (!['/discover', '/clubs', '/wallet'].some((prefix) => path === prefix || path.startsWith(prefix + '/') || path.startsWith(prefix + '?'))) return '/discover'
  return path
}

export async function submitAgeDeclaration(formData: FormData) {
  const next = safeNext(formData.get('next'))
  if (formData.get('decision') !== 'yes') redirect('/age-gate?declined=1')

  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) redirect('/login')

  const { error } = await supabase.from('age_declarations').insert({
    user_id: userId,
    policy_version: POLICY_VERSION,
    accepted: true,
  })

  // A prior declaration is already sufficient for this first-stage gate.
  if (error && error.code !== '23505') redirect('/age-gate?error=save')
  redirect(next)
}
