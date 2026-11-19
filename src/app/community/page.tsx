import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function CommunityPage() {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) redirect('/login?next=/community')

  const [{ data: profile }, { data: memberships }, { data: counties }] = await Promise.all([
    supabase.from('profiles').select('display_name,username,county_id').eq('id', userId).maybeSingle(),
    supabase.from('club_members').select('club_id,role').eq('user_id', userId),
    supabase.from('counties').select('id,name').order('name'),
  ])
  const clubIds = (memberships ?? []).map(item => item.club_id)
  const [{ data: myClubs }, { data: publicClubs }] = await Promise.all([
    clubIds.length ? supabase.from('clubs').select('id,name,description,county_id,visibility').in('id', clubIds).order('name') : Promise.resolve({ data: [] }),
    supabase.from('clubs').select('id,name,description,county_id').eq('status','active').eq('visibility','public').order('created_at',{ascending:false}).limit(6),
  ])
  const countyNames = new Map((counties ?? []).map(item => [item.id, item.name]))
  const name = profile?.display_name || profile?.username || 'there'
  const myClubIds = new Set(clubIds)
  const suggested = (publicClubs ?? []).filter(club => !myClubIds.has(club.id))

  return <main className="min-h-screen px-5 py-8 sm:px-8">
    <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4"><Link href="/" className="text-lg font-black">NIGHTLIFE<span className="text-lime-300"> KE</span></Link><nav className="flex flex-wrap items-center gap-4 text-sm"><Link href="/community" className="font-semibold text-lime-200">Home</Link><Link href="/discover" className="text-zinc-300 hover:text-white">Discover</Link><Link href="/clubs/new" className="text-zinc-300 hover:text-white">Create a club</Link><Link href="/wallet" className="text-zinc-300 hover:text-white">Wallet</Link></nav></header>
    <section className="mx-auto mt-12 max-w-7xl">
      <div className="glass relative overflow-hidden rounded-[2rem] p-7 sm:p-10"><div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-lime-300/10 blur-3xl"/><p className="relative text-xs font-bold uppercase tracking-[.25em] text-lime-300">Your social world</p><h1 className="relative mt-3 text-4xl font-black sm:text-5xl">Good to see you, {name}.</h1><p className="relative mt-3 max-w-2xl leading-7 text-zinc-400">Your home for communities, new connections and shared experiences. Explore beyond your county and find somewhere you belong.</p><div className="relative mt-7 flex flex-wrap gap-3"><Link href="/discover" className="rounded-xl bg-lime-300 px-5 py-3 font-bold text-black">Discover people & clubs →</Link><Link href="/clubs/new" className="rounded-xl border border-white/15 px-5 py-3 font-semibold">Create your community</Link></div></div>

      <section className="mt-10"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-lime-300">Your circles</p><h2 className="mt-2 text-2xl font-black">Communities you belong to</h2></div><Link href="/discover" className="text-sm font-semibold text-lime-200">Explore all clubs →</Link></div>
        {(myClubs ?? []).length ? <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(myClubs ?? []).map(club=><article key={club.id} className="glass rounded-2xl p-6"><p className="text-xs uppercase tracking-wider text-lime-300">{countyNames.get(club.county_id) ?? 'Kenya'} · {club.visibility === 'public' ? 'Public' : 'Private'}</p><h3 className="mt-3 text-xl font-bold">{club.name}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-zinc-400">{club.description || 'Your community is waiting.'}</p><Link href={'/clubs/'+club.id} className="mt-5 inline-flex rounded-xl border border-lime-300/25 px-4 py-3 text-sm font-bold text-lime-200">Open community →</Link></article>)}</div> : <div className="mt-5 rounded-2xl border border-dashed border-white/15 p-8 text-center"><p className="font-semibold">Your circle starts here.</p><p className="mt-2 text-sm text-zinc-400">Join a public club or create a private space for your people.</p><Link href="/discover" className="mt-5 inline-flex rounded-xl bg-lime-300 px-5 py-3 text-sm font-bold text-black">Find your first community</Link></div>}
      </section>

      <section className="mt-12"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-lime-300">Across Kenya</p><h2 className="mt-2 text-2xl font-black">Communities to explore</h2><p className="mt-2 text-sm text-zinc-400">Your location does not limit who you can meet.</p></div><Link href="/discover" className="text-sm font-semibold text-lime-200">Browse all 47 counties →</Link></div>
        {suggested.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{suggested.map(club=><article key={club.id} className="glass rounded-2xl p-6"><p className="text-xs uppercase tracking-wider text-lime-300">{countyNames.get(club.county_id) ?? 'Kenya'}</p><h3 className="mt-3 text-xl font-bold">{club.name}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-zinc-400">{club.description || 'Meet new people and find your crowd.'}</p><Link href={'/clubs/'+club.id} className="mt-5 inline-flex rounded-xl bg-lime-300 px-4 py-3 text-sm font-bold text-black">Meet this community →</Link></article>)}</div> : <div className="mt-5 rounded-2xl border border-white/10 p-7 text-sm text-zinc-400">You are already part of the public clubs shown here, or new clubs are still being created. Explore all counties to see more.</div>}
      </section>
      <section className="mt-12 grid gap-4 sm:grid-cols-3"><article className="glass rounded-2xl p-6"><span className="text-2xl">◎</span><h3 className="mt-3 font-bold">Meet people</h3><p className="mt-2 text-sm leading-6 text-zinc-400">Get to know the members of communities you join and build your circle.</p></article><article className="glass rounded-2xl p-6"><span className="text-2xl">♫</span><h3 className="mt-3 font-bold">Experience together</h3><p className="mt-2 text-sm leading-6 text-zinc-400">Enter shared 3D venues with music, dancing, DJs, lounges and a live atmosphere.</p></article><article className="glass rounded-2xl p-6"><span className="text-2xl">✦</span><h3 className="mt-3 font-bold">Create a space</h3><p className="mt-2 text-sm leading-6 text-zinc-400">Start a club, invite your friends and grow a community around your interests.</p></article></section>
    </section>
  </main>
}
