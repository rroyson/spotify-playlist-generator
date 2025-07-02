import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('spotify_access_token')?.value;
  
  if (!accessToken) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  
  try {
    // Validate token by making a test API call to Spotify
    await axios.get('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    return NextResponse.json({ authenticated: true });
  } catch (error) {
    // Token is invalid, expired, or revoked
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}