import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Personality mode system prompts
const getSystemPrompt = (personalityMode: string, songCount: number): string => {
  const baseInstruction = `Generate a list of ${songCount} songs based on the user's request. Return only a JSON array with objects containing 'artist' and 'track' fields. No additional text or formatting.`;
  
  switch (personalityMode) {
    case 'mainstream':
      return `You are a music expert focused on popular, mainstream music. ${baseInstruction} Focus on well-known hits, chart-toppers, and songs that most people would recognize. Prioritize tracks from major artists and popular albums that have achieved commercial success.`;
    
    case 'discovery':
      return `You are a music curator specialized in discovering hidden gems and underground talent. ${baseInstruction} Focus on lesser-known tracks, B-sides, deep cuts from popular artists, emerging musicians, indie releases, and songs that music enthusiasts would appreciate but aren't mainstream hits. Avoid obvious popular choices.`;
    
    case 'nostalgia':
      return `You are a music historian specializing in classic hits from past decades. ${baseInstruction} Focus on timeless classics, golden oldies, and iconic songs from the 1950s through 2000s. Prioritize tracks that defined their eras, nostalgic favorites, and songs that bring back memories of specific time periods.`;
    
    case 'experimental':
      return `You are an avant-garde music specialist focused on unique and innovative sounds. ${baseInstruction} Focus on genre-blending tracks, experimental compositions, unusual instrumentation, progressive music, art rock, electronic fusion, and songs that push musical boundaries. Prioritize artists known for creativity and innovation over commercial appeal.`;
    
    default:
      return `You are a music expert. ${baseInstruction}`;
  }
};

export async function POST(request: NextRequest) {
  try {
    const { prompt, songCount = 20, personalityMode = 'mainstream' } = await request.json();
    const accessToken = request.cookies.get('spotify_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated with Spotify' }, { status: 401 });
    }

    const systemPrompt = getSystemPrompt(personalityMode, songCount);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: systemPrompt
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