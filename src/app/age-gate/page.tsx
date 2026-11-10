import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { submitAgeDeclaration } from './actions'

function safeNext(value?: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/age-gate')) return '/discover'
  if (!['/discover', '/clubs', '/wallet'].some((prefix) => value === prefix || value.startsWith(prefix + '/') || value.startsWith(prefix + '?'))) return '/discover'
  return value
}

export default async function AgeGatePage({ searchParams }: { searchParams: Promise<{ next?: string; declined?: string; error?: string }> }) {
  const params = await searchParams
  const next = safeNext(params.next)
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) redirect('/login')

  const { data: declaration } = await supabase.from('age_declarations').select('user_id').eq('user_id', userId).maybeSingle()
  if (declaration) redirect(next)

  return <main className="noise flex min-h-screen items-center justify-center px-5 py-12">
    <section className="glass w-full max-w-lg rounded-[2rem] p-8 sm:p-10">
      <Link href="/" className="text-sm font-black tracking-wider">NIGHTLIFE<span className="text-lime-300"> KE</span></Link>
      {params.declined === '1' ? <>
        <p className="mt-12 text-xs font-bold uppercase tracking-[.25em] text-amber-300">Access not granted</p>
        <h1 className="mt-3 text-3xl font-black">Nightlife KE is for adults.</h1>
        <p className="mt-4 leading-7 text-zinc-300">You selected that you are under 18 or do not wish to make the declaration. You cannot continue into the platform.</p>
        <Link href="/" className="mt-8 inline-flex rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold">Leave Nightlife KE</Link>
      </> : <>
        <p className="mt-12 text-xs font-bold uppercase tracking-[.25em] text-lime-300">18+ age declaration</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Are you 18 or older?</h1>
        <p className="mt-4 leading-7 text-zinc-300">Nightlife KE is intended for adults aged 18 and over. Confirming allows you to enter the discovery experience.</p>
        <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-6 text-amber-100">This is a self-declaration, not proof of age. Club creation, joining clubs, room entry and wallet purchases still require independent age verification.</div>
        {params.error === 'save' && <p role="alert" className="mt-5 text-sm text-red-300">We could not save your declaration. Please try again.</p>}
        <form action={submitAgeDeclaration} className="mt-8 space-y-3">
          <input type="hidden" name="next" value={next} />
          <button type="submit" name="decision" value="yes" className="w-full rounded-xl bg-lime-300 px-5 py-4 font-bold text-black transition hover:bg-lime-200">Yes, I am 18 or older — Enter</button>
          <button type="submit" name="decision" value="no" className="w-full rounded-xl border border-white/15 px-5 py-4 font-semibold text-white hover:bg-white/5">No, I am under 18 — Exit</button>
        </form>
        <p className="mt-6 text-xs leading-5 text-zinc-500">Your confirmation is recorded with a timestamp and policy version. It is stored separately from independent age-verification records.</p>
      </>}
    </section>
  </main>
}
