/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import axios from 'axios'
import { getSpotifySession } from '@/utils/spotify-session'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

const requestWithCookie = (cookie?: string) =>
  new NextRequest('http://localhost:3000/api/anything', cookie ? { headers: { cookie } } : undefined)

describe('getSpotifySession', () => {
  beforeEach(() => {
    mockedAxios.get.mockReset()
  })

  it('returns null without calling Spotify when the cookie is missing', async () => {
    expect(await getSpotifySession(requestWithCookie())).toBeNull()
    expect(await getSpotifySession(requestWithCookie('spotify_access_token='))).toBeNull()
    expect(mockedAxios.get).not.toHaveBeenCalled()
  })

  it('returns null when Spotify rejects the token', async () => {
    mockedAxios.get.mockRejectedValueOnce({ response: { status: 401 } })

    expect(await getSpotifySession(requestWithCookie('spotify_access_token=forged'))).toBeNull()
    expect(mockedAxios.get).toHaveBeenCalledWith('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': 'Bearer forged' },
    })
  })

  it('returns null when Spotify answers without a user id', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: {} })

    expect(await getSpotifySession(requestWithCookie('spotify_access_token=odd'))).toBeNull()
  })

  it('returns the token and Spotify user id for a valid session', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { id: 'user123', display_name: 'Test' } })

    expect(await getSpotifySession(requestWithCookie('spotify_access_token=valid'))).toEqual({
      accessToken: 'valid',
      userId: 'user123',
    })
  })
})
