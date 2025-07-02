/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/auth/callback/route'
import axios from 'axios'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock environment variables
const originalEnv = process.env

beforeEach(() => {
  jest.resetModules()
  process.env = {
    ...originalEnv,
    SPOTIFY_CLIENT_ID: 'test_client_id',
    SPOTIFY_CLIENT_SECRET: 'test_client_secret',
    SPOTIFY_REDIRECT_URI: 'http://localhost:3000/api/auth/callback',
    NEXTAUTH_URL: 'http://localhost:3000',
  }
  mockedAxios.post.mockClear()
})

afterEach(() => {
  process.env = originalEnv
})

describe('/api/auth/callback', () => {
  it('should exchange authorization code for tokens successfully', async () => {
    // Mock successful token exchange
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        expires_in: 3600,
      },
    })

    const request = new NextRequest('http://localhost:3000/api/auth/callback?code=test_code')
    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/')
    
    // Check if cookies are set
    const cookies = response.headers.get('set-cookie')
    expect(cookies).toContain('spotify_access_token=test_access_token')
    expect(cookies).toContain('spotify_refresh_token=test_refresh_token')

    // Verify axios was called with correct parameters
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://accounts.spotify.com/api/token',
      expect.any(URLSearchParams),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': expect.stringContaining('Basic'),
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      })
    )
  })

  it('should handle missing authorization code', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/callback')
    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/?error=missing_code')
    expect(mockedAxios.post).not.toHaveBeenCalled()
  })

  it('should handle OAuth error from Spotify', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/callback?error=access_denied')
    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/?error=access_denied')
    expect(mockedAxios.post).not.toHaveBeenCalled()
  })

  it('should handle token exchange failure', async () => {
    // Mock failed token exchange
    mockedAxios.post.mockRejectedValueOnce(new Error('Token exchange failed'))

    const request = new NextRequest('http://localhost:3000/api/auth/callback?code=test_code')
    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/?error=token_exchange_failed')
  })

  it('should handle token response without refresh token', async () => {
    // Mock token exchange without refresh token
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        access_token: 'test_access_token',
        expires_in: 3600,
        // No refresh_token
      },
    })

    const request = new NextRequest('http://localhost:3000/api/auth/callback?code=test_code')
    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/')
    
    const cookies = response.headers.get('set-cookie')
    expect(cookies).toContain('spotify_access_token=test_access_token')
    expect(cookies).not.toContain('spotify_refresh_token')
  })

  it('should set cookie properties correctly', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        expires_in: 3600,
      },
    })

    const request = new NextRequest('http://localhost:3000/api/auth/callback?code=test_code')
    const response = await GET(request)

    const setCookieHeader = response.headers.get('set-cookie')
    
    // Check access token cookie properties
    expect(setCookieHeader).toContain('spotify_access_token=test_access_token')
    expect(setCookieHeader).toContain('Path=/')
    expect(setCookieHeader).toContain('SameSite=lax')
    expect(setCookieHeader).toContain('Max-Age=3600')
    
    // Check refresh token cookie properties
    expect(setCookieHeader).toContain('spotify_refresh_token=test_refresh_token')
    expect(setCookieHeader).toContain('Max-Age=2592000') // 30 days
  })
})