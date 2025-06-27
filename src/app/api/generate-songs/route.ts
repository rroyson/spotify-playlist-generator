import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
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

    return NextResponse.json({
      success: true,
      songs: songs,
      totalSongs: songs.length,
    });

  } catch (error) {
    console.error('Error generating songs:', error);
    return NextResponse.json({ error: 'Failed to generate songs' }, { status: 500 });
  }
}