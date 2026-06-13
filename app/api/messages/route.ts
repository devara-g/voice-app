import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const channelId = searchParams.get('channel_id');

  if (!channelId) {
    return NextResponse.json({ error: 'channel_id required' }, { status: 400 });
  }

  // Ambil history pesan untuk channel tertentu
  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) {
    console.error('[messages GET] Supabase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(req: NextRequest) {
  try {
    const { channel_id, user_id, content } = await req.json();

    if (!channel_id || !user_id || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert([{ channel_id, user_id, content }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
