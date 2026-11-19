'use client'

import { useEffect, useState } from 'react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export default function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [showIosHelp, setShowIosHelp] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined)
    }

    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    setInstalled(standalone)

    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function installApp() {
    if (installPrompt) {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === 'accepted') setInstalled(true)
      setInstallPrompt(null)
      return
    }
    setShowIosHelp(true)
  }

  if (installed) return null

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[100] flex items-center gap-2 rounded-full border border-lime-300/30 bg-[#10120f]/95 p-2 pl-4 shadow-2xl backdrop-blur-xl">
        <span className="text-xs font-semibold text-white">Get the app</span>
        <button onClick={installApp} className="rounded-full bg-lime-300 px-4 py-2 text-xs font-black text-black hover:bg-lime-200">
          Install
        </button>
      </div>
      {showIosHelp && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="install-help-title">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#11131b] p-6 text-white shadow-2xl">
            <h2 id="install-help-title" className="text-xl font-black">Install Nightlife KE</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">On iPhone or iPad, tap the Share button in Safari, then choose <strong>Add to Home Screen</strong>.</p>
            <button onClick={() => setShowIosHelp(false)} className="mt-5 w-full rounded-full bg-lime-300 px-5 py-3 font-bold text-black">Got it</button>
          </div>
        </div>
      )}
    </>
  )
}
