import { NextResponse } from 'next/server';

export async function POST() {
  const isProduction = process.env.NODE_ENV === 'production';

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  
  // Clear the Spotify authentication cookies
  response.cookies.set('spotify_access_token', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // Expire immediately
  });
  
  response.cookies.set('spotify_refresh_token', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // Expire immediately
  });
  
  return response;
}