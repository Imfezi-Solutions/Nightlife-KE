export default function OfflinePage() {
 return <main className="noise flex min-h-screen items-center justify-center px-6">
  <section className="glass w-full max-w-lg rounded-3xl p-8 text-center">
   <p className="text-xs font-black uppercase tracking-[.25em] text-lime-300">Nightlife KE</p>
   <h1 className="mt-5 text-3xl font-black">You’re temporarily offline</h1>
   <p className="mt-4 leading-7 text-zinc-400">Reconnect to the internet to enter your clubs, chat and join live rooms. We do not store private account pages for offline use.</p>
   <a href="/" className="mt-7 inline-flex rounded-full bg-lime-300 px-6 py-3 font-bold text-black">Try again</a>
  </section>
 </main>
}
