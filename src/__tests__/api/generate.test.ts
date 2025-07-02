/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/generate/route'

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
    mockCreate,
  }
})

// Mock axios
jest.mock('axios')
const mockedAxios = require('axios')
const { mockCreate } = require('openai')

beforeEach(() => {
  jest.clearAllMocks()
  mockCreate.mockClear()
  mockedAxios.get.mockClear()
  mockedAxios.post.mockClear()
  mockedAxios.get.mockReset()
  mockedAxios.post.mockReset()
})

describe('/api/generate', () => {
  it('should return 401 when not authenticated', async () => {
    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'test music',
        playlistName: 'Test Playlist',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'Not authenticated with Spotify' })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('should handle missing request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        cookie: 'spotify_access_token=test_token',
      },
    })

    const response = await POST(request)
    
    expect(response.status).toBe(500)
  })

  it('should handle OpenAI API errors', async () => {
    mockCreate.mockRejectedValueOnce(new Error('OpenAI Error'))

    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        prompt: 'test music',
        playlistName: 'Test Playlist',
      }),
    })

    const response = await POST(request)
    
    expect(response.status).toBe(500)
  })

  it('should handle OpenAI response parsing errors', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'invalid json' } }]
    })

    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        prompt: 'test music',
        playlistName: 'Test Playlist',
      }),
    })

    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to parse OpenAI response' })
  })

  it('should handle Spotify user API errors', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: '[{"artist": "Test Artist", "track": "Test Song"}]' } }]
    })

    mockedAxios.get.mockRejectedValueOnce(new Error('Spotify User API Error'))

    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        prompt: 'test music',
        playlistName: 'Test Playlist',
      }),
    })

    const response = await POST(request)
    
    expect(response.status).toBe(500)
  })

  it('should handle playlist creation API errors', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: '[{"artist": "Test Artist", "track": "Test Song"}]' } }]
    })

    mockedAxios.get
      .mockResolvedValueOnce({ data: { id: 'test_user_id' } }) // User API call
      .mockRejectedValueOnce(new Error('Search failed')) // Search API call

    mockedAxios.post.mockRejectedValueOnce(new Error('Playlist creation failed'))

    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        prompt: 'test music',
        playlistName: 'Test Playlist',
      }),
    })

    const response = await POST(request)
    
    expect(response.status).toBe(500)
  })

  it('should successfully create playlist with found tracks', async () => {
    const mockSongs = [
      { artist: 'Test Artist 1', track: 'Test Song 1' },
      { artist: 'Test Artist 2', track: 'Test Song 2' }
    ]

    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(mockSongs) } }]
    })

    // Mock axios calls in order: user profile, search calls, playlist creation, add tracks
    mockedAxios.get
      .mockResolvedValueOnce({ data: { id: 'test_user_id' } }) // User API call
      .mockResolvedValueOnce({ // First search
        data: { 
          tracks: { 
            items: [{ uri: 'spotify:track:123' }] 
          } 
        } 
      })
      .mockResolvedValueOnce({ // Second search
        data: { 
          tracks: { 
            items: [{ uri: 'spotify:track:456' }] 
          } 
        } 
      })

    mockedAxios.post
      .mockResolvedValueOnce({ // Playlist creation
        data: { 
          id: 'test_playlist_id', 
          external_urls: { spotify: 'https://open.spotify.com/playlist/test' } 
        } 
      })
      .mockResolvedValueOnce({ data: {} }) // Add tracks to playlist

    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        prompt: 'test music',
        playlistName: 'Test Playlist',
      }),
    })

    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data).toEqual({
      success: true,
      playlistId: 'test_playlist_id',
      playlistUrl: 'https://open.spotify.com/playlist/test',
      tracksAdded: 2,
      totalSongs: 2,
      songs: mockSongs
    })

    expect(mockCreate).toHaveBeenCalledWith({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a music expert. Generate a list of 20 songs based on the user's request. Return only a JSON array with objects containing 'artist' and 'track' fields. No additional text or formatting."
        },
        {
          role: "user",
          content: "Generate a playlist for: test music"
        }
      ],
      temperature: 0.7,
    })

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/users/test_user_id/playlists',
      {
        name: 'Test Playlist',
        description: 'Generated based on: test music',
        public: false,
      },
      {
        headers: {
          'Authorization': 'Bearer test_token',
          'Content-Type': 'application/json',
        },
      }
    )
  })

  it('should handle songs that are not found in Spotify search', async () => {
    const mockSongs = [
      { artist: 'Test Artist 1', track: 'Test Song 1' },
      { artist: 'Test Artist 2', track: 'Test Song 2' }
    ]

    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(mockSongs) } }]
    })

    // Mock axios calls: user profile, first search (no results), second search (found), playlist creation, add tracks
    mockedAxios.get
      .mockResolvedValueOnce({ data: { id: 'test_user_id' } }) // User API call
      .mockResolvedValueOnce({ // First search - no results
        data: { 
          tracks: { 
            items: [] 
          } 
        } 
      })
      .mockResolvedValueOnce({ // Second search - found
        data: { 
          tracks: { 
            items: [{ uri: 'spotify:track:456' }] 
          } 
        } 
      })

    mockedAxios.post
      .mockResolvedValueOnce({ // Playlist creation
        data: { 
          id: 'test_playlist_id', 
          external_urls: { spotify: 'https://open.spotify.com/playlist/test' } 
        } 
      })
      .mockResolvedValueOnce({ data: {} }) // Add tracks to playlist

    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        prompt: 'test music',
        playlistName: 'Test Playlist',
      }),
    })

    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.tracksAdded).toBe(1) // Only one track was found
    expect(data.totalSongs).toBe(2) // But two songs were requested
  })

  it('should create playlist with default name when none provided', async () => {
    const mockSongs = [{ artist: 'Test Artist', track: 'Test Song' }]

    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(mockSongs) } }]
    })

    mockedAxios.get
      .mockResolvedValueOnce({ data: { id: 'test_user_id' } })
      .mockResolvedValueOnce({ 
        data: { 
          tracks: { 
            items: [{ uri: 'spotify:track:123' }] 
          } 
        } 
      })

    mockedAxios.post
      .mockResolvedValueOnce({ 
        data: { 
          id: 'test_playlist_id', 
          external_urls: { spotify: 'https://open.spotify.com/playlist/test' } 
        } 
      })
      .mockResolvedValueOnce({ data: {} })

    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        prompt: 'test music',
        // No playlistName provided
      }),
    })

    const response = await POST(request)
    
    expect(response.status).toBe(200)
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/users/test_user_id/playlists',
      {
        name: 'AI Generated Playlist', // Default name
        description: 'Generated based on: test music',
        public: false,
      },
      expect.any(Object)
    )
  })

  it('should handle search errors gracefully and continue with other songs', async () => {
    const mockSongs = [
      { artist: 'Test Artist 1', track: 'Test Song 1' },
      { artist: 'Test Artist 2', track: 'Test Song 2' }
    ]

    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(mockSongs) } }]
    })

    // Mock axios calls: user profile, first search (fails), second search (succeeds), playlist creation, add tracks
    mockedAxios.get
      .mockResolvedValueOnce({ data: { id: 'test_user_id' } }) // User API call
      .mockRejectedValueOnce(new Error('Search error')) // First search fails
      .mockResolvedValueOnce({ // Second search succeeds
        data: { 
          tracks: { 
            items: [{ uri: 'spotify:track:456' }] 
          } 
        } 
      })

    mockedAxios.post
      .mockResolvedValueOnce({ 
        data: { 
          id: 'test_playlist_id', 
          external_urls: { spotify: 'https://open.spotify.com/playlist/test' } 
        } 
      })
      .mockResolvedValueOnce({ data: {} })

    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        prompt: 'test music',
        playlistName: 'Test Playlist',
      }),
    })

    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.tracksAdded).toBe(1) // Only one track was successfully added
  })

  it('should handle case with no tracks found at all', async () => {
    const mockSongs = [{ artist: 'Test Artist', track: 'Test Song' }]

    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(mockSongs) } }]
    })

    // Mock axios calls: user profile, search (no results), playlist creation (no tracks to add)
    mockedAxios.get
      .mockResolvedValueOnce({ data: { id: 'test_user_id' } })
      .mockResolvedValueOnce({ 
        data: { 
          tracks: { 
            items: [] // No tracks found
          } 
        } 
      })

    mockedAxios.post.mockResolvedValueOnce({ 
      data: { 
        id: 'test_playlist_id', 
        external_urls: { spotify: 'https://open.spotify.com/playlist/test' } 
      } 
    })
    // No second post call should be made since no tracks were found

    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        prompt: 'test music',
        playlistName: 'Test Playlist',
      }),
    })

    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.tracksAdded).toBe(0)
    expect(mockedAxios.post).toHaveBeenCalledTimes(1) // Only playlist creation, no tracks added
  })
})