import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Meet People & Explore Virtual Clubs Across Kenya',
  description: 'Discover Nightlife KE: meet new people, find communities, join immersive 3D virtual clubs, enjoy DJ sets and attend social events across Kenya. Adults 18+ only.',
  alternates: { canonical: '/' },
  openGraph: { title: 'Meet People & Explore Virtual Clubs Across Kenya', description: 'Find your people, discover communities and experience immersive virtual nightlife across Kenya. 18+ only.', url: 'https://nightlife.co.ke/', type: 'website' },
}

const pillars = [
  { number: '01', title: 'Find your people', body: 'Discover people, communities and public clubs across all 47 counties — not just your hometown.' },
  { number: '02', title: 'Build your circle', body: 'Join communities, meet members, bring friends along and create a place for your own crowd.' },
  { number: '03', title: 'Share experiences', body: 'Catch live events, conversations, DJ sets and nights out inside immersive virtual venues.' },
]

export default function HomePage() {

  const structuredData = { '@context': 'https://schema.org', '@graph': [ { '@type': 'Organization', name: 'Nightlife KE', url: 'https://nightlife.co.ke/', description: 'A Kenyan social and virtual nightlife platform operated by Imfezi Solutions.', parentOrganization: { '@type': 'Organization', name: 'Imfezi Solutions' } }, { '@type': 'WebSite', name: 'Nightlife KE', url: 'https://nightlife.co.ke/', inLanguage: 'en-KE', description: 'Meet people, discover communities and experience virtual clubs across Kenya.' }, { '@type': 'WebPage', name: 'Nightlife KE — Meet People & Explore Virtual Clubs Across Kenya', url: 'https://nightlife.co.ke/', isPartOf: { '@type': 'WebSite', url: 'https://nightlife.co.ke/' }, about: { '@type': 'Thing', name: 'Kenyan social networking and virtual nightlife' } } ] }
  return <main className="relative min-h-screen overflow-hidden noise">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <div className="pointer-events-none absolute -top-40 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-lime-400/10 blur-[120px]" />
    <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
      <Link href="/" className="text-xl font-black tracking-tight">NIGHTLIFE<span className="text-lime-300"> KE</span></Link>
      <nav className="flex items-center gap-3"><Link href="/discover" className="hidden rounded-full px-4 py-2 text-sm text-zinc-300 hover:text-white sm:inline-flex">Explore clubs</Link><Link href="/login" className="rounded-full border border-white/15 px-5 py-2 text-sm hover:border-lime-300/70">Sign in</Link></nav>
    </header>
    <section className="relative mx-auto grid min-h-[78vh] max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_.95fr]">
      <div>
        <p className="mb-6 inline-flex rounded-full border border-lime-300/25 bg-lime-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[.22em] text-lime-200">Kenya's social world · 18+</p>
        <h1 className="max-w-3xl text-6xl font-black leading-[.98] tracking-[-.06em] sm:text-7xl lg:text-8xl">Find your<br/><span className="text-lime-300">people.</span></h1>
        <p className="mt-8 max-w-xl text-lg leading-8 text-zinc-300">A social platform for meeting people, finding your crowd and sharing experiences across Kenya. From everyday connections to unforgettable nights inside virtual clubs.</p>
        <div className="mt-10 flex flex-wrap gap-4"><Link href="/login" className="rounded-full bg-lime-300 px-7 py-4 font-bold text-black transition hover:bg-lime-200">Join the community <span aria-hidden>↗</span></Link><Link href="/discover" className="rounded-full border border-white/15 px-7 py-4 font-semibold text-white hover:border-white/40">Explore clubs</Link></div>
        <p className="mt-7 text-xs tracking-wide text-zinc-500">18+ ONLY · Built for connection across all 47 counties</p>
      </div>
      <div className="relative mx-auto w-full max-w-xl">
        <div className="absolute inset-8 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="glass relative overflow-hidden rounded-[2.5rem] p-5 shadow-glow">
          <div className="relative rounded-[1.8rem] border border-white/10 p-6">
            <div className="flex items-center justify-between"><span className="text-xs font-bold tracking-[.25em] text-lime-200">YOUR SOCIAL WORLD</span><span className="rounded-full bg-lime-300/10 px-3 py-1 text-xs text-lime-200">KENYA · 47 COUNTIES</span></div>
            <div className="mt-9 rounded-3xl border border-white/10 bg-black/20 p-5"><p className="text-xs uppercase tracking-[.2em] text-zinc-500">Discover</p><h2 className="mt-2 text-3xl font-black">People. Places.<br/>Possibilities.</h2><div className="mt-6 flex flex-wrap gap-2">{['Meet people','Find communities','Join clubs','Live experiences'].map(x=><span key={x} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300">{x}</span>)}</div></div>
            <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-lime-300/10 p-4"><p className="text-2xl">◎</p><p className="mt-2 text-sm font-bold">Real connections</p><p className="mt-1 text-xs text-zinc-400">Find your circle</p></div><div className="rounded-2xl bg-violet-400/10 p-4"><p className="text-2xl">♫</p><p className="mt-2 text-sm font-bold">Virtual venues</p><p className="mt-1 text-xs text-zinc-400">Experience it together</p></div></div>
            <p className="mt-6 border-t border-white/10 pt-5 text-sm text-zinc-400">Your county is where you start — not where your world ends.</p>
          </div>
        </div>
      </div>
    </section>
    <section className="relative mx-auto grid max-w-7xl gap-4 px-6 pb-24 sm:grid-cols-3">
      {pillars.map(item=><article key={item.number} className="glass rounded-3xl p-7"><span className="text-sm font-bold text-lime-300">{item.number}</span><h3 className="mt-8 text-xl font-bold">{item.title}</h3><p className="mt-3 leading-7 text-zinc-400">{item.body}</p></article>)}
    </section>
    <section className="mx-auto max-w-7xl px-6 pb-24"><div className="glass flex flex-col justify-between gap-6 rounded-3xl p-8 sm:flex-row sm:items-center sm:p-10"><div><p className="text-xs font-bold uppercase tracking-[.25em] text-lime-300">The Nightlife KE difference</p><h2 className="mt-3 text-3xl font-black">Not just a feed. A place to belong.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Meet online, then step into shared 3D clubs with avatars, music, dancing, DJs, lounges and live social experiences.</p></div><Link href="/discover" className="shrink-0 rounded-xl bg-lime-300 px-6 py-4 text-center font-bold text-black">Discover your scene →</Link></div></section>
    <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-zinc-500">Nightlife KE · An Imfezi Solutions project · 18+ only</footer>
  </main>
}
