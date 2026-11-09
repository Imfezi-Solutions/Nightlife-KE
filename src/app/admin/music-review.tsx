'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
type Track={id:string;room_id:string;title:string;artist:string|null;source_type:string;rights_reference:string;created_at:string}
export default function MusicReview({tracks}:{tracks:Track[]}){
 const router=useRouter()
 const [busy,setBusy]=useState<string|null>(null)
 const [notice,setNotice]=useState('')
 async function review(id:string,status:'approved'|'rejected'){
  setBusy(id);setNotice('')
  try{
   const response=await fetch('/api/admin/music/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})})
   const data=await response.json()
   if(!response.ok)throw new Error(data.error??'Could not review track.')
   setNotice('Track rights status updated and recorded in the audit trail.');router.refresh()
  }catch(error){setNotice(error instanceof Error?error.message:'Could not review track.')}
  finally{setBusy(null)}
 }
 if(!tracks.length)return <p className="rounded-2xl border border-white/10 p-5 text-sm text-zinc-500">No tracks awaiting rights review.</p>
 return <div className="space-y-3">{tracks.map(track=><article key={track.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
  <p className="font-bold">{track.title}{track.artist?' — '+track.artist:''}</p>
  <p className="mt-1 text-xs text-zinc-500">{track.source_type.replaceAll('_',' ')} · room {track.room_id.slice(0,8)} · {new Date(track.created_at).toLocaleString()}</p>
  <p className="mt-3 break-words text-sm text-zinc-300">Rights evidence: {track.rights_reference}</p>
  <div className="mt-4 flex gap-2"><button disabled={busy===track.id} onClick={()=>void review(track.id,'approved')} className="rounded-lg bg-lime-300 px-4 py-2 text-xs font-bold text-black disabled:opacity-40">Approve rights</button><button disabled={busy===track.id} onClick={()=>void review(track.id,'rejected')} className="rounded-lg border border-red-300/20 px-4 py-2 text-xs text-red-200 disabled:opacity-40">Reject</button></div>
 </article>)}{notice&&<p role="status" className="text-sm text-zinc-300">{notice}</p>}</div>
}
