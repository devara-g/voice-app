import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { userIds } = await req.json();
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ emails: {} });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing Supabase keys' }, { status: 500 });
    }

    // Inisialisasi client Supabase
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const emails: Record<string, string> = {};
    const profiles: Record<string, { email: string; display_name: string; avatar_url: string | null; banner_url?: string | null; bio: string | null }> = {};
    
    // Fetch user details for each ID
    const promises = userIds.map((id: string) => supabaseAdmin.auth.admin.getUserById(id));
    const results = await Promise.all(promises);

    results.forEach((res) => {
      if (!res.error && res.data?.user) {
        const user = res.data.user;
        if (user.email) {
          emails[user.id] = user.email;
        }
        const meta = user.user_metadata || {};
        profiles[user.id] = {
          email: user.email || 'Unknown',
          display_name: meta.display_name || user.email?.split('@')[0] || 'Unknown',
          avatar_url: meta.avatar_url || null,
          banner_url: meta.banner_url || null,
          bio: meta.bio || null,
        };
      }
    });

    return NextResponse.json({ emails, profiles });
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
