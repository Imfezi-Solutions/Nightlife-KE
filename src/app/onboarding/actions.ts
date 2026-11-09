'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const profileSchema = z.object({ username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/), display_name: z.string().trim().min(2).max(50), gender: z.enum(['male','female','rather_not_say']), county_id: z.coerce.number().int().min(1).max(47) })

export async function saveProfile(formData: FormData) {
  const parsed = profileSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) redirect('/onboarding?error=invalid')
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  if (claimsError || !claimsData?.claims?.sub) redirect('/login')
  const { error } = await supabase.from('profiles').update({ ...parsed.data, updated_at: new Date().toISOString() }).eq('id', claimsData.claims.sub)
  if (error) redirect('/onboarding?error=save')
  redirect('/discover')
}
