import type { Metadata, Viewport } from 'next'
import PwaRegister from './pwa-register'
import './globals.css'

export const metadata: Metadata = {
 metadataBase: new URL('https://nightlife.co.ke'),
 title: { default: 'Nightlife KE | Meet People, Join Virtual Clubs & Experience Kenyan Nightlife', template: '%s | Nightlife KE' },
 description: 'Meet people across Kenya, discover communities and experience immersive virtual nightlife. Join Nightlife KE to connect, explore 3D clubs, enjoy DJ sets and attend live social events. 18+ only.',
 keywords: ['Nightlife KE', 'Kenya nightlife', 'virtual clubs Kenya', 'meet people in Kenya', 'Kenyan social platform', '3D virtual club', 'online social community Kenya', 'virtual nightlife', 'DJ events Kenya'],
 authors: [{ name: 'Nightlife KE' }], creator: 'Imfezi Solutions', publisher: 'Imfezi Solutions',
 alternates: { languages: { 'en-KE': '/' } },
 openGraph: { type: 'website', locale: 'en_KE', siteName: 'Nightlife KE', title: 'Nightlife KE | Meet People, Join Virtual Clubs & Experience Kenyan Nightlife', description: 'Meet people across Kenya, discover communities and experience immersive virtual nightlife. 18+ only.', url: 'https://nightlife.co.ke/', images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Nightlife KE — Kenya social and virtual nightlife platform' }] },
 twitter: { card: 'summary_large_image', title: 'Nightlife KE | Kenya’s Social & Virtual Nightlife Platform', description: 'Meet people, find your crowd and experience virtual clubs across Kenya. 18+ only.' },
 robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
 manifest: '/manifest.webmanifest',
 applicationName: 'Nightlife KE',
 appleWebApp: { capable: true, title: 'Nightlife KE', statusBarStyle: 'black-translucent' },
 icons: { icon: '/icons/nightlife-ke.svg', apple: '/icons/nightlife-ke.svg' },
}
export const viewport: Viewport = { themeColor: '#08090d', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
 return <html lang="en"><body><PwaRegister />{children}</body></html>
}
