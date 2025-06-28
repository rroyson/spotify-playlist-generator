import { NextRequest } from 'next/server'
import { GET as loginHandler } from '../../app/api/auth/login/route'
import { GET as callbackHandler } from '../../app/api/auth/callback/route'
import { GET as checkHandler } from '../../app/api/auth/check/route'
import { POST as logoutHandler } from '../../app/api/auth/logout/route'

// Mock environment variables
const mockEnv = {
  SPOTIFY_CLIENT_ID: 'test_client_id',
  SPOTIFY_CLIENT_SECRET: 'test_client_secret',
  SPOTIFY_REDIRECT_URI: 'http://localhost:3000/api/auth/callback',
  NEXTAUTH_URL: 'http://localhost:3000',
}

describe('Auth API Routes', () => {
  beforeEach(() => {
    // Set environment variables
    Object.assign(process.env, mockEnv)
    jest.clearAllMocks()
  })

  describe('/api/auth/login', () => {
    it('should redirect to Spotify authorization URL', async () => {
      const response = await loginHandler()

      expect(response.status).toBe(307) // Redirect status
      
      const location = response.headers.get('location')
      expect(location).toContain('https://accounts.spotify.com/authorize')
      expect(location).toContain('client_id=test_client_id')
      expect(location).toContain('redirect_uri=http%3A//localhost%3A3000/api/auth/callback')
      expect(location).toContain('scope=playlist-modify-public+playlist-modify-private+user-read-private+user-read-email')
    })
  })

  describe('/api/auth/check', () => {
    it('should return authenticated true when token exists', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/check')
      
      // Mock cookies
      Object.defineProperty(request, 'cookies', {
        value: {
          get: jest.fn().mockReturnValue({ value: 'valid_token' }),
        },
        writable: false,
      })

      const response = await checkHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.authenticated).toBe(true)
    })

    it('should return authenticated false when token missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/check')
      
      // Mock cookies with no token
      Object.defineProperty(request, 'cookies', {
        value: {
          get: jest.fn().mockReturnValue(undefined),
        },
        writable: false,
      })

      const response = await checkHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.authenticated).toBe(false)
    })
  })

  describe('/api/auth/logout', () => {
    it('should clear cookies and return success', async () => {
      const response = await logoutHandler()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Logged out successfully')

      // Check that cookies are cleared (maxAge: 0)
      const setCookieHeader = response.headers.get('set-cookie')
      expect(setCookieHeader).toContain('spotify_access_token=')
      expect(setCookieHeader).toContain('Max-Age=0')
    })
  })

  describe('/api/auth/callback', () => {
    beforeEach(() => {
      // Mock axios for token exchange
      jest.doMock('axios', () => ({
        post: jest.fn().mockResolvedValue({
          data: {
            access_token: 'test_access_token',
            refresh_token: 'test_refresh_token',
          },
        }),
      }))
    })

    it('should handle successful callback with code', async () => {
      const axios = require('axios')
      
      const request = new NextRequest(
        'http://localhost:3000/api/auth/callback?code=test_code&state=test_state'
      )

      const response = await callbackHandler(request)

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toBe('http://localhost:3000')
      
      // Verify token exchange was called
      expect(axios.post).toHaveBeenCalledWith(
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

    it('should handle callback with error parameter', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/auth/callback?error=access_denied'
      )

      const response = await callbackHandler(request)

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toBe('http://localhost:3000?error=access_denied')
    })

    it('should handle callback without code', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/auth/callback'
      )

      const response = await callbackHandler(request)

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toBe('http://localhost:3000?error=missing_code')
    })

    it('should handle token exchange failure', async () => {
      const axios = require('axios')
      axios.post.mockRejectedValue(new Error('Token exchange failed'))

      const request = new NextRequest(
        'http://localhost:3000/api/auth/callback?code=test_code'
      )

      const response = await callbackHandler(request)

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toBe('http://localhost:3000?error=token_exchange_failed')
    })
  })
})