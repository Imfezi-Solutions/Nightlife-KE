'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sparkles } from '@react-three/drei'
import { MathUtils, type Group } from 'three'
import { createClient } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'
import type { RealtimeChannel } from '@supabase/supabase-js'

type Dance = 'groove' | 'bounce' | 'sway' | 'hype'
type Avatar = { skin: 'warm'|'deep'|'light'|'tan'; hair: 'curly'|'fade'|'braids'|'short'; outfit: 'neon'|'street'|'vip'|'classic'; dance: Dance }
type Position = { x:number; z:number; dance:Dance }
type Remote = { id:string; position:Position }
const defaults: Avatar = { skin:'warm', hair:'curly', outfit:'neon', dance:'groove' }
const skin: Record<Avatar['skin'],string> = { warm:'#a96745', deep:'#613b2d', light:'#e0ad83', tan:'#c9875c' }
const clothes: Record<Avatar['outfit'],string> = { neon:'#c7ff38', street:'#6478ff', vip:'#e7bd75', classic:'#d5d9e2' }
const choices = {
 skin:[['warm','Warm brown'],['deep','Deep brown'],['light','Light'],['tan','Tan']],
 hair:[['curly','Curly'],['fade','Fade'],['braids','Braids'],['short','Short']],
 outfit:[['neon','Neon'],['street','Streetwear'],['vip','VIP'],['classic','Classic']],
 dance:[['groove','Groove'],['bounce','Bounce'],['sway','Sway'],['hype','Hype']],
} as const
const clamp = (n:number,min:number,max:number) => Math.max(min,Math.min(max,n))

function Dancer({ position, avatar, me=false }: { position:Position; avatar:Avatar; me?:boolean }) {
 const ref = useRef<Group>(null)
 useFrame(({clock}) => {
  if (!ref.current) return
  const t = clock.getElapsedTime()
  const speed = avatar.dance === 'hype' ? 8 : avatar.dance === 'bounce' ? 5 : 3
  ref.current.position.y = Math.abs(Math.sin(t*speed + position.x))* (avatar.dance === 'hype' ? .25 : .12)
  ref.current.rotation.z = Math.sin(t*2 + position.z) * (avatar.dance === 'sway' ? .2 : .07)
 })
 return <group ref={ref} position={[position.x,0,position.z]}>
  <mesh position={[0,1.55,0]} castShadow><sphereGeometry args={[.27,16,16]}/><meshStandardMaterial color={skin[avatar.skin]}/></mesh>
  <mesh position={[0,1.79,-.02]}><sphereGeometry args={[.28,14,10,0,Math.PI*2,0,Math.PI*.5]}/><meshStandardMaterial color="#20151f"/></mesh>
  <mesh position={[0,1.02,0]} castShadow><capsuleGeometry args={[.29,.55,4,8]}/><meshStandardMaterial color={clothes[avatar.outfit]} metalness={.12} roughness={.6}/></mesh>
  <mesh position={[-.37,1.03,0]} rotation={[0,0,-.35]}><capsuleGeometry args={[.085,.45,4,6]}/><meshStandardMaterial color={skin[avatar.skin]}/></mesh>
  <mesh position={[.37,1.03,0]} rotation={[0,0,.35]}><capsuleGeometry args={[.085,.45,4,6]}/><meshStandardMaterial color={skin[avatar.skin]}/></mesh>
  <mesh position={[-.15,.4,0]}><capsuleGeometry args={[.1,.52,4,6]}/><meshStandardMaterial color="#242330"/></mesh>
  <mesh position={[.15,.4,0]}><capsuleGeometry args={[.1,.52,4,6]}/><meshStandardMaterial color="#242330"/></mesh>
  {me && <mesh position={[0,2.08,0]}><sphereGeometry args={[.045,8,8]}/><meshBasicMaterial color="#c7ff38"/></mesh>}
 </group>
}

