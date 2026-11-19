import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VerifyAgeButton from './verify-age-button'

export default async function VerifyAgePage({ searchParams }: { searchParams: Promise<{ returned?: string }> }) {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) redirect('/login')

  const { data: verification } = await supabase
    .from('age_verifications')
    .select('status,expires_at,created_at')
    .eq('user_id', userId)
    .eq('provider', 'didit')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const params = await searchParams
  const verified = verification?.status === 'verified' &&
    Boolean(verification.expires_at && new Date(verification.expires_at) > new Date())

  const statusMessage = verified
    ? 'Your age has been independently verified. Restricted Nightlife KE features are now available.'
    : verification?.status === 'rejected'
      ? 'Didit could not approve this verification. Your restricted features remain locked.'
      : verification?.status === 'expired'
        ? 'Your previous verification session expired. Start a new check when you are ready.'
        : verification?.status === 'pending'
          ? params.returned === '1'
            ? 'We received your return from Didit. Your result is being confirmed securely. Refresh this page in a moment.'
            : 'Your verification is pending. Complete the secure check or return here after finishing.'
          : 'Complete an independent 18+ identity check to unlock club creation, club membership, room entry and wallet purchases.'

  return <main className="noise flex min-h-screen items-center justify-center px-5 py-12">
    <section className="glass w-full max-w-xl rounded-[2rem] p-8 sm:p-10">
      <Link href="/discover" className="text-sm font-black tracking-wider">NIGHTLIFE<span className="text-lime-300"> KE</span></Link>
      <p className="mt-12 text-xs font-bold uppercase tracking-[.25em] text-lime-300">Independent age verification</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">Confirm you're 18+.</h1>
      <p className="mt-4 leading-7 text-zinc-300">Nightlife KE uses Didit to check your identity document, date of birth and liveness. Your self-declaration alone cannot unlock restricted features.</p>
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm leading-6 text-zinc-200">{statusMessage}</div>
      {verified ? (
        <Link href="/discover" className="mt-8 block w-full rounded-xl bg-lime-300 px-5 py-4 text-center font-bold text-black">Return to discovery</Link>
      ) : (
        <div className="mt-8"><VerifyAgeButton /></div>
      )}
      <p className="mt-6 text-xs leading-5 text-zinc-500">Your identity documents and selfie are processed by Didit. Nightlife KE stores the provider session reference and verification status, not copies of your ID or selfie.</p>
      <Link href="/discover" className="mt-6 inline-block text-sm text-zinc-400 hover:text-white">← Back to discovery</Link>
    </section>
  </main>
}
