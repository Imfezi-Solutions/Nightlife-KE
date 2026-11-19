import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://nightlife.co.ke/', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: 'https://nightlife.co.ke/terms', lastModified: new Date('2026-11-18'), changeFrequency: 'yearly', priority: 0.3 },
  ]
}