function Venue({ position, remotes, avatar, high }: { position:Position; remotes:Remote[]; avatar:Avatar; high:boolean }) {
 return <>
  <color attach="background" args={['#080711']}/>
  <fog attach="fog" args={['#080711',14,28]}/>
  <ambientLight intensity={.55}/>
  <hemisphereLight args={['#aaa4ff','#161020',.7]}/>
  <spotLight position={[0,9,-5]} angle={.8} penumbra={.8} intensity={high?65:30} color="#c05aff" castShadow={high}/>
  <pointLight position={[-5,3,1]} intensity={high?16:7} color="#42dfff"/>
  <pointLight position={[5,3,1]} intensity={high?16:7} color="#c7ff38"/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.04,0]} receiveShadow><planeGeometry args={[18,14]}/><meshStandardMaterial color="#171426" metalness={.55} roughness={.38}/></mesh>
  <gridHelper args={[18,18,'#563675','#29213c']} position={[0,.005,0]}/>
  <mesh position={[0,2.6,-6.7]}><boxGeometry args={[18,5.2,.35]}/><meshStandardMaterial color="#171321"/></mesh>
  <mesh position={[0,4.15,-6.48]}><boxGeometry args={[5.5,.12,.1]}/><meshStandardMaterial color="#d45cff" emissive="#a72cff" emissiveIntensity={2.5}/></mesh>
  <group position={[0,0,-4.7]}>
   <mesh position={[0,.55,0]} castShadow><boxGeometry args={[4.4,1.1,1.5]}/><meshStandardMaterial color="#30213e" metalness={.45}/></mesh>
   <mesh position={[0,1.13,0]}><boxGeometry args={[4.5,.08,1.55]}/><meshStandardMaterial color="#a74bff" emissive="#a74bff" emissiveIntensity={2}/></mesh>
   {[-1.1,0,1.1].map(x=><mesh key={x} position={[x,1.3,0]}><cylinderGeometry args={[.25,.25,.08,20]}/><meshStandardMaterial color="#c7ff38" emissive="#7dbd22" emissiveIntensity={1.5}/></mesh>)}
  </group>
  <mesh position={[-8.7,2.5,0]}><boxGeometry args={[.3,5,14]}/><meshStandardMaterial color="#1a1627"/></mesh>
  <mesh position={[8.7,2.5,0]}><boxGeometry args={[.3,5,14]}/><meshStandardMaterial color="#1a1627"/></mesh>
  <mesh position={[-5.2,.65,-1.8]}><boxGeometry args={[2.4,1.3,1.2]}/><meshStandardMaterial color="#2a223d"/></mesh>
  <mesh position={[5.2,.65,-1.8]}><boxGeometry args={[2.4,1.3,1.2]}/><meshStandardMaterial color="#2a223d"/></mesh>
  {high && <Sparkles count={65} scale={[15,4,12]} size={2} speed={.25} color="#d7a5ff"/>}
  <Dancer position={position} avatar={avatar} me/>
  {remotes.map(m=><Dancer key={m.id} position={m.position} avatar={{...defaults,dance:m.position.dance}}/>)}
  <OrbitControls target={[0,1,-.4]} enablePan={false} minDistance={8} maxDistance={17} minPolarAngle={.65} maxPolarAngle={1.35}/>
 </>
}

