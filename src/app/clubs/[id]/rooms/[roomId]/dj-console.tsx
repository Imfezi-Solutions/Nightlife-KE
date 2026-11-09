'use client'

import { useEffect, useState } from 'react'
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
  const [rightsReference, setRightsReference] = useState('')
  const [sourceType, setSourceType] = useState<'original_upload'|'licensed_provider'|'public_domain'>('original_upload')
  const [duration, setDuration] = useState('180000')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`room-music:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dj_sessions', filter: `room_id=eq.${roomId}` }, (payload) => {
        if (payload.eventType === 'DELETE') setSession(null)
        else setSession(payload.new as DjSession)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dj_queue', filter: `room_id=eq.${roomId}` }, async () => {
        const { data } = await supabase.from('dj_queue').select('*').eq('room_id', roomId).eq('rights_status', 'approved').order('position').order('created_at')
        setQueue(data ?? [])
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [roomId])

  async function addTrack(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setNotice('')
    const supabase = createClient()
    const { error } = await supabase.from('dj_queue').insert({
      room_id: roomId, added_by: currentUserId, title: title.trim(), artist: artist.trim() || null,
      provider_asset_id: assetId.trim(), source_type: sourceType, rights_reference: rightsReference.trim(),
      duration_ms: Number(duration), rights_status: 'pending',
    })
    setBusy(false)
    if (error) { setNotice('Could not submit this track. Check your DJ permission and the details.'); return }
    setTitle(''); setArtist(''); setAssetId(''); setRightsReference('')
    setNotice('Submitted for rights review. It will appear in the playable queue only after approval.')
  }

  async function setPlayback(status: 'playing'|'paused'|'stopped', trackId?: string) {
    setBusy(true); setNotice('')
    const supabase = createClient()
    const next = {
      room_id: roomId, playback_status: status, position_ms: 0,
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

  const activeTrack = queue.find((track) => track.id === session?.current_track_id)
  return <section className="glass mt-6 space-y-6 rounded-3xl p-5 sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[.2em] text-lime-300">Nightlife KE audio</p><h2 className="mt-1 text-2xl font-black">DJ booth</h2></div>
      <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-300">{session?.playback_status ?? 'stopped'}</span>
    </div>
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <p className="text-xs text-zinc-500">NOW SELECTED</p>
      <p className="mt-1 font-bold">{activeTrack?.title ?? 'No approved track selected'}</p>
      <p className="text-sm text-zinc-400">{activeTrack?.artist ?? 'Approved tracks will appear here'}</p>
      {canControl && <div className="mt-4 flex flex-wrap gap-2">
        {queue.map(track => <button key={track.id} disabled={busy} onClick={() => void setPlayback('playing', track.id)} className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:border-lime-300/50">{track.title}</button>)}
        <button disabled={busy || queue.length===0} onClick={() => void setPlayback('paused')} className="rounded-lg bg-lime-300 px-4 py-2 text-sm font-bold text-black">Pause</button>
        <button disabled={busy} onClick={() => void setPlayback('stopped')} className="rounded-lg border border-white/10 px-4 py-2 text-sm">Stop</button>
      </div>}
      <p className="mt-3 text-xs text-zinc-500">Playback commands synchronize room state. Audio streaming requires a licensed provider integration; no commercial audio is streamed by this console.</p>
    </div>
    <div><h3 className="font-bold">Approved queue</h3>{queue.length ? <ol className="mt-3 space-y-2">{queue.map((track,i)=><li key={track.id} className="flex justify-between gap-3 rounded-xl bg-white/5 px-3 py-2 text-sm"><span>{i+1}. {track.title}{track.artist ? ` — ${track.artist}` : ''}</span><span className="text-xs text-zinc-500">{Math.round(track.duration_ms/60000)} min</span></li>)}</ol> : <p className="mt-2 text-sm text-zinc-500">No rights-approved tracks in this room yet.</p>}</div>
    {canControl && <form onSubmit={addTrack} className="space-y-3 border-t border-white/10 pt-5">
      <h3 className="font-bold">Submit a track for rights review</h3>
      <p className="text-xs text-zinc-400">Only tracks with documented rights can be approved for playback. A submission is not automatically playable.</p>
      <input required maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Track title" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm"/>
      <input maxLength={160} value={artist} onChange={e=>setArtist(e.target.value)} placeholder="Artist (optional)" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm"/>
      <input required value={assetId} onChange={e=>setAssetId(e.target.value)} placeholder="Provider asset ID / approved storage object ID" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm"/>
      <select value={sourceType} onChange={e=>setSourceType(e.target.value as typeof sourceType)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm"><option value="original_upload">Original music (rights owned)</option><option value="licensed_provider">Licensed music provider</option><option value="public_domain">Verified public-domain recording</option></select>
      <input required min={1000} max={1800000} type="number" value={duration} onChange={e=>setDuration(e.target.value)} placeholder="Duration in milliseconds" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm"/>
      <textarea required minLength={4} maxLength={500} value={rightsReference} onChange={e=>setRightsReference(e.target.value)} placeholder="Rights evidence reference / license ID / provenance details" rows={2} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm"/>
      <button disabled={busy} className="rounded-xl bg-lime-300 px-5 py-3 text-sm font-bold text-black disabled:opacity-50">{busy?'Working…':'Submit for review'}</button>
    </form>}
    {notice && <p role="status" className="rounded-xl bg-white/5 p-3 text-sm text-zinc-300">{notice}</p>}
  </section>
}
