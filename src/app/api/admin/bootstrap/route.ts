import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime='nodejs'

export async function POST(){
 const supabase=await createClient()
 const {data:{user}}=await supabase.auth.getUser()
 if(!user||!user.email||!user.email_confirmed_at)return NextResponse.json({error:'Sign in with a verified email address first.'},{status:401})
 const expected=process.env.NIGHTLIFE_INITIAL_SUPER_ADMIN_EMAIL?.trim().toLowerCase()
 if(!expected)return NextResponse.json({error:'Initial administrator email is not configured on the server.'},{status:503})
 if(user.email.toLowerCase()!==expected)return NextResponse.json({error:'This account is not authorized for initial administrator setup.'},{status:403})
 let admin
 try{admin=createAdminClient()}catch{return NextResponse.json({error:'Server admin credentials are not configured.'},{status:503})}
 const {data:existing,error:lookupError}=await admin.from('platform_admins').select('user_id,role').limit(1)
 if(lookupError)return NextResponse.json({error:'Could not check administrator setup.'},{status:500})
 if(existing?.length&& !existing.some(row=>row.user_id===user.id&&row.role==='super_admin'))return NextResponse.json({error:'An administrator has already been configured. Ask the existing super administrator for access.'},{status:409})
 const {error}=await admin.from('platform_admins').upsert({user_id:user.id,role:'super_admin',granted_by:user.id,updated_at:new Date().toISOString()})
 if(error)return NextResponse.json({error:'Could not create the initial administrator.'},{status:500})
 await admin.from('platform_audit_logs').insert({actor_id:user.id,action:'platform.super_admin.bootstrap',target_type:'platform_admin',target_id:user.id,details:{method:'verified_email_allowlist'}})
 return NextResponse.json({success:true,message:'Initial super administrator configured. Open the admin dashboard.'})
}
