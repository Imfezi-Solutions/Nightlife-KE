'use client'
import dynamic from 'next/dynamic'
import type { Json } from '@/lib/supabase/database.types'
const Engine = dynamic(() => import('./room-3d-engine'), { ssr:false, loading:()=><div className="mt-7 flex h-[420px] items-center justify-center rounded-[2rem] border border-white/10 bg-[#090a12] text-sm text-zinc-400">Loading the 3D nightclub…</div> })
export default function Room3DEngineLoader(props:{roomId:string;userId:string;displayName:string;initialConfig:Json|null}) { return <Engine {...props}/> }
