import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/friends?userId=xxx  -> list accepted friends + pending requests
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  try {
    // Get accepted friends (both directions)
    const { data: accepted, error: err1 } = await supabaseAdmin
      .from('friends')
      .select('user_id, friend_id, status, created_at')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted');

    // Get pending requests sent TO me
    const { data: incoming, error: err2 } = await supabaseAdmin
      .from('friends')
      .select('user_id, friend_id, status, created_at')
      .eq('friend_id', userId)
      .eq('status', 'pending');

    // Get pending requests I sent
    const { data: outgoing, error: err3 } = await supabaseAdmin
      .from('friends')
      .select('user_id, friend_id, status, created_at')
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (err1 || err2 || err3) {
      console.error('Friends query errors:', err1, err2, err3);
      return NextResponse.json({ error: 'Failed to fetch friends' }, { status: 500 });
    }

    // Gather all user IDs to fetch profiles
    const allIds = new Set<string>();
    (accepted || []).forEach((r) => { allIds.add(r.user_id); allIds.add(r.friend_id); });
    (incoming || []).forEach((r) => allIds.add(r.user_id));
    (outgoing || []).forEach((r) => allIds.add(r.friend_id));
    allIds.delete(userId);

    const userIdsArr = Array.from(allIds);
    let profileMap: Record<string, { email: string; display_name: string; avatar_url: string | null }> = {};

    if (userIdsArr.length > 0) {
      // Fetch auth users for emails
      const authUsers = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      authUsers.data?.users?.forEach((u) => {
        if (userIdsArr.includes(u.id)) {
          profileMap[u.id] = {
            email: u.email || 'unknown',
            display_name: u.user_metadata?.display_name || u.email?.split('@')[0] || 'User',
            avatar_url: u.user_metadata?.avatar_url || null,
          };
        }
      });
    }

    // Build friends list
    const friendsList = (accepted || []).map((r) => {
      const otherId = r.user_id === userId ? r.friend_id : r.user_id;
      return { ...profileMap[otherId], user_id: otherId, status: 'accepted' };
    });

    const incomingList = (incoming || []).map((r) => ({
      ...profileMap[r.user_id],
      user_id: r.user_id,
      status: 'pending_incoming',
    }));

    const outgoingList = (outgoing || []).map((r) => ({
      ...profileMap[r.friend_id],
      user_id: r.friend_id,
      status: 'pending_outgoing',
    }));

    return NextResponse.json({ friends: friendsList, incoming: incomingList, outgoing: outgoingList });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/friends  -> send friend request, accept, or reject
// body: { action: 'send'|'accept'|'reject'|'remove', userId, targetId } 
// For 'search': { action: 'search', email }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, targetId, email } = body;

    if (action === 'search') {
      // Find user by email
      if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });
      const authUsers = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const found = authUsers.data?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );
      if (!found) return NextResponse.json({ user: null });
      return NextResponse.json({
        user: {
          user_id: found.id,
          email: found.email,
          display_name: found.user_metadata?.display_name || found.email?.split('@')[0] || 'User',
          avatar_url: found.user_metadata?.avatar_url || null,
        },
      });
    }

    if (!userId || !targetId) {
      return NextResponse.json({ error: 'Missing userId or targetId' }, { status: 400 });
    }

    if (action === 'send') {
      // Check if friendship already exists
      const { data: existing } = await supabaseAdmin
        .from('friends')
        .select('*')
        .or(
          `and(user_id.eq.${userId},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${userId})`
        )
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: 'Friend request already exists or already friends' }, { status: 409 });
      }

      const { error } = await supabaseAdmin.from('friends').insert({
        user_id: userId,
        friend_id: targetId,
        status: 'pending',
      });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'accept') {
      const { error } = await supabaseAdmin
        .from('friends')
        .update({ status: 'accepted' })
        .eq('user_id', targetId)
        .eq('friend_id', userId)
        .eq('status', 'pending');

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'reject') {
      const { error } = await supabaseAdmin
        .from('friends')
        .delete()
        .eq('user_id', targetId)
        .eq('friend_id', userId)
        .eq('status', 'pending');

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'remove') {
      const { error } = await supabaseAdmin
        .from('friends')
        .delete()
        .or(
          `and(user_id.eq.${userId},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${userId})`
        );

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
