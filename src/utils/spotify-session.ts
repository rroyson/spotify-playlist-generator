import { NextRequest } from 'next/server';
import axios from 'axios';

export interface SpotifySession {
  accessToken: string;
  userId: string;
}

/**
 * Resolves the caller's Spotify session by validating the access-token cookie
 * against Spotify. Returns null when there is no usable session so each route
 * can shape its own 401. Never trust the cookie's presence alone.
 */
export async function getSpotifySession(request: NextRequest): Promise<SpotifySession | null> {
  const accessToken = request.cookies.get('spotify_access_token')?.value;

  if (!accessToken) {
    return null;
  }

  try {
    const { data } = await axios.get('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    return typeof data?.id === 'string' && data.id ? { accessToken, userId: data.id } : null;
  } catch {
    return null;
  }
}
