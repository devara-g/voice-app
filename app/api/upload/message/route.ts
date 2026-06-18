import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = 'message-media';
const MAX_IMAGE_MB = 10;
const MAX_AUDIO_MB = 5;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;

    if (!file || !userId) {
      return NextResponse.json({ error: 'File dan userId diperlukan' }, { status: 400 });
    }

    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isAudio = ALLOWED_AUDIO_TYPES.includes(file.type);

    if (!isImage && !isAudio) {
      return NextResponse.json(
        { error: 'Format tidak didukung. Gunakan gambar (JPG/PNG/GIF/WebP) atau audio (WebM/OGG/MP4).' },
        { status: 400 }
      );
    }

    const maxMB = isImage ? MAX_IMAGE_MB : MAX_AUDIO_MB;
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxMB) {
      return NextResponse.json(
        { error: `Ukuran file terlalu besar. Maksimal ${maxMB}MB.` },
        { status: 400 }
      );
    }

    // Auto-create bucket jika belum ada
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === BUCKET);

    if (!bucketExists) {
      const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: MAX_IMAGE_MB * 1024 * 1024,
        allowedMimeTypes: [...ALLOWED_IMAGE_TYPES, ...ALLOWED_AUDIO_TYPES],
      });
      if (createError) {
        console.error('Failed to create bucket:', createError);
        return NextResponse.json({ error: 'Gagal menyiapkan storage' }, { status: 500 });
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = file.name.split('.').pop() || (isImage ? 'png' : 'webm');
    const folder = isImage ? 'images' : 'audio';
    const filePath = `${folder}/${userId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filePath);

    return NextResponse.json({
      url: urlData.publicUrl,
      type: isImage ? 'image' : 'audio',
      name: file.name,
    });
  } catch (err) {
    console.error('Message media upload error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan saat upload' }, { status: 500 });
  }
}
