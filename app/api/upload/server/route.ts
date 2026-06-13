import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = 'server-assets';
const MAX_SIZE_MB = 8;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const serverId = formData.get('serverId') as string | null;
    const type = (formData.get('type') as string | null) || 'icon'; // 'icon' or 'banner'

    if (!file || !serverId) {
      return NextResponse.json({ error: 'File dan serverId diperlukan' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.' },
        { status: 400 }
      );
    }

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_SIZE_MB) {
      return NextResponse.json(
        { error: `Ukuran file terlalu besar. Maksimal ${MAX_SIZE_MB}MB.` },
        { status: 400 }
      );
    }

    // Ensure bucket exists
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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = file.name.split('.').pop() || 'jpg';
    // e.g. servers/server-uuid/icon-1234567890.jpg  or  servers/server-uuid/banner-1234567890.jpg
    const filePath = `servers/${serverId}/${type}-${Date.now()}.${ext}`;

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

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filePath);
    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error('Server asset upload error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan saat upload' }, { status: 500 });
  }
}
