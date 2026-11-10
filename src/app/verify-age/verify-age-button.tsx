'use client'

import { useState } from 'react'

export default function VerifyAgeButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function startVerification() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/age-verification/didit/session', { method: 'POST' })
      const result = await response.json() as { verificationUrl?: string; error?: string }
      if (!response.ok || !result.verificationUrl) {
        setError(result.error || 'Could not start verification. Please try again.')
        setLoading(false)
        return
      }
      window.location.assign(result.verificationUrl)
    } catch {
      setError('Could not reach the verification service. Please try again.')
      setLoading(false)
    }
  }

  return <div>
    <button
      type="button"
      onClick={startVerification}
      disabled={loading}
      className="w-full rounded-xl bg-lime-300 px-5 py-4 font-bold text-black transition hover:bg-lime-200 disabled:cursor-wait disabled:opacity-60"
    >
      {loading ? 'Preparing secure age check…' : 'Verify my age securely'}
    </button>
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
  </div>
}
