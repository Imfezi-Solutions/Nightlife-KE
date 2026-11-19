"use client"

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Profile = { id: string; username: string; display_name: string | null; avatar_url: string | null; bio: string | null; created_at: string }
type Club = { id: string; name: string; slug: string; status: string; visibility: string; capacity: number; created_at: string; created_by: string }

export default function OwnerControls({ profile, users, clubs }: { profile: Profile | null; users: Profile[]; clubs: Club[] }) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [username, setUsername] = useState(profile?.username ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [profileNotice, setProfileNotice] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [search, setSearch] = useState('')
  const [clubBusy, setClubBusy] = useState('')
  const [clubNotice, setClubNotice] = useState('')

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(user => [user.username, user.display_name ?? ''].some(value => value.toLowerCase().includes(q)))
  }, [users, search])

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingProfile(true); setProfileNotice('')
    try {
      const cleanUsername = username.trim().toLowerCase()
      if (!/^[a-z0-9_]{3,24}$/.test(cleanUsername)) throw new Error('Username must be 3–24 characters using letters, numbers or underscores.')
      if (displayName.trim().length > 60) throw new Error('Display name must be 60 characters or fewer.')
      if (bio.length > 280) throw new Error('Bio must be 280 characters or fewer.')
      if (avatarUrl && !/^https:\/\//i.test(avatarUrl)) throw new Error('Avatar URL must start with https://')
      if (!profile?.id) throw new Error('Your owner profile could not be found. Refresh the page and try again.')
      const supabase = createClient()
      const { error } = await supabase.from('profiles').update({
        username: cleanUsername,
        display_name: displayName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        bio: bio.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq('id', profile.id)
      if (error) throw error
      setProfileNotice('Owner profile saved.')
      router.refresh()
    } catch (error) {
      setProfileNotice(error instanceof Error ? error.message : 'Could not save profile.')
    } finally { setSavingProfile(false) }
  }

  async function setClubStatus(club: Club, status: 'active' | 'suspended' | 'archived') {
    if (club.status === status) return
    const label = status === 'archived' ? 'archive' : status
    if (!window.confirm(`Are you sure you want to ${label} “${club.name}”?`)) return
    setClubBusy(club.id); setClubNotice('')
    try {
      const response = await fetch('/api/admin/clubs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clubId: club.id, status }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Club update failed.')
      setClubNotice(`${club.name} is now ${status}.`)
      router.refresh()
    } catch (error) {
      setClubNotice(error instanceof Error ? error.message : 'Could not update club.')
    } finally { setClubBusy('') }
  }

  return <div className="mt-10 space-y-10">
    <section id="owner-profile" className="glass rounded-3xl border border-lime-300/20 p-6">
      <div className="mb-5"><p className="text-xs font-black uppercase tracking-[.2em] text-lime-300">Account settings</p><h2 className="mt-2 text-2xl font-black">Super Admin profile</h2><p className="mt-1 text-sm text-zinc-400">Manage the public profile connected to your owner account.</p></div>
      <form onSubmit={saveProfile} className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-zinc-300">Display name<input value={displayName} onChange={e=>setDisplayName(e.target.value)} maxLength={60} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white" placeholder="Your display name"/></label>
        <label className="text-sm text-zinc-300">Username<input value={username} onChange={e=>setUsername(e.target.value)} maxLength={24} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white" placeholder="your_username"/></label>
        <label className="text-sm text-zinc-300 md:col-span-2">Profile photo URL<input value={avatarUrl} onChange={e=>setAvatarUrl(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white" placeholder="https://…"/></label>
        <label className="text-sm text-zinc-300 md:col-span-2">Bio<textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={280} rows={3} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white" placeholder="A short profile description"/></label>
        <div className="flex flex-wrap items-center gap-3 md:col-span-2"><button disabled={savingProfile} className="rounded-xl bg-lime-300 px-5 py-3 font-bold text-black disabled:opacity-50">{savingProfile ? 'Saving…' : 'Save profile'}</button><span role="status" className="text-sm text-zinc-400">{profileNotice}</span></div>
      </form>
    </section>

    <section id="user-directory" className="glass rounded-3xl p-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.2em] text-lime-300">Community oversight</p><h2 className="mt-2 text-2xl font-black">User directory</h2><p className="mt-1 text-sm text-zinc-400">Browse member profiles and account creation dates.</p></div><span className="rounded-full border border-white/10 px-3 py-2 text-xs text-zinc-300">{users.length.toLocaleString()} loaded</span></div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search username or display name…" className="mt-5 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white"/>
      <div className="mt-4 max-h-[28rem] overflow-auto rounded-2xl border border-white/10">
        {filteredUsers.length ? filteredUsers.map(user=><div key={user.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 p-4 last:border-0"><div className="min-w-0"><p className="font-semibold">{user.display_name || user.username}</p><p className="text-xs text-zinc-500">@{user.username} · ID {user.id.slice(0,8)}</p></div><p className="text-xs text-zinc-500">Joined {new Date(user.created_at).toLocaleDateString()}</p></div>) : <p className="p-5 text-sm text-zinc-500">No matching users in the latest 100 profiles.</p>}
      </div>
    </section>

    <section id="club-management" className="glass rounded-3xl p-6">
      <div><p className="text-xs font-black uppercase tracking-[.2em] text-lime-300">Platform operations</p><h2 className="mt-2 text-2xl font-black">Club management</h2><p className="mt-1 text-sm text-zinc-400">Activate, suspend or archive clubs. Every status change is recorded in the audit trail.</p></div>
      {clubNotice && <p role="status" className="mt-4 text-sm text-lime-200">{clubNotice}</p>}
      <div className="mt-5 space-y-3">{clubs.length ? clubs.map(club=><article key={club.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 p-4 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><p className="font-bold">{club.name}</p><p className="mt-1 text-xs text-zinc-500">/{club.slug} · {club.visibility.replace('_',' ')} · capacity {club.capacity}</p><p className="mt-1 text-xs text-zinc-500">Created {new Date(club.created_at).toLocaleDateString()} · ID {club.id.slice(0,8)}</p></div><span className="w-fit rounded-full border border-white/10 px-3 py-1 text-xs capitalize text-zinc-300">{club.status}</span><div className="flex flex-wrap gap-2">{(['active','suspended','archived'] as const).map(status=><button key={status} disabled={clubBusy===club.id||club.status===status} onClick={()=>setClubStatus(club,status)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold capitalize text-zinc-200 hover:border-lime-300/40 disabled:opacity-30">{clubBusy===club.id?'Saving…':status}</button>)}</div></article>) : <p className="text-sm text-zinc-500">No clubs found.</p>}</div>
    </section>
  </div>
}
