'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminMfaSetup(){
 const router=useRouter()
 const [factorId,setFactorId]=useState('')
 const [challengeId,setChallengeId]=useState('')
 const [qr,setQr]=useState('')
 const [secret,setSecret]=useState('')
 const [code,setCode]=useState('')
 const [busy,setBusy]=useState(false)
 const [notice,setNotice]=useState('')
 const [ready,setReady]=useState(false)

 async function begin(){
  setBusy(true);setNotice('')
  try{
   const supabase=createClient()
   const {data,error}=await supabase.auth.mfa.listFactors()
   if(error)throw error
   const verified=data.totp.find(item=>item.status==='verified')
   if(verified){
    setFactorId(verified.id)
    const {data:challenge,error:challengeError}=await supabase.auth.mfa.challenge({factorId:verified.id})
    if(challengeError)throw challengeError
    setChallengeId(challenge.id)
    setNotice('Enter the current six-digit code from your authenticator app.')
   }else{
    const {data:enrolled,error:enrollError}=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:'Nightlife KE administrator'})
    if(enrollError)throw enrollError
    setFactorId(enrolled.id);setQr(enrolled.totp.qr_code);setSecret(enrolled.totp.secret)
    const {data:challenge,error:challengeError}=await supabase.auth.mfa.challenge({factorId:enrolled.id})
    if(challengeError)throw challengeError
    setChallengeId(challenge.id)
    setNotice('Scan the QR code with an authenticator app, then enter its six-digit code.')
   }
   setReady(true)
  }catch(error){setNotice(error instanceof Error?error.message:'Could not start MFA setup.')}
  finally{setBusy(false)}
 }

 async function verify(){
  if(!/^\d{6}$/.test(code)) {setNotice('Enter the six-digit code from your authenticator app.');return}
  setBusy(true);setNotice('')
  try{
   const supabase=createClient()
   const {error}=await supabase.auth.mfa.verify({factorId,challengeId,code})
   if(error)throw error
   setNotice('Administrator MFA is active. Refreshing your dashboard…')
   router.refresh()
  }catch(error){setNotice(error instanceof Error?error.message:'The code could not be verified.')}
  finally{setBusy(false)}
 }

 return <section className="glass mt-8 max-w-2xl rounded-3xl border border-lime-300/20 p-6">
  <p className="text-xs font-black uppercase tracking-[.2em] text-lime-300">Required administrator security</p>
  <h2 className="mt-2 text-2xl font-black">Set up two-factor authentication</h2>
  <p className="mt-3 text-sm leading-6 text-zinc-300">Before opening the owner dashboard, protect this account with an authenticator app such as Google Authenticator, Microsoft Authenticator or 1Password.</p>
  {!ready?<button onClick={begin} disabled={busy} className="mt-6 rounded-xl bg-lime-300 px-5 py-3 font-bold text-black disabled:opacity-50">{busy?'Loading…':'Set up / verify authenticator'}</button>:<div className="mt-6 space-y-4">
   {qr&&<div className="rounded-2xl bg-white p-4 text-center"><img src={qr} alt="Authenticator QR code" className="mx-auto h-48 w-48"/><p className="mt-3 break-all text-xs text-zinc-700">Manual setup key: {secret}</p></div>}
   <label className="block text-sm text-zinc-300">Six-digit authenticator code<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-lg tracking-[.4em] text-white"/></label>
   <button onClick={verify} disabled={busy||code.length!==6} className="w-full rounded-xl bg-lime-300 px-5 py-3 font-bold text-black disabled:opacity-50">{busy?'Verifying…':'Verify and secure admin account'}</button>
  </div>}
  {notice&&<p role="status" className="mt-4 text-sm text-zinc-300">{notice}</p>}
 </section>
}
