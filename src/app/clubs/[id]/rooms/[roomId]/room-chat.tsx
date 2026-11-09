'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Message = {
  id: string
  club_id: string
  room_id: string
  author_id: string
  body: string
  created_at: string
}

type RoomPresence = { online: boolean }

export default function RoomChat({
  roomId,
  currentUserId,
  capacity,
  initialMessages,
}: {
  clubId: string
  roomId: string
  currentUserId: string
  capacity: number
  initialMessages: Message[]
}) {
  const [messages, setMessages] = useState(initialMessages)
  const [connection, setConnection] = useState('Connecting…')
  const [presentMembers, setPresentMembers] = useState<RoomPresence[]>([])
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set())
  const [blocksLoaded, setBlocksLoaded] = useState(false)
  const [blockNotice, setBlockNotice] = useState('')

  useEffect(() => {
    const supabase = createClient()
    void supabase.from('user_blocks').select('blocked_user_id').eq('blocker_id', currentUserId)
      .then(({ data }) => {
        setBlockedIds(new Set((data ?? []).map((row) => row.blocked_user_id)))
        setBlocksLoaded(true)
      })
    const channel = supabase.channel('club-room:' + roomId, {
      config: { private: true, presence: { key: currentUserId } },
    })

    const syncPresence = () => {
      // Presence metadata is client-supplied. Never render it as a verified identity.
      const connections = Array.from(new Set(Object.keys(channel.presenceState<RoomPresence>())))
      setPresentMembers(connections.map(() => ({ online: true })))
    }

    channel
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages', filter: 'room_id=eq.' + roomId,
      }, (payload) => {
        const incoming = payload.new as Message
        setMessages((current) => {
          if (current.some((message) => message.id === incoming.id)) return current
          return [...current, incoming].slice(-100)
        })
      })
      .on('presence', { event: 'sync' }, sync)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnection('Live')
          void channel.track({ online: true })
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnection('Reconnecting…')
        } else if (status === 'CLOSED') {
          setConnection('Disconnected')
        }
      })

    return () => { void supabase.removeChannel(channel) }
  }, [roomId, currentUserId])

  async function blockMember(blockedUserId: string) {
    setBlockNotice('')
    const supabase = createClient()
    const { error } = await supabase.from('user_blocks').insert({
      blocker_id: currentUserId,
      blocked_user_id: blockedUserId,
    })
    if (error) {
      setBlockNotice('Could not block this member. Please try again.')
      return
    }
    setBlockedIds((current) => new Set([...current, blockedUserId]))
    setBlockNotice('This member’s messages are now hidden from you in this room.')
  }

  const visibleMessages = useMemo(
    () => messages.filter((message) => message.author_id === currentUserId || !blockedIds.has(message.author_id)),
    [messages, currentUserId, blockedIds],
  )

  return (
    <section className="glass mt-8 flex min-h-[65vh] flex-col overflow-hidden rounded-3xl">
      <header className="border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">Room chat</h2>
            <p className="text-xs text-zinc-500">Messages are visible to club members · blocked accounts are hidden for you</p>
          </div>
          <span className={'rounded-full px-3 py-1 text-xs ' + (connection === 'Live' ? 'bg-lime-300/10 text-lime-200' : 'bg-white/5 text-zinc-400')}>
            {connection}
          </span>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-300">Here right now</span>
            <span className="text-lime-200">{presentMembers.length} connections · room capacity {capacity}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {presentMembers.length === 0
              ? <span className="text-xs text-zinc-500">Waiting for people to arrive…</span>
              : <span className="text-xs text-zinc-300">{presentMembers.length} active connection{presentMembers.length === 1 ? '' : 's'} in this room</span>}
          </div>
        </div>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite">
        {!blocksLoaded
          ? <p className="py-16 text-center text-sm text-zinc-500">Loading your chat preferences…</p>
          : visibleMessages.length === 0
            ? <p className="py-16 text-center text-sm text-zinc-500">It’s quiet in here. Start the conversation.</p>
            : visibleMessages.map((message) => (
              <article key={message.id} className={'max-w-[88%] rounded-2xl px-4 py-3 ' + (message.author_id === currentUserId ? 'ml-auto bg-lime-300/10' : 'bg-white/5')}>
                <p className="mb-1 text-[11px] font-semibold text-lime-200">
                  {message.author_id === currentUserId ? 'You' : 'Club member'}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm text-zinc-100">{message.body}</p>
                {message.author_id !== currentUserId && <button onClick={() => void blockMember(message.author_id)} disabled={blockedIds.has(message.author_id)} className="mt-2 text-[10px] font-semibold text-red-200 disabled:opacity-40">{blockedIds.has(message.author_id) ? 'Blocked' : 'Block member'}</button>}
                <time className="mt-2 block text-right text-[10px] text-zinc-500" dateTime={message.created_at}>
                  {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </time>
              </article>
            ))}
      </div>
      {blockNotice && <p role="status" className="border-t border-white/10 px-5 py-3 text-xs text-zinc-300">{blockNotice}</p>}
    </section>
  )
}
