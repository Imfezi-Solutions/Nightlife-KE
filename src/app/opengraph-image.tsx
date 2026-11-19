import { ImageResponse } from 'next/og'

export const alt = 'Nightlife KE — a 3D virtual social nightlife platform by Imfezi Solutions'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '66px 76px', color: '#f4f4f5', background: 'linear-gradient(135deg, #080516 0%, #17102d 58%, #08090d 100%)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <div style={{ width: 90, height: 90, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#a52bdf', fontSize: 42, fontWeight: 900, color: '#ffffff' }}>NK</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 900, letterSpacing: 3 }}>NIGHTLIFE KE</div>
          <div style={{ display: 'flex', fontSize: 16, color: '#c4b5fd', letterSpacing: 3, marginTop: 8 }}>BY IMFEZI SOLUTIONS</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontSize: 76, fontWeight: 900, lineHeight: 1.05, letterSpacing: -3 }}>Your virtual night starts here.</div>
        <div style={{ display: 'flex', marginTop: 28, fontSize: 28, color: '#d4d4d8' }}>Meet · Connect · Dance · Experience</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, color: '#e879f9' }}>
        <div style={{ display: 'flex' }}>3D VIRTUAL SOCIAL NIGHTLIFE</div>
        <div style={{ display: 'flex' }}>18+ ONLY · NIGHTLIFE.CO.KE</div>
      </div>
    </div>,
    { ...size }
  )
}
