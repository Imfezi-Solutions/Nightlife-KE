'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Guest = { id: string; name: string }
type RoomEvent = { id: string; host: string; title: string; details: string; startsAt: string; going: string[] }
type Props = {
  roomId: string
  clubId: string
  userId: string
  displayName: string
  guests: Guest[]
  onDanceChallenge: () => void
  onOpenVip: () => void
}

export default function RoomCommunityHub({ roomId, clubId, userId, displayName, guests, onDanceChallenge, onOpenVip }: Props) {
  const [tab, setTab] = useState<'friends'|'events'|'safety'>('friends')
  const [friends, setFriends] = useState<string[]>([])
  const [requests, setRequests] = useState<string[]>([])
  const [messages, setMessages] = useState<{from:string;name:string;body:string;at:number}[]>([])
  const [messageTo, setMessageTo] = useState<string|null>(null)
  const [draft, setDraft] = useState('')
  const [events, setEvents] = useState<RoomEvent[]>([])
  const [eventTitle, setEventTitle] = useState('')
  const [eventDetails, setEventDetails] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [blocked, setBlocked] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const [incomingDanceChallenge, setIncomingDanceChallenge] = useState<string|null>(null)
  const supabase = useMemo(() => createClient(), [])
  const channelRef = useRef<ReturnType<typeof supabase.channel>|null>(null)

  const send = useCallback((event:string, payload:Record<string,unknown>) => {
    if(channelRef.current) void channelRef.current.send({type:'broadcast',event,payload})
  }, [])

  useEffect(() => {
    const channel = supabase.channel('room-social:'+roomId)
      .on('broadcast',{event:'friend-request'},({payload})=>{
        if(payload?.to===userId && typeof payload?.from==='string') setRequests(current=>current.includes(payload.from as string)?current:[...current,payload.from as string])
      })
      .on('broadcast',{event:'friend-accepted'},({payload})=>{
        if(payload?.to===userId && typeof payload?.from==='string') setFriends(current=>current.includes(payload.from as string)?current:[...current,payload.from as string])
      })
      .on('broadcast',{event:'private-message'},({payload})=>{
        if(payload?.to===userId && typeof payload?.from==='string' && typeof payload?.body==='string') setMessages(current=>[...current,{from:payload.from as string,name:String(payload.name||'Guest'),body:payload.body as string,at:Date.now()}].slice(-60))
      })
      .on('broadcast',{event:'club-event'},({payload})=>{
        if(payload?.event && typeof payload.event==='object') setEvents(current=>[payload.event as RoomEvent,...current.filter(e=>e.id!==(payload.event as RoomEvent).id)].slice(0,8))
      })
      .on('broadcast',{event:'event-rsvp'},({payload})=>{
        if(typeof payload?.eventId==='string'&&typeof payload?.user==='string') setEvents(current=>current.map(e=>e.id===payload.eventId?{...e,going:e.going.includes(payload.user as string)?e.going:[...e.going,payload.user as string]}:e))
      })
      .on('broadcast',{event:'dance-challenge'},({payload})=>{
        if(typeof payload?.from==='string'&&payload.from!==userId) setIncomingDanceChallenge(String(payload.name||'A guest'))
      })
      .subscribe()
    channelRef.current=channel
    return ()=>{channelRef.current=null;void supabase.removeChannel(channel)}
  }, [roomId,userId,supabase])

  useEffect(()=>{
    let active=true
    void supabase.from('user_blocks').select('blocked_user_id').eq('blocker_id',userId).then(({data})=>{
      if(active)setBlocked((data??[]).map(row=>row.blocked_user_id))
    })
    return ()=>{active=false}
  },[supabase,userId])

  const requestFriend=(guest:Guest)=>{
    send('friend-request',{from:userId,to:guest.id,name:displayName})
    setNotice('Friend request sent to '+guest.name+'.')
  }
  const acceptFriend=(id:string)=>{
    setFriends(current=>current.includes(id)?current:[...current,id])
    setRequests(current=>current.filter(item=>item!==id))
    send('friend-accepted',{from:userId,to:id})
  }
  const sendMessage=()=>{
    if(!messageTo||!draft.trim())return
    send('private-message',{from:userId,to:messageTo,name:displayName,body:draft.trim().slice(0,500)})
    setMessages(current=>[...current,{from:userId,name:displayName,body:draft.trim().slice(0,500),at:Date.now()}].slice(-60))
    setDraft('')
  }
  const createEvent=()=>{
    if(!eventTitle.trim()||!eventTime)return
    const item:RoomEvent={id:crypto.randomUUID(),host:displayName,title:eventTitle.trim().slice(0,70),details:eventDetails.trim().slice(0,240),startsAt:eventTime,going:[userId]}
    setEvents(current=>[item,...current].slice(0,8))
    send('club-event',{event:item})
    setEventTitle('');setEventDetails('');setEventTime('')
    setNotice('Your event has been shared with guests currently in this room.')
  }
  const blockGuest=async(guest:Guest)=>{
    const {error}=await supabase.from('user_blocks').insert({blocker_id:userId,blocked_user_id:guest.id})
    if(error){setNotice(error.code==='23505'?'This account is already blocked.':'Could not block this account. Please try again.');return}
    setBlocked(current=>[...current,guest.id])
    setNotice(guest.name+' has been blocked on your account.')
  }
  const reportGuest=(guest:Guest)=>{
    const subject=encodeURIComponent('Nightlife KE safety report')
    const body=encodeURIComponent('Please review this account report.\n\nClub ID: '+clubId+'\nRoom ID: '+roomId+'\nReported account ID: '+guest.id+'\nReported display name: '+guest.name+'\nReporter account ID: '+userId+'\n\nPlease describe what happened:')
    window.location.href='mailto:imfezisolutions@outlook.com?subject='+subject+'&body='+body
  }
  const availableGuests=guests.filter(g=>g.id!==userId&&!blocked.includes(g.id))
  const guestName=(id:string)=>guests.find(g=>g.id===id)?.name||('Guest '+id.slice(0,6))

  return <section className="mx-5 mb-4 rounded-2xl border border-violet-300/20 bg-[#11101d] p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-200">The social club</p><h3 className="mt-1 text-lg font-black text-white">Meet up, make plans.</h3></div>
      <div className="flex flex-wrap gap-2">
        {(['friends','events','safety'] as const).map(item=><button key={item} onClick={()=>setTab(item)} className={'rounded-lg px-3 py-2 text-xs font-bold capitalize '+(tab===item?'bg-violet-300 text-black':'border border-white/10 text-zinc-300')}>{item}</button>)}
      </div>
    </div>
    {notice&&<p role="status" className="mt-3 rounded-lg bg-violet-300/10 px-3 py-2 text-xs text-violet-100">{notice}</p>}
    {tab==='friends'&&<div className="mt-4 grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-white/10 p-3">
        <div className="flex items-center justify-between"><p className="text-xs font-bold text-white">Guests in this room</p><span className="text-[10px] text-zinc-500">{availableGuests.length} online</span></div>
        <div className="mt-3 space-y-2">{availableGuests.map(guest=><div key={guest.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/[.04] px-3 py-2"><span className="text-xs text-zinc-200">{guest.name}</span><div className="flex gap-2"><button onClick={()=>requestFriend(guest)} className="rounded-md border border-violet-300/30 px-2 py-1 text-[10px] text-violet-100">Add friend</button><button onClick={()=>setMessageTo(guest.id)} className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-zinc-200">Message</button></div></div>)}{availableGuests.length===0&&<p className="py-3 text-xs text-zinc-500">No other guests are visible right now.</p>}</div>
        {requests.length>0&&<div className="mt-4 border-t border-white/10 pt-3"><p className="text-xs font-bold text-white">Friend requests</p>{requests.map(id=><div key={id} className="mt-2 flex items-center justify-between gap-2"><span className="text-xs text-zinc-300">{guestName(id)}</span><button onClick={()=>acceptFriend(id)} className="rounded-md bg-violet-300 px-3 py-1.5 text-[10px] font-bold text-black">Accept</button></div>)}</div>}
        {friends.length>0&&<p className="mt-3 text-[10px] text-emerald-200">{friends.length} accepted room friend connection(s) in this session.</p>}
      </div>
      <div className="rounded-xl border border-white/10 p-3">
        <p className="text-xs font-bold text-white">Private room message</p>
        <select value={messageTo??''} onChange={e=>setMessageTo(e.target.value||null)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#171321] px-3 py-2 text-xs text-white"><option value="">Choose a guest…</option>{availableGuests.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select>
        <div className="mt-3 max-h-36 space-y-2 overflow-y-auto">{messages.filter(m=>!messageTo||m.from===messageTo||m.from===userId).map((m,i)=><p key={i} className="rounded-lg bg-white/[.04] px-3 py-2 text-xs text-zinc-200"><span className="font-bold text-violet-200">{m.name}: </span>{m.body}</p>)}</div>
        <div className="mt-3 flex gap-2"><input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();sendMessage()}}} maxLength={500} placeholder="Write a private message…" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white"/><button onClick={sendMessage} disabled={!messageTo||!draft.trim()} className="rounded-lg bg-violet-300 px-3 py-2 text-xs font-bold text-black disabled:opacity-40">Send</button></div>
        <p className="mt-2 text-[10px] text-zinc-500">Prototype messaging: messages are relayed live to guests in this room and are not stored.</p>
      </div>
    </div>}
    {tab==='events'&&<div className="mt-4 grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
      <div className="rounded-xl border border-white/10 p-3"><p className="text-xs font-bold text-white">Host a club event</p><input value={eventTitle} onChange={e=>setEventTitle(e.target.value)} maxLength={70} placeholder="Event name" className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white"/><textarea value={eventDetails} onChange={e=>setEventDetails(e.target.value)} maxLength={240} rows={2} placeholder="What should guests expect?" className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white"/><label className="mt-2 block text-[10px] text-zinc-400">Start time<input type="datetime-local" value={eventTime} onChange={e=>setEventTime(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white"/></label><button onClick={createEvent} disabled={!eventTitle.trim()||!eventTime} className="mt-3 rounded-lg bg-violet-300 px-4 py-2 text-xs font-black text-black disabled:opacity-40">Publish event</button></div>
      <div className="space-y-2">{events.map(item=><article key={item.id} className="rounded-xl border border-white/10 bg-white/[.03] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-white">{item.title}</p><span className="text-[10px] text-violet-200">{item.going.length} going</span></div><p className="mt-1 text-[10px] text-zinc-400">Hosted by {item.host} · {new Date(item.startsAt).toLocaleString()}</p>{item.details&&<p className="mt-2 text-xs text-zinc-300">{item.details}</p>}<button onClick={()=>{setEvents(current=>current.map(e=>e.id===item.id?{...e,going:e.going.includes(userId)?e.going:[...e.going,userId]}:e));send('event-rsvp',{eventId:item.id,user:userId})}} className="mt-3 rounded-lg border border-violet-300/30 px-3 py-1.5 text-[10px] font-bold text-violet-100">{item.going.includes(userId)?'You’re going':'I’m going'}</button></article>)}{events.length===0&&<p className="rounded-xl border border-dashed border-white/10 p-6 text-xs text-zinc-500">No events have been shared in this room yet. Host the first one.</p>}</div>
      <div className="lg:col-span-2 flex flex-wrap gap-2 rounded-xl border border-fuchsia-300/15 bg-fuchsia-300/5 p-3"><div className="flex-1"><p className="text-xs font-bold text-fuchsia-100">Group dance challenge</p><p className="mt-1 text-[10px] text-zinc-400">Invite the room to join a synchronised dance moment.</p></div><button onClick={()=>{send('dance-challenge',{from:userId,name:displayName});onDanceChallenge();setNotice('Dance challenge started. Guests in this room have been invited.')}} className="rounded-lg bg-fuchsia-300 px-3 py-2 text-xs font-black text-black">Start challenge</button>{incomingDanceChallenge&&<button onClick={()=>{setIncomingDanceChallenge(null);onDanceChallenge();setNotice('You joined '+incomingDanceChallenge+'’s dance challenge.')}} className="rounded-lg border border-fuchsia-300/30 px-3 py-2 text-xs font-bold text-fuchsia-100">Join {incomingDanceChallenge}</button>}</div>
    </div>}
    {tab==='safety'&&<div className="mt-4 space-y-3"><div className="rounded-xl border border-amber-300/15 bg-amber-300/5 p-3"><p className="text-xs font-bold text-amber-100">Your safety controls</p><p className="mt-1 text-[10px] leading-5 text-zinc-400">Blocking is saved to your account. Reports open an email to the Nightlife KE team with the account and room details ready for review.</p></div>{guests.filter(g=>g.id!==userId).map(guest=><div key={guest.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2"><span className="text-xs text-zinc-200">{guest.name}</span><div className="flex gap-2"><button disabled={blocked.includes(guest.id)} onClick={()=>void blockGuest(guest)} className="rounded-md border border-amber-300/30 px-2 py-1.5 text-[10px] text-amber-100 disabled:opacity-40">{blocked.includes(guest.id)?'Blocked':'Block'}</button><button onClick={()=>reportGuest(guest)} className="rounded-md border border-rose-300/30 px-2 py-1.5 text-[10px] text-rose-100">Report</button></div></div>)}{guests.length<=1&&<p className="text-xs text-zinc-500">Other guests will appear here when they join.</p>}</div>}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3"><button onClick={onOpenVip} className="rounded-lg border border-amber-300/30 px-3 py-2 text-xs font-bold text-amber-100">Enter VIP lounge</button><p className="text-[10px] text-zinc-500">Friends, event RSVPs and messages are room-session features in this prototype.</p></div>
  </section>
}
