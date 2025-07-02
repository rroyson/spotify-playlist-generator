/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/create-playlist/route'
import axios from 'axios'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

beforeEach(() => {
  jest.clearAllMocks()
  mockedAxios.get.mockClear()
  mockedAxios.post.mockClear()
  mockedAxios.get.mockReset()
  mockedAxios.post.mockReset()
})

describe('/api/create-playlist', () => {
  const mockSongs = [
    { artist: 'The Beatles', track: 'Hey Jude' },
    { artist: 'Queen', track: 'Bohemian Rhapsody' },
    { artist: 'Led Zeppelin', track: 'Stairway to Heaven' },
  ]

  it('should create playlist successfully', async () => {
    // Setup axios mocks in the correct order: user profile, search calls, playlist creation, add tracks
    mockedAxios.get
      .mockResolvedValueOnce({ // User profile
        data: { id: 'test_user_id' },
      })
      .mockResolvedValueOnce({ // First track search
        data: {
          tracks: {
            items: [{ uri: 'spotify:track:track1' }],
          },
        },
      })
      .mockResolvedValueOnce({ // Second track search
        data: {
          tracks: {
            items: [{ uri: 'spotify:track:track2' }],
          },
        },
      })
      .mockResolvedValueOnce({ // Third track search
        data: {
          tracks: {
            items: [{ uri: 'spotify:track:track3' }],
          },
        },
      })

    mockedAxios.post
      .mockResolvedValueOnce({ // Playlist creation
        data: {
          id: 'test_playlist_id',
          external_urls: { spotify: 'https://open.spotify.com/playlist/test_playlist_id' },
        },
      })
      .mockResolvedValueOnce({ data: {} }) // Add tracks to playlist

    const request = new NextRequest('http://localhost:3000/api/create-playlist', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        songs: mockSongs,
        playlistName: 'Test Playlist',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.playlistUrl).toBe('https://open.spotify.com/playlist/test_playlist_id')
    expect(data.tracksAdded).toBe(3)
    expect(data.totalSongs).toBe(3)

    // Verify API calls
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/me',
      { headers: { Authorization: 'Bearer test_token' } }
    )
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/users/test_user_id/playlists',
      { 
        name: 'Test Playlist', 
        description: 'AI generated playlist with 3 songs',
        public: false 
      },
      { 
        headers: { 
          'Authorization': 'Bearer test_token',
          'Content-Type': 'application/json'
        } 
      }
    )
  })

  it('should return 401 when not authenticated', async () => {
    const request = new NextRequest('http://localhost:3000/api/create-playlist', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        songs: mockSongs,
        playlistName: 'Test Playlist',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'Not authenticated with Spotify' })
    expect(mockedAxios.get).not.toHaveBeenCalled()
  })

  it('should handle missing request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/create-playlist', {
      method: 'POST',
      headers: {
        cookie: 'spotify_access_token=test_token',
      },
    })

    const response = await POST(request)
    
    expect(response.status).toBe(500)
  })

  it('should handle empty songs array', async () => {
    // Mock user profile and playlist creation for empty playlist
    mockedAxios.get.mockResolvedValueOnce({
      data: { id: 'test_user_id' },
    })

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        id: 'test_playlist_id',
        external_urls: { spotify: 'https://open.spotify.com/playlist/test_playlist_id' },
      },
    })

    // No track searches needed for empty array

    const request = new NextRequest('http://localhost:3000/api/create-playlist', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        songs: [],
        playlistName: 'Empty Playlist',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.tracksAdded).toBe(0)
    expect(data.totalSongs).toBe(0)
  })

  it('should handle Spotify user profile fetch error', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('User profile error'))

    const request = new NextRequest('http://localhost:3000/api/create-playlist', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        songs: mockSongs,
        playlistName: 'Test Playlist',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to create playlist' })
  })

  it('should handle playlist creation error', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { id: 'test_user_id' },
    })

    mockedAxios.post.mockRejectedValueOnce(new Error('Playlist creation error'))

    const request = new NextRequest('http://localhost:3000/api/create-playlist', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        songs: mockSongs,
        playlistName: 'Test Playlist',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to create playlist' })
  })

  it('should handle partial track search failures', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { id: 'test_user_id' },
    })

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        id: 'test_playlist_id',
        external_urls: { spotify: 'https://open.spotify.com/playlist/test_playlist_id' },
      },
    })

    // Mock track search - first succeeds, second fails, third succeeds
    mockedAxios.get
      .mockResolvedValueOnce({
        data: {
          tracks: {
            items: [{ uri: 'spotify:track:track1' }],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          tracks: {
            items: [], // No tracks found
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          tracks: {
            items: [{ uri: 'spotify:track:track3' }],
          },
        },
      })

    mockedAxios.post.mockResolvedValueOnce({ data: {} })

    const request = new NextRequest('http://localhost:3000/api/create-playlist', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        songs: mockSongs,
        playlistName: 'Test Playlist',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.tracksAdded).toBe(2) // Only 2 tracks found
    expect(data.totalSongs).toBe(3) // 3 songs requested
  })

  it('should handle track search errors', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { id: 'test_user_id' },
    })

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        id: 'test_playlist_id',
        external_urls: { spotify: 'https://open.spotify.com/playlist/test_playlist_id' },
      },
    })

    // Mock track search errors
    mockedAxios.get
      .mockRejectedValueOnce(new Error('Search error'))
      .mockRejectedValueOnce(new Error('Search error'))
      .mockRejectedValueOnce(new Error('Search error'))

    mockedAxios.post.mockResolvedValueOnce({ data: {} })

    const request = new NextRequest('http://localhost:3000/api/create-playlist', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        songs: mockSongs,
        playlistName: 'Test Playlist',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.tracksAdded).toBe(0) // No tracks added due to search errors
    expect(data.totalSongs).toBe(3)
  })

  it('should use default playlist name when not provided', async () => {
    // Setup axios mocks in order: user profile, searches, playlist creation, add tracks
    mockedAxios.get
      .mockResolvedValueOnce({
        data: { id: 'test_user_id' },
      })
      .mockResolvedValueOnce({
        data: { tracks: { items: [{ uri: 'spotify:track:track1' }] } },
      })
      .mockResolvedValueOnce({
        data: { tracks: { items: [{ uri: 'spotify:track:track2' }] } },
      })
      .mockResolvedValueOnce({
        data: { tracks: { items: [{ uri: 'spotify:track:track3' }] } },
      })

    mockedAxios.post
      .mockResolvedValueOnce({
        data: {
          id: 'test_playlist_id',
          external_urls: { spotify: 'https://open.spotify.com/playlist/test_playlist_id' },
        },
      })
      .mockResolvedValueOnce({ data: {} })

    const request = new NextRequest('http://localhost:3000/api/create-playlist', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'spotify_access_token=test_token',
      },
      body: JSON.stringify({
        songs: mockSongs,
        // No playlistName provided
      }),
    })

    await POST(request)

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/users/test_user_id/playlists',
      { 
        name: 'AI Generated Playlist', 
        description: 'AI generated playlist with 3 songs',
        public: false 
      },
      { 
        headers: { 
          'Authorization': 'Bearer test_token',
          'Content-Type': 'application/json'
        } 
      }
    )
  })
})