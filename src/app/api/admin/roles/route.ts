import { NextResponse } from 'next/server'

// Nightlife KE is configured with one owner-level administrator account.
// Staff administrator provisioning is intentionally disabled.
export async function POST(){
 return NextResponse.json({error:'Additional administrator accounts are disabled for Nightlife KE.'},{status:403})
}
