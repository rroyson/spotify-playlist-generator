/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/auth/check/route'
import axios from 'axios'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('/api/auth/check', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return authenticated true when access token is valid', async () => {
    // Mock successful Spotify API response
    mockedAxios.get.mockResolvedValueOnce({
      data: { id: 'user123', display_name: 'Test User' }
    })

    const request = new NextRequest('http://localhost:3000/api/auth/check', {
      headers: {
        cookie: 'spotify_access_token=valid_token',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ authenticated: true })
    expect(mockedAxios.get).toHaveBeenCalledWith('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': 'Bearer valid_token',
      },
    })
  })

  it('should return 401 when access token is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/check')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ authenticated: false })
    expect(mockedAxios.get).not.toHaveBeenCalled()
  })

  it('should return 401 when access token is empty', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/check', {
      headers: {
        cookie: 'spotify_access_token=',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ authenticated: false })
    expect(mockedAxios.get).not.toHaveBeenCalled()
  })

  it('should return 401 when token is expired', async () => {
    // Mock expired token response from Spotify
    mockedAxios.get.mockRejectedValueOnce({
      response: {
        status: 401,
        data: { error: { status: 401, message: 'The access token expired' } }
      }
    })

    const request = new NextRequest('http://localhost:3000/api/auth/check', {
      headers: {
        cookie: 'spotify_access_token=expired_token',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ authenticated: false })
    expect(mockedAxios.get).toHaveBeenCalledWith('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': 'Bearer expired_token',
      },
    })
  })

  it('should return 401 when token is malformed', async () => {
    // Mock malformed token response from Spotify
    mockedAxios.get.mockRejectedValueOnce({
      response: {
        status: 400,
        data: { error: { status: 400, message: 'Invalid access token' } }
      }
    })

    const request = new NextRequest('http://localhost:3000/api/auth/check', {
      headers: {
        cookie: 'spotify_access_token=malformed_token',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ authenticated: false })
    expect(mockedAxios.get).toHaveBeenCalledWith('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': 'Bearer malformed_token',
      },
    })
  })

  it('should return 401 when token is revoked', async () => {
    // Mock revoked token response from Spotify
    mockedAxios.get.mockRejectedValueOnce({
      response: {
        status: 403,
        data: { error: { status: 403, message: 'Insufficient client scope' } }
      }
    })

    const request = new NextRequest('http://localhost:3000/api/auth/check', {
      headers: {
        cookie: 'spotify_access_token=revoked_token',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ authenticated: false })
    expect(mockedAxios.get).toHaveBeenCalledWith('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': 'Bearer revoked_token',
      },
    })
  })

  it('should return 401 when network error occurs', async () => {
    // Mock network error
    mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'))

    const request = new NextRequest('http://localhost:3000/api/auth/check', {
      headers: {
        cookie: 'spotify_access_token=valid_token',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ authenticated: false })
    expect(mockedAxios.get).toHaveBeenCalledWith('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': 'Bearer valid_token',
      },
    })
  })

  it('should handle multiple cookies correctly with valid token', async () => {
    // Mock successful Spotify API response
    mockedAxios.get.mockResolvedValueOnce({
      data: { id: 'user123', display_name: 'Test User' }
    })

    const request = new NextRequest('http://localhost:3000/api/auth/check', {
      headers: {
        cookie: 'other_cookie=value; spotify_access_token=valid_token; another_cookie=value2',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ authenticated: true })
    expect(mockedAxios.get).toHaveBeenCalledWith('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': 'Bearer valid_token',
      },
    })
  })

  it('should ignore other cookies when access token is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/check', {
      headers: {
        cookie: 'other_cookie=value; another_cookie=value2',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ authenticated: false })
    expect(mockedAxios.get).not.toHaveBeenCalled()
  })
})