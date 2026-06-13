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

    // Inisialisasi client Supabase dengan schema 'auth' menggunakan service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'auth',
      },
    });

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, raw_user_meta_data')
      .in('id', userIds);

    if (error) {
      console.error('Error fetching users from auth schema:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const emails: Record<string, string> = {};
    const profiles: Record<string, { email: string; display_name: string; avatar_url: string | null; bio: string | null }> = {};
    
    const userData = data as { id: string; email?: string; raw_user_meta_data?: any }[] | null;
    userData?.forEach((user) => {
      if (user.email) {
        emails[user.id] = user.email;
      }
      const meta = user.raw_user_meta_data || {};
      profiles[user.id] = {
        email: user.email || 'Unknown',
        display_name: meta.display_name || user.email?.split('@')[0] || 'Unknown',
        avatar_url: meta.avatar_url || null,
        bio: meta.bio || null,
      };
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
