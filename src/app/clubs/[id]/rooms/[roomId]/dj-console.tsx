'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase/database.types'

type QueueTrack = Tables<'dj_queue'>
type DjSession = Tables<'dj_sessions'>

export default function DjConsole({ roomId, currentUserId, canControl, initialQueue, initialSession }: {
  roomId: string
  currentUserId: string
  canControl: boolean
  initialQueue: QueueTrack[]
  initialSession: DjSession | null
}) {
  const [queue, setQueue] = useState(initialQueue)
  const [session, setSession] = useState(initialSession)
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [assetId, setAssetId] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [rightsReference, setRightsReference] = useState('')
  const [sourceType, setSourceType] = useState<'original_upload'|'licensed_provider'|'public_domain'>('original_upload')
  const [duration, setDuration] = useState('180000')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [audioUrl, setAudioUrl] = useState('')
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [audioNotice, setAudioNotice] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const activeTrack = queue.find((track) => track.id === session?.current_track_id)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('room-music:' + roomId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dj_sessions', filter: 'room_id=eq.' + roomId }, (payload) => {
        if (payload.eventType === 'DELETE') setSession(null)
        else setSession(payload.new as DjSession)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dj_queue', filter: 'room_id=eq.' + roomId }, async () => {
        const { data } = await supabase.from('dj_queue').select('*').eq('room_id', roomId).eq('rights_status', 'approved').order('position').order('created_at')
        setQueue(data ?? [])
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [roomId])

  useEffect(() => {
    let cancelled = false
    async function resolveAudio() {
      setAudioUrl('')
      setAudioNotice('')
      if (!activeTrack) return
      if (activeTrack.source_type === 'licensed_provider') {
        setAudioNotice('This track requires its licensed provider adapter. No third-party stream is opened directly.')
        return
      }
      const supabase = createClient()
      const { data, error } = await supabase.storage.from('room-audio').createSignedUrl(activeTrack.provider_asset_id, 3600)
      if (cancelled) return
      if (error || !data?.signedUrl) {
        setAudioNotice('The approved audio asset could not be loaded for this room.')
        return
      }
      setAudioUrl(data.signedUrl)
    }
    void resolveAudio()
    return () => { cancelled = true }
  }, [activeTrack?.id, activeTrack?.provider_asset_id, activeTrack?.source_type])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !audioUrl || !session) return
    const synchronize = () => {
      if (session.playback_status === 'stopped') {
        audio.pause()
        audio.currentTime = 0
        return
      }
      if (session.playback_status === 'paused') {
        audio.pause()
        if (Number.isFinite(audio.duration)) audio.currentTime = Math.min(session.position_ms / 1000, audio.duration)
        else audio.currentTime = session.position_ms / 1000
        return
      }
      if (!audioEnabled) {
        setAudioNotice('Tap Enable room audio once to allow synchronized playback on this device.')
        return
      }
      const elapsed = session.started_at ? Math.max(0, Date.now() - new Date(session.started_at).getTime()) : 0
      const target = (session.position_ms + elapsed) / 1000
      const safeTarget = Number.isFinite(audio.duration) ? Math.min(target, Math.max(0, audio.duration - 0.1)) : target
      if (Math.abs(audio.currentTime - safeTarget) > 1.25) audio.currentTime = safeTarget
      void audio.play().then(() => setAudioNotice('')).catch(() => setAudioNotice('Playback was blocked. Tap Enable room audio and try again.'))
    }
    audio.addEventListener('loadedmetadata', synchronize)
    synchronize()
    return () => audio.removeEventListener('loadedmetadata', synchronize)
  }, [audioUrl, audioEnabled, session?.playback_status, session?.started_at, session?.position_ms])

  async function addTrack(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setNotice('')
    const supabase = createClient()
    let storedAssetId = assetId.trim()
    let uploadedPath = ''
    if (sourceType !== 'licensed_provider') {
      if (!audioFile) { setBusy(false); setNotice('Choose an original or public-domain audio file to upload.'); return }
      if (audioFile.size > 25 * 1024 * 1024) { setBusy(false); setNotice('Audio files must be 25 MB or smaller.'); return }
      const allowed = ['audio/mpeg','audio/mp3','audio/wav','audio/ogg','audio/mp4','audio/aac','audio/flac']
      if (!allowed.includes(audioFile.type)) { setBusy(false); setNotice('Use an MP3, WAV, OGG, MP4, AAC or FLAC audio file.'); return }
      const safeName = audioFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      uploadedPath = roomId + '/' + currentUserId + '/' + crypto.randomUUID() + '-' + safeName
      const { error: uploadError } = await supabase.storage.from('room-audio').upload(uploadedPath, audioFile, { contentType: audioFile.type, upsert: false })
      if (uploadError) { setBusy(false); setNotice('Audio upload failed. Check your DJ permission and file type.'); return }
      storedAssetId = uploadedPath
    } else if (!storedAssetId) {
      setBusy(false); setNotice('Enter the asset identifier supplied by the licensed music provider.'); return
    }

    const { error } = await supabase.from('dj_queue').insert({
      room_id: roomId, added_by: currentUserId, title: title.trim(), artist: artist.trim() || null,
      provider_asset_id: storedAssetId, source_type: sourceType, rights_reference: rightsReference.trim(),
      duration_ms: Number(duration), rights_status: 'pending',
    })
    setBusy(false)
    if (error) {
      if (uploadedPath) await supabase.storage.from('room-audio').remove([uploadedPath])
      setNotice('Could not submit this track. Check your DJ permission and the details.')
      return
    }
    setTitle(''); setArtist(''); setAssetId(''); setAudioFile(null); setRightsReference('')
    setNotice('Submitted for rights review. The uploaded file remains private until approval.')
  }

  async function setPlayback(status: 'playing'|'paused'|'stopped', trackId?: string) {
    setBusy(true); setNotice('')
    const supabase = createClient()
    const currentPosition = Math.floor((audioRef.current?.currentTime ?? 0) * 1000)
    const nextPosition = status === 'stopped' ? 0 : status === 'paused' ? currentPosition : trackId ? 0 : (session?.position_ms ?? currentPosition)
    const next = {
      room_id: roomId, playback_status: status, position_ms: nextPosition,
      current_track_id: trackId ?? session?.current_track_id ?? null,
      started_at: status === 'playing' ? new Date().toISOString() : null,
      updated_by: currentUserId, updated_at: new Date().toISOString(),
    }
    const { error } = session
      ? await supabase.from('dj_sessions').update(next).eq('room_id', roomId)
      : await supabase.from('dj_sessions').insert(next)
    setBusy(false)
    if (error) setNotice('Playback state could not be updated. Confirm your DJ role and try again.')
    else setSession(next as DjSession)
  }

  return <section className="glass mt-6 space-y-6 rounded-3xl p-5 sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[.2em] text-lime-300">Nightlife KE audio</p><h2 className="mt-1 text-2xl font-black">DJ booth</h2></div>
      <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-300">{session?.playback_status ?? 'stopped'}</span>
    </div>
    <audio ref={audioRef} src={audioUrl || undefined} preload="metadata" onError={() => setAudioNotice('Audio could not be played on this device.')} className="hidden" />
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <p className="text-xs text-zinc-500">NOW SELECTED</p>
      <p className="mt-1 font-bold">{activeTrack?.title ?? 'No approved track selected'}</p>
      <p className="text-sm text-zinc-400">{activeTrack?.artist ?? 'Approved room audio will appear here'}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {!audioEnabled && <button disabled={!activeTrack || !audioUrl} onClick={() => setAudioEnabled(true)} className="rounded-lg border border-lime-300/30 px-3 py-2 text-xs font-semibold text-lime-200 disabled:opacity-40">Enable room audio</button>}
        {canControl && <div className="flex flex-wrap gap-2">
          {queue.map(track => <button key={track.id} disabled={busy} onClick={() => void setPlayback('playing', track.id)} className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:border-lime-300/50">{track.title}</button>)}
          {session?.playback_status === 'paused' && <button disabled={busy} onClick={() => void setPlayback('playing')} className="rounded-lg bg-lime-300 px-4 py-2 text-sm font-bold text-black">Resume</button>}
          <button disabled={busy || queue.length===0} onClick={() => void setPlayback('paused')} className="rounded-lg bg-lime-300 px-4 py-2 text-sm font-bold text-black">Pause</button>
          <button disabled={busy} onClick={() => void setPlayback('stopped')} className="rounded-lg border border-white/10 px-4 py-2 text-sm">Stop</button>
        </div>}
      </div>
      {audioNotice && <p role="status" className="mt-3 text-xs text-amber-200">{audioNotice}</p>}
      <p className="mt-3 text-xs text-zinc-500">Original uploads and verified public-domain recordings can play after rights approval. Licensed-provider playback needs a provider-specific adapter and agreement.</p>
    </div>
    <div><h3 className="font-bold">Approved queue</h3>{queue.length ? <ol className="mt-3 space-y-2">{queue.map((track,i)=><li key={track.id} className="flex justify-between gap-3 rounded-xl bg-white/5 px-3 py-2 text-sm"><span>{i+1}. {track.title}{track.artist ? ' — ' + track.artist : ''}</span><span className="text-xs text-zinc-500">{Math.round(track.duration_ms/60000)} min</span></li>)}</ol> : <p className="mt-2 text-sm text-zinc-500">No rights-approved tracks in this room yet.</p>}</div>
    {canControl && <form onSubmit={addTrack} className="space-y-3 border-t border-white/10 pt-5">
      <h3 className="font-bold">Submit a track for rights review</h3>
      <p className="text-xs text-zinc-400">Original/public-domain audio uploads stay private and unplayable until an authorized administrator reviews the rights evidence.</p>
      <input required maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Track title" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm"/>
      <input maxLength={160} value={artist} onChange={e=>setArtist(e.target.value)} placeholder="Artist (optional)" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm"/>
      <select value={sourceType} onChange={e=>setSourceType(e.target.value as typeof sourceType)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm"><option value="original_upload">Original music (rights owned)</option><option value="public_domain">Public-domain recording</option><option value="licensed_provider">Licensed music provider</option></select>
      {sourceType === 'licensed_provider' ? <input required value={assetId} onChange={e=>setAssetId(e.target.value)} placeholder="Licensed provider asset ID" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm"/> : <label className="block text-sm text-zinc-300">Audio file (25 MB max)<input required type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/mp4,audio/aac,audio/flac" onChange={e=>setAudioFile(e.target.files?.[0]??null)} className="mt-2 block w-full text-xs text-zinc-400"/></label>}
      <input required min={1000} max={1800000} type="number" value={duration} onChange={e=>setDuration(e.target.value)} placeholder="Duration in milliseconds" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm"/>
      <textarea required minLength={4} maxLength={500} value={rightsReference} onChange={e=>setRightsReference(e.target.value)} placeholder="Rights evidence reference / license ID / provenance details" rows={2} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm"/>
      <button disabled={busy} className="rounded-xl bg-lime-300 px-5 py-3 text-sm font-bold text-black disabled:opacity-50">{busy?'Working…':'Submit for review'}</button>
    </form>}
    {notice && <p role="status" className="rounded-xl bg-white/5 p-3 text-sm text-zinc-300">{notice}</p>}
  </section>
}
