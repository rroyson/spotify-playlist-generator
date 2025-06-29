import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Simple in-memory cache per user session - no persistence needed
const userSessionCache = new Map<string, Array<{artist: string, track: string}>>()

const getSystemPrompt = (
  personalityMode: string,
  songCount: number
): string => {
  const baseInstruction = `You are an assistant that only responds in JSON. Create a list of ${songCount} unique songs based off the following statement. Include "id", "artist", "track", "album" in your response. An example response is:
[
  {
    "id": 1,
    "artist": "The Beatles",
    "track": "Hey Jude",
    "album": "The Beatles (White Album)"
  },
  {
    "id": 2,
    "artist": "Queen",
    "track": "Bohemian Rhapsody", 
    "album": "A Night at the Opera"
  }
]`

  switch (personalityMode) {
    case 'mainstream':
      return `${baseInstruction} Focus on popular hits, chart-toppers, and well-known songs that most people would recognize.`

    case 'discovery':
      return `${baseInstruction} Focus on lesser-known tracks, hidden gems, and songs that music enthusiasts would appreciate but aren't mainstream hits.`

    case 'nostalgia':
      return `${baseInstruction} Focus on classic hits from past decades, timeless songs, and nostalgic favorites from the 1950s through 2000s.`

    case 'experimental':
      return `${baseInstruction} Focus on unique, innovative sounds, experimental music, and genre-blending tracks that push musical boundaries.`

    case 'default':
      return `${baseInstruction} Create a well-rounded playlist with a good mix of popular hits, hidden gems, classic tracks, and contemporary songs.`

    default:
      return baseInstruction
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      prompt,
      songCount = 20,
      personalityMode = 'default',
    } = await request.json()
    const accessToken = request.cookies.get('spotify_access_token')?.value

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated with Spotify' },
        { status: 401 }
      )
    }

    const systemPrompt = getSystemPrompt(personalityMode, songCount)

    // Create cache key for this user's session and prompt type
    const userKey = request.cookies.get('spotify_access_token')?.value?.slice(-10) || 'anonymous'
    const cacheKey = `${userKey}-${prompt.toLowerCase()}-${personalityMode}-${songCount}`

    // Get recent playlists for this user's prompt
    const recentPlaylist = userSessionCache.get(cacheKey)

    // Build avoidance instruction if we have previous results
    let avoidanceInstruction = ''
    if (recentPlaylist && recentPlaylist.length > 0) {
      const recentSongs = recentPlaylist.slice(0, 15) // Show max 15 recent songs to avoid prompt being too long
      const songList = recentSongs
        .map((song) => `"${song.track}" by ${song.artist}`)
        .join(', ')

      avoidanceInstruction = `\n\nIMPORTANT: I recently generated a playlist for a similar request. To ensure variety, please avoid using more than 20% of these songs: ${songList}. Focus on different artists, decades, sub-genres, or musical styles to create a fresh playlist.`
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: `${systemPrompt} "${prompt}".${avoidanceInstruction}`,
        },
      ],
      temperature: 0.4, // Slightly higher for variety when avoiding previous songs
      max_tokens: Math.max(3000, songCount * 80),
    })

    console.log('completion', completion)

    const rawContent = completion.choices[0].message.content || ''
    console.log('Raw OpenAI response:', rawContent)

    let songs
    try {
      // Clean up the response and extract JSON
      let jsonContent = rawContent.trim()

      // Remove markdown formatting if present
      jsonContent = jsonContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()

      // Extract JSON array
      const jsonMatch = jsonContent.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        jsonContent = jsonMatch[0]
      }

      songs = JSON.parse(jsonContent)
    } catch (error) {
      console.error('Error parsing OpenAI response:', error)
      console.error('Raw content was:', rawContent)
      return NextResponse.json(
        { error: 'Failed to parse OpenAI response' },
        { status: 500 }
      )
    }

    // Validate and clean the songs array
    if (!Array.isArray(songs)) {
      return NextResponse.json(
        { error: 'Invalid response format' },
        { status: 500 }
      )
    }

    // Filter and validate songs - keep only artist and track for our API
    const validSongs = songs
      .filter((song) => song && song.artist && song.track)
      .map((song) => ({
        artist: String(song.artist).trim(),
        track: String(song.track).trim(),
      }))
      .filter((song) => song.artist !== '' && song.track !== '')

    console.log(
      `Generated ${validSongs.length} valid songs out of ${songs.length} total`
    )

    // Cache the new playlist for this user's future requests
    userSessionCache.set(cacheKey, validSongs.slice(0, 50))
    
    // Clean up cache if it gets too large (keep last 100 user sessions)
    if (userSessionCache.size > 100) {
      const firstKey = userSessionCache.keys().next().value
      if (firstKey) {
        userSessionCache.delete(firstKey)
      }
    }

    return NextResponse.json({
      success: true,
      songs: validSongs,
      totalSongs: validSongs.length,
    })
  } catch (error) {
    console.error('Error generating songs:', error)
    return NextResponse.json(
      { error: 'Failed to generate songs' },
      { status: 500 }
    )
  }
}
