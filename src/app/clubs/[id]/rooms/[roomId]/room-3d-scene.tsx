'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'

type AvatarConfig = {
  skin: 'warm'|'deep'|'light'|'tan'
  hair: 'curly'|'fade'|'braids'|'short'
  outfit: 'neon'|'street'|'vip'|'classic'
  dance: 'groove'|'bounce'|'sway'|'hype'
}
const defaults: AvatarConfig = { skin:'warm', hair:'curly', outfit:'neon', dance:'groove' }
const options = {
  skin: [{value:'warm',label:'Warm brown'},{value:'deep',label:'Deep brown'},{value:'light',label:'Light'},{value:'tan',label:'Tan'}],
  hair: [{value:'curly',label:'Curly'},{value:'fade',label:'Fade'},{value:'braids',label:'Braids'},{value:'short',label:'Short'}],
  outfit: [{value:'neon',label:'Neon'},{value:'street',label:'Streetwear'},{value:'vip',label:'VIP'},{value:'classic',label:'Classic'}],
  dance: [{value:'groove',label:'Groove'},{value:'bounce',label:'Bounce'},{value:'sway',label:'Sway'},{value:'hype',label:'Hype'}],
}
const skinColor: Record<AvatarConfig['skin'],string> = { warm:'#a96745',deep:'#613b2d',light:'#e0ad83',tan:'#c9875c' }
const outfitColor: Record<AvatarConfig['outfit'],string> = { neon:'#c7ff38',street:'#6478ff',vip:'#e7bd75',classic:'#d5d9e2' }

function Avatar({ config, label, className='' }: {config:AvatarConfig;label:string;className?:string}) {
  return <div className={`avatar-figure ${className} dance-${config.dance}`} aria-label={label}>
    <div className="avatar-shadow"/>
    <div className="avatar-head" style={{background:skinColor[config.skin]}}>
      <div className={`avatar-hair hair-${config.hair}`}/>
      <div className="avatar-face"><i/><i/></div>
    </div>
    <div className="avatar-neck" style={{background:skinColor[config.skin]}}/>
    <div className="avatar-body" style={{background:outfitColor[config.outfit]}}>
      <span className="avatar-chain"/>
    </div>
    <div className="avatar-arm avatar-arm-left" style={{background:skinColor[config.skin]}}/>
    <div className="avatar-arm avatar-arm-right" style={{background:skinColor[config.skin]}}/>
    <div className="avatar-leg avatar-leg-left"/><div className="avatar-leg avatar-leg-right"/>
    <div className="avatar-name">{label}</div>
  </div>
}

