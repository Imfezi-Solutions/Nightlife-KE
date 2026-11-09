'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const createSchema = z.object({
  name: z.string().trim().min(3).max(60),
  county_id: z.coerce.number().int().min(1).max(47),
  description: z.string().trim().max(500).optional(),
  visibility: z.enum(['public', 'invite_only']),
  capacity: z.coerce.number().int().min(2).max(30),
})

export async function createClubAction(formData: FormData) {
  const parsed = createSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) redirect('/clubs/new?error=invalid')

  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) redirect('/login')

  const { data, error } = await supabase.rpc('create_club', {
    p_name: parsed.data.name,
    p_county_id: parsed.data.county_id,
    p_description: parsed.data.description || null,
    p_visibility: parsed.data.visibility,
    p_capacity: parsed.data.capacity,
  })

  if (error) {
    const code = error.code === '42501' ? 'verification' : 'create'
    redirect(`/clubs/new?error=${code}`)
  }

  const result = data as { club_id: string; slug: string; invitation_code: string | null }
  revalidatePath('/discover')
  if (result.invitation_code) {
    redirect(`/clubs/${result.club_id}?code=${encodeURIComponent(result.invitation_code)}`)
  }
  redirect(`/clubs/${result.club_id}`)
}

const joinSchema = z.object({
  club_id: z.string().uuid(),
  invitation_code: z.string().trim().max(32).optional(),
})

export async function joinClubAction(formData: FormData) {
  const parsed = joinSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) redirect('/discover?error=invalid')

  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) redirect('/login')

  const { error } = await supabase.rpc('join_club', {
    p_club_id: parsed.data.club_id,
    p_invitation_code: parsed.data.invitation_code || null,
  })
  if (error) {
    const code = error.code === '42501' ? 'verification' : 'join'
    redirect(`/discover?error=${code}`)
  }
  revalidatePath('/discover')
  redirect(`/clubs/${parsed.data.club_id}`)
}
