import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { joinClubAction } from '../clubs/actions'

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ error?: string; county?: string }> }) {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) redirect('/login')
  const params = await searchParams
  const selectedCounty = params.county && /^\d+$/.test(params.county) ? Number(params.county) : null
  let clubsQuery = supabase.from('clubs')
    .select('id,name,slug,description,capacity,county_id')
    .eq('status','active')
    .eq('visibility','public')
    .order('created_at',{ascending:false})
    .limit(500)
  if (selectedCounty) clubsQuery = clubsQuery.eq('county_id', selectedCounty)
  const [{ data: profile }, { data: counties }, { data: clubs }, { data: memberships }, { data: adminAssignment }] = await Promise.all([
    supabase.from('profiles').select('display_name,county_id').eq('id', userId).single(),
    supabase.from('counties').select('id,name').order('name'),
    clubsQuery,
    supabase.from('club_members').select('club_id').eq('user_id', userId),
    supabase.from('platform_admins').select('role').eq('user_id',userId).maybeSingle(),
  ])
  const countyMap = new Map((counties ?? []).map((county) => [county.id, county.name]))
  const memberClubIds = new Set((memberships ?? []).map((membership) => membership.club_id))
  const errorMessage = params.error === 'verification' || params.error === 'age_verification_required'
    ? 'Age verification is temporarily paused. Please try the action again.'
    : params.error ? 'We could not complete that action. Check the club details and try again.' : ''
  return <main className="min-h-screen px-5 py-8 sm:px-8">
    <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4"><Link href="/" className="text-lg font-black">NIGHTLIFE<span className="text-lime-300"> KE</span></Link><nav className="flex items-center gap-4 text-sm"><Link href="/community" className="font-semibold text-lime-200 hover:text-lime-100">Social home</Link><Link href="/discover" className="text-zinc-300 hover:text-white">Clubs</Link><Link href="/wallet" className="text-zinc-300 hover:text-white">Wallet</Link>{adminAssignment&&<Link href="/admin" className="text-sm font-semibold text-violet-200 hover:text-violet-100">Admin</Link>}<span className="text-sm text-zinc-400">Hey, {profile?.display_name || 'there'}</span></nav></header>
    <section className="mx-auto mt-12 max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-6"><div><p className="text-xs font-bold uppercase tracking-[.25em] text-lime-300">Discover your scene</p><h1 className="mt-3 text-4xl font-black sm:text-5xl">Find your people.</h1><p className="mt-3 max-w-2xl text-zinc-400">Explore and join public clubs anywhere in Kenya. Your home county does not limit where you can go.</p></div><div className="flex items-center gap-3"><div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm"><span className="text-zinc-400">Age verification</span><p className="mt-1 font-semibold text-amber-300">Temporarily paused</p></div><Link href="/clubs/new" className="rounded-xl bg-lime-300 px-5 py-4 text-sm font-bold text-black">Create a club</Link></div></div>
      {errorMessage && <p role="alert" className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm text-amber-100">{errorMessage}</p>}
      <form method="get" className="mt-9 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-end">
        <label className="flex-1 text-xs font-semibold text-zinc-300">Explore by county
          <select name="county" defaultValue={selectedCounty ? String(selectedCounty) : 'all'} className="mt-2 w-full rounded-xl border border-white/10 bg-[#151321] px-4 py-3 text-sm text-white">
            <option value="all">All counties in Kenya</option>
            {(counties ?? []).map((county) => <option key={county.id} value={county.id}>{county.name}</option>)}
          </select>
        </label>
        <button className="rounded-xl border border-lime-300/30 px-6 py-3 text-sm font-bold text-lime-200 hover:bg-lime-300/10">Show clubs</button>
        {selectedCounty && <Link href="/discover" className="px-3 py-3 text-center text-sm text-zinc-400 hover:text-white">Clear filter</Link>}
      </form>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-black">{selectedCounty ? 'Clubs in ' + (countyMap.get(selectedCounty) ?? 'selected county') : 'Public clubs across Kenya'}</h2><span className="text-xs text-zinc-500">{clubs?.length ?? 0} clubs shown</span></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(clubs ?? []).map((club) => {
        const isMember = memberClubIds.has(club.id)
        return <article key={club.id} className="glass flex flex-col rounded-2xl p-6"><p className="text-xs uppercase tracking-wider text-lime-300">{countyMap.get(club.county_id) ?? 'Kenya'}</p><h2 className="mt-3 text-xl font-bold">{club.name}</h2><p className="mt-2 min-h-12 flex-1 text-sm leading-6 text-zinc-400">{club.description || 'A new Nightlife KE venue.'}</p><div className="mt-5 flex items-center justify-between text-xs text-zinc-500"><span>Up to {club.capacity} members</span><span>{isMember ? 'Member' : 'Open to join'}</span></div><div className="mt-4 flex gap-2">{isMember ? <Link href={`/clubs/${club.id}`} className="flex-1 rounded-xl border border-lime-300/30 px-4 py-3 text-center text-sm font-bold text-lime-200">View & enter club →</Link> : <><Link href={`/clubs/${club.id}`} className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-semibold text-zinc-200 hover:bg-white/5">Details</Link><form action={joinClubAction}><input type="hidden" name="club_id" value={club.id}/><button className="rounded-xl bg-lime-300 px-4 py-3 text-sm font-bold text-black hover:bg-lime-200">Join club</button></form></>}</div></article>
      })}</div>
      {(!clubs || clubs.length === 0) && <div className="glass mt-6 rounded-2xl p-8 text-center text-zinc-400">No public clubs found here yet. Try another county or view all counties.</div>}
      <div className="mt-12 rounded-3xl border border-lime-300/15 bg-lime-300/5 p-7"><h2 className="text-2xl font-black">Build your own scene.</h2><p className="mt-2 text-sm text-zinc-400">Create a public venue or a private club for your invited crew. You can still explore and join public clubs across all 47 counties.</p></div>
    </section>
  </main>
}
