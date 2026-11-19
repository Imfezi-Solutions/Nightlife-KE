'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

type OrderStatus = 'new' | 'accepted' | 'preparing' | 'ready' | 'served'
type BarOrder = {
  id:string
  roomId:string
  guestId:string
  guestName:string
  item:string
  category:string
  quantity:number
  notes:string
  status:OrderStatus
  createdAt:string
  updatedAt:string
}
const MENU = [
  {name:'Tropical Sunset',category:'Signature mocktails',description:'Pineapple, citrus and grenadine',price:'Complimentary'},
  {name:'Passion Breeze',category:'Signature mocktails',description:'Passion fruit, lime and mint',price:'Complimentary'},
  {name:'Berry Spark',category:'Signature mocktails',description:'Mixed berries and sparkling soda',price:'Complimentary'},
  {name:'Classic Mojito (0.0%)',category:'Zero-proof classics',description:'Mint, lime and soda',price:'Complimentary'},
  {name:'Ginger Fizz',category:'Zero-proof classics',description:'Fresh ginger, lemon and soda',price:'Complimentary'},
  {name:'Fresh Juice',category:'Refreshments',description:'Seasonal fruit juice',price:'Complimentary'},
  {name:'Sparkling Water',category:'Refreshments',description:'Chilled sparkling water',price:'Complimentary'},
  {name:'Still Water',category:'Refreshments',description:'Chilled still water',price:'Complimentary'},
]
const statusLabel:Record<OrderStatus,string>={new:'New ticket',accepted:'Accepted',preparing:'Preparing',ready:'Ready to serve',served:'Served'}
const nextStatus:Partial<Record<OrderStatus,OrderStatus>>={new:'accepted',accepted:'preparing',preparing:'ready',ready:'served'}

