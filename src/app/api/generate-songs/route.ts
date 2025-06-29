import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Generate random forbidden songs list to prevent repetition
const getRandomForbiddenSongs = (): string => {
  const commonSongs = [
    "Good Vibrations", "Stairway to Heaven", "Go Your Own Way", "Sweet Child o' Mine", 
    "Bohemian Rhapsody", "Purple Rain", "Billie Jean", "Hey Jude", "We Will Rock You",
    "Ring of Fire", "Paint It Black", "Space Oddity", "Smells Like Teen Spirit", 
    "Dancing Queen", "Born to Run", "Under Pressure", "Three Little Birds",
    "Rocket Man", "I Wanna Dance with Somebody", "Thunderstruck", "Back in Black",
    "Superstition", "Africa", "Every Breath You Take", "Hotel California",
    "Satisfaction", "Like a Rolling Stone", "Imagine", "Yesterday"
  ]
  
  // Pick 10-15 random songs to forbid
  const shuffled = commonSongs.sort(() => 0.5 - Math.random())
  const forbidden = shuffled.slice(0, 10 + Math.floor(Math.random() * 6))
  return `- ${forbidden.join(', ')}`
}

// Generate random musical directions to force variety
const getRandomDirections = (): string => {
  const directions = [
    "Deep cuts from well-known artists",
    "International artists from different countries", 
    "Lesser-known albums from popular artists",
    "Different decades than usual (explore 60s, 70s, 80s, 90s, 2000s, 2010s)",
    "Live versions or acoustic versions",
    "Collaboration tracks and duets",
    "Artists from specific regions (UK, Australia, Canada, etc.)",
    "Genre-blending tracks that mix styles",
    "Breakthrough hits vs. later career songs",
    "Female artists and diverse voices",
    "Instrumental tracks and unique arrangements",
    "Cover versions by different artists",
    "Soundtrack contributions and theme songs",
    "B-sides and rare releases"
  ]
  
  // Pick 3-4 random directions
  const shuffled = directions.sort(() => 0.5 - Math.random())
  return shuffled.slice(0, 3 + Math.floor(Math.random() * 2)).map(d => `- ${d}`).join('\n')
}

// Personality mode system prompts
const getSystemPrompt = (
  personalityMode: string,
  songCount: number,
  randomSeed: string
): string => {
  const baseInstruction = `Generate a list of ${songCount} songs based on the user's request. 

CRITICAL: Return ONLY a valid JSON array with objects containing 'artist' and 'track' fields. Format must be:
[{"artist": "Artist Name", "track": "Song Title"}, {"artist": "Artist Name", "track": "Song Title"}]

Do not include:
- Any explanatory text before or after the JSON
- Markdown formatting or code blocks
- Single quotes (use double quotes only)
- Comments or additional fields

IMPORTANT: Create a completely unique playlist that differs from any previous generations, even for identical requests. Session ID: ${randomSeed}`

  switch (personalityMode) {
    case 'mainstream':
      return `You are a music expert focused on popular, mainstream music. ${baseInstruction} Focus on well-known hits, chart-toppers, and songs that most people would recognize. Prioritize tracks from major artists and popular albums that have achieved commercial success. Vary your selections across different decades, sub-genres, and popularity levels to ensure uniqueness.`

    case 'discovery':
      return `You are a music curator specialized in discovering hidden gems and underground talent. ${baseInstruction} Focus on lesser-known tracks, B-sides, deep cuts from popular artists, emerging musicians, indie releases, and songs that music enthusiasts would appreciate but aren't mainstream hits. Avoid obvious popular choices. Explore different regions, time periods, and musical movements for variety.`

    case 'nostalgia':
      return `You are a music historian specializing in classic hits from past decades. ${baseInstruction} Focus on timeless classics, golden oldies, and iconic songs from the 1950s through 2000s. Prioritize tracks that defined their eras, nostalgic favorites, and songs that bring back memories of specific time periods. Rotate through different decades and genres to create fresh combinations.`

    case 'experimental':
      return `You are an avant-garde music specialist focused on unique and innovative sounds. ${baseInstruction} Focus on genre-blending tracks, experimental compositions, unusual instrumentation, progressive music, art rock, electronic fusion, and songs that push musical boundaries. Prioritize artists known for creativity and innovation over commercial appeal. Explore different experimental movements and avant-garde styles.`

    case 'default':
      return `You are a knowledgeable music expert with balanced taste across all genres and eras. ${baseInstruction} Create a well-rounded playlist that includes a good mix of popular hits, lesser-known gems, classic tracks, and contemporary songs. Balance mainstream appeal with musical diversity and quality. Ensure each generation explores different musical territories and combinations.`

    default:
      return `You are a music expert. ${baseInstruction}`
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

    // Add small random delay to prevent rate limiting issues
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 100 + 50)
    )

    // Generate multiple sources of randomness
    const randomSeed = Math.random().toString(36).substring(2)
    const timestamp = Date.now()
    const uniqueId = `${randomSeed}-${timestamp}-${Math.floor(
      Math.random() * 10000
    )}`

    const systemPrompt = getSystemPrompt(personalityMode, songCount, uniqueId)

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Generate a playlist for: ${prompt}. 

