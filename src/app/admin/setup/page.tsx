'use client'
import Link from 'next/link'
import { useState } from 'react'
export default function AdminSetupPage(){
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 async function bootstrap(){
  setBusy(true);setMessage('')
  try{const response=await fetch('/api/admin/bootstrap',{method:'POST'});const data=await response.json();if(!response.ok)throw new Error(data.error??'Setup failed.');setMessage(data.message??'Administrator configured.')}
  catch(error){setMessage(error instanceof Error?error.message:'Setup failed.')}
  finally{setBusy(false)}
 }
 return <main className="flex min-h-screen items-center justify-center px-5"><section className="glass w-full max-w-lg rounded-3xl p-8"><p className="text-xs font-black uppercase tracking-[.25em] text-lime-300">Nightlife KE</p><h1 className="mt-4 text-3xl font-black">Initial admin setup</h1><p className="mt-3 text-sm leading-6 text-zinc-400">Only the verified email configured in the server variable NIGHTLIFE_INITIAL_SUPER_ADMIN_EMAIL can claim the first super-administrator role. Once an administrator exists, this bootstrap route cannot grant another first-admin account.</p><button onClick={()=>void bootstrap()} disabled={busy} className="mt-7 w-full rounded-xl bg-lime-300 px-5 py-3 font-bold text-black disabled:opacity-50">{busy?'Checking account…':'Set up initial administrator'}</button>{message&&<p role="status" className="mt-4 text-sm text-zinc-300">{message}</p>}<Link href="/discover" className="mt-5 block text-center text-sm text-zinc-400">Back to discovery</Link></section></main>
}
