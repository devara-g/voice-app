import { NextRequest, NextResponse } from 'next/server';
import { RoomServiceClient } from 'livekit-server-sdk';

// GET /api/livekit/participants?roomName=serverId_channelId
export async function GET(req: NextRequest) {
  const roomName = req.nextUrl.searchParams.get('roomName');
  if (!roomName) {
    return NextResponse.json({ error: 'Missing roomName' }, { status: 400 });
  }

  try {
    const apiKey = process.env.LIVEKIT_API_KEY!;
    const apiSecret = process.env.LIVEKIT_API_SECRET!;
    const livekitUrl = process.env.LIVEKIT_URL!;

    const svc = new RoomServiceClient(livekitUrl, apiKey, apiSecret);
    const participants = await svc.listParticipants(roomName);

    const result = participants.map((p) => ({
      identity: p.identity,
      name: p.name || p.identity,
      metadata: p.metadata, // avatar_url
      joinedAt: Number(p.joinedAt),
    }));

    return NextResponse.json({ participants: result });
  } catch {
    // Room belum ada / tidak ada peserta — ini normal, return kosong
    return NextResponse.json({ participants: [] });
  }
}
