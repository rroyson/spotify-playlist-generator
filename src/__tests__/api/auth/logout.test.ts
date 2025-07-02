/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/auth/logout/route'

describe('/api/auth/logout', () => {
  it('should clear authentication cookies and return success', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        cookie: 'spotify_access_token=valid_token; spotify_refresh_token=refresh_token',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true, message: 'Logged out successfully' })

    // Check that cookies are cleared
    const setCookieHeader = response.headers.get('set-cookie')
    expect(setCookieHeader).toContain('spotify_access_token=')
    expect(setCookieHeader).toContain('spotify_refresh_token=')
    expect(setCookieHeader).toContain('Max-Age=0')
    expect(setCookieHeader).toContain('Path=/')
  })

  it('should handle logout when no cookies are present', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true, message: 'Logged out successfully' })

    // Should still set clearing cookies
    const setCookieHeader = response.headers.get('set-cookie')
    expect(setCookieHeader).toContain('spotify_access_token=')
    expect(setCookieHeader).toContain('spotify_refresh_token=')
    expect(setCookieHeader).toContain('Max-Age=0')
  })

  it('should handle logout with only access token cookie', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        cookie: 'spotify_access_token=valid_token',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true, message: 'Logged out successfully' })

    const setCookieHeader = response.headers.get('set-cookie')
    expect(setCookieHeader).toContain('spotify_access_token=')
    expect(setCookieHeader).toContain('spotify_refresh_token=')
  })

  it('should set correct cookie clearing properties', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        cookie: 'spotify_access_token=valid_token; spotify_refresh_token=refresh_token',
      },
    })

    const response = await POST(request)
    const setCookieHeader = response.headers.get('set-cookie')

    // Check that cookies are set to expire immediately
    expect(setCookieHeader).toContain('Max-Age=0')
    expect(setCookieHeader).toContain('Path=/')
    expect(setCookieHeader).toContain('SameSite=lax')
    
    // Check both cookies are cleared
    expect(setCookieHeader).toContain('spotify_access_token=;')
    expect(setCookieHeader).toContain('spotify_refresh_token=;')
  })
})