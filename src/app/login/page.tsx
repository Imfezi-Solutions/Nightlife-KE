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
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [termsChecked, setTermsChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmationSent, setConfirmationSent] = useState(false)

  async function resendConfirmation() {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: 'https://nightlife-ke.vercel.app/auth/callback?next=/onboarding' },
    })
    if (error) setError(error.message)
    else setError('A fresh confirmation email has been sent. Use the newest email only.')
    setLoading(false)
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()

    if (mode === 'signup') {
      if (!acceptedTerms) {
        setShowTerms(true)
        setLoading(false)
        return
      }
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
        options: {
          emailRedirectTo: 'https://nightlife-ke.vercel.app/auth/callback?next=/onboarding',
          data: { terms_accepted: true, terms_version: '2026-11-18-v1', terms_accepted_at: new Date().toISOString() },
        },
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
      <button onClick={resendConfirmation} disabled={loading} className="mt-4 w-full rounded-xl border border-lime-300/40 px-5 py-3 font-semibold text-lime-200 disabled:opacity-60">{loading ? 'Sending…' : 'Resend confirmation email'}</button>
      {error && <p role="status" className="mt-4 text-sm text-zinc-300">{error}</p>}
      <button onClick={() => { setConfirmationSent(false); setMode('signin') }} className="mt-8 w-full rounded-xl bg-lime-300 px-5 py-4 font-bold text-black">Back to sign in</button>
    </> : <>
      <p className="mt-12 text-xs font-bold uppercase tracking-[.25em] text-lime-300">{mode === 'signin' ? 'The night starts here' : 'Join the scene'}</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">{mode === 'signin' ? 'Come on in.' : 'Create your account.'}</h1>
      <p className="mt-4 leading-7 text-zinc-400">{mode === 'signin' ? 'Sign in with your email and password to discover your scene.' : 'Register with your email address and create a secure password.'}</p>
      {authError && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{authError === 'configuration' ? 'Authentication is not configured correctly. Please try again later.' : 'Your confirmation link could not be verified. Please sign in again.'}</p>}
      <form onSubmit={submit} className="mt-8 space-y-4">
        <label className="block text-sm text-zinc-300">Email address<input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-lime-300" placeholder="you@example.com" /></label>
        <label className="block text-sm text-zinc-300">Password<input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={mode === 'signup' ? 8 : undefined} required value={password} onChange={event => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-lime-300" placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'} /></label>
        {mode === 'signup' && <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-zinc-300"><p>{acceptedTerms ? '✓ You have accepted the Terms and Conditions.' : 'Before joining the scene, review and accept our Terms and Conditions.'}</p><button type="button" onClick={() => { setTermsChecked(acceptedTerms); setShowTerms(true) }} className="mt-2 font-semibold text-lime-300 underline">{acceptedTerms ? 'Review terms' : 'Read and accept terms'}</button></div>}
        {mode === 'signup' && <label className="block text-sm text-zinc-300">Confirm password<input type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-lime-300" placeholder="Enter your password again" /></label>}
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-lime-300 px-5 py-4 font-bold text-black disabled:opacity-60">{loading ? (mode === 'signin' ? 'Signing in…' : 'Creating account…') : (mode === 'signin' ? 'Sign in' : 'Create account')}</button>
      </form>
      {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
      <p className="mt-6 text-center text-sm text-zinc-400">{mode === 'signin' ? 'New to Nightlife KE?' : 'Already have an account?'} <button type="button" onClick={() => { const nextMode = mode === 'signin' ? 'signup' : 'signin'; setMode(nextMode); setError(''); if (nextMode === 'signup' && !acceptedTerms) { setTermsChecked(false); setShowTerms(true) } }} className="font-semibold text-lime-300 hover:underline">{mode === 'signin' ? 'Create an account' : 'Sign in'}</button></p>
      <p className="mt-8 text-xs leading-6 text-zinc-500">Nightlife KE is an adults-only social platform. Independent identity verification is temporarily paused; users must still follow the Terms and Conditions and applicable laws.</p>
    </>}
    {showTerms && mode === 'signup' && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="signup-terms-title">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-lime-300/20 bg-[#11120f] shadow-2xl shadow-black/60">
        <div className="border-b border-white/10 px-6 py-5 sm:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[.25em] text-lime-300">Before you enter</p>
          <h2 id="signup-terms-title" className="mt-2 text-2xl font-black text-white sm:text-3xl">The Nightlife KE agreement</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">A social space for meeting people, sharing moments and enjoying clubs. These rules help keep the scene safe and respectful.</p>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5 text-sm leading-6 text-zinc-300 sm:px-8">
          <section><h3 className="font-bold text-white">18+ only</h3><p>Nightlife KE is strictly for adults aged 18 and above. By continuing, you confirm that you are at least 18. Do not lie about your age or create an account for a minor. Any pause in identity verification does not lower this age requirement.</p></section>
          <section><h3 className="font-bold text-white">Be real. Be respectful.</h3><p>Use information that does not mislead other members. Do not impersonate people, harass, threaten, bully, stalk, discriminate against, exploit or defraud anyone. Respect boundaries and stop contacting someone who asks you to stop.</p></section>
          <section><h3 className="font-bold text-white">Your profile, posts and messages</h3><p>You are responsible for what you post, upload, send or share, including photos, comments, profile details and private messages. Only share content you have the right and permission to use. Do not share another person's private information, intimate material, image or recordings without their consent. Do not post illegal, hateful, violent, sexually exploitative or otherwise harmful content.</p></section>
          <section><h3 className="font-bold text-white">Friends, follows and private conversations</h3><p>Friend requests, follows and messages are features for genuine social interaction, not permission to spam or pressure other members. Do not use the platform to solicit, scam, threaten or repeatedly contact people against their wishes. You can choose who you interact with and should report conduct that makes you feel unsafe.</p></section>
          <section><h3 className="font-bold text-white">Clubs, rooms and events</h3><p>Follow club rules and instructions from authorised hosts and moderators. Club owners and event organisers are responsible for managing their spaces. Do not disrupt events, evade moderation, misuse DJ or bartender tools, or use clubs to arrange unlawful activity.</p></section>
          <section><h3 className="font-bold text-white">Safety, moderation and enforcement</h3><p>We may review reports, remove content, restrict features or suspend accounts when needed to protect members, enforce these rules or comply with the law. Do not attempt to hack, disrupt, scrape, abuse or interfere with Nightlife KE or another member's account.</p></section>
          <section><h3 className="font-bold text-white">Payments and virtual features</h3><p>Check the price and details shown before making a purchase. You are responsible for payments you authorise. Virtual credits and items are not cash and cannot be exchanged for money unless we expressly say otherwise. Refunds and disputes are handled under applicable law and payment-provider rules.</p></section>
          <section><h3 className="font-bold text-white">Your data and changes to these terms</h3><p>Our <Link href="/privacy" className="text-lime-300 underline">Privacy Policy</Link> explains how personal information is handled. We may update features or these terms and may restrict or discontinue the service. The full <Link href="/terms" target="_blank" className="text-lime-300 underline">Terms and Conditions</Link> apply alongside this summary.</p></section>
          <p className="text-xs text-zinc-500">Effective 19 November 2026 · Questions: imfezisolutions@outlook.com</p>
        </div>
        <div className="border-t border-white/10 bg-black/20 px-6 py-5 sm:px-8">
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-white"><input type="checkbox" checked={termsChecked} onChange={event => setTermsChecked(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-lime-300" /><span>I confirm that I am 18 or older, have read these terms, and agree to the Nightlife KE Terms and Conditions and Privacy Policy.</span></label>
          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setShowTerms(false)} className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-zinc-300 hover:bg-white/5">Not now</button>
            <button type="button" disabled={!termsChecked} onClick={() => { setAcceptedTerms(true); setShowTerms(false); setError('') }} className="rounded-xl bg-lime-300 px-6 py-3 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-40">I agree — continue</button>
          </div>
        </div>
      </div>
    </div>}
  </div></main>
}
