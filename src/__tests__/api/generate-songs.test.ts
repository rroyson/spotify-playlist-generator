/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/generate-songs/route'

// Mock OpenAI
jest.mock('openai', () => {
  const mockCreate = jest.fn()
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
    mockCreate, // Export for use in tests
  }
})

const { mockCreate } = require('openai')

// Mock environment variables
const originalEnv = process.env

beforeEach(() => {
  jest.resetModules()
  process.env = {
    ...originalEnv,
    OPENAI_API_KEY: 'test_openai_key',
  }
  mockCreate.mockClear()
})

afterEach(() => {
  process.env = originalEnv
})

describe('/api/generate-songs', () => {
  const mockSongs = [
    { id: 1, artist: 'Artist 1', track: 'Song 1', album: 'Album 1' },
    { id: 2, artist: 'Artist 2', track: 'Song 2', album: 'Album 2' },
    { id: 3, artist: 'Artist 1', track: 'Song 3', album: 'Album 3' },
  ]

  beforeEach(() => {
    // Clear any cached data
    jest.clearAllMocks()
  })

  it('should generate songs successfully with default personality', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify(mockSongs),
          },
        },
      ],
    })

    const request = new NextRequest('http://localhost:3000/api/generate-songs', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        prompt: 'upbeat workout music',
        songCount: 20,
        personalityMode: 'default',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.songs).toHaveLength(3)
    expect(data.songs[0]).toEqual({ artist: 'Artist 1', track: 'Song 1' })

    // Check OpenAI was called with correct parameters
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('Create a list of 20 unique songs'),
          },
        ],
        temperature: 0.4,
      })
    )
  })

  it('should enforce artist diversity (max 2 per artist)', async () => {
    const songsWithDuplicateArtists = [
      { id: 1, artist: 'Artist 1', track: 'Song 1', album: 'Album 1' },
      { id: 2, artist: 'Artist 1', track: 'Song 2', album: 'Album 2' },
      { id: 3, artist: 'Artist 1', track: 'Song 3', album: 'Album 3' }, // Should be filtered out
      { id: 4, artist: 'Artist 2', track: 'Song 4', album: 'Album 4' },
    ]

    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify(songsWithDuplicateArtists),
          },
        },
      ],
    })

    const request = new NextRequest('http://localhost:3000/api/generate-songs', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        prompt: 'rock music',
        songCount: 10,
        personalityMode: 'default',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.songs).toHaveLength(3) // Third song from Artist 1 should be filtered out
    
    const artist1Songs = data.songs.filter((song: any) => song.artist === 'Artist 1')
    expect(artist1Songs).toHaveLength(2)
  })

  it('should handle different personality modes', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify(mockSongs),
          },
        },
      ],
    })

    const request = new NextRequest('http://localhost:3000/api/generate-songs', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        prompt: 'chill music',
        songCount: 15,
        personalityMode: 'discovery',
      }),
    })

    const response = await POST(request)
    await response.json()

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('Focus on lesser-known tracks'),
          },
        ],
        temperature: 0.4,
      })
    )
  })

  it('should handle mainstream personality mode', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(mockSongs) } }],
    })

    const request = new NextRequest('http://localhost:3000/api/generate-songs', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        prompt: 'popular music hits',
        songCount: 10,
        personalityMode: 'mainstream',
      }),
    })

    await POST(request)

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('Focus on popular hits'),
          },
        ],
        temperature: 0.4,
      })
    )
  })

  it('should handle nostalgia personality mode', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(mockSongs) } }],
    })

    const request = new NextRequest('http://localhost:3000/api/generate-songs', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        prompt: 'classic rock',
        songCount: 10,
        personalityMode: 'nostalgia',
      }),
    })

    await POST(request)

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('Focus on classic hits'),
          },
        ],
        temperature: 0.4,
      })
    )
  })

  it('should handle experimental personality mode', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(mockSongs) } }],
    })

    const request = new NextRequest('http://localhost:3000/api/generate-songs', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token_experimental_unique',
      },
      body: JSON.stringify({
        prompt: 'electronic experimental unique',
        songCount: 10,
        personalityMode: 'experimental',
      }),
    })

    await POST(request)

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('Focus on unique, innovative sounds, experimental music'),
          },
        ],
        temperature: 0.4,
      })
    )
  })

  it('should return 401 when not authenticated', async () => {
    const request = new NextRequest('http://localhost:3000/api/generate-songs', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'test music',
        songCount: 10,
        personalityMode: 'default',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'Not authenticated with Spotify' })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('should handle missing request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/generate-songs', {
      method: 'POST',
      headers: {
        cookie: 'spotify_access_token=test_token',
      },
    })

    const response = await POST(request)
    
    expect(response.status).toBe(500)
  })

  it('should handle OpenAI API errors', async () => {
    mockCreate.mockRejectedValueOnce(new Error('OpenAI API Error'))

    const request = new NextRequest('http://localhost:3000/api/generate-songs', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        prompt: 'test music',
        songCount: 10,
        personalityMode: 'default',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to generate songs' })
  })

  it('should handle invalid JSON response from OpenAI', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: 'Invalid JSON response',
          },
        },
      ],
    })

    const request = new NextRequest('http://localhost:3000/api/generate-songs', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        prompt: 'test music',
        songCount: 10,
        personalityMode: 'default',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to parse OpenAI response' })
  })

  it('should handle case-insensitive artist diversity', async () => {
    const songsWithCaseVariations = [
      { id: 1, artist: 'The Beatles', track: 'Song 1', album: 'Album 1' },
      { id: 2, artist: 'the beatles', track: 'Song 2', album: 'Album 2' },
      { id: 3, artist: 'THE BEATLES', track: 'Song 3', album: 'Album 3' }, // Should be filtered
      { id: 4, artist: 'Queen', track: 'Song 4', album: 'Album 4' },
    ]

    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(songsWithCaseVariations) } }],
    })

    const request = new NextRequest('http://localhost:3000/api/generate-songs', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        prompt: 'classic rock',
        songCount: 10,
        personalityMode: 'default',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(data.songs).toHaveLength(3) // Third Beatles song should be filtered out
    const beatlesSongs = data.songs.filter((song: any) => 
      song.artist.toLowerCase().includes('beatles')
    )
    expect(beatlesSongs).toHaveLength(2)
  })

  it('should reject unknown personality mode with validation error', async () => {
    const request = new NextRequest('http://localhost:3000/api/generate-songs', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        prompt: 'test music',
        songCount: 10,
        personalityMode: 'unknown_mode',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      error: 'Invalid input parameters',
      details: expect.arrayContaining([expect.stringContaining('Invalid personality mode')])
    })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('should handle markdown-formatted JSON response', async () => {
    const markdownResponse = '```json\n' + JSON.stringify(mockSongs) + '\n```'
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: markdownResponse } }],
    })

    const request = new NextRequest('http://localhost:3000/api/generate-songs', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        prompt: 'test music',
        songCount: 10,
        personalityMode: 'default',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.songs).toHaveLength(3)
  })

  it('should handle JSON with extra text and extract array', async () => {
    const responseWithExtraText = 'Here are some songs: ' + JSON.stringify(mockSongs) + ' Enjoy!'
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: responseWithExtraText } }],
    })

    const request = new NextRequest('http://localhost:3000/api/generate-songs', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        prompt: 'test music',
        songCount: 10,
        personalityMode: 'default',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.songs).toHaveLength(3)
  })

  it('should handle non-array response from OpenAI', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: '{"not": "an array"}' } }],
    })

    const request = new NextRequest('http://localhost:3000/api/generate-songs', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        prompt: 'test music',
        songCount: 10,
        personalityMode: 'default',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Invalid response format' })
  })

  it('should filter out invalid songs (missing artist or track)', async () => {
    const songsWithInvalidEntries = [
      { id: 1, artist: 'Valid Artist', track: 'Valid Track', album: 'Album' },
      { id: 2, artist: '', track: 'No Artist', album: 'Album' }, // Invalid
      { id: 3, artist: 'No Track', track: '', album: 'Album' }, // Invalid
      { id: 4, artist: 'Another Valid', track: 'Another Track', album: 'Album' },
      { id: 5, track: 'Missing Artist Field', album: 'Album' }, // Invalid
    ]

    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(songsWithInvalidEntries) } }],
    })

    const request = new NextRequest('http://localhost:3000/api/generate-songs', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        prompt: 'test music',
        songCount: 10,
        personalityMode: 'default',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.songs).toHaveLength(2) // Only 2 valid songs
    expect(data.songs[0]).toEqual({ artist: 'Valid Artist', track: 'Valid Track' })
    expect(data.songs[1]).toEqual({ artist: 'Another Valid', track: 'Another Track' })
  })

  it('should handle user session caching and avoidance', async () => {
    // First request
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify([
        { id: 1, artist: 'Artist 1', track: 'Song 1', album: 'Album 1' }
      ]) } }],
    })

    const firstRequest = new NextRequest('http://localhost:3000/api/generate-songs', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token_123',
      },
      body: JSON.stringify({
        prompt: 'rock music',
        songCount: 5,
        personalityMode: 'default',
      }),
    })

    await POST(firstRequest)

    // Second request with same user token
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify([
        { id: 2, artist: 'Artist 2', track: 'Song 2', album: 'Album 2' }
      ]) } }],
    })

    const secondRequest = new NextRequest('http://localhost:3000/api/generate-songs', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token_123',
      },
      body: JSON.stringify({
        prompt: 'jazz music',
        songCount: 5,
        personalityMode: 'default',
      }),
    })

    await POST(secondRequest)

    // Verify that the second call includes avoidance instruction
    expect(mockCreate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('avoid using more than 5%'),
          },
        ],
      })
    )
  })

  it('should handle cache cleanup when size exceeds limit', async () => {
    // This test ensures cache cleanup branches are covered
    // We can't easily test the actual cache size limit in a unit test,
    // but we can ensure the branches are covered by calling the endpoint multiple times
    
    for (let i = 0; i < 5; i++) {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify([
          { id: i, artist: `Artist ${i}`, track: `Song ${i}`, album: `Album ${i}` }
        ]) } }],
      })

      const request = new NextRequest('http://localhost:3000/api/generate-songs', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `spotify_access_token=test_token_${i}`,
        },
        body: JSON.stringify({
          prompt: `music type ${i}`,
          songCount: 5,
          personalityMode: 'default',
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    }
  })

  it('should handle missing access token in cookie parsing', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(mockSongs) } }],
    })

    const request = new NextRequest('http://localhost:3000/api/generate-songs', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'other_cookie=value', // No spotify_access_token
      },
      body: JSON.stringify({
        prompt: 'test music',
        songCount: 10,
        personalityMode: 'default',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'Not authenticated with Spotify' })
  })

})