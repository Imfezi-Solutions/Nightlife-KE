import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: { extend: { colors: { ink: '#08090d', panel: '#11131b', neon: '#b7ff4a', violet: '#a78bfa' }, boxShadow: { glow: '0 0 40px rgba(183,255,74,.12)' } } },
  plugins: [],
}

export default config
