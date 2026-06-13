import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/servers/[id] — get server details including banner_url
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing server id' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('servers')
    .select('id, name, owner_id, image_url, banner_url, invite_code, created_at')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Server not found' }, { status: 404 });
  }

  return NextResponse.json({ server: data });
}

// PATCH /api/servers/[id] — update server settings (owner only)
// body: { userId, name?, image_url?, banner_url? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing server id' }, { status: 400 });

  try {
    const body = await req.json();
    const { userId, name, image_url, banner_url } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId diperlukan' }, { status: 400 });
    }

    // Verify ownership
    const { data: server, error: fetchError } = await supabaseAdmin
      .from('servers')
      .select('id, owner_id')
      .eq('id', id)
      .single();

    if (fetchError || !server) {
      return NextResponse.json({ error: 'Server tidak ditemukan' }, { status: 404 });
    }

    if (server.owner_id !== userId) {
      return NextResponse.json({ error: 'Hanya owner yang dapat mengubah server' }, { status: 403 });
    }

    // Build update payload (only include fields that were provided)
    const updates: Record<string, string> = {};
    if (name !== undefined && name.trim()) updates.name = name.trim();
    if (image_url !== undefined) updates.image_url = image_url;
    if (banner_url !== undefined) updates.banner_url = banner_url;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Tidak ada field yang diubah' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('servers')
      .update(updates)
      .eq('id', id)
      .select('id, name, owner_id, image_url, banner_url')
      .single();

    if (updateError) {
      console.error('Error updating server:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ server: updated });
  } catch (err) {
    console.error('PATCH /api/servers/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
