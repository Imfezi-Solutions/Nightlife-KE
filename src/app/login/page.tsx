'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  async function signIn() {
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` } })
    if (error) { setError(error.message); setLoading(false) }
  }
  return <main className="noise flex min-h-screen items-center justify-center px-5 py-12"><div className="glass w-full max-w-md rounded-[2rem] p-8 sm:p-10"><Link href="/" className="text-sm font-bold tracking-wider">← NIGHTLIFE<span className="text-lime-300"> KE</span></Link><p className="mt-12 text-xs font-bold uppercase tracking-[.25em] text-lime-300">The night starts here</p><h1 className="mt-3 text-4xl font-black tracking-tight">Come on in.</h1><p className="mt-4 leading-7 text-zinc-400">Sign in with Google to set up your profile and discover your scene.</p><button onClick={signIn} disabled={loading} className="mt-9 w-full rounded-xl bg-lime-300 px-5 py-4 font-bold text-black disabled:opacity-60">{loading ? 'Connecting…' : 'Continue with Google'}</button>{error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}<p className="mt-8 text-xs leading-6 text-zinc-500">By continuing, you confirm that you are 18 or older. Google sign-in does not verify your age; access to club features remains restricted until the separate age-verification process is completed.</p></div></main>
}
