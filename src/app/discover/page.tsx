import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DiscoverPage() {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) redirect('/login')
  const [{ data: profile }, { data: counties }, { data: clubs }, { data: verification }] = await Promise.all([
    supabase.from('profiles').select('display_name,county_id').eq('id', claims.claims.sub).single(),
    supabase.from('counties').select('id,name').order('name'),
    supabase.from('clubs').select('id,name,slug,description,capacity,county_id').eq('status','active').eq('visibility','public').order('created_at',{ascending:false}).limit(24),
    supabase.from('age_verifications').select('status,expires_at').eq('user_id',claims.claims.sub).eq('status','verified').order('verified_at',{ascending:false}).limit(1).maybeSingle(),
  ])
  const verified = Boolean(verification && (!verification.expires_at || new Date(verification.expires_at) > new Date()))
  const countyMap = new Map((counties ?? []).map((county) => [county.id, county.name]))
  return <main className="min-h-screen px-5 py-8 sm:px-8"><header className="mx-auto flex max-w-7xl items-center justify-between"><Link href="/" className="text-lg font-black">NIGHTLIFE<span className="text-lime-300"> KE</span></Link><span className="text-sm text-zinc-400">Hey, {profile?.display_name || 'there'}</span></header><section className="mx-auto mt-12 max-w-7xl"><div className="flex flex-wrap items-end justify-between gap-6"><div><p className="text-xs font-bold uppercase tracking-[.25em] text-lime-300">Discover your scene</p><h1 className="mt-3 text-4xl font-black sm:text-5xl">Find your people.</h1><p className="mt-3 text-zinc-400">Explore public clubs across Kenya.</p></div><div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm"><span className="text-zinc-400">Age verification</span><p className={verified ? 'mt-1 font-semibold text-lime-300' : 'mt-1 font-semibold text-amber-300'}>{verified ? 'Verified' : 'Required before entry'}</p></div></div>{!verified && <div className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5 text-sm leading-6 text-amber-100">Your profile is ready, but club entry and club creation stay locked until a real age-verification provider confirms that you are 18+. Google sign-in alone is not age verification.</div>}<div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(clubs ?? []).map((club) => <article key={club.id} className="glass rounded-2xl p-6"><p className="text-xs uppercase tracking-wider text-lime-300">{countyMap.get(club.county_id) ?? 'Kenya'}</p><h2 className="mt-3 text-xl font-bold">{club.name}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-zinc-400">{club.description || 'A new Nightlife KE venue.'}</p><div className="mt-5 flex items-center justify-between text-xs text-zinc-500"><span>Room capacity up to {club.capacity}</span><span>Coming online</span></div></article>)}</div>{(!clubs || clubs.length === 0) && <div className="glass mt-6 rounded-2xl p-8 text-center text-zinc-400">No public clubs yet. The first venues are about to open.</div>}<div className="mt-12 rounded-3xl border border-lime-300/15 bg-lime-300/5 p-7"><h2 className="text-2xl font-black">Build your own scene.</h2><p className="mt-2 text-sm text-zinc-400">Club creation and invite-code joining are being wired into the next release.</p></div></section></main>
}
