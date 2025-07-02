/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/auth/login/route'

// Mock environment variables
const originalEnv = process.env

beforeEach(() => {
  jest.resetModules()
  process.env = {
    ...originalEnv,
    SPOTIFY_CLIENT_ID: 'test_client_id',
    SPOTIFY_REDIRECT_URI: 'http://localhost:3000/api/auth/callback',
  }
})

afterEach(() => {
  process.env = originalEnv
})

describe('/api/auth/login', () => {
  it('should redirect to Spotify OAuth with correct parameters', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login')
    const response = await GET(request)

    expect(response.status).toBe(307)
    
    const location = response.headers.get('location')
    expect(location).toContain('https://accounts.spotify.com/authorize')
    expect(location).toContain('client_id=test_client_id')
    expect(location).toContain('response_type=code')
    expect(location).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fcallback')
    expect(location).toContain('scope=playlist-modify-public')
  })

  it('should handle missing SPOTIFY_CLIENT_ID', async () => {
    // Temporarily override environment for this test
    const originalClientId = process.env.SPOTIFY_CLIENT_ID
    process.env.SPOTIFY_CLIENT_ID = undefined
    
    // Need to re-import the module to pick up env changes
    delete require.cache[require.resolve('@/app/api/auth/login/route')]
    const { GET: GET_TEST } = require('@/app/api/auth/login/route')
    
    const request = new NextRequest('http://localhost:3000/api/auth/login')
    const response = await GET_TEST(request)
    
    expect(response.status).toBe(307)
    const location = response.headers.get('location')
    expect(location).toContain('client_id=undefined')
    
    // Restore original value
    process.env.SPOTIFY_CLIENT_ID = originalClientId
  })

  it('should handle missing SPOTIFY_REDIRECT_URI', async () => {
    const originalRedirectUri = process.env.SPOTIFY_REDIRECT_URI
    process.env.SPOTIFY_REDIRECT_URI = undefined
    
    delete require.cache[require.resolve('@/app/api/auth/login/route')]
    const { GET: GET_TEST } = require('@/app/api/auth/login/route')
    
    const request = new NextRequest('http://localhost:3000/api/auth/login')
    const response = await GET_TEST(request)
    
    expect(response.status).toBe(307)
    const location = response.headers.get('location')
    expect(location).toContain('redirect_uri=undefined')
    
    process.env.SPOTIFY_REDIRECT_URI = originalRedirectUri
  })

  it('should generate different state parameters for CSRF protection', async () => {
    const request1 = new NextRequest('http://localhost:3000/api/auth/login')
    const request2 = new NextRequest('http://localhost:3000/api/auth/login')
    
    const response1 = await GET(request1)
    const response2 = await GET(request2)
    
    const location1 = response1.headers.get('location')
    const location2 = response2.headers.get('location')
    
    const state1 = new URL(location1!).searchParams.get('state')
    const state2 = new URL(location2!).searchParams.get('state')
    
    expect(state1).toBeDefined()
    expect(state2).toBeDefined()
    expect(state1).not.toBe(state2)
  })
})