export default function Room3DEngine({roomId,userId,displayName,initialConfig}:{roomId:string;userId:string;displayName:string;initialConfig:Json|null}) {
 const [avatar,setAvatar]=useState<Avatar>(()=>({...defaults,...(initialConfig && typeof initialConfig==='object' && !Array.isArray(initialConfig)?initialConfig:{})}) as Avatar)
 const [position,setPosition]=useState<Position>({x:0,z:2.2,dance:defaults.dance})
 const [remotes,setRemotes]=useState<Remote[]>([])
 const [quality,setQuality]=useState<'low'|'high'>('low')
 const [editing,setEditing]=useState(false)
 const [saving,setSaving]=useState(false)
 const [status,setStatus]=useState('Connecting…')
 const channelRef=useRef<RealtimeChannel|null>(null)
 const lastSent=useRef(0)
 const publish=useCallback((p:Position)=>{
  const now=Date.now()
  if(channelRef.current && now-lastSent.current>=80){lastSent.current=now;void channelRef.current.track({x:p.x,z:p.z,dance:p.dance})}
 },[])
 const move=useCallback((dx:number,dz:number)=>{
  setPosition(current=>{const next={x:clamp(current.x+dx,-7,7),z:clamp(current.z+dz,-5,5),dance:current.dance};publish(next);return next})
 },[publish])
 useEffect(()=>{
  const supabase=createClient()
  const channel=supabase.channel('club-room:'+roomId,{config:{private:true,presence:{key:userId}}})
  channelRef.current=channel
  const sync=()=>{
   const state=channel.presenceState() as Record<string,Array<Record<string,unknown>>>
   const list:Remote[]=[]
   for(const [id,metas] of Object.entries(state)){
    if(id===userId||!metas?.length)continue
    const meta=metas[metas.length-1]
    const dance=['groove','bounce','sway','hype'].includes(String(meta.dance))?meta.dance as Dance:'groove'
    list.push({id,position:{x:typeof meta.x==='number'?clamp(meta.x,-7,7):0,z:typeof meta.z==='number'?clamp(meta.z,-5,5):0,dance}})
   }
   setRemotes(list)
  }
  channel.on('presence',{event:'sync'},sync).subscribe(state=>{
   if(state==='SUBSCRIBED'){setStatus('Multiplayer connected');void channel.track({x:position.x,z:position.z,dance:position.dance})}
   else if(state==='CHANNEL_ERROR'||state==='TIMED_OUT')setStatus('Reconnecting…')
   else if(state==='CLOSED')setStatus('Disconnected')
  })
  return ()=>{channelRef.current=null;void supabase.removeChannel(channel)}
  // Connect once per authenticated room identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[roomId,userId])
 useEffect(()=>{
  const keys:Record<string,[number,number]>={ArrowUp:[0,-.35],w:[0,-.35],W:[0,-.35],ArrowDown:[0,.35],s:[0,.35],S:[0,.35],ArrowLeft:[-.35,0],a:[-.35,0],A:[-.35,0],ArrowRight:[.35,0],d:[.35,0],D:[.35,0]}
  const onKey=(e:KeyboardEvent)=>{if(['INPUT','TEXTAREA','SELECT'].includes((e.target as HTMLElement|null)?.tagName??''))return;const v=keys[e.key];if(v){e.preventDefault();move(v[0],v[1])}}
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)
 },[move])
 async function save(){
  setSaving(true);const supabase=createClient()
  const {error}=await supabase.from('profiles').update({avatar_config:avatar as unknown as Json,updated_at:new Date().toISOString()}).eq('id',userId)
  setSaving(false);setStatus(error?'Avatar save failed':'Avatar saved')
 }
 function dance(d:Dance){const next={...position,dance:d};setPosition(next);setAvatar(a=>({...a,dance:d}));publish(next)}
 return <section className="mt-7 overflow-hidden rounded-[2rem] border border-white/10 bg-[#090a12]">
  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
   <div><p className="text-[10px] font-black uppercase tracking-[.28em] text-lime-300">Real-time 3D venue</p><h2 className="mt-1 text-xl font-black">The dancefloor</h2><p className="mt-1 text-xs text-zinc-500">{status} · {remotes.length+1} connections</p></div>
   <label className="text-xs text-zinc-400">Graphics <select value={quality} onChange={e=>setQuality(e.target.value as 'low'|'high')} className="ml-2 rounded-lg border border-white/10 bg-[#151421] px-2 py-2 text-white"><option value="low">Low data</option><option value="high">High quality</option></select></label>
  </header>
  <div className="relative h-[420px] sm:h-[540px]">
   <Canvas shadows={quality==='high'} dpr={quality==='high'?[1,1.5]:1} camera={{position:[0,7.5,12.5],fov:48}} gl={{antialias:quality==='high',powerPreference:'high-performance'}}>
    <Venue position={position} remotes={remotes} avatar={avatar} high={quality==='high'}/>
   </Canvas>
   <div className="absolute bottom-4 left-4 rounded-xl border border-white/10 bg-black/65 px-3 py-2 text-[11px] text-zinc-200">WASD / arrows to move · drag to look</div>
   <div className="absolute bottom-4 right-4 grid grid-cols-3 gap-1.5 sm:hidden">
    <span/><button aria-label="Move forward" onClick={()=>move(0,-.7)} className="h-11 w-11 rounded-xl bg-lime-300 text-lg font-black text-black">↑</button><span/>
    <button aria-label="Move left" onClick={()=>move(-.7,0)} className="h-11 w-11 rounded-xl bg-lime-300 text-lg font-black text-black">←</button>
    <button aria-label="Move backward" onClick={()=>move(0,.7)} className="h-11 w-11 rounded-xl bg-lime-300 text-lg font-black text-black">↓</button>
    <button aria-label="Move right" onClick={()=>move(.7,0)} className="h-11 w-11 rounded-xl bg-lime-300 text-lg font-black text-black">→</button>
   </div>
  </div>
  <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
   <div><p className="font-bold">{displayName||'Your avatar'}</p><p className="text-xs text-zinc-500">Your position is shared with verified room members</p></div>
   <div className="flex flex-wrap gap-2">{(['groove','bounce','sway','hype'] as Dance[]).map(d=><button key={d} onClick={()=>dance(d)} className="rounded-lg border border-white/10 px-3 py-2 text-xs capitalize text-zinc-200">{d}</button>)}<button onClick={()=>setEditing(v=>!v)} className="rounded-lg border border-lime-300/30 px-3 py-2 text-xs font-bold text-lime-200">Customize</button></div>
  </footer>
  {editing&&<div className="grid gap-4 p-5 sm:grid-cols-2">{(Object.keys(choices) as (keyof Avatar)[]).map(key=><label key={key} className="text-xs font-bold capitalize text-zinc-400">{key}<select value={avatar[key]} onChange={e=>setAvatar(a=>({...a,[key]:e.target.value} as Avatar))} className="mt-2 w-full rounded-xl border border-white/10 bg-[#12141e] px-4 py-3 text-sm text-white">{choices[key].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>)}<div className="sm:col-span-2"><button onClick={()=>void save()} disabled={saving} className="rounded-xl bg-lime-300 px-5 py-3 text-sm font-black text-black disabled:opacity-50">{saving?'Saving…':'Save character'}</button></div></div>}
 </section>
}
