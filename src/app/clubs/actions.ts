'use server'

import { revalidatePath } from 'next/cache'
import { notFound, redirect } from 'next/navigation'
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
    p_description: parsed.data.description || undefined,
    p_visibility: parsed.data.visibility,
    p_capacity: parsed.data.capacity,
  })

  if (error) {
    const code = error.code === '42501' ? 'verification' : 'create'
    redirect(`/clubs/new?error=${code}`)
  }

  const result = data as unknown as { club_id: string; slug: string; invitation_code: string | null }
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
    p_invitation_code: parsed.data.invitation_code || undefined,
  })
  if (error) {
    const code = error.message.includes('18+ verification required') ? 'verification' : 'join'
    redirect(`/discover?error=${code}`)
  }
  revalidatePath('/discover')
  redirect(`/clubs/${parsed.data.club_id}`)
}


const sendMessageSchema = z.object({
  club_id: z.string().uuid(),
  room_id: z.string().uuid(),
  body: z.string().trim().min(1).max(1000),
})

export async function sendRoomMessageAction(formData: FormData) {
  const parsed = sendMessageSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) redirect('/discover?error=message')

  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) redirect('/login')

  const { data: room } = await supabase.from('rooms')
    .select('id')
    .eq('id', parsed.data.room_id)
    .eq('club_id', parsed.data.club_id)
    .maybeSingle()
  if (!room) notFound()

  const { error } = await supabase.from('chat_messages').insert({
    club_id: parsed.data.club_id,
    room_id: parsed.data.room_id,
    author_id: userId,
    body: parsed.data.body,
  })

  if (error) {
    const reason = error.message.includes('rate limit') ? 'slow_down' : 'message'
    redirect(`/clubs/${parsed.data.club_id}/rooms/${parsed.data.room_id}?error=${reason}`)
  }

  revalidatePath(`/clubs/${parsed.data.club_id}/rooms/${parsed.data.room_id}`)
  redirect(`/clubs/${parsed.data.club_id}/rooms/${parsed.data.room_id}`)
}


const removeMemberSchema = z.object({
  club_id: z.string().uuid(),
  target_user_id: z.string().uuid(),
})

export async function removeClubMemberAction(formData: FormData) {
  const parsed = removeMemberSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) redirect('/discover?error=moderation')

  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) redirect('/login')

  const { error } = await supabase.rpc('remove_club_member', {
    p_club_id: parsed.data.club_id,
    p_target_user_id: parsed.data.target_user_id,
  })

  if (error) redirect(`/clubs/${parsed.data.club_id}?error=remove`)
  revalidatePath(`/clubs/${parsed.data.club_id}`)
  redirect(`/clubs/${parsed.data.club_id}?notice=member_removed`)
}

const reportMemberSchema = z.object({
  club_id: z.string().uuid(),
  reported_user_id: z.string().uuid(),
  reason: z.enum(['harassment','hate_speech','sexual_content','spam','impersonation','underage_concern','other']),
  details: z.string().trim().max(1000).optional(),
})

export async function reportClubMemberAction(formData: FormData) {
  const parsed = reportMemberSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) redirect('/discover?error=report')

  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const reporterId = claims?.claims?.sub
  if (!reporterId) redirect('/login')

  const { error } = await supabase.from('club_reports').insert({
    club_id: parsed.data.club_id,
    reporter_id: reporterId,
    reported_user_id: parsed.data.reported_user_id,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
  })

  if (error) redirect(`/clubs/${parsed.data.club_id}?error=report`)
  redirect(`/clubs/${parsed.data.club_id}?notice=report_sent`)
}

const reviewReportSchema = z.object({
  club_id: z.string().uuid(),
  report_id: z.string().uuid(),
  status: z.enum(['reviewing','resolved','dismissed']),
})

export async function reviewClubReportAction(formData: FormData) {
  const parsed = reviewReportSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) redirect('/discover?error=moderation')

  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const reviewerId = claims?.claims?.sub
  if (!reviewerId) redirect('/login')

  const { error } = await supabase.from('club_reports')
    .update({ status: parsed.data.status, reviewed_by: reviewerId })
    .eq('id', parsed.data.report_id)
    .eq('club_id', parsed.data.club_id)

  if (error) redirect(`/clubs/${parsed.data.club_id}?error=review`)
  revalidatePath(`/clubs/${parsed.data.club_id}`)
  redirect(`/clubs/${parsed.data.club_id}?notice=report_updated`)
}


const updateClubSchema = z.object({
  club_id: z.string().uuid(),
  name: z.string().trim().min(3).max(60),
  description: z.string().trim().max(500).optional(),
  visibility: z.enum(['public', 'invite_only']),
  capacity: z.coerce.number().int().min(2).max(30),
})

export async function updateClubSettingsAction(formData: FormData) {
  const parsed = updateClubSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) redirect('/discover?error=club_settings')
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) redirect('/login')
  const { error } = await supabase.rpc('update_club_settings', {
    p_club_id: parsed.data.club_id,
    p_name: parsed.data.name,
    p_description: parsed.data.description || null,
    p_visibility: parsed.data.visibility,
    p_capacity: parsed.data.capacity,
  })
  if (error) redirect('/clubs/' + parsed.data.club_id + '?error=club_settings')
  revalidatePath('/clubs/' + parsed.data.club_id)
  revalidatePath('/discover')
  redirect('/clubs/' + parsed.data.club_id + '?notice=settings_saved')
}

const rotateInvitationSchema = z.object({ club_id: z.string().uuid() })

export async function rotateClubInvitationAction(formData: FormData) {
  const parsed = rotateInvitationSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) redirect('/discover?error=invitation')
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) redirect('/login')
  const { data: code, error } = await supabase.rpc('rotate_club_invitation_code', {
    p_club_id: parsed.data.club_id,
  })
  if (error || !code) redirect('/clubs/' + parsed.data.club_id + '?error=invitation')
  revalidatePath('/clubs/' + parsed.data.club_id)
  redirect('/clubs/' + parsed.data.club_id + '?code=' + encodeURIComponent(code) + '&notice=invite_rotated')
}

const memberRoleSchema = z.object({
  club_id: z.string().uuid(),
  target_user_id: z.string().uuid(),
  role: z.enum(['member', 'moderator', 'dj']),
})

export async function setClubMemberRoleAction(formData: FormData) {
  const parsed = memberRoleSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) redirect('/discover?error=member_role')
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) redirect('/login')
  const { error } = await supabase.rpc('set_club_member_role', {
    p_club_id: parsed.data.club_id,
    p_target_user_id: parsed.data.target_user_id,
    p_role: parsed.data.role,
  })
  if (error) redirect('/clubs/' + parsed.data.club_id + '?error=member_role')
  revalidatePath('/clubs/' + parsed.data.club_id)
  redirect('/clubs/' + parsed.data.club_id + '?notice=role_updated')
}
