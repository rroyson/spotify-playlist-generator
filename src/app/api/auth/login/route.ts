import { NextResponse } from 'next/server';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

export async function GET() {
  const scope = 'playlist-modify-public playlist-modify-private user-read-private user-read-email';
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID!,
    scope,
    redirect_uri: SPOTIFY_REDIRECT_URI!,
    state,
  });

  const spotifyAuthUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

  // The callback compares Spotify's returned state against this cookie (login CSRF protection)
  const response = NextResponse.redirect(spotifyAuthUrl);
  response.cookies.set('spotify_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  return response;
}
