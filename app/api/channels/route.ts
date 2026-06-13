import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const serverId = searchParams.get('server_id');

  if (!serverId) {
    return NextResponse.json({ error: 'server_id required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('channels')
    .select('*')
    .eq('server_id', serverId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ channels: data });
}

export async function POST(req: NextRequest) {
  try {
    const { server_id, name, type } = await req.json();

    if (!server_id || !name || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (type !== 'text' && type !== 'voice') {
      return NextResponse.json({ error: 'Invalid channel type' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('channels')
      .insert([{ server_id, name, type }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ channel: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