Unique Request ID: ${uniqueId}

CRITICAL INSTRUCTION: You must create a completely different playlist from any previous generation. DO NOT include these commonly suggested songs:
${getRandomForbiddenSongs()}

Instead, explore:
${getRandomDirections()}

Make this playlist completely unique and unexpected while still matching the theme. Focus on variety across decades, regions, and sub-genres.`,
        },
      ],
      temperature: 0.9,
      top_p: 0.9,
      frequency_penalty: 0.5,
      presence_penalty: 0.3,
    })

    console.log('completion', completion)

    const rawContent = completion.choices[0].message.content || ''
    console.log('Raw OpenAI response:', rawContent)

    let songs = []
    try {
      // Try to extract and parse JSON, with fallback to manual parsing
      let jsonContent = rawContent.trim()

      // Remove markdown code blocks if present
      jsonContent = jsonContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()

      // Look for JSON array in the response
      const jsonMatch = jsonContent.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        jsonContent = jsonMatch[0]
      }

      // Try to parse directly first
      try {
        songs = JSON.parse(jsonContent)
      } catch (directParseError) {
        console.log(
          'Direct parse failed, trying manual extraction...',
          directParseError
        )

        // Fallback: Extract songs manually using regex
        const songMatches = jsonContent.matchAll(
          /\{\s*["']?\s*artist\s*["']?\s*:\s*["']([^"']+)["']\s*,\s*["']?\s*track\s*["']?\s*:\s*["']([^"']+)["']\s*\}/gi
        )

        songs = Array.from(songMatches).map((match) => ({
          artist: match[1].trim(),
          track: match[2].trim(),
        }))

        console.log(`Manually extracted ${songs.length} songs`)
      }

      // Validate the structure
      if (!Array.isArray(songs)) {
        throw new Error('Response is not an array')
      }

      // Validate and clean each song object
      songs = songs
        .filter(
          (song) =>
            song &&
            typeof song === 'object' &&
            song.artist !== undefined &&
            song.track !== undefined
        )
        .map((song) => ({
          artist: String(song.artist).trim(),
          track: String(song.track).trim(),
        }))
        .filter((song) => song.artist !== '' && song.track !== '')
    } catch (error) {
      console.error('Error parsing OpenAI response:', error)
      console.error('Raw content was:', rawContent)
      return NextResponse.json(
        {
          error: 'Failed to parse OpenAI response',
          rawResponse: rawContent.substring(0, 500), // Include first 500 chars for debugging
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      songs: songs,
      totalSongs: songs.length,
    })
  } catch (error) {
    console.error('Error generating songs:', error)
    console.error(
      'Error details:',
      error instanceof Error ? error.message : 'Unknown error'
    )
    return NextResponse.json(
      {
        error: 'Failed to generate songs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
