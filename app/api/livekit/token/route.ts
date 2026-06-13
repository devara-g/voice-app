import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

export async function POST(req: NextRequest) {
  try {
    const { roomName, participantName, displayName, avatarUrl } = await req.json();
    
    const apiKey = process.env.LIVEKIT_API_KEY!;
    const apiSecret = process.env.LIVEKIT_API_SECRET!;
    
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      name: displayName || participantName,
      metadata: avatarUrl || '',
      ttl: '10m', // Token valid selama 10 menit
    });
    
    at.addGrant({ roomJoin: true, room: roomName });
    
    const token = await at.toJwt();
    
    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error generating token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}