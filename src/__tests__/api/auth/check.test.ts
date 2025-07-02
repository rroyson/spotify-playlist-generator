/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/auth/check/route'

describe('/api/auth/check', () => {
  it('should return authenticated true when access token exists', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/check', {
      headers: {
        cookie: 'spotify_access_token=valid_token',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ authenticated: true })
  })

  it('should return 401 when access token is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/check')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ authenticated: false })
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
  })

  it('should handle multiple cookies correctly', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/check', {
      headers: {
        cookie: 'other_cookie=value; spotify_access_token=valid_token; another_cookie=value2',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ authenticated: true })
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
  })
})