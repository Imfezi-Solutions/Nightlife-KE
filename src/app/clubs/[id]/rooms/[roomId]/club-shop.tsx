'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const items = [
  { key: 'virtual_cocktail', name: 'Virtual cocktail', detail: 'A colourful club drink for your avatar.', price: 15, icon: '🍹' },
  { key: 'mocktail', name: 'Tropical mocktail', detail: 'A bright, alcohol-free party drink.', price: 12, icon: '🥤' },
  { key: 'soda', name: 'Chilled soda', detail: 'A classic refreshment.', price: 8, icon: '🧃' },
  { key: 'glowstick', name: 'Neon glowstick', detail: 'Carry a little extra light onto the dancefloor.', price: 10, icon: '✨' },
  { key: 'vip_token', name: 'VIP table pass', detail: 'A virtual pass for the VIP corner.', price: 50, icon: '🌟' },
] as const

export default function ClubShop({ clubId, roomId }: { clubId: string; roomId: string }) {
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [owned, setOwned] = useState<Record<string, number>>({})

  useEffect(() => {
    const supabase = createClient()
    void supabase.from('wallets').select('balance_credits').maybeSingle().then(({ data, error }) => {
      if (!error) setBalance(data?.balance_credits ?? 0)
      setLoading(false)
    })
    void supabase.from('club_item_inventory').select('item_key,quantity').eq('club_id', clubId).then(({ data }) => {
      const next: Record<string, number> = {}
      for (const row of data ?? []) next[row.item_key] = row.quantity
      setOwned(next)
    })
  }, [clubId])

  async function purchase(itemKey: typeof items[number]['key']) {
    setBuying(itemKey)
    setNotice('')
    const supabase = createClient()
    const { data, error } = await supabase.rpc('purchase_club_item', {
      p_club_id: clubId,
      p_room_id: roomId,
      p_item_key: itemKey,
    })
    setBuying(null)
    if (error) {
      const message = error.message.toLowerCase()
      setNotice(message.includes('insufficient') ? 'Not enough credits. Top up your wallet first.' : message.includes('verification') ? 'Your 18+ verification is required to buy club items.' : 'Purchase could not be completed. Please try again.')
      return
    }
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      if (typeof data.balance_credits === 'number') setBalance(data.balance_credits)
      if (typeof data.quantity === 'number') setOwned(current => ({ ...current, [itemKey]: data.quantity as number }))
      setNotice((typeof data.item_name === 'string' ? data.item_name : 'Item') + ' added to your club inventory.')
    } else {
      setNotice('Purchase completed.')
    }
  }

  return (
    <section className="glass mt-7 rounded-3xl border border-white/10 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-[10px] font-black uppercase tracking-[.25em] text-lime-300">The club shop</p><h2 className="mt-2 text-2xl font-black">Get something for the night</h2><p className="mt-2 max-w-xl text-sm text-zinc-400">Buy virtual drinks, glow items and VIP passes with your Nightlife KE credits. Items stay in your club inventory.</p></div>
        <div className="rounded-2xl border border-lime-300/20 bg-lime-300/5 px-4 py-3"><p className="text-[10px] uppercase tracking-wider text-zinc-400">Your credits</p><p className="mt-1 text-2xl font-black text-lime-200">{loading ? '…' : balance ?? '—'}</p></div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(item => (
          <article key={item.key} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between"><span className="text-3xl">{item.icon}</span><span className="text-sm font-black text-lime-200">{item.price} credits</span></div>
            <h3 className="mt-3 font-bold">{item.name}</h3><p className="mt-1 min-h-10 text-xs leading-5 text-zinc-400">{item.detail}</p>
            <p className="mt-2 text-[11px] text-zinc-500">Owned: {owned[item.key] ?? 0}</p>
            <button onClick={() => void purchase(item.key)} disabled={loading || buying !== null || (balance !== null && balance < item.price)} className="mt-3 w-full rounded-xl bg-lime-300 px-4 py-2.5 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-40">{buying === item.key ? 'Buying…' : 'Buy item'}</button>
          </article>
        ))}
      </div>
      {notice && <p role="status" className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200">{notice}</p>}
      <p className="mt-4 text-[11px] text-zinc-500">All products here are digital items only. No physical alcohol or real-world delivery is sold through this shop.</p>
    </section>
  )
}
