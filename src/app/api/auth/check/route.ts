import { NextRequest, NextResponse } from 'next/server';
import { getSpotifySession } from '@/utils/spotify-session';

export async function GET(request: NextRequest) {
  const session = await getSpotifySession(request);

  return NextResponse.json({ authenticated: !!session }, { status: session ? 200 : 401 });
}
