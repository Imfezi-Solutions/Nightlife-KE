'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
const roles=['platform_admin','moderator','finance_admin','support_admin'] as const
export default function RoleManagement(){
 const router=useRouter()
 const [email,setEmail]=useState('')
 const [role,setRole]=useState<(typeof roles)[number]>('moderator')
 const [busy,setBusy]=useState(false)
 const [notice,setNotice]=useState('')
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setNotice('')
  try{
   const response=await fetch('/api/admin/roles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,role})})
   const data=await response.json()
   if(!response.ok)throw new Error(data.error??'Could not assign role.')
   setNotice('Platform role assigned.');setEmail('');router.refresh()
  }catch(error){setNotice(error instanceof Error?error.message:'Could not assign role.')}
  finally{setBusy(false)}
 }
 return <form onSubmit={submit} className="glass mt-4 grid gap-3 rounded-2xl p-5 sm:grid-cols-[1fr_200px_auto]">
  <label className="text-xs font-bold text-zinc-400">Verified account email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="team@example.com" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white"/></label>
  <label className="text-xs font-bold text-zinc-400">Platform role<select value={role} onChange={e=>setRole(e.target.value as typeof role)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white">{roles.map(item=><option key={item} value={item}>{item.replaceAll('_',' ')}</option>)}</select></label>
  <button disabled={busy} className="self-end rounded-xl bg-lime-300 px-5 py-3 text-sm font-bold text-black disabled:opacity-50">{busy?'Saving…':'Assign role'}</button>
  {notice&&<p role="status" className="text-sm text-zinc-300 sm:col-span-3">{notice}</p>}
 </form>
}
