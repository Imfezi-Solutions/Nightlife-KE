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
  deckAUrl: string | null
  deckBUrl: string | null
  deckAName: string
  deckBName: string
  playbackStartedAt: number | null
}
export const DEFAULT_DJ_MIX: DJMix = {
  playing: false, bpm: 118, crossfader: 0, master: 0.72, bass: 0, treble: 0, filter: 18000,
  deckAUrl: null, deckBUrl: null, deckAName: '', deckBName: '', playbackStartedAt: null,
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
  }, [mix.crossfader, mix.master, mix.bass, mix.treble, mix.filter])

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
    updateDeck(audio.elementA, mix.deckAUrl)
    updateDeck(audio.elementB, mix.deckBUrl)
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
  }, [mix.deckAUrl, mix.deckBUrl, mix.playing, mix.playbackStartedAt])

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
    if (!file.type.startsWith('audio/') || !/\.(mp3|wav|ogg|m4a|aac)$/i.test(file.name)) {
      setError('Choose an MP3, WAV, OGG, M4A or AAC audio file.'); return
    }
    if (file.size > 25 * 1024 * 1024) { setError('Each track must be 25 MB or smaller.'); return }
    setUploading(deck); setError('')
    try {
      const supabase = createClient()
      const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-90)
      const path = `${roomId}/${userId}/${crypto.randomUUID()}-${safeName}`
      const { error: uploadError } = await supabase.storage.from('room-audio').upload(path, file, { contentType: file.type, upsert: false })
      if (uploadError) throw uploadError
      const { data, error: urlError } = await supabase.storage.from('room-audio').createSignedUrl(path, 3600)
      if (urlError || !data?.signedUrl) throw urlError || new Error('Could not prepare the shared track URL.')
      const key = deck === 'A' ? 'deckA' : 'deckB'
      onMixChange({ ...mix, [`${key}Url`]: data.signedUrl, [`${key}Name`]: file.name, playing: false, playbackStartedAt: null })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Track upload failed. Check that you are signed in and are the room DJ.')
    } finally { setUploading(null) }
  }

  return <div className="border-t border-white/10 px-5 py-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-[10px] font-black uppercase tracking-[.25em] text-fuchsia-200">Live room sound</p><p className="mt-1 text-xs text-zinc-400">{djName ? `DJ: ${djName}` : 'No DJ on the decks'} · {mix.playing ? 'Mix is live' : 'Music stopped'}</p></div>
      <div className="flex flex-wrap gap-2">
        {!audioEnabled && <button onClick={()=>void enableAudio()} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white">Enable room audio</button>}
        {!isDJ && <button onClick={()=>{onClaim();setOpen(true)}} className="rounded-lg bg-fuchsia-300 px-3 py-2 text-xs font-black text-black">Become the DJ</button>}
        {isDJ && <><button onClick={()=>setOpen(v=>!v)} className="rounded-lg bg-fuchsia-300 px-3 py-2 text-xs font-black text-black">{open ? 'Close DJ studio' : 'Open DJ studio'}</button><button onClick={()=>void togglePlayback()} className="rounded-lg border border-fuchsia-300/30 px-3 py-2 text-xs text-fuchsia-100">{mix.playing?'Pause room music':'Play room mix'}</button></>}
      </div>
    </div>
    {open && isDJ && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-fuchsia-300/30 bg-[#100e1b] p-5 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-fuchsia-200">Nightlife DJ studio</p><p className="mt-1 text-xs text-zinc-500">Two real audio decks · shared room playback · EQ and crossfader</p></div><div className="flex gap-2"><button onClick={()=>setOpen(false)} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-300">Close window</button><button onClick={()=>void togglePlayback()} className={`rounded-xl px-5 py-3 text-sm font-black ${mix.playing?'bg-rose-400 text-black':'bg-lime-300 text-black'}`}>{mix.playing?'Stop mix':'Play room mix'}</button></div></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {(['A','B'] as const).map(deck => { const name = deck === 'A' ? mix.deckAName : mix.deckBName; const busy = uploading === deck; return <div key={deck} className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs font-black uppercase tracking-widest text-fuchsia-200">Deck {deck}</p><p className="mt-2 min-h-10 break-all text-sm text-white">{name || 'No track loaded'}</p><label className="mt-3 inline-flex cursor-pointer rounded-lg bg-fuchsia-300 px-3 py-2 text-xs font-black text-black">{busy?'Uploading…':'Load audio track'}<input type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/mp4,audio/aac,.mp3,.wav,.ogg,.m4a,.aac" disabled={!!uploading} className="hidden" onChange={e=>{void uploadTrack(deck,e.target.files?.[0]);e.currentTarget.value=''}}/></label><p className="mt-2 text-[10px] text-zinc-500">Up to 25 MB · uploaded to this room for guests</p></div>})}
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs text-zinc-300">Tempo · {mix.bpm} BPM<input aria-label="Tempo" type="range" min="80" max="160" value={mix.bpm} onChange={e=>change('bpm',Number(e.target.value))} className="mt-2 w-full accent-fuchsia-300"/></label>
        <label className="text-xs text-zinc-300">Master volume · {Math.round(mix.master*100)}%<input aria-label="Master volume" type="range" min="0" max="1" step=".01" value={mix.master} onChange={e=>change('master',Number(e.target.value))} className="mt-2 w-full accent-fuchsia-300"/></label>
        <label className="text-xs text-zinc-300">Deck A / Deck B · {mix.crossfader.toFixed(2)}<input aria-label="Crossfader" type="range" min="-1" max="1" step=".01" value={mix.crossfader} onChange={e=>change('crossfader',Number(e.target.value))} className="mt-2 w-full accent-fuchsia-300"/></label>
        <label className="text-xs text-zinc-300">Low-pass filter · {Math.round(mix.filter)} Hz<input aria-label="Low-pass filter" type="range" min="250" max="18000" step="50" value={mix.filter} onChange={e=>change('filter',Number(e.target.value))} className="mt-2 w-full accent-fuchsia-300"/></label>
        <label className="text-xs text-zinc-300">Bass EQ · {mix.bass.toFixed(1)} dB<input aria-label="Bass EQ" type="range" min="-18" max="18" step=".5" value={mix.bass} onChange={e=>change('bass',Number(e.target.value))} className="mt-2 w-full accent-fuchsia-300"/></label>
        <label className="text-xs text-zinc-300">Treble EQ · {mix.treble.toFixed(1)} dB<input aria-label="Treble EQ" type="range" min="-18" max="18" step=".5" value={mix.treble} onChange={e=>change('treble',Number(e.target.value))} className="mt-2 w-full accent-fuchsia-300"/></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>onMixChange({...mix,...DEFAULT_DJ_MIX,deckAUrl:mix.deckAUrl,deckBUrl:mix.deckBUrl,deckAName:mix.deckAName,deckBName:mix.deckBName})} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-300">Reset mixer</button><span className="self-center text-[11px] text-zinc-500">Every guest must tap Enable room audio once. Upload only music you own or are licensed to play.</span></div>
      {error&&<p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
    </div></div>}
  </div>
}
