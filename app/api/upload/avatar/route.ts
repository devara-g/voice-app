import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = 'avatars';
const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;

    if (!file || !userId) {
      return NextResponse.json({ error: 'File dan userId diperlukan' }, { status: 400 });
    }

    // Validasi tipe file
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Format file tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.' }, { status: 400 });
    }

    // Validasi ukuran
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_SIZE_MB) {
      return NextResponse.json({ error: `Ukuran file terlalu besar. Maksimal ${MAX_SIZE_MB}MB.` }, { status: 400 });
    }

    // Pastikan bucket 'avatars' ada — buat jika belum
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === BUCKET);

    if (!bucketExists) {
      const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: MAX_SIZE_MB * 1024 * 1024,
        allowedMimeTypes: ALLOWED_TYPES,
      });
      if (createError) {
        console.error('Failed to create bucket:', createError);
        return NextResponse.json({ error: 'Gagal menyiapkan storage' }, { status: 500 });
      }
    }

    // Konversi File ke ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Nama file: userId/timestamp.ext
    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `${userId}/${Date.now()}.${ext}`;

    // Upload ke Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Dapatkan public URL
    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error('Avatar upload error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan saat upload' }, { status: 500 });
  }
}
