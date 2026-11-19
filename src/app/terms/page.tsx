import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms and Conditions',
  description: 'Read the terms for using Nightlife KE, a social and virtual nightlife platform for adults aged 18 and over in Kenya.',
  alternates: { canonical: '/terms' },
  robots: { index: true, follow: true },
}

export default function TermsPage() {
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-12 text-zinc-200">
    <Link href="/login" className="text-sm text-lime-300 hover:underline">← Back to Nightlife KE</Link>
    <p className="mt-10 text-xs font-bold uppercase tracking-[.25em] text-lime-300">Nightlife KE · Effective 18 November 2026</p>
    <h1 className="mt-3 text-4xl font-black text-white">Terms and Conditions</h1>
    <p className="mt-4 leading-7 text-zinc-400">By creating an account or using Nightlife KE, you agree to these terms. If you do not agree, do not use the platform.</p>
    <div className="mt-8 space-y-7 leading-7">
      <section><h2 className="text-xl font-bold text-white">1. Adults-only platform</h2><p>Nightlife KE is intended only for people aged 18 or older. You must be at least 18 to register or use the platform. Identity-based age verification is temporarily paused; this does not change the minimum-age requirement. Do not misrepresent your age. We may restrict or suspend accounts where there is a safety concern or credible indication that a user is under 18.</p></section>
      <section><h2 className="text-xl font-bold text-white">2. Your account and conduct</h2><p>Provide accurate account information and keep your login credentials secure. You are responsible for activity under your account. Treat other users respectfully. Harassment, threats, hate speech, impersonation, scams, unlawful activity, non-consensual content and attempts to exploit or disrupt the service are prohibited.</p></section>
      <section><h2 className="text-xl font-bold text-white">3. Clubs, rooms and user content</h2><p>Club owners and moderators are responsible for managing their spaces. You retain responsibility for content you post, upload, stream or share, and must have the rights and permissions needed to do so. Do not upload unlawful, abusive, infringing or harmful material. We may remove content or restrict access to protect users and the platform.</p></section>
      <section><h2 className="text-xl font-bold text-white">4. Consent and privacy</h2><p>Respect other users’ boundaries. Do not record, share or redistribute another person’s personal information, image, voice or content without the permissions required by law and the platform. Review our <Link href="/privacy" className="text-lime-300 underline">Privacy Policy</Link> for information about data handling.</p></section>
      <section><h2 className="text-xl font-bold text-white">5. Payments and virtual items</h2><p>Prices and features are shown in the platform before purchase. Virtual credits or items have no cash value unless expressly stated. Do not make a payment you do not authorise. Payment disputes and refund requests are handled in accordance with applicable law and the relevant payment provider’s rules.</p></section>
      <section><h2 className="text-xl font-bold text-white">6. Availability and enforcement</h2><p>We may update, suspend or discontinue features, and may suspend or terminate accounts that breach these terms or threaten user safety. We aim to keep the service available but do not guarantee uninterrupted operation.</p></section>
      <section><h2 className="text-xl font-bold text-white">7. Changes and contact</h2><p>We may update these terms from time to time. Continued use after an update means you accept the revised terms. For questions or concerns, contact <a href="mailto:imfezisolutions@outlook.com" className="text-lime-300 underline">imfezisolutions@outlook.com</a>.</p></section>
    </div>
  </main>
}