import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminMfaSetup from './role-management'
import ReportReview from './report-review'
import MusicReview from './music-review'

export default async function AdminPage(){
 const supabase=await createClient()
 const {data:claims}=await supabase.auth.getClaims()
 const userId=claims?.claims?.sub
 if(!userId)redirect('/login')
 const {data:assignment}=await supabase.from('platform_admins').select('role').eq('user_id',userId).maybeSingle()
 if(!assignment)notFound()
 const role=assignment.role
 const {data:assurance}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
 const adminMfaReady=assurance?.currentLevel==='aal2'
 const {data:adminProfile}=await supabase.from('profiles').select('username,display_name,avatar_url,bio').eq('id',userId).maybeSingle()
 const canReview=['super_admin','platform_admin','moderator','support_admin'].includes(role)
 const canFinance=['super_admin','finance_admin'].includes(role)
 const canAudit=['super_admin','platform_admin'].includes(role)
 const canReviewMusic=['super_admin','platform_admin'].includes(role)
 const admin=supabase as any
 const [users,clubs,rooms,pendingReports,pendingPayments]=await Promise.all([
  admin.from('profiles').select('id',{count:'exact',head:true}),
  admin.from('clubs').select('id',{count:'exact',head:true}),
  admin.from('rooms').select('id',{count:'exact',head:true}),
  admin.from('club_reports').select('id',{count:'exact',head:true}).in('status',['open','reviewing']),
  admin.from('payment_intents').select('id',{count:'exact',head:true}).in('status',['pending','queued']),
 ])
 const [{data:reports},{data:payments},{data:audit},{data:pendingTracks}]=await Promise.all([
  canReview?admin.from('club_reports').select('id,club_id,reporter_id,reported_user_id,reason,details,status,created_at').order('created_at',{ascending:false}).limit(30):Promise.resolve({data:[]}),
  canFinance?admin.from('payment_intents').select('id,amount_kes,credits,status,external_reference,mpesa_receipt,created_at').order('created_at',{ascending:false}).limit(30):Promise.resolve({data:[]}),
  canAudit?admin.from('platform_audit_logs').select('id,actor_id,action,target_type,target_id,details,created_at').order('created_at',{ascending:false}).limit(20):Promise.resolve({data:[]}),
  canReviewMusic?admin.from('dj_queue').select('id,room_id,title,artist,source_type,rights_reference,created_at').eq('rights_status','pending').order('created_at',{ascending:false}).limit(30):Promise.resolve({data:[]}),
 ])
 const stats=[['Users',users.count??0],['Clubs',clubs.count??0],['Rooms',rooms.count??0],['Open reports',pendingReports.count??0],['Pending payments',pendingPayments.count??0]]
 return <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6">
  <header className="flex flex-wrap items-center justify-between gap-4"><div><Link href="/discover" className="text-sm text-zinc-400 hover:text-white">← Back to discovery</Link><p className="mt-6 text-xs font-black uppercase tracking-[.25em] text-lime-300">Nightlife KE operations</p><h1 className="mt-2 text-4xl font-black">Admin dashboard</h1><p className="mt-2 text-sm text-zinc-400">Signed in with role: <span className="font-semibold capitalize text-lime-200">{role.replaceAll('_',' ')}</span></p></div><span className="rounded-xl border border-white/10 px-4 py-3 text-xs text-zinc-400">Administrative actions are audited</span></header>
  {!adminMfaReady?<AdminMfaSetup/>:<><section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{stats.map(([label,value])=><article key={label} className="glass rounded-2xl p-5"><p className="text-xs text-zinc-500">{label}</p><p className="mt-2 text-3xl font-black tabular-nums">{Number(value).toLocaleString()}</p></article>)}</section>
  {role==='super_admin'&&<section className="glass mt-8 rounded-3xl border border-lime-300/20 p-6"><div className="flex flex-wrap items-center gap-4">{adminProfile?.avatar_url?<img src={adminProfile.avatar_url} alt="Your profile" className="h-16 w-16 rounded-full object-cover"/>:<div className="grid h-16 w-16 place-items-center rounded-full bg-lime-300/10 text-2xl font-black text-lime-200">{(adminProfile?.display_name||adminProfile?.username||'A')[0].toUpperCase()}</div>}<div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[.2em] text-lime-300">Sole platform owner</p><h2 className="mt-1 text-2xl font-black">{adminProfile?.display_name||adminProfile?.username||'Administrator'}</h2><p className="text-sm text-zinc-400">@{adminProfile?.username||'profile setup pending'}</p></div><span className="rounded-full border border-lime-300/30 px-3 py-2 text-xs font-bold text-lime-200">SUPER ADMIN</span></div><p className="mt-4 text-sm leading-6 text-zinc-400">This is the owner account for Nightlife KE. Administrator access is locked to this one verified account; no other administrator accounts can be added.</p>{adminProfile?.username&&<Link href={'/profile/'+adminProfile.username} className="mt-4 inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold">View your public profile →</Link>}</section>}
  {canReview&&<section className="mt-10"><h2 className="mb-4 text-2xl font-black">Moderation queue</h2><ReportReview reports={reports??[]}/></section>}
  {canReviewMusic&&<section className="mt-10"><h2 className="mb-4 text-2xl font-black">Music rights review</h2><MusicReview tracks={pendingTracks??[]}/></section>}
  {canFinance&&<section className="mt-10"><h2 className="mb-4 text-2xl font-black">Payment review</h2><div className="overflow-hidden rounded-2xl border border-white/10">{!payments?.length?<p className="p-5 text-sm text-zinc-500">No payment intents yet.</p>:payments.map((payment:any)=><article key={payment.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 p-4 last:border-0"><div><p className="font-semibold">KES {payment.amount_kes.toLocaleString()} · {payment.credits.toLocaleString()} credits</p><p className="mt-1 text-xs text-zinc-500">{payment.external_reference} · {new Date(payment.created_at).toLocaleString()}</p>{payment.mpesa_receipt&&<p className="mt-1 text-xs text-zinc-400">M-Pesa receipt: {payment.mpesa_receipt}</p>}</div><span className="rounded-full bg-white/5 px-3 py-1 text-xs capitalize text-zinc-300">{payment.status}</span></article>)}</div></section>}
  {canAudit&&<section className="mt-10"><h2 className="mb-4 text-2xl font-black">Audit trail</h2><div className="overflow-hidden rounded-2xl border border-white/10">{!audit?.length?<p className="p-5 text-sm text-zinc-500">No administrative actions recorded yet.</p>:audit.map((item:any)=><article key={item.id} className="border-b border-white/5 p-4 last:border-0"><p className="text-sm font-semibold">{item.action}</p><p className="mt-1 text-xs text-zinc-500">{item.actor_id.slice(0,8)} · {item.target_type} · {new Date(item.created_at).toLocaleString()}</p></article>)}</div></section>}
 </>}
 </main>
}
