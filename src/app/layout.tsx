import type { Metadata, Viewport } from 'next'
import PwaRegister from './pwa-register'
import './globals.css'

export const metadata: Metadata = {
 title: 'Nightlife KE — Your night, your people',
 description: 'Discover Kenyan virtual clubs, meet people and experience nightlife together.',
 manifest: '/manifest.webmanifest',
 applicationName: 'Nightlife KE',
 appleWebApp: { capable: true, title: 'Nightlife KE', statusBarStyle: 'black-translucent' },
 icons: { icon: '/icons/nightlife-ke.svg', apple: '/icons/nightlife-ke.svg' },
}
export const viewport: Viewport = { themeColor: '#08090d', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
 return <html lang="en"><body><PwaRegister />{children}</body></html>
}
