import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { safeError } from '@/utils/safe-error';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');
  const expectedState = request.cookies.get('spotify_oauth_state')?.value;

  if (error) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}?error=${error}`);
  }

  // ponytail: plain compare; state is a random UUID an attacker never sees, so timing is moot
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}?error=invalid_state`);
  }

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}?error=missing_code`);
  }

  try {
    const tokenResponse = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI!,
      }),
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token } = tokenResponse.data;


    const isProduction = process.env.NODE_ENV === 'production';

    const response = NextResponse.redirect(process.env.NEXTAUTH_URL!);
    response.cookies.delete('spotify_oauth_state');
    response.cookies.set('spotify_access_token', access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 3600,
    });
    
    if (refresh_token) {
      response.cookies.set('spotify_refresh_token', refresh_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (error) {
    console.error('Error exchanging code for token:', safeError(error));
    const response = NextResponse.redirect(`${process.env.NEXTAUTH_URL}?error=token_exchange_failed`);
    response.cookies.delete('spotify_oauth_state');
    return response;
  }
}