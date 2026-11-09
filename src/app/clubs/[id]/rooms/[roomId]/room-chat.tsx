'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Message = {
  id: string
  club_id: string
  room_id: string
  author_id: string
  body: string
  created_at: string
}

export default function RoomChat({
  clubId,
  roomId,
  currentUserId,
  initialMessages,
}: {
  clubId: string
  roomId: string
  currentUserId: string
  initialMessages: Message[]
}) {
  const [messages, setMessages] = useState(initialMessages)
  const [connection, setConnection] = useState('Connecting…')

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`club-room-${clubId}-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const incoming = payload.new as Message
          setMessages((current) => {
            if (current.some((message) => message.id === incoming.id)) return current
            return [...current, incoming].slice(-100)
          })
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnection('Live')
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setConnection('Reconnecting…')
        else if (status === 'CLOSED') setConnection('Disconnected')
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [clubId, roomId])

  return (
    <section className="glass mt-8 flex min-h-[65vh] flex-col overflow-hidden rounded-3xl">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <h2 className="font-bold">Room chat</h2>
          <p className="text-xs text-zinc-500">Messages are visible to club members</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs ${connection === 'Live' ? 'bg-lime-300/10 text-lime-200' : 'bg-white/5 text-zinc-400'}`}>
          {connection}
        </span>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite">
        {messages.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-500">It’s quiet in here. Start the conversation.</p>
        ) : messages.map((message) => (
          <article key={message.id} className={`max-w-[88%] rounded-2xl px-4 py-3 ${message.author_id === currentUserId ? 'ml-auto bg-lime-300/10' : 'bg-white/5'}`}>
            <p className="mb-1 text-[11px] font-semibold text-lime-200">
              {message.author_id === currentUserId ? 'You' : `Member · ${message.author_id.slice(0, 6)}`}
            </p>
            <p className="whitespace-pre-wrap break-words text-sm text-zinc-100">{message.body}</p>
            <time className="mt-2 block text-right text-[10px] text-zinc-500" dateTime={message.created_at}>
              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </time>
          </article>
        ))}
      </div>
      <form action="/clubs" className="border-t border-white/10 p-4" onSubmit={(event) => event.preventDefault()}>
        <p className="text-xs text-zinc-500">Use the message form below to post. Keep it respectful.</p>
      </form>
    </section>
  )
}
