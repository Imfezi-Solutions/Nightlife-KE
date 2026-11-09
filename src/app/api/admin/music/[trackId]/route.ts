import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
export const runtime='nodejs'
export async function POST(request:Request,{params}:{params:Promise<{trackId:string}>}){
 const {trackId}=await params
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trackId))return NextResponse.json({error:'Invalid track identifier.'},{status:400})
 const supabase=await createClient()
 const {data:{user}}=await supabase.auth.getUser()
 if(!user)return NextResponse.json({error:'Sign in required.'},{status:401})
 const {data:assignment}=await supabase.from('platform_admins').select('role').eq('user_id',user.id).maybeSingle()
 if(!assignment||!['super_admin','platform_admin'].includes(assignment.role))return NextResponse.json({error:'Only platform administrators can review music rights.'},{status:403})
 const body=await request.json().catch(()=>null) as {status?:unknown}|null
 if(!body||!['approved','rejected'].includes(String(body.status)))return NextResponse.json({error:'Choose approve or reject.'},{status:400})
 const admin=createAdminClient()
 const {error}=await admin.rpc('review_dj_track',{p_track_id:trackId,p_actor_id:user.id,p_status:String(body.status)})
 if(error)return NextResponse.json({error:'Could not update music rights status.'},{status:400})
 return NextResponse.json({success:true})
}
