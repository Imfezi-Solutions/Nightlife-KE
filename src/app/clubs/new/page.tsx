import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClubAction } from '../actions'

export default async function NewClubPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) redirect('/login')
  const { data: counties } = await supabase.from('counties').select('id,name').order('name')
  const params = await searchParams
  const message = params.error === 'verification'
    ? 'You need completed, valid 18+ verification before creating a club.'
    : params.error ? 'We could not create your club. Check the details and try again.' : ''

  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-10">
    <Link href="/discover" className="text-sm text-zinc-400 hover:text-white">← Back to discovery</Link>
    <div className="glass mt-8 rounded-3xl p-7 sm:p-10">
      <p className="text-xs font-bold uppercase tracking-[.25em] text-lime-300">Create a venue</p>
      <h1 className="mt-3 text-4xl font-black">Start your own scene.</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-400">Your club starts with five spaces: dancefloor, DJ booth, lounge, bar and VIP lounge. The total club capacity is capped at 30 members.</p>
      {message && <p role="alert" className="mt-6 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm text-amber-100">{message}</p>}
      <form action={createClubAction} className="mt-8 space-y-5">
        <label className="block text-sm text-zinc-300">Club name<input name="name" required minLength={3} maxLength={60} placeholder="e.g. After Hours Nairobi" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-lime-300" /></label>
        <label className="block text-sm text-zinc-300">County<select name="county_id" required defaultValue="" className="mt-2 w-full rounded-xl border border-white/10 bg-[#11131b] px-4 py-3"><option value="" disabled>Select county</option>{(counties ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="block text-sm text-zinc-300">Description <span className="text-zinc-500">(optional)</span><textarea name="description" maxLength={500} rows={3} placeholder="What's the vibe?" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-lime-300" /></label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm text-zinc-300">Club type<select name="visibility" defaultValue="public" className="mt-2 w-full rounded-xl border border-white/10 bg-[#11131b] px-4 py-3"><option value="public">Public — discoverable</option><option value="invite_only">Private — invitation code</option></select></label>
          <label className="block text-sm text-zinc-300">Maximum members<select name="capacity" defaultValue="30" className="mt-2 w-full rounded-xl border border-white/10 bg-[#11131b] px-4 py-3">{[10,15,20,25,30].map(n => <option key={n} value={n}>{n} people</option>)}</select></label>
        </div>
        <button className="w-full rounded-xl bg-lime-300 px-5 py-4 font-bold text-black hover:bg-lime-200">Create my club</button>
        <p className="text-xs leading-5 text-zinc-500">Club creation is restricted to accounts with valid, independently confirmed 18+ status.</p>
      </form>
    </div>
  </main>
}
