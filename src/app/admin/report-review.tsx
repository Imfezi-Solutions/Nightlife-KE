'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
type Report={id:string;club_id:string;reporter_id:string;reported_user_id:string;reason:string;details:string|null;status:string;created_at:string}
export default function ReportReview({reports}:{reports:Report[]}){
 const router=useRouter()
 const [busy,setBusy]=useState<string|null>(null)
 const [message,setMessage]=useState('')
 async function update(id:string,status:'reviewing'|'resolved'|'dismissed'){
  setBusy(id);setMessage('')
  try{
   const response=await fetch('/api/admin/reports/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})})
   const data=await response.json()
   if(!response.ok)throw new Error(data.error??'Could not update report.')
   setMessage('Report status updated.');router.refresh()
  }catch(error){setMessage(error instanceof Error?error.message:'Could not update report.')}
  finally{setBusy(null)}
 }
 if(!reports.length)return <p className="rounded-2xl border border-white/10 p-5 text-sm text-zinc-500">No reports in the moderation queue.</p>
 return <div className="space-y-3">{reports.map(report=><article key={report.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
  <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold capitalize">{report.reason.replaceAll('_',' ')}</p><span className="rounded-full bg-white/5 px-3 py-1 text-xs capitalize text-zinc-300">{report.status}</span></div>
  {report.details&&<p className="mt-3 text-sm leading-6 text-zinc-300">{report.details}</p>}
  <p className="mt-3 text-xs text-zinc-500">Club {report.club_id.slice(0,8)} · reported user {report.reported_user_id.slice(0,8)} · {new Date(report.created_at).toLocaleString()}</p>
  <div className="mt-4 flex flex-wrap gap-2">{(['reviewing','resolved','dismissed'] as const).map(status=><button key={status} disabled={busy===report.id||report.status===status} onClick={()=>void update(report.id,status)} className="rounded-lg border border-white/10 px-3 py-2 text-xs capitalize text-zinc-200 disabled:opacity-40">{busy===report.id?'Saving…':status}</button>)}</div>
 </article>)}{message&&<p role="status" className="text-sm text-zinc-300">{message}</p>}</div>
}
