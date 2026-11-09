import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
export const runtime='nodejs'
const allowedRoles=['platform_admin','moderator','finance_admin','support_admin']
export async function POST(request:Request){
 const supabase=await createClient()
 const {data:{user}}=await supabase.auth.getUser()
 if(!user)return NextResponse.json({error:'Sign in required.'},{status:401})
 const {data:assignment}=await supabase.from('platform_admins').select('role').eq('user_id',user.id).maybeSingle()
 if(assignment?.role!=='super_admin')return NextResponse.json({error:'Only the super administrator can assign platform roles.'},{status:403})
 const body=await request.json().catch(()=>null) as {email?:unknown;role?:unknown}|null
 const email=typeof body?.email==='string'?body.email.trim().toLowerCase():''
 const role=String(body?.role??'')
 if(!email||email.length>254||!email.includes('@')||!allowedRoles.includes(role))return NextResponse.json({error:'Enter a valid email and platform role.'},{status:400})
 const admin=createAdminClient()
 const {data:userList,error:listError}=await admin.auth.admin.listUsers({page:1,perPage:1000})
 if(listError)return NextResponse.json({error:'Could not find the target account.'},{status:500})
 const target=userList.users.find(candidate=>candidate.email?.toLowerCase()===email&&candidate.email_confirmed_at)
 if(!target)return NextResponse.json({error:'No account with that verified email was found.'},{status:404})
 const {error}=await admin.from('platform_admins').upsert({user_id:target.id,role,granted_by:user.id,updated_at:new Date().toISOString()})
 if(error)return NextResponse.json({error:'Could not assign platform role.'},{status:500})
 await admin.from('platform_audit_logs').insert({actor_id:user.id,action:'platform.role.assigned',target_type:'platform_admin',target_id:target.id,details:{role,email}})
 return NextResponse.json({success:true})
}
