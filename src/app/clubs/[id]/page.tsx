import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  joinClubAction,
  removeClubMemberAction,
  reportClubMemberAction,
  reviewClubReportAction,
} from '../actions'

type ClubSummary = {
  id: string
  name: string
  description: string | null
  visibility: string
  capacity: number
  county_id: number
  county_name?: string
}

export default async function ClubPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ code?: string; error?: string; notice?: string }>
}) {
  const { id } = await params
  const query = await searchParams
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const currentUserId = claims?.claims?.sub
  if (!currentUserId) redirect('/login')

  const { data: visibleClub } = await supabase.from('clubs')
    .select('id,name,description,visibility,capacity,county_id')
    .eq('id', id).maybeSingle()

  let club: ClubSummary | null = visibleClub as ClubSummary | null
  if (!club && query.code) {
    const { data } = await supabase.rpc('preview_invite_club', {
      p_club_id: id,
      p_invitation_code: query.code,
    })
    if (data) club = data as unknown as ClubSummary
  }
  if (!club) notFound()

  const [{ data: rooms }, { data: membership }, { data: county }, { data: members }] = await Promise.all([
    supabase.from('rooms').select('id,name,room_type,capacity').eq('club_id', id).order('created_at'),
    supabase.from('club_members').select('role').eq('club_id', id).eq('user_id', currentUserId).maybeSingle(),
    club.county_name
      ? Promise.resolve({ data: { name: club.county_name } })
      : supabase.from('counties').select('name').eq('id', club.county_id).maybeSingle(),
    supabase.from('club_members').select('user_id,role,joined_at').eq('club_id', id).order('joined_at'),
  ])

  const isMember = Boolean(membership)
  const isOwner = membership?.role === 'owner'
  const isModerator = membership?.role === 'owner' || membership?.role === 'moderator'
  const canSeeCode = query.code && isOwner && club.visibility === 'invite_only'
  const memberIds = (members ?? []).map((member) => member.user_id)
  const [{ data: memberProfiles }, { data: reports }] = await Promise.all([
    memberIds.length
      ? supabase.from('profiles').select('id,username,display_name').in('id', memberIds)
      : Promise.resolve({ data: [] }),
    isModerator
      ? supabase.from('club_reports')
          .select('id,reporter_id,reported_user_id,reason,details,status,created_at')
          .eq('club_id', id)
          .order('created_at', { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] }),
  ])
  const profileById = new Map((memberProfiles ?? []).map((profile) => [profile.id, profile]))

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-10">
      <Link href="/discover" className="text-sm text-zinc-400 hover:text-white">← Discovery</Link>
      <section className="glass mt-8 rounded-3xl p-8 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[.25em] text-lime-300">
          {county?.name ?? 'Kenya'} · {club.visibility === 'public' ? 'Public club' : 'Private club'}
        </p>
        <h1 className="mt-3 text-4xl font-black">{club.name}</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">{club.description || 'Welcome to the club.'}</p>
        <p className="mt-5 text-sm text-zinc-500">Capacity: {club.capacity} members</p>
        {canSeeCode && (
          <div className="mt-6 rounded-xl border border-lime-300/20 bg-lime-300/5 p-4">
            <p className="text-xs uppercase tracking-wider text-lime-200">Private invitation code</p>
            <p className="mt-2 break-all font-mono text-2xl font-bold tracking-widest">{query.code}</p>
            <p className="mt-2 text-xs text-zinc-500">Share this link privately. Only the code hash is stored in the database.</p>
          </div>
        )}
        {!isMember && (
          <form action={joinClubAction} className="mt-7 flex flex-col gap-3 sm:flex-row">
            <input type="hidden" name="club_id" value={club.id} />
            {club.visibility === 'invite_only' && (
              <input name="invitation_code" required defaultValue={query.code ?? ''} placeholder="Enter invitation code" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3" />
            )}
            <button className="rounded-xl bg-lime-300 px-6 py-3 font-bold text-black">Join club</button>
          </form>
        )}
        {isMember && (
          <p className="mt-6 inline-flex rounded-full bg-lime-300/10 px-4 py-2 text-sm font-semibold text-lime-200">
            {isOwner ? 'You own this club' : membership?.role === 'moderator' ? 'You moderate this club' : 'You are a club member'}
          </p>
        )}
        {query.notice === 'member_removed' && <p className="mt-4 text-sm text-lime-200">Member removed from this club.</p>}
        {query.notice === 'report_sent' && <p className="mt-4 text-sm text-lime-200">Your report has been submitted to the club moderators.</p>}
        {query.notice === 'report_updated' && <p className="mt-4 text-sm text-lime-200">Report status updated.</p>}
        {query.error && <p className="mt-4 text-sm text-red-300">That action could not be completed. Check your permissions and try again.</p>}
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-black">Explore the spaces</h2>
        <p className="mt-2 text-sm text-zinc-400">Enter a room to chat and see who is there in real time.</p>
        {isMember ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(rooms ?? []).map((room) => (
              <Link key={room.id} href={`/clubs/${id}/rooms/${room.id}`} className="glass rounded-2xl p-6 transition hover:border-lime-300/40">
                <p className="text-xs uppercase tracking-wider text-lime-300">{room.room_type.replace('_', ' ')}</p>
                <h3 className="mt-3 text-xl font-bold">{room.name}</h3>
                <p className="mt-2 text-sm text-zinc-500">Up to {room.capacity} people · Enter room →</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-2xl border border-white/10 p-6 text-sm text-zinc-400">Club rooms are visible to members only.</p>
        )}
      </section>

      {isMember && (
        <section className="mt-12 grid gap-8 lg:grid-cols-2">
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">Club members</h2>
              <span className="text-sm text-zinc-400">{members?.length ?? 0} / {club.capacity}</span>
            </div>
            <ul className="mt-5 space-y-3">
              {(members ?? []).map((member) => {
                const profile = profileById.get(member.user_id)
                const label = profile?.display_name || profile?.username || 'Club member'
                const canRemove = isModerator
                  && member.user_id !== currentUserId
                  && member.role !== 'owner'
                  && (isOwner || member.role === 'member')
                return (
                  <li key={member.user_id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{label}</p>
                      <p className="text-xs capitalize text-zinc-500">{member.role}</p>
                    </div>
                    {canRemove && (
                      <form action={removeClubMemberAction}>
                        <input type="hidden" name="club_id" value={id} />
                        <input type="hidden" name="target_user_id" value={member.user_id} />
                        <button className="rounded-lg border border-red-300/20 px-3 py-2 text-xs text-red-200 hover:bg-red-300/10">Remove</button>
                      </form>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="glass rounded-3xl p-6">
            <h2 className="text-xl font-black">Report a member</h2>
            <p className="mt-2 text-sm text-zinc-400">Reports go to this club’s owner and moderators. Use this for harassment, spam, or safety concerns.</p>
            <form action={reportClubMemberAction} className="mt-5 space-y-3">
              <input type="hidden" name="club_id" value={id} />
              <label className="block text-xs font-semibold text-zinc-300" htmlFor="reported-user">Member</label>
              <select id="reported-user" name="reported_user_id" required className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm">
                <option value="">Choose a member</option>
                {(members ?? []).filter((member) => member.user_id !== currentUserId).map((member) => {
                  const profile = profileById.get(member.user_id)
                  return <option key={member.user_id} value={member.user_id}>{profile?.display_name || profile?.username || 'Club member'}</option>
                })}
              </select>
              <label className="block text-xs font-semibold text-zinc-300" htmlFor="report-reason">Reason</label>
              <select id="report-reason" name="reason" required className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm">
                <option value="harassment">Harassment or bullying</option>
                <option value="hate_speech">Hate speech</option>
                <option value="sexual_content">Inappropriate sexual content</option>
                <option value="spam">Spam or scams</option>
                <option value="impersonation">Impersonation</option>
                <option value="underage_concern">Underage safety concern</option>
                <option value="other">Other</option>
              </select>
              <label className="block text-xs font-semibold text-zinc-300" htmlFor="report-details">Details (optional)</label>
              <textarea id="report-details" name="details" maxLength={1000} rows={3} placeholder="Tell moderators what happened…" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm" />
              <button className="rounded-xl border border-red-300/30 px-5 py-3 text-sm font-bold text-red-200 hover:bg-red-300/10">Submit report</button>
            </form>
          </div>
        </section>
      )}

      {isModerator && (
        <section className="glass mt-8 rounded-3xl p-6">
          <h2 className="text-xl font-black">Moderation reports</h2>
          <p className="mt-2 text-sm text-zinc-400">Latest reports submitted to this club.</p>
          <div className="mt-5 space-y-3">
            {(reports ?? []).length === 0 && <p className="text-sm text-zinc-500">No reports yet.</p>}
            {(reports ?? []).map((report) => (
              <article key={report.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold capitalize">{report.reason.replace('_', ' ')}</p>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs capitalize text-zinc-300">{report.status}</span>
                </div>
                {report.details && <p className="mt-2 text-sm text-zinc-400">{report.details}</p>}
                <p className="mt-2 text-xs text-zinc-500">Reported member: {profileById.get(report.reported_user_id)?.username || 'Member'} · {new Date(report.created_at).toLocaleString()}</p>
                {report.status !== 'resolved' && report.status !== 'dismissed' && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(report.status === 'open' ? ['reviewing', 'resolved', 'dismissed'] as const : ['resolved', 'dismissed'] as const).map((status) => (
                      <form key={status} action={reviewClubReportAction}>
                        <input type="hidden" name="club_id" value={id} />
                        <input type="hidden" name="report_id" value={report.id} />
                        <input type="hidden" name="status" value={status} />
                        <button className="rounded-lg border border-white/10 px-3 py-2 text-xs capitalize text-zinc-300 hover:bg-white/5">{status}</button>
                      </form>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
