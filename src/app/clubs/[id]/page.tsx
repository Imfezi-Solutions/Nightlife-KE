import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { joinClubAction } from '../actions'

export default async function ClubPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ code?: string }> }) {
  const { id } = await params
  const query = await searchParams
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) redirect('/login')

  const [{ data: club }, { data: rooms }, { data: membership }, { data: county }] = await Promise.all([
    supabase.from('clubs').select('id,name,description,visibility,capacity,created_by,county_id').eq('id', id).maybeSingle(),
    supabase.from('rooms').select('id,name,room_type,capacity').eq('club_id', id).order('created_at'),
    supabase.from('club_members').select('role').eq('club_id', id).eq('user_id', claims.claims.sub).maybeSingle(),
    supabase.from('counties').select('name').eq('id', (await supabase.from('clubs').select('county_id').eq('id',id).maybeSingle()).data?.county_id ?? -1).maybeSingle(),
  ])
  if (!club) notFound()
  const isMember = Boolean(membership)
  const isOwner = membership?.role === 'owner'
  return <main className="mx-auto min-h-screen max-w-6xl px-5 py-10">
    <Link href="/discover" className="text-sm text-zinc-400 hover:text-white">← Discovery</Link>
    <section className="glass mt-8 rounded-3xl p-8 sm:p-10">
      <p className="text-xs font-bold uppercase tracking-[.25em] text-lime-300">{county?.name ?? 'Kenya'} · {club.visibility === 'public' ? 'Public club' : 'Private club'}</p>
      <h1 className="mt-3 text-4xl font-black">{club.name}</h1>
      <p className="mt-3 max-w-2xl text-zinc-400">{club.description || 'Welcome to the club.'}</p>
      <p className="mt-5 text-sm text-zinc-500">Capacity: {club.capacity} members</p>
      {query.code && isOwner && <div className="mt-6 rounded-xl border border-lime-300/20 bg-lime-300/5 p-4"><p className="text-xs uppercase tracking-wider text-lime-200">Private invitation code — share securely</p><p className="mt-2 break-all font-mono text-2xl font-bold tracking-widest">{query.code}</p><p className="mt-2 text-xs text-zinc-500">This code is shown once. The database stores only its SHA-256 hash.</p></div>}
      {!isMember && <form action={joinClubAction} className="mt-7 flex flex-col gap-3 sm:flex-row"><input type="hidden" name="club_id" value={club.id}/>{club.visibility === 'invite_only' && <input name="invitation_code" required placeholder="Enter invitation code" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3"/>}<button className="rounded-xl bg-lime-300 px-6 py-3 font-bold text-black">Join club</button></form>}
      {isMember && <p className="mt-6 inline-flex rounded-full bg-lime-300/10 px-4 py-2 text-sm font-semibold text-lime-200">{isOwner ? 'You own this club' : 'You are a club member'}</p>}
    </section>
    <section className="mt-10"><h2 className="text-2xl font-black">Explore the spaces</h2><p className="mt-2 text-sm text-zinc-400">Each space is ready for the next realtime and 3D experience layer.</p><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(rooms ?? []).map(room => <article key={room.id} className="glass rounded-2xl p-6"><p className="text-xs uppercase tracking-wider text-lime-300">{room.room_type.replace('_',' ')}</p><h3 className="mt-3 text-xl font-bold">{room.name}</h3><p className="mt-2 text-sm text-zinc-500">Up to {room.capacity} people</p></article>)}</div></section>
  </main>
}
