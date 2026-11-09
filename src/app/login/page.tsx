'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    const requestedNext = searchParams.get('next') ?? '/onboarding'
    const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/onboarding'
    window.location.assign(next)
  }

  const authError = searchParams.get('error')
  return <main className="noise flex min-h-screen items-center justify-center px-5 py-12"><div className="glass w-full max-w-md rounded-[2rem] p-8 sm:p-10">
    <Link href="/" className="text-sm font-bold tracking-wider">← NIGHTLIFE<span className="text-lime-300"> KE</span></Link>
    <p className="mt-12 text-xs font-bold uppercase tracking-[.25em] text-lime-300">The night starts here</p>
    <h1 className="mt-3 text-4xl font-black tracking-tight">Come on in.</h1>
    <p className="mt-4 leading-7 text-zinc-400">Sign in with your email and password to discover your scene.</p>
    {authError && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{authError === 'configuration' ? 'Authentication is not configured correctly. Please try again later.' : 'Your sign-in link could not be verified. Please sign in again.'}</p>}
    <form onSubmit={signIn} className="mt-8 space-y-4">
      <label className="block text-sm text-zinc-300">Email address<input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-lime-300" placeholder="you@example.com" /></label>
      <label className="block text-sm text-zinc-300">Password<input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-lime-300" placeholder="Your password" /></label>
      <button type="submit" disabled={loading} className="w-full rounded-xl bg-lime-300 px-5 py-4 font-bold text-black disabled:opacity-60">{loading ? 'Signing in…' : 'Sign in'}</button>
    </form>
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
    <p className="mt-6 text-center text-sm text-zinc-400">New to Nightlife KE? <Link href="/signup" className="font-semibold text-lime-300 hover:underline">Create an account</Link></p>
    <p className="mt-8 text-xs leading-6 text-zinc-500">Nightlife KE is for adults aged 18 and over. Account registration does not itself verify your age; access to clubs remains restricted until independent age verification is completed.</p>
  </div></main>
}
