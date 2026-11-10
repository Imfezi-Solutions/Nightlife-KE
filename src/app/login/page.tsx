'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [authError, setAuthError] = useState('')
  useEffect(() => { setAuthError(new URLSearchParams(window.location.search).get('error') ?? '') }, [])
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmationSent, setConfirmationSent] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()

    if (mode === 'signup') {
      if (password.length < 8) {
        setError('Use a password with at least 8 characters.')
        setLoading(false)
        return
      }
      if (password !== confirmPassword) {
        setError('The passwords do not match.')
        setLoading(false)
        return
      }
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
      })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      setConfirmationSent(true)
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    const requestedNext = new URLSearchParams(window.location.search).get('next') ?? '/onboarding'
    const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/onboarding'
    window.location.assign(next)
  }

  return <main className="noise flex min-h-screen items-center justify-center px-5 py-12"><div className="glass w-full max-w-md rounded-[2rem] p-8 sm:p-10">
    <Link href="/" className="text-sm font-bold tracking-wider">← NIGHTLIFE<span className="text-lime-300"> KE</span></Link>
    {confirmationSent ? <>
      <p className="mt-12 text-xs font-bold uppercase tracking-[.25em] text-lime-300">One more step</p>
      <h1 className="mt-3 text-3xl font-black">Check your email.</h1>
      <p className="mt-4 leading-7 text-zinc-300">We sent a confirmation link to <strong>{email}</strong>. Open it to verify your email and finish creating your account.</p>
      <p className="mt-6 text-sm text-zinc-400">After confirming, you'll return to Nightlife KE to set up your profile.</p>
      <button onClick={() => { setConfirmationSent(false); setMode('signin') }} className="mt-8 w-full rounded-xl bg-lime-300 px-5 py-4 font-bold text-black">Back to sign in</button>
    </> : <>
      <p className="mt-12 text-xs font-bold uppercase tracking-[.25em] text-lime-300">{mode === 'signin' ? 'The night starts here' : 'Join the scene'}</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">{mode === 'signin' ? 'Come on in.' : 'Create your account.'}</h1>
      <p className="mt-4 leading-7 text-zinc-400">{mode === 'signin' ? 'Sign in with your email and password to discover your scene.' : 'Register with your email address and create a secure password.'}</p>
      {authError && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{authError === 'configuration' ? 'Authentication is not configured correctly. Please try again later.' : 'Your confirmation link could not be verified. Please sign in again.'}</p>}
      <form onSubmit={submit} className="mt-8 space-y-4">
        <label className="block text-sm text-zinc-300">Email address<input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-lime-300" placeholder="you@example.com" /></label>
        <label className="block text-sm text-zinc-300">Password<input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={mode === 'signup' ? 8 : undefined} required value={password} onChange={event => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-lime-300" placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'} /></label>
        {mode === 'signup' && <label className="block text-sm text-zinc-300">Confirm password<input type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-lime-300" placeholder="Enter your password again" /></label>}
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-lime-300 px-5 py-4 font-bold text-black disabled:opacity-60">{loading ? (mode === 'signin' ? 'Signing in…' : 'Creating account…') : (mode === 'signin' ? 'Sign in' : 'Create account')}</button>
      </form>
      {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
      <p className="mt-6 text-center text-sm text-zinc-400">{mode === 'signin' ? 'New to Nightlife KE?' : 'Already have an account?'} <button type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError('') }} className="font-semibold text-lime-300 hover:underline">{mode === 'signin' ? 'Create an account' : 'Sign in'}</button></p>
      <p className="mt-8 text-xs leading-6 text-zinc-500">Nightlife KE is for adults aged 18 and over. Account registration does not itself verify your age; access to clubs remains restricted until independent age verification is completed.</p>
    </>}
  </div></main>
}
