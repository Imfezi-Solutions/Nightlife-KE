import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) redirect('/login')
  const [{ data: profile }, { data: counties }, { data: clubs }, { data: verification }, { data: adminAssignment }] = await Promise.all([
    supabase.from('profiles').select('display_name,county_id').eq('id', claims.claims.sub).single(),
    supabase.from('counties').select('id,name').order('name'),
    supabase.from('clubs').select('id,name,slug,description,capacity,county_id').eq('status','active').eq('visibility','public').order('created_at',{ascending:false}).limit(24),
    supabase.from('age_verifications').select('status,expires_at').eq('user_id',claims.claims.sub).eq('status','verified').not('verified_at','is',null).gt('expires_at',new Date().toISOString()).order('verified_at',{ascending:false}).limit(1).maybeSingle(),
    supabase.from('platform_admins').select('role').eq('user_id',claims.claims.sub).maybeSingle(),
  ])
  const params = await searchParams
  const verified = Boolean(verification && verification.expires_at && new Date(verification.expires_at) > new Date())
  const countyMap = new Map((counties ?? []).map((county) => [county.id, county.name]))
  const errorMessage = params.error === 'verification' || params.error === 'age_verification_required'
    ? 'Independent 18+ age verification is required before joining a club, entering a room or using the wallet.'
    : params.error ? 'We could not complete that action. Check the club details and try again.' : ''
  return <main className="min-h-screen px-5 py-8 sm:px-8">
    <header className="mx-auto flex max-w-7xl items-center justify-between"><Link href="/" className="text-lg font-black">NIGHTLIFE<span className="text-lime-300"> KE</span></Link><div className="flex items-center gap-4"><Link href="/wallet" className="text-sm font-semibold text-lime-200 hover:text-lime-100">Wallet</Link>{adminAssignment&&<Link href="/admin" className="text-sm font-semibold text-violet-200 hover:text-violet-100">Admin</Link>}<span className="text-sm text-zinc-400">Hey, {profile?.display_name || 'there'}</span></div></header>
    <section className="mx-auto mt-12 max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-6"><div><p className="text-xs font-bold uppercase tracking-[.25em] text-lime-300">Discover your scene</p><h1 className="mt-3 text-4xl font-black sm:text-5xl">Find your people.</h1><p className="mt-3 text-zinc-400">Explore public clubs across Kenya.</p></div><div className="flex items-center gap-3"><div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm"><span className="text-zinc-400">Independent age verification</span><p className={verified ? 'mt-1 font-semibold text-lime-300' : 'mt-1 font-semibold text-amber-300'}>{verified ? 'Verified' : 'Still required for restricted features'}</p></div><Link href="/clubs/new" className="rounded-xl bg-lime-300 px-5 py-4 text-sm font-bold text-black">Create a club</Link></div></div>
      {!verified && <div className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5 text-sm leading-6 text-amber-100">Your 18+ declaration lets you explore discovery. It is not age verification. Club creation, joining clubs, entering rooms and wallet purchases remain locked until an independent age-verification provider confirms your age.</div>}
      {errorMessage && <p role="alert" className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm text-amber-100">{errorMessage}</p>}
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(clubs ?? []).map((club) => <article key={club.id} className="glass rounded-2xl p-6"><p className="text-xs uppercase tracking-wider text-lime-300">{countyMap.get(club.county_id) ?? 'Kenya'}</p><h2 className="mt-3 text-xl font-bold">{club.name}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-zinc-400">{club.description || 'A new Nightlife KE venue.'}</p><div className="mt-5 flex items-center justify-between text-xs text-zinc-500"><span>Up to {club.capacity} members</span><Link href={verified ? `/clubs/${club.id}` : '/discover?error=verification'} className="font-semibold text-lime-200 hover:text-lime-100">{verified ? 'View club →' : 'Age check required'}</Link></div></article>)}</div>
      {(!clubs || clubs.length === 0) && <div className="glass mt-6 rounded-2xl p-8 text-center text-zinc-400">No public clubs yet. The first venues are about to open.</div>}
      <div className="mt-12 rounded-3xl border border-lime-300/15 bg-lime-300/5 p-7"><h2 className="text-2xl font-black">Build your own scene.</h2><p className="mt-2 text-sm text-zinc-400">Create a public venue or a private club for your invited crew. Independent age verification is required.</p></div>
    </section>
  </main>
}
