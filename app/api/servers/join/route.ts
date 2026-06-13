import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// GET /api/servers/join?serverId=xxx  -> get or generate invite code for server
export async function GET(request: NextRequest) {
  const serverId = request.nextUrl.searchParams.get('serverId');
  if (!serverId) return NextResponse.json({ error: 'Missing serverId' }, { status: 400 });

  try {
    const { data: server, error } = await supabaseAdmin
      .from('servers')
      .select('id, name, invite_code, image_url')
      .eq('id', serverId)
      .single();

    if (error || !server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    // Generate invite code if missing
    if (!server.invite_code) {
      let newCode = generateInviteCode();
      // Ensure uniqueness
      let exists = true;
      while (exists) {
        const { data: existing } = await supabaseAdmin
          .from('servers')
          .select('id')
          .eq('invite_code', newCode)
          .maybeSingle();
        if (!existing) exists = false;
        else newCode = generateInviteCode();
      }

      const { error: updateError } = await supabaseAdmin
        .from('servers')
        .update({ invite_code: newCode })
        .eq('id', serverId);

      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
      server.invite_code = newCode;
    }

    return NextResponse.json({ inviteCode: server.invite_code, serverName: server.name });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/servers/join  -> join server by invite code
// body: { inviteCode, userId }
export async function POST(request: NextRequest) {
  try {
    const { inviteCode, userId } = await request.json();
    if (!inviteCode || !userId) {
      return NextResponse.json({ error: 'Missing inviteCode or userId' }, { status: 400 });
    }

    // Find server by invite code
    const { data: server, error: serverError } = await supabaseAdmin
      .from('servers')
      .select('id, name, owner_id')
      .eq('invite_code', inviteCode.toUpperCase().trim())
      .maybeSingle();

    if (serverError || !server) {
      return NextResponse.json({ error: 'Kode undangan tidak valid' }, { status: 404 });
    }

    // Check if already a member
    const { data: existingMember } = await supabaseAdmin
      .from('members')
      .select('user_id')
      .eq('server_id', server.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingMember) {
      // Already a member, just return the server info so we can redirect
      return NextResponse.json({ 
        success: true, 
        alreadyMember: true, 
        serverId: server.id, 
        serverName: server.name 
      });
    }

    // Add as member
    const { error: joinError } = await supabaseAdmin
      .from('members')
      .insert({ server_id: server.id, user_id: userId });

    if (joinError) {
      return NextResponse.json({ error: joinError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      alreadyMember: false, 
      serverId: server.id, 
      serverName: server.name 
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
