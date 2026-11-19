import { ImageResponse } from 'next/og'

export const alt = 'Nightlife KE — Kenya’s social and virtual nightlife platform'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '76px', color: '#f4f4f5', background: 'linear-gradient(135deg, #08090d 0%, #171329 55%, #26320d 100%)' }}>
        <div style={{ display: 'flex', fontSize: 28, fontWeight: 800, letterSpacing: 5 }}>NIGHTLIFE <span style={{ color: '#bef264', marginLeft: 12 }}>KE</span></div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 1.05, letterSpacing: -3 }}>Find your people.</div>
          <div style={{ marginTop: 28, fontSize: 30, color: '#d4d4d8' }}>Meet · Connect · Experience virtual nightlife</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, color: '#bef264' }}><span>KENYA’S SOCIAL WORLD</span><span>18+ ONLY · NIGHTLIFE.CO.KE</span></div>
      </div>
    ),
    { ...size }
  )
}
