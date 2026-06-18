import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { decodeMessageContent, encodeMessageContent, MessageReplyMeta, MessageAttachment } from '@/lib/messageFormat';

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

  const messages = (data ?? []).map((message) => {
    const decoded = decodeMessageContent(message.content || '');
    return {
      ...message,
      content: decoded.content,
      reply_meta: decoded.replyMeta,
      attachments: decoded.attachments,
    };
  });

  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  try {
    const { channel_id, user_id, content, reply_meta, attachments } = await req.json();

    if (!channel_id || !user_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // Perlu content atau attachments
    if (!content && (!attachments || attachments.length === 0)) {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong' }, { status: 400 });
    }

    const storedContent = encodeMessageContent(content || '', reply_meta || null, attachments || null);

    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert([{ channel_id, user_id, content: storedContent }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const decoded = decodeMessageContent(data.content || '');
    return NextResponse.json({
      message: {
        ...data,
        content: decoded.content,
        reply_meta: decoded.replyMeta,
        attachments: decoded.attachments,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { message_id, user_id, content, reply_meta } = await req.json();

    if (!message_id || !user_id || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('messages')
      .select('id, user_id, content')
      .eq('id', message_id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (existing.user_id !== user_id) {
      return NextResponse.json({ error: 'Tidak bisa mengubah pesan milik orang lain' }, { status: 403 });
    }

    const decodedExisting = decodeMessageContent(existing.content || '');
    const storedContent = encodeMessageContent(content, reply_meta ?? decodedExisting.replyMeta, decodedExisting.attachments);

    const { data, error } = await supabaseAdmin
      .from('messages')
      .update({ content: storedContent })
      .eq('id', message_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const decoded = decodeMessageContent(data.content || '');
    return NextResponse.json({
      message: {
        ...data,
        content: decoded.content,
        reply_meta: decoded.replyMeta,
        attachments: decoded.attachments,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { message_id, user_id } = await req.json();

    if (!message_id || !user_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('messages')
      .select('id, user_id')
      .eq('id', message_id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (existing.user_id !== user_id) {
      return NextResponse.json({ error: 'Tidak bisa menghapus pesan milik orang lain' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('id', message_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
