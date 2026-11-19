'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

type Signal = { from:string; to:string; description?:RTCSessionDescriptionInit; candidate?:RTCIceCandidateInit }

export default function RoomVoiceChat({ roomId, userId }: { roomId:string; userId:string }) {
 const [joined,setJoined]=useState(false)
 const [muted,setMuted]=useState(false)
 const [status,setStatus]=useState('Voice chat is off')
 const [speakers,setSpeakers]=useState(0)
 const [remoteStreams,setRemoteStreams]=useState<Record<string,MediaStream>>({})
 const channelRef=useRef<RealtimeChannel|null>(null)
 const localStreamRef=useRef<MediaStream|null>(null)
 const peersRef=useRef<Map<string,RTCPeerConnection>>(new Map())
 const audioRef=useRef<HTMLAudioElement|null>(null)
 const remoteAudioRefs=useRef<Map<string,HTMLAudioElement>>(new Map())
 const supabaseRef=useRef<ReturnType<typeof createClient>|null>(null)

 const sendSignal=useCallback((signal:Signal)=>{
  void channelRef.current?.send({type:'broadcast',event:'signal',payload:signal})
 },[])

 const closePeer=useCallback((peerId:string)=>{
  const pc=peersRef.current.get(peerId)
  if(pc){pc.onicecandidate=null;pc.ontrack=null;pc.close();peersRef.current.delete(peerId)}
  remoteAudioRefs.current.delete(peerId)
  setRemoteStreams(current=>{const next={...current};delete next[peerId];return next})
  setSpeakers(peersRef.current.size)
 },[])

 const makePeer=useCallback((peerId:string)=>{
  const existing=peersRef.current.get(peerId)
  if(existing)return existing
  const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]})
  peersRef.current.set(peerId,pc)
  localStreamRef.current?.getTracks().forEach(track=>pc.addTrack(track,localStreamRef.current!))
  pc.onicecandidate=e=>{if(e.candidate)sendSignal({from:userId,to:peerId,candidate:e.candidate.toJSON()})}
  pc.ontrack=e=>{
   const stream=e.streams[0]
   if(stream)setRemoteStreams(current=>({...current,[peerId]:stream}))
  }
  pc.onconnectionstatechange=()=>{if(['failed','closed','disconnected'].includes(pc.connectionState))closePeer(peerId)}
  setSpeakers(peersRef.current.size)
  return pc
 },[closePeer,sendSignal,userId])

 const leave=useCallback(async()=>{
  peersRef.current.forEach(pc=>pc.close());peersRef.current.clear()
  localStreamRef.current?.getTracks().forEach(track=>track.stop());localStreamRef.current=null
  if(channelRef.current&&supabaseRef.current)await supabaseRef.current.removeChannel(channelRef.current)
  channelRef.current=null;setRemoteStreams({});setSpeakers(0);setJoined(false);setMuted(false);setStatus('Voice chat is off')
 },[])

 const join=useCallback(async()=>{
  if(joined)return
  if(!navigator.mediaDevices?.getUserMedia){setStatus('Microphone access requires a secure, supported browser.');return}
  setStatus('Requesting microphone permission…')
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false})
   localStreamRef.current=stream
   if(audioRef.current)audioRef.current.srcObject=stream
   const supabase=createClient();supabaseRef.current=supabase
   const channel=supabase.channel('voice-room:'+roomId,{config:{private:false,presence:{key:userId}}})
   channelRef.current=channel
   channel.on('broadcast',{event:'signal'},async({payload})=>{
    const signal=payload as Signal
    if(!signal||signal.to!==userId||signal.from===userId)return
    try{
     const pc=makePeer(signal.from)
     if(signal.candidate){try{await pc.addIceCandidate(signal.candidate)}catch{};return}
     if(signal.description?.type==='offer'){
      await pc.setRemoteDescription(signal.description)
      const answer=await pc.createAnswer();await pc.setLocalDescription(answer)
      sendSignal({from:userId,to:signal.from,description:pc.localDescription?.toJSON()})
     }else if(signal.description?.type==='answer'&&pc.signalingState==='have-local-offer'){
      await pc.setRemoteDescription(signal.description)
     }
    }catch{setStatus('A voice connection could not be established.')}
   })
   channel.on('presence',{event:'sync'},()=>{
    const state=channel.presenceState() as Record<string,unknown[]>
    const ids=Object.keys(state).filter(id=>id!==userId)
    ids.forEach(async peerId=>{
     if(userId.localeCompare(peerId)<0){
      const pc=makePeer(peerId)
      if(pc.signalingState==='stable'){
       try{const offer=await pc.createOffer();await pc.setLocalDescription(offer);sendSignal({from:userId,to:peerId,description:pc.localDescription?.toJSON()})}catch{}
      }
     }
    })
    Array.from(peersRef.current.keys()).filter(id=>!ids.includes(id)).forEach(closePeer)
   })
   channel.subscribe(async state=>{
    if(state==='SUBSCRIBED'){
     await channel.track({joined_at:new Date().toISOString()})
     setJoined(true);setStatus('You are live on voice')
    }else if(state==='CHANNEL_ERROR'||state==='TIMED_OUT'){setStatus('Voice connection interrupted')}
   })
  }catch(error){
   streamCleanup()
   const name=error instanceof DOMException?error.name:''
   setStatus(name==='NotAllowedError'?'Microphone permission was denied. Allow microphone access and try again.':name==='NotFoundError'?'No microphone was found on this device.':'Could not start voice chat. Check your microphone and browser permissions.')
  }
 },[joined,roomId,userId,makePeer,sendSignal,closePeer])

 function streamCleanup(){localStreamRef.current?.getTracks().forEach(track=>track.stop());localStreamRef.current=null}
 function toggleMute(){
  const next=!muted;localStreamRef.current?.getAudioTracks().forEach(track=>{track.enabled=!next});setMuted(next)
 }

 useEffect(()=>()=>{peersRef.current.forEach(pc=>pc.close());localStreamRef.current?.getTracks().forEach(track=>track.stop());if(channelRef.current&&supabaseRef.current)void supabaseRef.current.removeChannel(channelRef.current)},[])

 return <section className="mt-4 rounded-2xl border border-cyan-300/15 bg-[#0d1420] p-4 sm:p-5">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><p className="text-xs font-black uppercase tracking-[.2em] text-cyan-200">Proximity-free room voice</p><p className="mt-1 text-sm text-zinc-300">Talk live with people in this room. Your microphone stays off until you join.</p><p role="status" className="mt-2 text-xs text-zinc-500">{status}{joined?' · '+speakers+' peer connection(s)':''}</p></div>
   <div className="flex gap-2">
    {!joined?<button onClick={()=>void join()} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-black text-slate-950">Join voice</button>:<><button onClick={toggleMute} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-white">{muted?'Unmute':'Mute mic'}</button><button onClick={()=>void leave()} className="rounded-xl border border-rose-300/30 px-4 py-2.5 text-sm font-bold text-rose-200">Leave voice</button></>}
   </div>
  </div>
  <audio ref={audioRef} autoPlay muted playsInline className="hidden"/>
  {Object.entries(remoteStreams).map(([id,stream])=><audio key={id} autoPlay playsInline ref={node=>{if(node){node.srcObject=stream;remoteAudioRefs.current.set(id,node)}}} className="hidden"/> )}
  <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">Voice is live and not recorded by this feature. Use headphones to reduce echo. For privacy, only join when you are comfortable speaking to other members of this room.</p>
 </section>
}
