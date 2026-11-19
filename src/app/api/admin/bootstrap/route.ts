import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime='nodejs'

export async function GET(){
 const supabase=await createClient()
 const {data:{user}}=await supabase.auth.getUser()
 if(!user||!user.email_confirmed_at)return NextResponse.redirect(new URL('/login?next=/api/admin/bootstrap',process.env.NEXT_PUBLIC_SITE_URL||'https://nightlife-ke.vercel.app'))
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nightlife KE · Owner setup</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#08090d;color:#f4f4f5;font:16px system-ui;padding:24px}.card{max-width:520px;background:#151711;border:1px solid #bef26444;border-radius:24px;padding:32px}h1{font-size:30px;margin:8px 0 16px}p{line-height:1.7;color:#b4b4b8}button{width:100%;padding:16px;border:0;border-radius:12px;background:#d9f99d;font-weight:800;font-size:15px;cursor:pointer}#status{margin-top:16px;color:#d9f99d}</style></head><body><main class="card"><p style="color:#d9f99d;font-weight:800;letter-spacing:3px">NIGHTLIFE KE · OWNER SETUP</p><h1>Activate your Super Admin account</h1><p>Signed in as <strong>${user.email}</strong>. This one-time setup only works for the email address authorised by Imfezi Solutions. The database allows one administrator account only.</p><button id="claim">Activate my administrator account</button><p id="status" role="status"></p></main><script>document.getElementById('claim').onclick=async()=>{const b=document.getElementById('claim'),s=document.getElementById('status');b.disabled=true;b.textContent='Verifying…';try{const r=await fetch(location.pathname,{method:'POST'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Setup failed');s.textContent=d.message||'Administrator access activated.';location.href='/admin'}catch(e){s.textContent=e.message;b.disabled=false;b.textContent='Try again'}}</script></body></html>`
 return new NextResponse(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})
}

export async function POST(){
 const supabase=await createClient()
 const {data:{user}}=await supabase.auth.getUser()
 if(!user||!user.email||!user.email_confirmed_at)return NextResponse.json({error:'Sign in with a verified email address first.'},{status:401})
 const expected=process.env.NIGHTLIFE_INITIAL_SUPER_ADMIN_EMAIL?.trim().toLowerCase()
 if(!expected)return NextResponse.json({error:'Initial administrator email is not configured yet. Send the verified signup email to Imfezi support to complete owner setup.'},{status:503})
 if(user.email.toLowerCase()!==expected)return NextResponse.json({error:'This account is not authorised for initial administrator setup.'},{status:403})
 let admin
 try{admin=createAdminClient()}catch{return NextResponse.json({error:'Server admin credentials are not configured.'},{status:503})}
 const {data:existing,error:lookupError}=await admin.from('platform_admins').select('user_id,role').limit(1)
 if(lookupError)return NextResponse.json({error:'Could not check administrator setup.'},{status:500})
 if(existing?.length&&!existing.some(row=>row.user_id===user.id&&row.role==='super_admin'))return NextResponse.json({error:'An administrator has already been configured. The owner account cannot be replaced through signup.'},{status:409})
 const {error}=await admin.from('platform_admins').upsert({user_id:user.id,role:'super_admin',granted_by:user.id,updated_at:new Date().toISOString()})
 if(error)return NextResponse.json({error:'Could not create the initial administrator.'},{status:500})
 await admin.from('platform_audit_logs').insert({actor_id:user.id,action:'platform.super_admin.bootstrap',target_type:'platform_admin',target_id:user.id,details:{method:'verified_email_allowlist'}})
 return NextResponse.json({success:true,message:'Initial super administrator configured. Open the admin dashboard.'})
}
