import { NextRequest } from 'next/server'
import { POST as generateSongsHandler } from '../../app/api/generate-songs/route'
import { POST as createPlaylistHandler } from '../../app/api/create-playlist/route'

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  }
})

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
}))

describe('Playlist API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('/api/generate-songs', () => {
    it('should generate songs successfully', async () => {
      const OpenAI = require('openai').default
      const mockOpenAI = new OpenAI()
      
      const mockSongs = [
        { artist: 'Artist 1', track: 'Song 1' },
        { artist: 'Artist 2', track: 'Song 2' },
      ]

      mockOpenAI.chat.completions.create.mockResolvedValue({
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
        body: JSON.stringify({ prompt: 'upbeat workout music' }),
      })

      // Mock cookies
      Object.defineProperty(request, 'cookies', {
        value: {
          get: jest.fn().mockReturnValue({ value: 'valid_token' }),
        },
        writable: false,
      })

      const response = await generateSongsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.songs).toEqual(mockSongs)
      expect(data.totalSongs).toBe(2)
    })

    it('should return 401 when not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-songs', {
        method: 'POST',
        body: JSON.stringify({ prompt: 'test' }),
      })

      // Mock cookies with no token
      Object.defineProperty(request, 'cookies', {
        value: {
          get: jest.fn().mockReturnValue(undefined),
        },
        writable: false,
      })

      const response = await generateSongsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Not authenticated with Spotify')
    })

    it('should handle OpenAI API errors', async () => {
      const OpenAI = require('openai').default
      const mockOpenAI = new OpenAI()
      
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('OpenAI API Error'))

      const request = new NextRequest('http://localhost:3000/api/generate-songs', {
        method: 'POST',
        body: JSON.stringify({ prompt: 'test' }),
      })

      Object.defineProperty(request, 'cookies', {
        value: {
          get: jest.fn().mockReturnValue({ value: 'valid_token' }),
        },
        writable: false,
      })

      const response = await generateSongsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to generate songs')
    })

    it('should handle invalid OpenAI response', async () => {
      const OpenAI = require('openai').default
      const mockOpenAI = new OpenAI()
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'invalid json response',
            },
          },
        ],
      })

      const request = new NextRequest('http://localhost:3000/api/generate-songs', {
        method: 'POST',
        body: JSON.stringify({ prompt: 'test' }),
      })

      Object.defineProperty(request, 'cookies', {
        value: {
          get: jest.fn().mockReturnValue({ value: 'valid_token' }),
        },
        writable: false,
      })

      const response = await generateSongsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to parse OpenAI response')
    })
  })

  describe('/api/create-playlist', () => {
    beforeEach(() => {
      const axios = require('axios')
      
      // Mock Spotify API calls
      axios.get
        .mockResolvedValueOnce({
          // User info
          data: { id: 'test_user_id' },
        })
        .mockResolvedValue({
          // Search results
          data: {
            tracks: {
              items: [{ uri: 'spotify:track:123' }],
            },
          },
        })

      axios.post
        .mockResolvedValueOnce({
          // Create playlist
          data: {
            id: 'playlist_123',
            external_urls: { spotify: 'https://spotify.com/playlist/123' },
          },
        })
        .mockResolvedValueOnce({
          // Add tracks
          data: {},
        })
    })

    it('should create playlist successfully', async () => {
      const mockSongs = [
        { artist: 'Artist 1', track: 'Song 1' },
        { artist: 'Artist 2', track: 'Song 2' },
      ]

      const request = new NextRequest('http://localhost:3000/api/create-playlist', {
        method: 'POST',
        body: JSON.stringify({
          songs: mockSongs,
          playlistName: 'Test Playlist',
        }),
      })

      Object.defineProperty(request, 'cookies', {
        value: {
          get: jest.fn().mockReturnValue({ value: 'valid_token' }),
        },
        writable: false,
      })

      const response = await createPlaylistHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.playlistId).toBe('playlist_123')
      expect(data.playlistUrl).toBe('https://spotify.com/playlist/123')
      expect(data.tracksAdded).toBe(2)
      expect(data.totalSongs).toBe(2)
    })

    it('should return 401 when not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/create-playlist', {
        method: 'POST',
        body: JSON.stringify({ songs: [], playlistName: 'Test' }),
      })

      Object.defineProperty(request, 'cookies', {
        value: {
          get: jest.fn().mockReturnValue(undefined),
        },
        writable: false,
      })

      const response = await createPlaylistHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Not authenticated with Spotify')
    })

    it('should return 400 for invalid songs data', async () => {
      const request = new NextRequest('http://localhost:3000/api/create-playlist', {
        method: 'POST',
        body: JSON.stringify({ songs: 'invalid', playlistName: 'Test' }),
      })

      Object.defineProperty(request, 'cookies', {
        value: {
          get: jest.fn().mockReturnValue({ value: 'valid_token' }),
        },
        writable: false,
      })

      const response = await createPlaylistHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid songs data')
    })

    it('should handle Spotify API errors', async () => {
      const axios = require('axios')
      axios.get.mockRejectedValue(new Error('Spotify API Error'))

      const request = new NextRequest('http://localhost:3000/api/create-playlist', {
        method: 'POST',
        body: JSON.stringify({
          songs: [{ artist: 'Test', track: 'Test' }],
          playlistName: 'Test',
        }),
      })

      Object.defineProperty(request, 'cookies', {
        value: {
          get: jest.fn().mockReturnValue({ value: 'valid_token' }),
        },
        writable: false,
      })

      const response = await createPlaylistHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create playlist')
    })

    it('should handle songs not found on Spotify', async () => {
      const axios = require('axios')
      
      axios.get
        .mockResolvedValueOnce({
          data: { id: 'test_user_id' },
        })
        .mockResolvedValue({
          // No tracks found
          data: {
            tracks: {
              items: [],
            },
          },
        })

      const mockSongs = [{ artist: 'Unknown Artist', track: 'Unknown Song' }]

      const request = new NextRequest('http://localhost:3000/api/create-playlist', {
        method: 'POST',
        body: JSON.stringify({
          songs: mockSongs,
          playlistName: 'Test Playlist',
        }),
      })

      Object.defineProperty(request, 'cookies', {
        value: {
          get: jest.fn().mockReturnValue({ value: 'valid_token' }),
        },
        writable: false,
      })

      const response = await createPlaylistHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.tracksAdded).toBe(0)
      expect(data.totalSongs).toBe(1)
    })
  })
})