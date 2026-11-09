import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import RoomChat from './room-chat'
import { sendRoomMessageAction } from '../../../actions'
import { createClient } from '@/lib/supabase/server'

export default async function ClubRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; roomId: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id, roomId } = await params
  const query = await searchParams
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) redirect('/login')

  const [{ data: room }, { data: membership }] = await Promise.all([
    supabase.from('rooms')
      .select('id,club_id,name,room_type,capacity')
      .eq('id', roomId)
      .eq('club_id', id)
      .eq('is_active', true)
      .maybeSingle(),
    supabase.from('club_members')
      .select('role')
      .eq('club_id', id)
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  if (!room || !membership) notFound()

  const [{ data: club }, { data: messages }] = await Promise.all([
    supabase.from('clubs').select('name').eq('id', id).maybeSingle(),
    supabase.from('chat_messages')
      .select('id,club_id,room_id,author_id,body,created_at')
      .eq('club_id', id)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(100),
  ])

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 sm:px-6">
      <Link href={`/clubs/${id}`} className="text-sm text-zinc-400 hover:text-white">← Back to {club?.name ?? 'club'}</Link>
      <header className="mt-7">
        <p className="text-xs font-bold uppercase tracking-[.25em] text-lime-300">{room.room_type.replace('_', ' ')} · {room.capacity} capacity</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">{room.name}</h1>
        <p className="mt-2 text-sm text-zinc-400">You’re in the room. Meet the people here and keep the conversation respectful.</p>
      </header>

      {query.error === 'slow_down' && <p className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-200">You’re sending messages too quickly. Wait a few seconds and try again.</p>}
      {query.error === 'message' && <p className="mt-5 rounded-xl border border-red-300/20 bg-red-300/5 p-3 text-sm text-red-200">Your message could not be sent. Please try again.</p>}

      <RoomChat
        clubId={id}
        roomId={roomId}
        currentUserId={userId}
        capacity={room.capacity}
        initialMessages={messages ?? []}
      />

      <form action={sendRoomMessageAction} className="glass mt-4 rounded-2xl p-3 sm:p-4">
        <input type="hidden" name="club_id" value={id} />
        <input type="hidden" name="room_id" value={roomId} />
        <label htmlFor="room-message" className="sr-only">Your message</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <textarea
            id="room-message"
            name="body"
            required
            maxLength={1000}
            rows={2}
            placeholder="Say something to the room…"
            className="min-h-14 flex-1 resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-lime-300/50"
          />
          <button type="submit" className="rounded-xl bg-lime-300 px-6 py-3 font-bold text-black transition hover:bg-lime-200">Send message</button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">1,000 characters max · Five messages per 10 seconds</p>
      </form>
    </main>
  )
}
