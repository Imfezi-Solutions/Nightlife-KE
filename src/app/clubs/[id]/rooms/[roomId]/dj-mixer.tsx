'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type DJMix = {
  playing: boolean
  bpm: number
  crossfader: number
  master: number
  bass: number
  treble: number
  filter: number
}

export const DEFAULT_DJ_MIX: DJMix = {
  playing: false, bpm: 118, crossfader: 0, master: 0.72, bass: 0, treble: 0, filter: 18000,
}

type Props = {
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
  timer: number | null
  step: number
}

function envelope(context: AudioContext, destination: AudioNode, frequency: number, duration: number, type: OscillatorType, peak: number) {
  const osc = context.createOscillator()
  const gain = context.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, context.currentTime)
  gain.gain.setValueAtTime(0.0001, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), context.currentTime + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration)
  osc.connect(gain).connect(destination)
  osc.start()
  osc.stop(context.currentTime + duration + 0.025)
}

export default function DJMixer({ mix, isDJ, djName, onClaim, onMixChange }: Props) {
  const rig = useRef<AudioRig | null>(null)
  const [open, setOpen] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [localError, setLocalError] = useState('')

  const ensureAudio = useCallback(async () => {
    if (!rig.current) {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) { setLocalError('This browser does not support live audio mixing.'); return }
      const context = new AudioContextClass()
      const master = context.createGain()
      const low = context.createBiquadFilter()
      const high = context.createBiquadFilter()
      const filter = context.createBiquadFilter()
      const deckA = context.createGain()
      const deckB = context.createGain()
      low.type = 'lowshelf'; low.frequency.value = 180
      high.type = 'highshelf'; high.frequency.value = 4200
      filter.type = 'lowpass'
      deckA.connect(filter); deckB.connect(filter)
      filter.connect(low).connect(high).connect(master).connect(context.destination)
      rig.current = { context, master, low, high, filter, deckA, deckB, timer: null, step: 0 }
    }
    await rig.current.context.resume()
    setAudioEnabled(true)
    return rig.current
  }, [])

  const stopLoop = useCallback(() => {
    const audio = rig.current
    if (audio?.timer !== null && audio?.timer !== undefined) {
      window.clearInterval(audio.timer)
      audio.timer = null
    }
  }, [])

  const startLoop = useCallback((audio: AudioRig) => {
    if (audio.timer !== null) return
    const tick = () => {
      const now = audio.context.currentTime
      const step = audio.step++ % 16
      // Original, synthesised club beat: kick, snare, hi-hats and bass.
      if (step === 0 || step === 8) envelope(audio.context, audio.deckA, 58, .24, 'sine', .9)
      if (step === 4 || step === 12) envelope(audio.context, audio.deckA, 185, .13, 'triangle', .34)
      if (step % 2 === 0) envelope(audio.context, audio.deckB, step % 4 === 0 ? 9200 : 6800, .045, 'square', .055)
      if ([0, 3, 6, 8, 11, 14].includes(step)) {
        const notes = [55, 55, 65.4, 73.4, 82.4, 73.4, 65.4, 55]
        envelope(audio.context, audio.deckB, notes[Math.floor(step / 2)] || 55, .18, 'sawtooth', .14)
      }
      void now
    }
    tick()
    audio.timer = window.setInterval(tick, 60000 / mix.bpm / 4)
  }, [mix.bpm])

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
    if (mix.playing && audioEnabled) startLoop(audio)
    else stopLoop()
    if (audio.timer !== null) {
      stopLoop()
      startLoop(audio)
    }
  }, [mix, audioEnabled, startLoop, stopLoop])

  useEffect(() => () => {
    stopLoop()
    if (rig.current) void rig.current.context.close()
    rig.current = null
  }, [stopLoop])

  const change = (key: keyof DJMix, value: number | boolean) => onMixChange({ ...mix, [key]: value })
  const enableAudio = async () => { await ensureAudio(); if (mix.playing && rig.current) startLoop(rig.current) }
  const togglePlayback = async () => {
    if (!audioEnabled) await enableAudio()
    change('playing', !mix.playing)
  }

  return <div className="border-t border-white/10 px-5 py-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-[10px] font-black uppercase tracking-[.25em] text-fuchsia-200">Live room sound</p><p className="mt-1 text-xs text-zinc-400">{djName ? `DJ: ${djName}` : 'No DJ on the decks'} · {mix.playing ? 'Mix is live' : 'Music stopped'}</p></div>
      <div className="flex flex-wrap gap-2">
        {!audioEnabled && <button onClick={()=>void enableAudio()} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white">Enable room audio</button>}
        {!isDJ && <button onClick={()=>{onClaim();setOpen(true)}} className="rounded-lg bg-fuchsia-300 px-3 py-2 text-xs font-black text-black">Become the DJ</button>}
        {isDJ && <><button onClick={()=>setOpen(v=>!v)} className="rounded-lg bg-fuchsia-300 px-3 py-2 text-xs font-black text-black">{open ? 'Close DJ studio' : 'Open DJ studio'}</button><button onClick={()=>onMixChange({...mix,playing:!mix.playing})} className="rounded-lg border border-fuchsia-300/30 px-3 py-2 text-xs text-fuchsia-100">{mix.playing?'Pause room music':'Resume room music'}</button></>}
      </div>
    </div>
    {open && isDJ && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-fuchsia-300/30 bg-[#100e1b] p-5 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-fuchsia-200">Nightlife DJ studio</p><p className="mt-1 text-xs text-zinc-500">Separate mixer window · two live synth decks · EQ · crossfader</p></div><div className="flex gap-2"><button onClick={()=>setOpen(false)} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-300">Close window</button><button onClick={()=>void togglePlayback()} className={`rounded-xl px-5 py-3 text-sm font-black ${mix.playing?'bg-rose-400 text-black':'bg-lime-300 text-black'}`}>{mix.playing?'Stop mix':'Play live mix'}</button></div></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs text-zinc-300">Tempo · {mix.bpm} BPM<input aria-label="Tempo" type="range" min="80" max="160" value={mix.bpm} onChange={e=>change('bpm',Number(e.target.value))} className="mt-2 w-full accent-fuchsia-300"/></label>
        <label className="text-xs text-zinc-300">Master volume · {Math.round(mix.master*100)}%<input aria-label="Master volume" type="range" min="0" max="1" step=".01" value={mix.master} onChange={e=>change('master',Number(e.target.value))} className="mt-2 w-full accent-fuchsia-300"/></label>
        <label className="text-xs text-zinc-300">Deck A / Deck B · {mix.crossfader.toFixed(2)}<input aria-label="Crossfader" type="range" min="-1" max="1" step=".01" value={mix.crossfader} onChange={e=>change('crossfader',Number(e.target.value))} className="mt-2 w-full accent-fuchsia-300"/></label>
        <label className="text-xs text-zinc-300">Low-pass filter · {Math.round(mix.filter)} Hz<input aria-label="Filter" type="range" min="250" max="18000" step="50" value={mix.filter} onChange={e=>change('filter',Number(e.target.value))} className="mt-2 w-full accent-fuchsia-300"/></label>
        <label className="text-xs text-zinc-300">Bass EQ · {mix.bass.toFixed(1)} dB<input aria-label="Bass EQ" type="range" min="-18" max="18" step=".5" value={mix.bass} onChange={e=>change('bass',Number(e.target.value))} className="mt-2 w-full accent-fuchsia-300"/></label>
        <label className="text-xs text-zinc-300">Treble EQ · {mix.treble.toFixed(1)} dB<input aria-label="Treble EQ" type="range" min="-18" max="18" step=".5" value={mix.treble} onChange={e=>change('treble',Number(e.target.value))} className="mt-2 w-full accent-fuchsia-300"/></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>onMixChange({...mix,bpm:118,crossfader:0,master:.72,bass:0,treble:0,filter:18000})} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-300">Reset mixer</button><span className="self-center text-[11px] text-zinc-500">Other guests must enable room audio once to hear the live mix.</span></div>
      {localError&&<p className="mt-3 text-xs text-rose-300">{localError}</p>}
    </div></div>}
  </div>
}
