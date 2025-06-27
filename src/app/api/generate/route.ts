import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import axios from 'axios';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { prompt, playlistName } = await request.json();
    const accessToken = request.cookies.get('spotify_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated with Spotify' }, { status: 401 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a music expert. Generate a list of 20 songs based on the user's request. Return only a JSON array with objects containing 'artist' and 'track' fields. No additional text or formatting."
        },
        {
          role: "user",
          content: `Generate a playlist for: ${prompt}`
        }
      ],
      temperature: 0.7,
    });

    let songs;
    try {
      songs = JSON.parse(completion.choices[0].message.content || '[]');
    } catch {
      return NextResponse.json({ error: 'Failed to parse OpenAI response' }, { status: 500 });
    }

    const userResponse = await axios.get('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const userId = userResponse.data.id;

    const playlistResponse = await axios.post(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        name: playlistName || `AI Generated Playlist`,
        description: `Generated based on: ${prompt}`,
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
      songs: songs,
    });

  } catch (error) {
    console.error('Error generating playlist:', error);
    return NextResponse.json({ error: 'Failed to generate playlist' }, { status: 500 });
  }
}