export default function BartenderStation({roomId,userId,displayName}:{roomId:string;userId:string;displayName:string}) {
  const [open,setOpen]=useState(false)
  const [mode,setMode]=useState<'guest'|'bartender'>('guest')
  const [orders,setOrders]=useState<BarOrder[]>([])
  const [selected,setSelected]=useState(MENU[0].name)
  const [quantity,setQuantity]=useState(1)
  const [notes,setNotes]=useState('')
  const [filter,setFilter]=useState<'active'|'all'>('active')
  const [notice,setNotice]=useState('')
  const [channel,setChannel]=useState<RealtimeChannel|null>(null)
  useEffect(()=>{
    const supabase=createClient()
    const ch=supabase.channel('bar-station:'+roomId,{config:{broadcast:{self:false}}})
      .on('broadcast',{event:'order-created'},({payload})=>{
        if(payload?.order?.roomId===roomId)setOrders(current=>[payload.order as BarOrder,...current.filter(o=>o.id!==payload.order.id)])
      })
      .on('broadcast',{event:'order-updated'},({payload})=>{
        if(payload?.order?.roomId===roomId)setOrders(current=>current.map(o=>o.id===payload.order.id?payload.order as BarOrder:o))
      })
      .subscribe(state=>{if(state==='SUBSCRIBED')setNotice('Bar service connected');else if(state==='CHANNEL_ERROR'||state==='TIMED_OUT')setNotice('Reconnecting to bar service…')})
    setChannel(ch)
    return()=>{setChannel(null);void supabase.removeChannel(ch)}
  },[roomId])
  const send=async(event:'order-created'|'order-updated',order:BarOrder)=>{
    if(!channel){setNotice('Bar service is connecting. Try again in a moment.');return}
    const result=await channel.send({type:'broadcast',event,payload:{order}})
    if(result!=='ok')setNotice('Could not sync this update. Please try again.')
  }
  const placeOrder=async()=>{
    const item=MENU.find(m=>m.name===selected)
    if(!item)return
    const now=new Date().toISOString()
    const order:BarOrder={id:crypto.randomUUID(),roomId,guestId:userId,guestName:displayName||'Guest',item:item.name,category:item.category,quantity,notes:notes.trim(),status:'new',createdAt:now,updatedAt:now}
    setOrders(current=>[order,...current])
    await send('order-created',order)
    setQuantity(1);setNotes('');setNotice('Order sent to the bar. You can follow its progress here.')
  }
  const updateOrder=async(order:BarOrder)=>{
    const status=nextStatus[order.status]
    if(!status)return
    const updated={...order,status,updatedAt:new Date().toISOString()}
    setOrders(current=>current.map(o=>o.id===order.id?updated:o))
    await send('order-updated',updated)
  }
  const activeOrders=useMemo(()=>orders.filter(o=>o.status!=='served'),[orders])
  const visibleOrders=filter==='active'?activeOrders:orders
  const mine=orders.filter(o=>o.guestId===userId)
  const mineActive=mine.filter(o=>o.status!=='served')
  const grouped=MENU.reduce<Record<string,typeof MENU>>((acc,item)=>{(acc[item.category]??=[]).push(item);return acc},{})
  return <>
    <div className="fixed bottom-5 left-4 z-[70] flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-2 rounded-2xl border border-amber-200/20 bg-[#100d17]/95 p-2 shadow-2xl backdrop-blur-xl sm:bottom-6 sm:left-6">
      <div className="hidden px-2 sm:block"><p className="text-[9px] font-black uppercase tracking-[.2em] text-amber-200">At the bar</p><p className="text-[10px] text-zinc-400">{activeOrders.length} active orders</p></div>
      <button onClick={()=>{setMode('guest');setOpen(true)}} className="rounded-xl bg-amber-200 px-4 py-3 text-xs font-black text-black shadow-lg hover:bg-amber-100">Order a drink</button>
      <button onClick={()=>{setMode('bartender');setOpen(true)}} className="rounded-xl border border-amber-200/35 bg-amber-200/10 px-4 py-3 text-xs font-black text-amber-100 hover:bg-amber-200/20">Be the bartender</button>
    </div>
    {open&&<div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/85 p-2 backdrop-blur-md sm:p-4">
      <div className="max-h-[96vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-amber-200/15 bg-[#0d0b12] p-4 shadow-2xl sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-amber-200 to-orange-500 text-xl text-black">✦</div><div><p className="text-[10px] font-black uppercase tracking-[.25em] text-amber-200">Nightlife KE · Bar operations</p><h2 className="mt-1 text-xl font-black text-white">The bar station</h2><p className="mt-1 text-[10px] text-zinc-500">{notice||'Connecting bar service…'}</p></div></div>
          <div className="flex items-center gap-2"><div className="flex rounded-xl border border-white/10 bg-black/30 p-1"><button onClick={()=>setMode('guest')} className={'rounded-lg px-3 py-2 text-xs font-bold '+(mode==='guest'?'bg-amber-200 text-black':'text-zinc-400')}>Guest</button><button onClick={()=>setMode('bartender')} className={'rounded-lg px-3 py-2 text-xs font-bold '+(mode==='bartender'?'bg-amber-200 text-black':'text-zinc-400')}>Bartender</button></div><button onClick={()=>setOpen(false)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300">Minimise ✕</button></div>
        </header>
        {mode==='guest'?<div className="grid gap-5 pt-5 lg:grid-cols-[1.1fr_.9fr]">
          <section><div className="mb-4"><p className="text-xs font-black uppercase tracking-widest text-amber-100">Drinks menu</p><p className="mt-1 text-xs text-zinc-500">Choose a drink and send your order directly to the bar.</p></div>
            {Object.entries(grouped).map(([category,items])=><div key={category} className="mb-5"><h3 className="mb-2 text-[10px] font-black uppercase tracking-[.2em] text-zinc-500">{category}</h3><div className="grid gap-2 sm:grid-cols-2">{items.map(item=><button key={item.name} onClick={()=>setSelected(item.name)} className={'rounded-2xl border p-3 text-left transition '+(selected===item.name?'border-amber-200/60 bg-amber-200/10':'border-white/10 bg-white/[.025] hover:bg-white/[.05]')}><div className="flex items-start justify-between gap-2"><span className="text-sm font-bold text-white">{item.name}</span><span className="text-[9px] font-bold text-emerald-300">{item.price}</span></div><p className="mt-1 text-xs text-zinc-500">{item.description}</p></button>)}</div></div>)}
          </section>
          <aside className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><p className="text-xs font-black uppercase tracking-widest text-amber-100">Your order</p><div className="mt-4 rounded-xl bg-black/30 p-4"><p className="text-lg font-black text-white">{selected}</p><p className="mt-1 text-xs text-zinc-500">{MENU.find(m=>m.name===selected)?.description}</p><div className="mt-4 flex items-center justify-between"><span className="text-xs text-zinc-400">Quantity</span><div className="flex items-center gap-3"><button onClick={()=>setQuantity(q=>Math.max(1,q-1))} className="h-8 w-8 rounded-lg border border-white/10 text-white">−</button><span className="w-4 text-center text-sm font-bold text-white">{quantity}</span><button onClick={()=>setQuantity(q=>Math.min(5,q+1))} className="h-8 w-8 rounded-lg border border-white/10 text-white">+</button></div></div></div><label className="mt-4 block text-xs font-bold text-zinc-400">Special request <textarea value={notes} onChange={e=>setNotes(e.target.value)} maxLength={120} rows={3} placeholder="e.g. no ice…" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-amber-200/50"/></label><button onClick={()=>void placeOrder()} className="mt-4 w-full rounded-xl bg-amber-200 px-4 py-3 text-sm font-black text-black hover:bg-amber-100">Send order to bartender</button><p className="mt-2 text-[10px] text-zinc-600">Virtual service only. No wallet payment is taken.</p>
            <div className="mt-6 border-t border-white/10 pt-4"><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-widest text-zinc-300">Your tickets</p><span className="text-[10px] text-zinc-500">{mineActive.length} active</span></div>{mine.length===0?<p className="mt-3 text-xs text-zinc-600">Your orders will appear here.</p>:<div className="mt-3 space-y-2">{mine.slice(0,8).map(o=><div key={o.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex justify-between gap-2"><span className="text-xs font-bold text-white">{o.quantity} × {o.item}</span><span className="text-[10px] text-amber-200">{statusLabel[o.status]}</span></div>{o.notes&&<p className="mt-1 text-[10px] text-zinc-500">{o.notes}</p>}</div>)}</div>}</div>
          </aside>
        </div>:<div className="pt-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><p className="text-[10px] uppercase tracking-widest text-zinc-500">New tickets</p><p className="mt-2 text-2xl font-black text-amber-200">{orders.filter(o=>o.status==='new').length}</p></div><div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><p className="text-[10px] uppercase tracking-widest text-zinc-500">Preparing</p><p className="mt-2 text-2xl font-black text-cyan-200">{orders.filter(o=>o.status==='preparing'||o.status==='accepted').length}</p></div><div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><p className="text-[10px] uppercase tracking-widest text-zinc-500">Ready</p><p className="mt-2 text-2xl font-black text-emerald-200">{orders.filter(o=>o.status==='ready').length}</p></div><div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><p className="text-[10px] uppercase tracking-widest text-zinc-500">Served</p><p className="mt-2 text-2xl font-black text-white">{orders.filter(o=>o.status==='served').length}</p></div></div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-amber-100">Live order tickets</p><p className="mt-1 text-xs text-zinc-500">Accept, prepare, mark ready and serve each guest.</p></div><div className="flex rounded-xl border border-white/10 bg-black/30 p-1"><button onClick={()=>setFilter('active')} className={'rounded-lg px-3 py-2 text-xs '+(filter==='active'?'bg-white/10 text-white':'text-zinc-500')}>Active</button><button onClick={()=>setFilter('all')} className={'rounded-lg px-3 py-2 text-xs '+(filter==='all'?'bg-white/10 text-white':'text-zinc-500')}>All tickets</button></div></div>
          {visibleOrders.length===0?<div className="mt-4 rounded-2xl border border-dashed border-white/10 p-10 text-center"><p className="font-bold text-zinc-300">No {filter==='active'?'active':'recent'} tickets</p><p className="mt-2 text-xs text-zinc-600">Guest orders will appear here in real time while you are connected.</p></div>:<div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visibleOrders.map(order=><article key={order.id} className="rounded-2xl border border-white/10 bg-[#17141e] p-4"><div className="flex items-start justify-between gap-2"><div><p className="text-[9px] font-black uppercase tracking-widest text-amber-200">Ticket · {order.id.slice(0,6).toUpperCase()}</p><h3 className="mt-1 text-base font-black text-white">{order.quantity} × {order.item}</h3><p className="mt-1 text-xs text-zinc-500">For {order.guestName}</p></div><span className="rounded-full bg-white/5 px-2 py-1 text-[9px] font-bold text-amber-100">{statusLabel[order.status]}</span></div>{order.notes&&<div className="mt-3 rounded-lg bg-black/30 p-2 text-xs text-zinc-300">Request: {order.notes}</div>}<div className="mt-4 flex items-center justify-between gap-2"><span className="text-[10px] text-zinc-600">{new Date(order.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>{nextStatus[order.status]?<button onClick={()=>void updateOrder(order)} className="rounded-lg bg-amber-200 px-3 py-2 text-[10px] font-black text-black">{({new:'Accept order',accepted:'Start preparing',preparing:'Mark ready',ready:'Serve guest'} as Record<string,string>)[order.status]}</button>:<span className="text-[10px] font-bold text-emerald-300">Completed</span>}</div></article>)}</div>}
        </div>}
        <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4"><p className="text-[10px] text-zinc-600">Live updates are shared with guests currently connected to this room. No real-money transactions.</p><button onClick={()=>setOpen(false)} className="rounded-lg border border-white/10 px-4 py-2 text-xs text-zinc-300">Return to club</button></footer>
      </div>
    </div>}
  </>
}
