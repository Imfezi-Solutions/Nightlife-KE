import Link from 'next/link'

export default function HomePage() {
  return <main className="relative min-h-screen overflow-hidden noise">
    <div className="pointer-events-none absolute -top-40 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-lime-400/10 blur-[120px]" />
    <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
      <Link href="/" className="text-xl font-black tracking-tight">NIGHTLIFE<span className="text-lime-300"> KE</span></Link>
      <Link href="/login" className="rounded-full border border-white/15 px-5 py-2 text-sm hover:border-lime-300/70">Sign in</Link>
    </header>
    <section className="relative mx-auto grid min-h-[78vh] max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_.95fr]">
      <div>
        <p className="mb-6 inline-flex rounded-full border border-lime-300/25 bg-lime-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[.22em] text-lime-200">Kenya after dark · Reimagined</p>
        <h1 className="max-w-3xl text-6xl font-black leading-[.98] tracking-[-.06em] sm:text-7xl lg:text-8xl">Your night.<br/><span className="text-lime-300">Your people.</span></h1>
        <p className="mt-8 max-w-xl text-lg leading-8 text-zinc-400">Step into virtual clubs, find your county’s crowd, meet new people and make every night feel like a night out.</p>
        <div className="mt-10 flex flex-wrap gap-4"><Link href="/login" className="rounded-full bg-lime-300 px-7 py-4 font-bold text-black transition hover:bg-lime-200">Enter Nightlife KE <span aria-hidden>↗</span></Link><a href="#experience" className="rounded-full border border-white/15 px-7 py-4 font-semibold text-white hover:border-white/40">Explore the experience</a></div>
        <p className="mt-7 text-xs tracking-wide text-zinc-500">18+ ONLY · Built for the Kenyan scene</p>
      </div>
      <div className="relative mx-auto w-full max-w-xl">
        <div className="absolute inset-8 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="glass relative aspect-[4/5] overflow-hidden rounded-[2.5rem] p-5 shadow-glow">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(183,255,74,.18),transparent_45%),radial-gradient(ellipse_at_80%_80%,rgba(139,92,246,.22),transparent_45%)]" />
          <div className="relative flex h-full flex-col justify-between rounded-[1.8rem] border border-white/10 p-6">
            <div className="flex items-center justify-between"><span className="text-xs font-bold tracking-[.25em] text-lime-200">LIVE VENUE</span><span className="rounded-full bg-red-500/15 px-3 py-1 text-xs text-red-300">● LIVE SOON</span></div>
            <div className="text-center"><div className="mx-auto mb-6 flex h-40 w-40 items-center justify-center rounded-full border border-lime-200/30 bg-lime-200/5 text-7xl shadow-[0_0_70px_rgba(183,255,74,.14)]">♫</div><p className="text-sm uppercase tracking-[.3em] text-zinc-400">The virtual dancefloor</p><h2 className="mt-3 text-4xl font-black">AFTER HOURS</h2><p className="mt-2 text-sm text-zinc-400">Nairobi · Dancefloor</p></div>
            <div className="flex items-center justify-between border-t border-white/10 pt-5 text-sm"><span className="text-zinc-400">Your crew is waiting</span><span className="font-semibold text-lime-200">30 spots / room</span></div>
          </div>
        </div>
      </div>
    </section>
    <section id="experience" className="relative mx-auto grid max-w-7xl gap-4 px-6 pb-24 sm:grid-cols-3">
      {[['01','Find your scene','Explore clubs and people across all 47 counties.'],['02','Bring your people','Create a club and invite friends with a private code.'],['03','Own the night','Dance, chat and move between immersive club spaces.']].map(([n,title,body])=><article key={n} className="glass rounded-3xl p-7"><span className="text-sm font-bold text-lime-300">{n}</span><h3 className="mt-8 text-xl font-bold">{title}</h3><p className="mt-3 leading-7 text-zinc-400">{body}</p></article>)}
    </section>
    <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-zinc-500">Nightlife KE · An Imfezi Solutions project · 18+ only</footer>
  </main>
}
