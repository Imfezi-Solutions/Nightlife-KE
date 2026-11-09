'use client'

import { useState } from 'react'

type CreditPackage = { id:string; amountKes:number; credits:number }

export default function WalletCheckout({ packages }:{packages:CreditPackage[]}) {
 const [phone,setPhone]=useState('')
 const [packageId,setPackageId]=useState(packages[0]?.id??'')
 const [loading,setLoading]=useState(false)
 const [message,setMessage]=useState('')
 const [reference,setReference]=useState('')
 async function submit(event:React.FormEvent<HTMLFormElement>) {
  event.preventDefault()
  setLoading(true);setMessage('');setReference('')
  try {
   const response=await fetch('/api/payments/initiate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({packageId,phoneNumber:phone})})
   const data=await response.json()
   if(!response.ok)throw new Error(data.error??'Could not start payment.')
   setReference(data.externalReference??'')
   setMessage(data.message??'Payment request sent. Complete the M-Pesa prompt.')
  } catch(error) {
   setMessage(error instanceof Error?error.message:'Could not start payment.')
  } finally { setLoading(false) }
 }
 if(packages.length===0) return <div className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5 text-sm text-amber-100">Credit packages have not been configured yet. Imfezi must approve the KES-to-credit pricing before purchases can be enabled.</div>
 return <form onSubmit={submit} className="glass space-y-4 rounded-2xl p-5">
  <h2 className="text-lg font-bold">Buy credits with M-Pesa</h2>
  <label className="block text-sm text-zinc-300">Credit package
   <select value={packageId} onChange={e=>setPackageId(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#11131b] px-4 py-3 text-white">
    {packages.map(item=><option key={item.id} value={item.id}>{item.credits.toLocaleString()} credits · KES {item.amountKes.toLocaleString()}</option>)}
   </select>
  </label>
  <label className="block text-sm text-zinc-300">M-Pesa phone number
   <input value={phone} onChange={e=>setPhone(e.target.value)} required inputMode="tel" autoComplete="tel" placeholder="07XX XXX XXX" className="mt-2 w-full rounded-xl border border-white/10 bg-[#11131b] px-4 py-3 text-white outline-none focus:border-lime-300/50"/>
  </label>
  <button disabled={loading||!packageId} className="w-full rounded-xl bg-lime-300 px-5 py-3 font-bold text-black disabled:opacity-50">{loading?'Sending STK prompt…':'Continue with M-Pesa'}</button>
  {message&&<p role="status" className="text-sm text-zinc-300">{message}</p>}
  {reference&&<p className="text-xs text-zinc-500">Payment reference: {reference}. Refresh this page after PayHero confirms payment to see your updated balance.</p>}
  <p className="text-xs leading-5 text-zinc-500">Your wallet is credited only after the server verifies the payment status with PayHero. Do not share your M-Pesa PIN with anyone.</p>
 </form>
}