export default function Room3DScene({ userId, initialConfig, displayName }: {
  userId:string; initialConfig:Json | null; displayName:string
}) {
  const [config,setConfig] = useState<AvatarConfig>(() => ({...defaults,...(initialConfig && typeof initialConfig==='object' && !Array.isArray(initialConfig) ? initialConfig : {})}) as AvatarConfig)
  const [saving,setSaving] = useState(false)
  const [message,setMessage] = useState('')
  const [editorOpen,setEditorOpen] = useState(false)

  function change<K extends keyof AvatarConfig>(key:K,value:AvatarConfig[K]) {
    setConfig(current=>({...current,[key]:value}))
  }
  async function saveAvatar() {
    setSaving(true);setMessage('')
    const supabase=createClient()
    const {error}=await supabase.from('profiles').update({avatar_config:config as unknown as Json,updated_at:new Date().toISOString()}).eq('id',userId)
    setSaving(false)
    setMessage(error?'Could not save your avatar. Please try again.':'Avatar saved to your profile.')
  }

  return <section className="mt-7 overflow-hidden rounded-[2rem] border border-white/10 bg-[#090a12]">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-7">
      <div><p className="text-[10px] font-black uppercase tracking-[.28em] text-lime-300">Live virtual venue</p><h2 className="mt-1 text-xl font-black">The dancefloor</h2></div>
      <div className="flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/5 px-3 py-1.5 text-xs text-lime-200"><span className="h-2 w-2 animate-pulse rounded-full bg-lime-300"/> Your avatar is in the club</div>
    </div>
    <div className="nightclub-scene relative min-h-[410px] overflow-hidden sm:min-h-[480px]">
      <div className="club-ceiling-light light-one"/><div className="club-ceiling-light light-two"/><div className="club-laser laser-one"/><div className="club-laser laser-two"/>
      <div className="club-back-wall"><div className="club-sign">NIGHTLIFE <b>KE</b></div><div className="club-equalizer"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></div>
      <div className="club-dj-platform"><span>DJ BOOTH</span><div className="club-decks"><i/><i/><i/></div></div>
      <div className="club-floor"/>
      <Avatar config={{...config,dance:'sway',outfit:'street'}} label="Guest" className="guest-one"/>
      <Avatar config={{...config,dance:'bounce',outfit:'vip',hair:'braids'}} label="Guest" className="guest-two"/>
      <Avatar config={{...config,dance:'hype',outfit:'classic',hair:'fade'}} label="Guest" className="guest-three"/>
      <Avatar config={config} label={displayName || 'You'} className="avatar-you"/>
      <div className="scene-caption"><span className="text-lime-200">●</span> Dancefloor · Virtual preview</div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-white/[.025] px-5 py-4 sm:px-7">
      <div><p className="font-bold">Your character</p><p className="text-xs text-zinc-500">Choose your look and dance style</p></div>
      <button onClick={()=>setEditorOpen(v=>!v)} className="rounded-xl border border-lime-300/30 px-4 py-2.5 text-sm font-bold text-lime-200 hover:bg-lime-300/10">{editorOpen?'Close editor':'Customize avatar'}</button>
    </div>
    {editorOpen && <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7">
      {(Object.keys(options) as (keyof AvatarConfig)[]).map(key=><label key={key} className="block"><span className="mb-2 block text-xs font-bold capitalize text-zinc-400">{key}</span><select value={config[key]} onChange={e=>change(key,e.target.value as never)} className="w-full rounded-xl border border-white/10 bg-[#12141e] px-4 py-3 text-sm text-white">{options[key].map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>)}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><button onClick={()=>void saveAvatar()} disabled={saving} className="rounded-xl bg-lime-300 px-5 py-3 text-sm font-black text-black disabled:opacity-50">{saving?'Saving…':'Save character'}</button><button onClick={()=>setConfig(defaults)} className="rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-300">Reset</button>{message&&<span role="status" className="text-xs text-zinc-400">{message}</span>}</div>
    </div>}
    <style jsx>{`
      .nightclub-scene{perspective:900px;background:radial-gradient(ellipse at 50% 42%,#48215f 0%,#1a1430 36%,#090b17 76%);isolation:isolate}
      .club-back-wall{position:absolute;inset:10% 9% 35%;border:1px solid #ffffff12;background:linear-gradient(180deg,#191529,#10111d);transform:rotateX(-5deg);box-shadow:0 0 70px #8c3cff20}
      .club-sign{position:absolute;top:18%;width:100%;text-align:center;font-size:clamp(19px,4vw,36px);font-weight:1000;letter-spacing:.22em;color:#fff;text-shadow:0 0 12px #d35cff,0 0 35px #a52cff}
      .club-sign b{color:#c8ff39}
      .club-equalizer{position:absolute;bottom:10%;left:25%;right:25%;height:24%;display:flex;align-items:end;justify-content:center;gap:5px}
      .club-equalizer i{width:7%;height:var(--h,35%);border-radius:5px 5px 0 0;background:linear-gradient(#d75cff,#643aff);box-shadow:0 0 15px #b94bff;animation:eq .8s ease-in-out infinite alternate}
      .club-equalizer i:nth-child(2n){--h:80%;animation-delay:.2s}.club-equalizer i:nth-child(3n){--h:55%;animation-delay:.4s}
      .club-floor{position:absolute;left:-10%;right:-10%;bottom:-17%;height:55%;transform:rotateX(62deg);transform-origin:top;background:repeating-linear-gradient(90deg,#ffffff0a 0 1px,transparent 1px 60px),repeating-linear-gradient(0deg,#ffffff0a 0 1px,transparent 1px 60px),linear-gradient(135deg,#191329,#25203c 50%,#111522);box-shadow:0 -20px 60px #b53cff22}
      .club-dj-platform{position:absolute;z-index:2;top:39%;left:50%;width:34%;height:19%;transform:translateX(-50%) rotateX(10deg);border:1px solid #c45aff66;background:linear-gradient(180deg,#402454,#171321);box-shadow:0 0 30px #c44dff35;text-align:center;color:#f0c9ff;font-size:9px;letter-spacing:.2em;padding-top:5px}
      .club-decks{display:flex;justify-content:center;gap:9px;margin:6px auto}.club-decks i{width:25px;height:25px;border:3px solid #a8ff38;border-radius:50%;box-shadow:0 0 10px #a8ff38}
      .club-ceiling-light{position:absolute;z-index:1;top:0;width:35%;height:65%;filter:blur(28px);opacity:.38;background:linear-gradient(180deg,#b43cff,transparent);clip-path:polygon(35% 0,65% 0,100% 100%,0 100%)}
      .light-one{left:2%;transform:rotate(18deg)}.light-two{right:2%;background:linear-gradient(180deg,#55dfff,transparent);transform:rotate(-18deg)}
      .club-laser{position:absolute;z-index:2;top:10%;width:1px;height:75%;background:#c8ff39;box-shadow:0 0 8px #c8ff39;opacity:.55;transform:rotate(24deg);left:24%}.laser-two{left:auto;right:25%;background:#b85cff;box-shadow:0 0 8px #b85cff;transform:rotate(-24deg)}
      .avatar-figure{position:absolute;z-index:4;width:65px;height:150px;bottom:16%;transform-style:preserve-3d;filter:drop-shadow(0 12px 10px #0008)}
      .avatar-head{position:absolute;top:0;left:22px;width:28px;height:32px;border-radius:46% 46% 42% 42%;z-index:3;box-shadow:inset -5px -2px 0 #0002}
      .avatar-hair{position:absolute;left:-2px;top:-5px;width:32px;height:13px;border-radius:50% 50% 20% 20%;background:#17121b}
      .hair-curly{box-shadow:0 -5px 0 -1px #17121b,7px -5px 0 -1px #17121b,15px -4px 0 -1px #17121b,24px -3px 0 -1px #17121b}
      .hair-braids{height:18px;border-radius:45% 45% 25% 25%;background:repeating-linear-gradient(90deg,#211520 0 3px,#65402f 3px 5px)}
      .hair-fade{height:8px;border-radius:40% 40% 20% 20%}.hair-short{height:7px}
      .avatar-face{position:absolute;top:15px;left:7px;display:flex;gap:8px}.avatar-face i{width:3px;height:3px;border-radius:50%;background:#211511}
      .avatar-neck{position:absolute;top:28px;left:32px;width:9px;height:10px;z-index:2}
      .avatar-body{position:absolute;top:36px;left:15px;width:43px;height:52px;border-radius:12px 12px 8px 8px;z-index:2;box-shadow:inset -7px -2px 0 #0002}
      .avatar-chain{position:absolute;left:14px;top:4px;width:14px;height:12px;border-bottom:1px solid #fff9;border-radius:50%}
      .avatar-arm{position:absolute;top:40px;width:11px;height:48px;border-radius:9px;transform-origin:top center;z-index:1}
      .avatar-arm-left{left:9px;transform:rotate(20deg)}.avatar-arm-right{right:4px;transform:rotate(-22deg)}
      .avatar-leg{position:absolute;top:82px;width:13px;height:48px;border-radius:8px;background:#24212c;z-index:1}
      .avatar-leg-left{left:19px;transform:rotate(4deg)}.avatar-leg-right{left:40px;transform:rotate(-4deg)}
      .avatar-shadow{position:absolute;bottom:13px;left:5px;width:60px;height:13px;border-radius:50%;background:#0009;filter:blur(5px)}
      .avatar-name{position:absolute;top:135px;left:-18px;width:100px;text-align:center;font-size:10px;color:#fff;text-shadow:0 1px 5px #000}
      .avatar-you{left:50%;bottom:12%;transform:translateX(-50%) scale(1.18);z-index:6}
      .guest-one{left:17%;bottom:17%;transform:scale(.84)}.guest-two{right:16%;bottom:17%;transform:scale(.9)}.guest-three{left:34%;bottom:7%;transform:scale(.7)}
      .dance-groove{animation:groove 1.3s ease-in-out infinite}.dance-bounce{animation:bounce .65s ease-in-out infinite}.dance-sway{animation:sway 1.7s ease-in-out infinite}.dance-hype{animation:hype .55s ease-in-out infinite}
      .scene-caption{position:absolute;z-index:8;bottom:12px;left:16px;border:1px solid #ffffff1a;border-radius:999px;background:#08090dcc;padding:7px 12px;font-size:10px;color:#ddd}
      @keyframes groove{0%,100%{translate:0 0;rotate:-3deg}50%{translate:0 -8px;rotate:3deg}}
      @keyframes bounce{0%,100%{translate:0 0}50%{translate:0 -15px}}
      @keyframes sway{0%,100%{rotate:-7deg}50%{rotate:7deg}}
      @keyframes hype{0%,100%{translate:0 0;rotate:-8deg}50%{translate:0 -13px;rotate:8deg}}
      @keyframes eq{to{height:90%}}
      @media(max-width:520px){.avatar-figure{scale:.82}.avatar-you{scale:1}.club-dj-platform{width:42%}.club-back-wall{left:4%;right:4%}}
      @media(prefers-reduced-motion:reduce){.avatar-figure,.club-equalizer i{animation:none!important}}
    `}</style>
  </section>
}
