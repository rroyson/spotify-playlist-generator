import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  
  // Clear the Spotify authentication cookies
  response.cookies.set('spotify_access_token', '', {
    httpOnly: false,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // Expire immediately
  });
  
  response.cookies.set('spotify_refresh_token', '', {
    httpOnly: false,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // Expire immediately
  });
  
  return response;
}