'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [playlistName, setPlaylistName] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedSongs, setGeneratedSongs] = useState<Array<{
    artist: string
    track: string
  }> | null>(null)
  const [playlistResult, setPlaylistResult] = useState<{
    error?: string
    playlistUrl?: string
    tracksAdded?: number
    totalSongs?: number
  } | null>(null)
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check')
        setIsAuthenticated(response.ok)
      } catch {
        setIsAuthenticated(false)
      }
    }
    checkAuth()

    // Also check when the page becomes visible (after returning from Spotify)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkAuth()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', checkAuth)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', checkAuth)
    }
  }, [])

  const handleLogin = () => {
    window.location.href = '/api/auth/login'
  }

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout')
      setIsAuthenticated(false)
      setGeneratedSongs(null)
      setPlaylistResult(null)
      setPrompt('')
      setPlaylistName('')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const handleGenerateSongs = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!prompt.trim()) return

    setIsGenerating(true)
    setGeneratedSongs(null)
    setPlaylistResult(null)

    try {
      const response = await axios.post('/api/generate-songs', {
        prompt,
      })

      setGeneratedSongs(response.data.songs)
    } catch (error) {
      console.error('Error generating songs:', error)
      setPlaylistResult({ error: 'Failed to generate songs' })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCreatePlaylist = async () => {
    if (!generatedSongs) return

    setIsCreatingPlaylist(true)
    setPlaylistResult(null)

    try {
      const response = await axios.post('/api/create-playlist', {
        songs: generatedSongs,
        playlistName: playlistName || 'AI Generated Playlist',
      })

      setPlaylistResult(response.data)
    } catch (error) {
      console.error('Error creating playlist:', error)
      setPlaylistResult({ error: 'Failed to create playlist' })
    } finally {
      setIsCreatingPlaylist(false)
    }
  }

  const handleStartOver = () => {
    setGeneratedSongs(null)
    setPlaylistResult(null)
    setPrompt('')
    setPlaylistName('')
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-emerald-500 via-blue-600 to-purple-700 p-4 sm:p-8'>
      <div className='max-w-4xl mx-auto'>
        <div className='text-center mb-8'>
          <h1 className='text-4xl sm:text-5xl font-bold text-white mb-4 drop-shadow-lg'>
            🎵 AI Spotify Playlist Generator
          </h1>
          <p className='text-white/90 text-lg sm:text-xl'>
            Create personalized playlists using AI and Spotify
          </p>
        </div>

        <div className='bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 sm:p-8'>
          {!isAuthenticated ? (
            <div className='text-center py-8'>
              <div className='mb-6'>
                <div className='w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <span className='text-3xl'>🎵</span>
                </div>
                <h2 className='text-2xl sm:text-3xl font-bold mb-4 text-gray-800'>
                  Connect to Spotify
                </h2>
                <p className='text-gray-600 mb-8 text-lg'>
                  Login with your Spotify account to start creating amazing
                  playlists
                </p>
              </div>
              <button
                onClick={handleLogin}
                className='bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-full transition-all transform hover:scale-105 shadow-lg text-lg'
              >
                🎧 Login with Spotify
              </button>
            </div>
          ) : (
            <div className='space-y-8'>
              <div className='flex justify-between items-start'>
                <div className='text-center flex-1'>
                  <h2 className='text-2xl font-bold text-gray-800 mb-2'>
                    Create Your Playlist
                  </h2>
                  <p className='text-gray-600'>
                    Tell us what kind of music you&apos;re in the mood for
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className='bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm'
                >
                  Logout
                </button>
              </div>

              <form onSubmit={handleGenerateSongs} className='space-y-6'>
                <div>
                  <label
                    htmlFor='playlistName'
                    className='block text-sm font-semibold text-gray-800 mb-3'
                  >
                    🏷️ Playlist Name (optional)
                  </label>
                  <input
                    type='text'
                    id='playlistName'
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    placeholder='My Awesome Playlist'
                    className='w-full px-4 py-4 text-gray-800 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-500 text-lg'
                  />
                </div>

                <div>
                  <label
                    htmlFor='prompt'
                    className='block text-sm font-semibold text-gray-800 mb-3'
                  >
                    🎯 Describe your perfect playlist
                  </label>
                  <textarea
                    id='prompt'
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder='e.g., upbeat songs for working out, chill indie music for studying, 90s rock classics, relaxing jazz for dinner...'
                    rows={4}
                    required
                    className='w-full px-4 py-4 text-gray-800 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none placeholder-gray-500 text-lg'
                  />
                </div>

                <button
                  type='submit'
                  disabled={isGenerating || !prompt.trim()}
                  className='w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg text-lg'
                >
                  {isGenerating
                    ? '🎵 Generating Songs...'
                    : '✨ Generate Song Ideas'}
                </button>
              </form>

              {/* Song Preview - Step 1 */}
              {generatedSongs && !playlistResult && (
                <div className='bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-6'>
                  <div className='flex justify-between items-center mb-4'>
                    <h3 className='text-xl font-bold text-gray-800'>
                      🎵 Your AI-Generated Songs
                    </h3>
                    <button
                      onClick={() => setGeneratedSongs(null)}
                      className='text-gray-500 hover:text-gray-700 text-2xl'
                    >
                      ×
                    </button>
                  </div>

                  <p className='text-gray-600 mb-4'>
                    Here are {generatedSongs.length} songs AI picked for you.
                    Review them and create your Spotify playlist when ready!
                  </p>

                  <div className='space-y-3 mb-6 max-h-60 overflow-y-auto'>
                    {generatedSongs.map((song, index) => (
                      <div
                        key={index}
                        className='flex items-center p-3 bg-white rounded-lg shadow-sm'
                      >
                        <span className='text-2xl mr-3'>🎵</span>
                        <div>
                          <p className='font-semibold text-gray-800'>
                            {song.track}
                          </p>
                          <p className='text-gray-600 text-sm'>{song.artist}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className='flex flex-col sm:flex-row gap-3'>
                    <button
                      onClick={handleCreatePlaylist}
                      disabled={isCreatingPlaylist}
                      className='flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg'
                    >
                      {isCreatingPlaylist
                        ? '🎵 Creating Playlist...'
                        : '✅ Create Spotify Playlist'}
                    </button>
                    <button
                      onClick={handleStartOver}
                      className='flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg'
                    >
                      🔄 Start Over
                    </button>
                  </div>
                </div>
              )}

              {/* Playlist Created - Step 2 */}
              {playlistResult && !playlistResult.error && (
                <div className='bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6'>
                  <div className='text-center'>
                    <span className='text-6xl mb-4 block'>🎉</span>
                    <h3 className='text-2xl font-bold text-gray-800 mb-4'>
                      Playlist Created Successfully!
                    </h3>
                    <p className='text-gray-600 mb-6 text-lg'>
                      Your playlist has been added to your Spotify account with{' '}
                      {playlistResult.tracksAdded} out of{' '}
                      {playlistResult.totalSongs} songs
                    </p>

                    <div className='flex flex-col sm:flex-row gap-3 justify-center'>
                      <a
                        href={playlistResult.playlistUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg'
                      >
                        🎧 Open in Spotify
                      </a>
                      <button
                        onClick={handleStartOver}
                        className='bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg'
                      >
                        ✨ Create Another Playlist
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Messages */}
              {playlistResult?.error && (
                <div className='bg-red-50 border-2 border-red-200 rounded-2xl p-6'>
                  <div className='text-red-600 text-center'>
                    <span className='text-4xl mb-4 block'>⚠️</span>
                    <h3 className='font-bold text-xl mb-2'>
                      Oops! Something went wrong
                    </h3>
                    <p className='text-lg mb-4'>{playlistResult.error}</p>
                    <div className='flex flex-col sm:flex-row gap-3 justify-center'>
                      <button
                        onClick={() => setPlaylistResult(null)}
                        className='bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-xl transition-all'
                      >
                        Try Again
                      </button>
                      <button
                        onClick={handleStartOver}
                        className='bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-xl transition-all'
                      >
                        Start Over
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
