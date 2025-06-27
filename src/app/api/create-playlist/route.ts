import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const { songs, playlistName } = await request.json();
    const accessToken = request.cookies.get('spotify_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated with Spotify' }, { status: 401 });
    }

    if (!songs || !Array.isArray(songs)) {
      return NextResponse.json({ error: 'Invalid songs data' }, { status: 400 });
    }

    // Get user info
    const userResponse = await axios.get('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const userId = userResponse.data.id;

    // Create playlist
    const playlistResponse = await axios.post(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        name: playlistName || `AI Generated Playlist`,
        description: `AI generated playlist with ${songs.length} songs`,
        public: false,
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const playlistId = playlistResponse.data.id;
    const trackUris: string[] = [];

    // Search for each song and get Spotify URIs
    for (const song of songs) {
      try {
        const searchResponse = await axios.get('https://api.spotify.com/v1/search', {
          params: {
            q: `artist:${song.artist} track:${song.track}`,
            type: 'track',
            limit: 1,
          },
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (searchResponse.data.tracks.items.length > 0) {
          trackUris.push(searchResponse.data.tracks.items[0].uri);
        }
      } catch (searchError) {
        console.error(`Failed to search for ${song.artist} - ${song.track}:`, searchError);
      }
    }

    // Add tracks to playlist
    if (trackUris.length > 0) {
      await axios.post(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          uris: trackUris,
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      playlistId,
      playlistUrl: playlistResponse.data.external_urls.spotify,
      tracksAdded: trackUris.length,
      totalSongs: songs.length,
    });

  } catch (error) {
    console.error('Error creating playlist:', error);
    return NextResponse.json({ error: 'Failed to create playlist' }, { status: 500 });
  }
}