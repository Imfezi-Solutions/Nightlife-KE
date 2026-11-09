import Link from 'next/link'
import { redirect } from 'next/navigation'
import WalletCheckout from './wallet-checkout'
import { createClient } from '@/lib/supabase/server'

type CreditPackage={id:string;amountKes:number;credits:number}
function getPackages():CreditPackage[]{
 try{
  const value:unknown=JSON.parse(process.env.NIGHTLIFE_CREDIT_PACKAGES_JSON??'[]')
  if(!Array.isArray(value))return []
  return value.filter((item):item is CreditPackage=>item&&typeof item.id==='string'&&Number.isSafeInteger(item.amountKes)&&item.amountKes>0&&Number.isSafeInteger(item.credits)&&item.credits>0)
 }catch{return []}
}

export default async function WalletPage(){
 const supabase=await createClient()
 const {data:claims}=await supabase.auth.getClaims()
 const userId=claims?.claims?.sub
 if(!userId)redirect('/login')
 const {data:age}=await supabase.from('age_verifications').select('id').eq('user_id',userId).eq('status','verified').not('verified_at','is',null).gt('expires_at',new Date().toISOString()).limit(1).maybeSingle()
 if(!age)redirect('/discover?error=age_verification_required')
 const [{data:wallet},{data:transactions}]=await Promise.all([
  supabase.from('wallets').select('balance_credits').eq('user_id',userId).maybeSingle(),
  supabase.from('wallet_transactions').select('id,entry_type,credits_delta,balance_after,description,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(25),
 ])
 return <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 sm:px-6">
  <Link href="/discover" className="text-sm text-zinc-400 hover:text-white">← Back to discovery</Link>
  <header className="mt-8"><p className="text-xs font-black uppercase tracking-[.25em] text-lime-300">Nightlife KE wallet</p><h1 className="mt-2 text-4xl font-black">Your credits</h1><p className="mt-2 text-sm text-zinc-400">Manage your balance and review purchases.</p></header>
  <section className="mt-7 rounded-3xl border border-lime-300/20 bg-gradient-to-br from-lime-300/10 to-violet-500/10 p-7">
   <p className="text-xs font-bold uppercase tracking-[.2em] text-zinc-400">Available balance</p>
   <p className="mt-3 text-5xl font-black tabular-nums">{(wallet?.balance_credits??0).toLocaleString()} <span className="text-lg text-lime-200">credits</span></p>
  </section>
  <div className="mt-7"><WalletCheckout packages={getPackages()}/></div>
  <section className="mt-8">
   <h2 className="text-xl font-bold">Recent transactions</h2>
   <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
    {!transactions?.length?<p className="p-6 text-sm text-zinc-500">No wallet transactions yet.</p>:transactions.map(item=><article key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 p-4 last:border-0">
     <div><p className="font-semibold">{item.description}</p><p className="mt-1 text-xs text-zinc-500">{new Date(item.created_at).toLocaleString()}</p></div>
     <div className="text-right"><p className={item.credits_delta>0?'font-bold text-lime-200':'font-bold text-zinc-200'}>{item.credits_delta>0?'+':''}{item.credits_delta.toLocaleString()} credits</p><p className="text-xs text-zinc-500">Balance {item.balance_after.toLocaleString()}</p></div>
    </article>)}
   </div>
  </section>
 </main>
}
