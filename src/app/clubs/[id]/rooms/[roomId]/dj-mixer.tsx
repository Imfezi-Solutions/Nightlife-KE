'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type DJMix = {
  playing: boolean
  bpm: number
  crossfader: number
  master: number
  bass: number
  treble: number
  filter: number
  deckAPath: string | null
  deckBPath: string | null
  deckAName: string
  deckBName: string
  playbackStartedAt: number | null
}
export const DEFAULT_DJ_MIX: DJMix = {
  playing: false, bpm: 118, crossfader: 0, master: 0.72, bass: 0, treble: 0, filter: 18000,
  deckAPath: null, deckBPath: null, deckAName: '', deckBName: '', playbackStartedAt: null,
}
type Props = {
  roomId: string
  userId: string
  mix: DJMix
  isDJ: boolean
  djName: string | null
  onClaim: () => void
  onMixChange: (next: DJMix) => void
}
type QueueTrack = { id:string; title:string; artist:string|null; duration_ms:number; provider_asset_id:string; position:number; created_at:string }
type AudioRig = {
  context: AudioContext
  master: GainNode
  low: BiquadFilterNode
  high: BiquadFilterNode
  filter: BiquadFilterNode
  deckA: GainNode
  deckB: GainNode
  elementA: HTMLAudioElement
  elementB: HTMLAudioElement
  sourceA: MediaElementAudioSourceNode
  sourceB: MediaElementAudioSourceNode
}
export default function DJMixer({ roomId, userId, mix, isDJ, djName, onClaim, onMixChange }: Props) {
  const rig = useRef<AudioRig | null>(null)
  const [open, setOpen] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [uploading, setUploading] = useState<'A' | 'B' | null>(null)
  const [error, setError] = useState('')
  const [rightsConfirmed, setRightsConfirmed] = useState(false)
  const [deckAUrl, setDeckAUrl] = useState<string | null>(null)
  const [deckBUrl, setDeckBUrl] = useState<string | null>(null)
  const [queue, setQueue] = useState<QueueTrack[]>([])
  const [progress, setProgress] = useState({ a:0, b:0, da:0, db:0 })

  const ensureAudio = useCallback(async () => {
    if (!rig.current) {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) throw new Error('This browser does not support live audio mixing.')
      const context = new AudioContextClass()
      const master = context.createGain()
      const low = context.createBiquadFilter()
      const high = context.createBiquadFilter()
      const filter = context.createBiquadFilter()
      const deckA = context.createGain()
      const deckB = context.createGain()
      const elementA = new Audio()
      const elementB = new Audio()
      elementA.crossOrigin = 'anonymous'; elementB.crossOrigin = 'anonymous'
      elementA.preload = 'auto'; elementB.preload = 'auto'
      const sourceA = context.createMediaElementSource(elementA)
      const sourceB = context.createMediaElementSource(elementB)
      sourceA.connect(deckA); sourceB.connect(deckB)
      deckA.connect(filter); deckB.connect(filter)
      filter.connect(low).connect(high).connect(master).connect(context.destination)
      rig.current = { context, master, low, high, filter, deckA, deckB, elementA, elementB, sourceA, sourceB }
    }
    await rig.current.context.resume()
    setAudioEnabled(true)
    return rig.current
  }, [])

  useEffect(() => {
    const audio = rig.current
    if (!audio) return
    const x = (mix.crossfader + 1) / 2
    audio.deckA.gain.setTargetAtTime(Math.cos(x * Math.PI / 2), audio.context.currentTime, .04)
    audio.deckB.gain.setTargetAtTime(Math.sin(x * Math.PI / 2), audio.context.currentTime, .04)
    audio.master.gain.setTargetAtTime(mix.master, audio.context.currentTime, .04)
    audio.low.gain.setTargetAtTime(mix.bass, audio.context.currentTime, .04)
    audio.high.gain.setTargetAtTime(mix.treble, audio.context.currentTime, .04)
    audio.filter.frequency.setTargetAtTime(mix.filter, audio.context.currentTime, .04)
    audio.elementA.playbackRate = mix.bpm / 118
    audio.elementB.playbackRate = mix.bpm / 118
  }, [mix.crossfader, mix.master, mix.bass, mix.treble, mix.filter, mix.bpm])

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = async () => {
      const path = mix.deckAPath
      if (!path) { setDeckAUrl(null); return }
      const { data, error } = await createClient().storage.from('room-audio').createSignedUrl(path, 3600)
      if (cancelled) return
      if (error || !data?.signedUrl) { setError(error?.message || 'Could not prepare Deck A for room playback.'); setDeckAUrl(null) }
      else { setDeckAUrl(data.signedUrl); setError('') }
      timer = setTimeout(refresh, 50 * 60 * 1000)
    }
    void refresh()
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [roomId, mix.deckAPath])

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = async () => {
      const path = mix.deckBPath
      if (!path) { setDeckBUrl(null); return }
      const { data, error } = await createClient().storage.from('room-audio').createSignedUrl(path, 3600)
      if (cancelled) return
      if (error || !data?.signedUrl) { setError(error?.message || 'Could not prepare Deck B for room playback.'); setDeckBUrl(null) }
      else { setDeckBUrl(data.signedUrl); setError('') }
      timer = setTimeout(refresh, 50 * 60 * 1000)
    }
    void refresh()
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [roomId, mix.deckBPath])

  useEffect(() => {
    const audio = rig.current
    if (!audio) return
    const updateDeck = (element: HTMLAudioElement, url: string | null) => {
      if (element.src !== (url || '')) {
        element.pause()
        element.src = url || ''
        element.load()
      }
    }
    updateDeck(audio.elementA, deckAUrl)
    updateDeck(audio.elementB, deckBUrl)
    if (!mix.playing) {
      audio.elementA.pause(); audio.elementB.pause()
      return
    }
    const syncPlay = async (element: HTMLAudioElement) => {
      if (!element.src) return
      if (mix.playbackStartedAt) {
        const elapsed = Math.max(0, (Date.now() - mix.playbackStartedAt) / 1000)
        if (Number.isFinite(element.duration) && element.duration > 0) {
          const target = elapsed % element.duration
          if (Math.abs(element.currentTime - target) > 1.25) element.currentTime = target
        }
      }
      try { await element.play() } catch { /* Guest must tap Enable room audio first. */ }
    }
    void syncPlay(audio.elementA)
    void syncPlay(audio.elementB)
  }, [deckAUrl, deckBUrl, mix.playing, mix.playbackStartedAt])

  useEffect(() => {
    let active = true
    const supabase = createClient()
    const load = async () => {
      const { data, error } = await supabase.from('dj_queue').select('id,title,artist,duration_ms,provider_asset_id,position,created_at').eq('room_id',roomId).eq('rights_status','approved').order('position',{ascending:true}).order('created_at',{ascending:true})
      if (active && !error) setQueue((data || []) as QueueTrack[])
      if (active && error) setError(error.message)
    }
    void load()
    const channel = supabase.channel('dj-queue-'+roomId).on('postgres_changes',{event:'*',schema:'public',table:'dj_queue',filter:'room_id=eq.'+roomId},()=>{void load()}).subscribe()
    return () => { active=false; void supabase.removeChannel(channel) }
  },[roomId])

  useEffect(() => {
    const timer = setInterval(() => {
      const a=rig.current?.elementA, b=rig.current?.elementB
      if (!a || !b) return
      setProgress({a:a.duration>0?a.currentTime/a.duration:0,b:b.duration>0?b.currentTime/b.duration:0,da:Number.isFinite(a.duration)?a.duration:0,db:Number.isFinite(b.duration)?b.duration:0})
    },250)
    return () => clearInterval(timer)
  },[])

  useEffect(() => () => {
    if (rig.current) {
      rig.current.elementA.pause(); rig.current.elementB.pause()
      void rig.current.context.close()
      rig.current = null
    }
  }, [])

  const change = (key: keyof DJMix, value: number | boolean | string | null) => onMixChange({ ...mix, [key]: value })
  const enableAudio = async () => {
    try {
      const audio = await ensureAudio()
      let urlA = deckAUrl
      let urlB = deckBUrl
      if (mix.deckAPath && !urlA) {
        const { data, error } = await createClient().storage.from('room-audio').createSignedUrl(mix.deckAPath, 3600)
        if (error) throw error
        urlA = data?.signedUrl || null
        setDeckAUrl(urlA)
      }
      if (mix.deckBPath && !urlB) {
        const { data, error } = await createClient().storage.from('room-audio').createSignedUrl(mix.deckBPath, 3600)
        if (error) throw error
        urlB = data?.signedUrl || null
        setDeckBUrl(urlB)
      }
      audio.elementA.src = urlA || ''
      audio.elementB.src = urlB || ''
      audio.elementA.load(); audio.elementB.load()
      if (mix.playing) {
        await Promise.all([audio.elementA.play().catch(()=>{}), audio.elementB.play().catch(()=>{})])
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not enable audio.') }
  }
  const togglePlayback = async () => {
    if (!audioEnabled) await enableAudio()
    onMixChange({ ...mix, playing: !mix.playing, playbackStartedAt: !mix.playing ? Date.now() : null })
  }
  const uploadTrack = async (deck: 'A' | 'B', file?: File) => {
    if (!file) return
    if (!rightsConfirmed) { setError('Confirm that you own this music or have permission to stream it.'); return }
    if (!file.type.startsWith('audio/') || !/\.(mp3|wav|ogg|m4a|aac)$/i.test(file.name)) {
      setError('Choose an MP3, WAV, OGG, M4A or AAC audio file.'); return
    }
    if (file.size > 25 * 1024 * 1024) { setError('Each track must be 25 MB or smaller.'); return }
    setUploading(deck); setError('')
    let uploadedPath: string | null = null
    try {
      const localUrl = URL.createObjectURL(file)
      const durationMs = await new Promise<number>((resolve, reject) => {
        const probe = new Audio()
        probe.preload = 'metadata'
        probe.onloadedmetadata = () => { const duration = probe.duration; URL.revokeObjectURL(localUrl); if (!Number.isFinite(duration) || duration <= 0) reject(new Error('Could not read the track duration.')); else resolve(Math.round(duration * 1000)) }
        probe.onerror = () => { URL.revokeObjectURL(localUrl); reject(new Error('This audio file could not be decoded by the browser.')) }
        probe.src = localUrl
      })
      const supabase = createClient()
      const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-90)
      const path = roomId + '/' + userId + '/' + crypto.randomUUID() + '-' + safeName
      const { error: uploadError } = await supabase.storage.from('room-audio').upload(path, file, { contentType: file.type, upsert: false })
      if (uploadError) throw uploadError
      uploadedPath = path
      const { error: queueError } = await supabase.from('dj_queue').insert({
        room_id: roomId, added_by: userId, source_type: 'original_upload', provider_asset_id: path,
        title: file.name, artist: null, duration_ms: durationMs,
        rights_reference: 'DJ attestation: uploader confirms ownership or permission to stream this audio in Nightlife KE.',
        rights_status: 'approved', position: queue.length,
      })
      if (queueError) throw queueError
      const key = deck === 'A' ? 'deckA' : 'deckB'
      const next = { ...mix, playing: false, playbackStartedAt: null } as DJMix
      if (key === 'deckA') { next.deckAPath = path; next.deckAName = file.name }
      else { next.deckBPath = path; next.deckBName = file.name }
      onMixChange(next)
      setRightsConfirmed(false)
    } catch (e) {
      if (uploadedPath) {
        const supabase = createClient()
        await supabase.from('dj_queue').delete().eq('provider_asset_id', uploadedPath).eq('room_id', roomId).then(()=>{})
        await supabase.storage.from('room-audio').remove([uploadedPath]).catch(()=>{})
      }
      setError(e instanceof Error ? e.message : 'Track upload failed. Your account must be an age-verified DJ or room owner/moderator.')
    } finally { setUploading(null) }
  }

  const loadQueueTrack = (track:QueueTrack, deck:'A'|'B') => onMixChange({...mix,playing:false,playbackStartedAt:null,...(deck==='A'?{deckAPath:track.provider_asset_id,deckAName:track.title}:{deckBPath:track.provider_asset_id,deckBName:track.title})})
  const [deletingTrack,setDeletingTrack] = useState<string|null>(null)
  const [deleteError,setDeleteError] = useState('')
  const deleteTrack = async (track:QueueTrack) => {
    if (deletingTrack) return
    if (!window.confirm('Remove this song from the club queue?')) return
    setDeletingTrack(track.id); setDeleteError('')
    const supabase=createClient()
    const {error:removeError}=await supabase.from('dj_queue').delete().eq('id',track.id).eq('room_id',roomId)
    if(removeError){setDeleteError(removeError.message);setDeletingTrack(null);return}
    const stillLoaded = mix.deckAPath===track.provider_asset_id || mix.deckBPath===track.provider_asset_id
    if(!stillLoaded && track.provider_asset_id.startsWith(roomId+'/')) await supabase.storage.from('room-audio').remove([track.provider_asset_id])
    setDeletingTrack(null)
  }
  const cue = (deck:'A'|'B') => { const el=deck==='A'?rig.current?.elementA:rig.current?.elementB; if(el) el.currentTime=0 }
  const fmt = (n:number) => Number.isFinite(n)&&n>=0 ? Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0') : '0:00'
  const bars = Array.from({length:56},(_,i)=>12+Math.abs(Math.sin(i*1.73)*Math.cos(i*.31))*78)
  const deckPanel = (deck:'A'|'B') => {
    const name=deck==='A'?mix.deckAName:mix.deckBName, p=deck==='A'?progress.a:progress.b, duration=deck==='A'?progress.da:progress.db
    const tint=deck==='A'?'cyan':'fuchsia'
    return <section key={deck} className="min-w-0 rounded-2xl border border-white/10 bg-[#11121c] p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><span className={'grid h-7 w-7 place-items-center rounded-lg text-xs font-black '+(deck==='A'?'bg-cyan-300 text-black':'bg-fuchsia-300 text-black')}>{deck}</span><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-zinc-400">Deck {deck}</p><p className="text-[9px] text-zinc-600">PLAYER 0{deck==='A'?'1':'2'}</p></div></div><span className={'rounded-full px-2 py-1 text-[9px] font-black '+(mix.playing&&name?'bg-emerald-300/15 text-emerald-300':'bg-white/5 text-zinc-500')}>{mix.playing&&name?'ON AIR':'STANDBY'}</span></div>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <div className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full border border-white/10 bg-[radial-gradient(circle,#343541_0%,#10111a_68%,#080910_70%)] shadow-[0_12px_38px_rgba(0,0,0,.6)] sm:h-40 sm:w-40">
          <div className="absolute inset-[9px] rounded-full border border-white/10"/><div className="absolute inset-[18px] rounded-full border border-white/10"/><div className="absolute inset-[27px] rounded-full border border-white/10"/><div className="absolute inset-[35px] rounded-full border border-white/10"/>
          <div className="absolute inset-0 rounded-full opacity-50" style={{background:'repeating-conic-gradient(transparent 0deg 3deg,rgba(255,255,255,.15) 3.2deg 3.5deg)'}}/>
          <div className="relative grid h-14 w-14 place-items-center rounded-full border-4 border-[#858694] bg-[radial-gradient(circle_at_35%_30%,#f4f4f6,#555765_45%,#171822_75%)]" style={{animation:'nightlife-vinyl-spin 2.2s linear infinite',animationPlayState:mix.playing&&name?'running':'paused'}}><span className={'h-3 w-3 rounded-full '+(deck==='A'?'bg-cyan-300':'bg-fuchsia-300')}/></div>
          <span className="absolute right-6 top-6 h-2 w-2 rounded-full bg-white shadow-[0_0_8px_white]"/>
        </div>
        <div className="min-w-0 flex-1 self-stretch"><p className="text-[9px] font-bold uppercase tracking-[.2em] text-zinc-500">Now loaded</p><p className="mt-1 min-h-10 break-words text-sm font-bold text-white">{name||'Load a track to this deck'}</p>
          <div className="mt-3 flex h-10 items-center gap-[2px] overflow-hidden rounded-lg border border-white/5 bg-black/40 px-2">{bars.map((h,i)=><span key={i} className={'flex-1 rounded-full '+(deck==='A'?'bg-cyan-300':'bg-fuchsia-300')} style={{height:h+'%',opacity:i/bars.length<p?.95:.28}}/>)}</div>
          <div className="mt-2 flex justify-between text-[10px] tabular-nums text-zinc-500"><span>{fmt(p*duration)}</span><span>{fmt(duration)}</span></div>
          <div className="mt-3 flex flex-wrap gap-2"><button onClick={()=>cue(deck)} disabled={!name} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-black uppercase text-zinc-200 disabled:opacity-30">Cue / Reset</button><label className="cursor-pointer rounded-lg bg-white/10 px-3 py-2 text-[10px] font-black uppercase text-white">{uploading===deck?'Uploading…':'Load track'}<input type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac" disabled={!!uploading} className="hidden" onChange={e=>{void uploadTrack(deck,e.target.files?.[0]);e.currentTarget.value=''}}/></label></div>
        </div>
      </div>
      <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Tempo / pitch <span className="float-right text-white">{mix.bpm} BPM</span></p><input aria-label={'Deck '+deck+' tempo'} type="range" min="80" max="160" value={mix.bpm} onChange={e=>change('bpm',Number(e.target.value))} className={'mt-2 w-full '+(deck==='A'?'accent-cyan-300':'accent-fuchsia-300')}/>
    </section>
  }

  return <div className="border-t border-white/10 px-5 py-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.25em] text-fuchsia-200">Live room sound</p><p className="mt-1 text-xs text-zinc-400">{djName?'DJ: '+djName:'No DJ on the decks'} · {mix.playing?'Mix is live':'Music stopped'}</p></div>
      <div className="flex flex-wrap gap-2">{!audioEnabled&&<button onClick={()=>void enableAudio()} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white">Enable room audio</button>}{!isDJ&&<button onClick={()=>{onClaim();setOpen(true)}} className="rounded-lg bg-fuchsia-300 px-3 py-2 text-xs font-black text-black">Become the DJ</button>}{isDJ&&<><button onClick={()=>setOpen(v=>!v)} className="rounded-lg bg-fuchsia-300 px-3 py-2 text-xs font-black text-black">{open?'Close DJ studio':'Open DJ studio'}</button><button onClick={()=>void togglePlayback()} className="rounded-lg border border-fuchsia-300/30 px-3 py-2 text-xs text-fuchsia-100">{mix.playing?'Pause room music':'Play room mix'}</button></>}</div>
    </div>
    {open&&isDJ&&<div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-2 backdrop-blur-md sm:p-4"><div className="max-h-[96vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-white/10 bg-[#090a11] p-3 shadow-2xl sm:rounded-3xl sm:p-5">
      <style>{'@keyframes nightlife-vinyl-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}'}</style>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-300 to-cyan-300 text-lg font-black text-black">N</div><div><p className="text-[11px] font-black uppercase tracking-[.25em] text-fuchsia-200">Nightlife KE · DJ Pro</p><p className="mt-1 text-xs text-zinc-500">Dual turntable performance console · <span className="text-emerald-300">● Connected</span></p></div></div><div className="flex items-center gap-2"><span className="hidden text-[10px] text-zinc-500 sm:inline">{djName||'Live DJ'}</span><button onClick={()=>setOpen(false)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300">Minimise ✕</button></div></header>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#12131e] px-3 py-3"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-zinc-500">Master output</p><p className="mt-1 text-sm font-black text-white">{mix.playing?'LIVE IN THE CLUB':'MIXER STANDBY'} <span className="ml-2 text-xs font-normal text-zinc-500">· {mix.bpm} BPM</span></p></div><div className="flex gap-2"><button onClick={()=>void togglePlayback()} className={'rounded-lg px-5 py-3 text-xs font-black uppercase '+(mix.playing?'bg-rose-400 text-black':'bg-emerald-300 text-black')}>{mix.playing?'Ⅱ Pause mix':'▶ Start mix'}</button><button onClick={()=>{onMixChange({...mix,playing:false,playbackStartedAt:null});rig.current?.elementA.pause();rig.current?.elementB.pause()}} className="rounded-lg border border-white/10 px-4 py-3 text-xs text-zinc-300">■ Stop</button></div></div>
      <label className="mb-4 flex items-start gap-2 rounded-xl border border-white/5 bg-white/[.025] p-3 text-[11px] text-zinc-400"><input type="checkbox" checked={rightsConfirmed} onChange={e=>setRightsConfirmed(e.target.checked)} className="mt-0.5 accent-fuchsia-300"/><span>I own these tracks or have permission to upload and stream them in this club.</span></label>
      <div className="grid gap-3 lg:grid-cols-2">{deckPanel('A')}{deckPanel('B')}</div>
      <section className="mt-3 rounded-2xl border border-white/10 bg-[#11121c] p-3 sm:p-4"><div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-zinc-300">Central mixer</p><p className="mt-1 text-[10px] text-zinc-600">Blend both decks into the club output</p></div><span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold text-zinc-400">MASTER {Math.round(mix.master*100)}%</span></div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <label className="rounded-xl bg-black/30 p-3 text-[10px] font-bold uppercase text-zinc-500">Bass EQ <span className="float-right text-cyan-200">{mix.bass.toFixed(1)} dB</span><input aria-label="Bass EQ" type="range" min="-18" max="18" step=".5" value={mix.bass} onChange={e=>change('bass',Number(e.target.value))} className="mt-3 w-full accent-cyan-300"/></label>
          <label className="rounded-xl bg-black/30 p-3 text-[10px] font-bold uppercase text-zinc-500">Treble EQ <span className="float-right text-fuchsia-200">{mix.treble.toFixed(1)} dB</span><input aria-label="Treble EQ" type="range" min="-18" max="18" step=".5" value={mix.treble} onChange={e=>change('treble',Number(e.target.value))} className="mt-3 w-full accent-fuchsia-300"/></label>
          <label className="rounded-xl bg-black/30 p-3 text-[10px] font-bold uppercase text-zinc-500">Filter <span className="float-right text-white">{Math.round(mix.filter)} Hz</span><input aria-label="Filter" type="range" min="250" max="18000" step="50" value={mix.filter} onChange={e=>change('filter',Number(e.target.value))} className="mt-3 w-full accent-violet-300"/></label>
          <label className="rounded-xl bg-black/30 p-3 text-[10px] font-bold uppercase text-zinc-500">Master volume <span className="float-right text-white">{Math.round(mix.master*100)}%</span><input aria-label="Master volume" type="range" min="0" max="1" step=".01" value={mix.master} onChange={e=>change('master',Number(e.target.value))} className="mt-3 w-full accent-emerald-300"/></label>
        </div>
        <div className="mt-4 rounded-xl bg-black/30 p-3"><div className="mb-2 flex justify-between text-[10px] font-black uppercase tracking-[.2em] text-zinc-500"><span>Crossfader</span><span className="text-zinc-300">{mix.crossfader<-.15?'Deck A':mix.crossfader>.15?'Deck B':'Centre blend'}</span></div><div className="flex items-center gap-3"><span className="text-xs font-black text-cyan-300">A</span><input aria-label="Crossfader" type="range" min="-1" max="1" step=".01" value={mix.crossfader} onChange={e=>change('crossfader',Number(e.target.value))} className="w-full accent-fuchsia-300"/><span className="text-xs font-black text-fuchsia-300">B</span></div></div>
      </section>
      <section className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#11121c]"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-zinc-300">Music library · room queue</p><p className="mt-1 text-[10px] text-zinc-600">Choose a queued song and load it as your next transition</p></div><span className="rounded-full bg-fuchsia-300/10 px-3 py-1 text-[10px] font-bold text-fuchsia-200">{queue.length} TRACKS</span></div>
        {queue.length===0?<div className="px-4 py-8 text-center"><p className="text-sm font-bold text-zinc-300">Your room playlist is empty</p><p className="mt-1 text-xs text-zinc-600">Upload a track on either deck. It will appear here for the next mix.</p></div>:<div className="max-h-64 overflow-y-auto">{queue.map((track,index)=><div key={track.id} className="flex flex-wrap items-center gap-3 border-b border-white/5 px-3 py-3 last:border-0 hover:bg-white/[.025] sm:px-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-[10px] font-black text-zinc-500">{String(index+1).padStart(2,'0')}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-white">{track.title}</p><p className="mt-1 text-[10px] text-zinc-600">{track.artist||'Room upload'} · {fmt(track.duration_ms/1000)}</p></div><button onClick={()=>loadQueueTrack(track,'A')} className="rounded-lg border border-cyan-300/20 px-3 py-2 text-[9px] font-black uppercase text-cyan-200 hover:bg-cyan-300/10">Load A</button><button onClick={()=>loadQueueTrack(track,'B')} className="rounded-lg border border-fuchsia-300/20 px-3 py-2 text-[9px] font-black uppercase text-fuchsia-200 hover:bg-fuchsia-300/10">Load B</button><button onClick={()=>void deleteTrack(track)} disabled={!!deletingTrack} className="rounded-lg border border-rose-400/25 px-3 py-2 text-[9px] font-black uppercase text-rose-300 disabled:opacity-40">{deletingTrack===track.id?'Removing…':'Delete'}</button></div>)}</div>}
      </section>
      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-600"><span>Each guest enables room audio once. Upload only music you have rights to stream.</span><button onClick={()=>onMixChange({...mix,...DEFAULT_DJ_MIX,deckAPath:mix.deckAPath,deckBPath:mix.deckBPath,deckAName:mix.deckAName,deckBName:mix.deckBName})} className="rounded-lg border border-white/10 px-3 py-2 text-zinc-400">Reset mixer</button></footer>
      {(error||deleteError)&&<p role="alert" className="mt-3 rounded-lg border border-rose-400/20 bg-rose-400/5 p-3 text-xs text-rose-300">{error||deleteError}</p>}
    </div></div>}
  </div>
}
