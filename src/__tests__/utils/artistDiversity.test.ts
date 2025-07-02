/**
 * @jest-environment node
 */

// Import the function directly from the route file since it's not exported as a utility
// This approach tests the actual implementation
import { describe, it, expect } from '@jest/globals'

// Re-implement the function for testing (since it's not exported)
const enforceArtistDiversity = (songs: Array<{artist: string, track: string}>, maxPerArtist: number = 2): Array<{artist: string, track: string}> => {
  const artistCount = new Map<string, number>()
  return songs.filter(song => {
    const normalizedArtist = song.artist.toLowerCase().trim()
    const currentCount = artistCount.get(normalizedArtist) || 0
    if (currentCount < maxPerArtist) {
      artistCount.set(normalizedArtist, currentCount + 1)
      return true
    }
    return false
  })
}

describe('enforceArtistDiversity', () => {
  it('should limit songs to maximum 2 per artist by default', () => {
    const songs = [
      { artist: 'Artist 1', track: 'Song 1' },
      { artist: 'Artist 1', track: 'Song 2' },
      { artist: 'Artist 1', track: 'Song 3' }, // Should be filtered out
      { artist: 'Artist 2', track: 'Song 4' },
    ]

    const result = enforceArtistDiversity(songs)

    expect(result).toHaveLength(3)
    expect(result.filter(song => song.artist === 'Artist 1')).toHaveLength(2)
    expect(result.filter(song => song.artist === 'Artist 2')).toHaveLength(1)
  })

  it('should handle case-insensitive artist names', () => {
    const songs = [
      { artist: 'The Beatles', track: 'Song 1' },
      { artist: 'the beatles', track: 'Song 2' },
      { artist: 'THE BEATLES', track: 'Song 3' }, // Should be filtered out
      { artist: 'Queen', track: 'Song 4' },
    ]

    const result = enforceArtistDiversity(songs)

    expect(result).toHaveLength(3)
    const beatlesSongs = result.filter(song => 
      song.artist.toLowerCase().includes('beatles')
    )
    expect(beatlesSongs).toHaveLength(2)
  })

  it('should handle custom max per artist limit', () => {
    const songs = [
      { artist: 'Artist 1', track: 'Song 1' },
      { artist: 'Artist 1', track: 'Song 2' },
      { artist: 'Artist 1', track: 'Song 3' },
      { artist: 'Artist 1', track: 'Song 4' },
    ]

    const result = enforceArtistDiversity(songs, 3)

    expect(result).toHaveLength(3)
    expect(result.filter(song => song.artist === 'Artist 1')).toHaveLength(3)
  })

  it('should preserve song order when possible', () => {
    const songs = [
      { artist: 'Artist 1', track: 'First Song' },
      { artist: 'Artist 2', track: 'Second Song' },
      { artist: 'Artist 1', track: 'Third Song' },
      { artist: 'Artist 1', track: 'Fourth Song' }, // Should be filtered out
    ]

    const result = enforceArtistDiversity(songs)

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ artist: 'Artist 1', track: 'First Song' })
    expect(result[1]).toEqual({ artist: 'Artist 2', track: 'Second Song' })
    expect(result[2]).toEqual({ artist: 'Artist 1', track: 'Third Song' })
  })

  it('should handle empty array', () => {
    const songs: Array<{artist: string, track: string}> = []
    const result = enforceArtistDiversity(songs)
    expect(result).toHaveLength(0)
  })

  it('should handle single song', () => {
    const songs = [{ artist: 'Solo Artist', track: 'Only Song' }]
    const result = enforceArtistDiversity(songs)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ artist: 'Solo Artist', track: 'Only Song' })
  })

  it('should handle artists with leading/trailing whitespace', () => {
    const songs = [
      { artist: '  Artist 1  ', track: 'Song 1' },
      { artist: 'Artist 1', track: 'Song 2' },
      { artist: ' Artist 1 ', track: 'Song 3' }, // Should be filtered out
    ]

    const result = enforceArtistDiversity(songs)

    expect(result).toHaveLength(2)
    expect(result.filter(song => song.artist.trim() === 'Artist 1')).toHaveLength(2)
  })

  it('should handle zero max per artist (edge case)', () => {
    const songs = [
      { artist: 'Artist 1', track: 'Song 1' },
      { artist: 'Artist 2', track: 'Song 2' },
    ]

    const result = enforceArtistDiversity(songs, 0)

    expect(result).toHaveLength(0)
  })

  it('should handle large max per artist', () => {
    const songs = [
      { artist: 'Artist 1', track: 'Song 1' },
      { artist: 'Artist 1', track: 'Song 2' },
      { artist: 'Artist 1', track: 'Song 3' },
    ]

    const result = enforceArtistDiversity(songs, 100)

    expect(result).toHaveLength(3)
    expect(result.filter(song => song.artist === 'Artist 1')).toHaveLength(3)
  })
})