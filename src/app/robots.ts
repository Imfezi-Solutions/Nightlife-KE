import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/auth/', '/login', '/onboarding', '/community', '/people', '/messages', '/notifications', '/events', '/profile/', '/settings', '/club/'] },
      { userAgent: 'Googlebot', allow: '/', disallow: ['/admin', '/api/', '/auth/', '/login', '/onboarding', '/community', '/people', '/messages', '/notifications', '/events', '/profile/', '/settings', '/club/'] },
    ],
    sitemap: 'https://nightlife.co.ke/sitemap.xml',
    host: 'https://nightlife.co.ke',
  }
}
