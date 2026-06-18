import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = 'message-media';

export async function GET() {
  try {
    // Cek apakah bucket sudah ada
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();

    if (listError) {
      return NextResponse.json({ error: 'Gagal list buckets: ' + listError.message }, { status: 500 });
    }

    const exists = buckets?.some((b) => b.name === BUCKET);

    if (exists) {
      return NextResponse.json({ ok: true, message: `Bucket "${BUCKET}" sudah ada.` });
    }

    // Buat bucket baru
    const { data, error: createError } = await supabaseAdmin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
        'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav',
      ],
    });

    if (createError) {
      return NextResponse.json({ error: 'Gagal buat bucket: ' + createError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: `Bucket "${BUCKET}" berhasil dibuat! Sekarang fitur gambar & voice note siap digunakan.`,
      data,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
