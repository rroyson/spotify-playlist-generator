'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { Mark, plural } from '@/components/ui'
import {
  ArrowCounterClockwiseIcon,
  ArrowSquareOutIcon,
  BinocularsIcon,
  CaretDownIcon,
  CheckIcon,
  FireIcon,
  FlaskIcon,
  RadioIcon,
  ScalesIcon,
  SignOutIcon,
  SparkleIcon,
  SpotifyLogoIcon,
  WarningCircleIcon,
} from '@/components/icons'

const MODES = [
  {
    value: 'default',
    label: 'Balanced',
    hint: 'A mix of eras, genres and moods.',
    Icon: ScalesIcon,
  },
  {
    value: 'mainstream',
    label: 'Mainstream',
    hint: 'Popular hits and well-known tracks.',
    Icon: FireIcon,
  },
  {
    value: 'discovery',
    label: 'Discovery',
    hint: 'Hidden gems and emerging artists.',
    Icon: BinocularsIcon,
  },
  {
    value: 'nostalgia',
    label: 'Nostalgia',
    hint: 'Classic hits from past decades.',
    Icon: RadioIcon,
  },
  {
    value: 'experimental',
    label: 'Experimental',
    hint: 'Unusual, boundary-pushing sounds.',
    Icon: FlaskIcon,
  },
]

const SONG_COUNTS = [10, 20, 30, 50]

// Example output shown on the signed-out screen. Real songs, illustrative only.
const EXAMPLE_PROMPT = 'late-night drive, synthy and a little sad'
const EXAMPLE_SONGS = [
  { track: 'Nightcall', artist: 'Kavinsky' },
  { track: 'Midnight City', artist: 'M83' },
  { track: 'A Real Hero', artist: 'College, Electric Youth' },
  { track: 'Genesis', artist: 'Grimes' },
]

type Song = { artist: string; track: string; selected: boolean }

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [playlistName, setPlaylistName] = useState('')
  const [songCount, setSongCount] = useState(20)
  const [personalityMode, setPersonalityMode] = useState('default')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedSongs, setGeneratedSongs] = useState<Song[] | null>(null)
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
        songCount,
        personalityMode,
      })

      const songs = response.data.songs || []
      setGeneratedSongs(
        songs.map((song: { artist: string; track: string }) => ({
          ...song,
          selected: true,
        })),
      )
    } catch (error) {
      console.error('Error generating songs:', error)
      const res = (
        error as { response?: { status?: number; data?: { error?: string } } }
      ).response
      setPlaylistResult({
        error:
          res?.status === 429 && res.data?.error
            ? res.data.error
            : 'Failed to generate songs',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCreatePlaylist = async () => {
    if (!generatedSongs) return

    const selectedSongs = generatedSongs.filter((song) => song.selected)
    if (selectedSongs.length === 0) return

    setIsCreatingPlaylist(true)
    setPlaylistResult(null)

    try {
      const response = await axios.post('/api/create-playlist', {
        songs: selectedSongs,
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
    setSongCount(20)
    setPersonalityMode('default')
  }

  const toggleSongSelection = (index: number) => {
    if (!generatedSongs) return
    setGeneratedSongs(
      generatedSongs.map((song, i) =>
        i === index ? { ...song, selected: !song.selected } : song,
      ),
    )
  }

  const setAllSelected = (selected: boolean) => {
    if (!generatedSongs) return
    setGeneratedSongs(generatedSongs.map((song) => ({ ...song, selected })))
  }

  const selectedCount = generatedSongs
    ? generatedSongs.filter((song) => song.selected).length
    : 0
  const activeMode =
    MODES.find((mode) => mode.value === personalityMode) ?? MODES[0]

  return (
    <div className='min-h-dvh'>
      <a
        href='#main'
        className='btn btn-primary sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50'
      >
        Skip to content
      </a>

      <header className='mx-auto flex max-w-2xl items-center justify-between px-6 py-6'>
        <div className='flex items-center gap-2.5'>
          <Mark />
          <span className='font-display text-lg font-bold tracking-tight'>
            Playlist Generator
          </span>
        </div>
        {isAuthenticated && (
          <button onClick={handleLogout} className='btn btn-ghost px-3 text-sm'>
            <SignOutIcon size={16} />
            Log out
          </button>
        )}
      </header>

      <main id='main' className='mx-auto max-w-2xl px-6 pb-24 pt-8 sm:pt-14'>
        {!isAuthenticated ? (
          <section className='space-y-10 md:space-y-12'>
            <h1 className='font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-[3.5rem]'>
              Describe the vibe. Get the playlist.
            </h1>

            <div className='grid items-center gap-12 md:grid-cols-[1fr_0.9fr]'>
              <div>
                <p className='max-w-md text-lg text-ink-muted'>
                  Tell it what you&rsquo;re in the mood for and it drafts a
                  Spotify playlist you can trim before saving.
                </p>
                <button
                  onClick={handleLogin}
                  className='btn btn-primary mt-8 text-base'
                >
                  <SpotifyLogoIcon size={20} />
                  Connect Spotify
                </button>
                <p className='mt-4 text-sm text-ink-muted'>
                  Playlists are created in your own Spotify library.
                </p>
              </div>

              <div className='relative'>
                <div
                  aria-hidden='true'
                  className='absolute inset-0 rotate-2 rounded-lg bg-primary-soft'
                />
                <div className='relative -rotate-1 rounded-lg border border-line bg-canvas p-5 shadow-sm'>
                  <p className='text-xs font-semibold tracking-wide text-ink-muted uppercase'>
                    Example
                  </p>
                  <p className='mt-1 font-display text-lg font-bold'>
                    &ldquo;{EXAMPLE_PROMPT}&rdquo;
                  </p>
                  <ol className='mt-4 divide-y divide-line'>
                    {EXAMPLE_SONGS.map((song, i) => (
                      <li
                        key={song.track}
                        className='flex items-center gap-3 py-2.5'
                      >
                        <span className='w-5 text-sm text-ink-muted tabular-nums'>
                          {i + 1}
                        </span>
                        <div className='min-w-0'>
                          <p className='truncate font-medium'>{song.track}</p>
                          <p className='truncate text-sm text-ink-muted'>
                            {song.artist}
                          </p>
                        </div>
                        <CheckIcon
                          size={18}
                          className='ml-auto shrink-0 text-accent'
                        />
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <div className='space-y-10'>
            <div>
              <h1 className='font-display text-3xl font-extrabold tracking-tight sm:text-4xl'>
                Create a playlist
              </h1>
              <p className='mt-2 text-ink-muted'>
                Tell it what you&rsquo;re in the mood for.
              </p>
            </div>

            <form onSubmit={handleGenerateSongs} className='space-y-6'>
              <div>
                <label htmlFor='prompt' className='label'>
                  Describe your playlist
                </label>
                <textarea
                  id='prompt'
                  name='prompt'
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder='e.g. upbeat 90s pop for a road trip, or quiet piano for a rainy morning…'
                  rows={3}
                  required
                  className='field resize-none'
                />
              </div>

              <div className='grid gap-6 sm:grid-cols-[minmax(0,1fr)_11rem]'>
                <div>
                  <label htmlFor='playlistName' className='label'>
                    Playlist name{' '}
                    <span className='font-normal text-ink-muted'>
                      (optional)
                    </span>
                  </label>
                  <input
                    type='text'
                    id='playlistName'
                    name='playlistName'
                    autoComplete='off'
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    placeholder='Rainy morning piano…'
                    className='field'
                  />
                </div>
                <div>
                  <label htmlFor='songCount' className='label'>
                    Number of songs
                  </label>
                  <div className='relative'>
                    <select
                      id='songCount'
                      name='songCount'
                      value={songCount}
                      onChange={(e) => setSongCount(Number(e.target.value))}
                      className='field appearance-none pr-10 text-ink'
                    >
                      {SONG_COUNTS.map((count) => (
                        <option key={count} value={count}>
                          {count} songs
                        </option>
                      ))}
                    </select>
                    <CaretDownIcon
                      size={16}
                      className='pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-ink-muted'
                    />
                  </div>
                </div>
              </div>

              <fieldset>
                <legend className='label'>Taste</legend>
                <div className='flex flex-wrap gap-2 sm:grid sm:grid-cols-5'>
                  {MODES.map(({ value, label, Icon }) => (
                    <label key={value} className='chip'>
                      <input
                        type='radio'
                        name='personalityMode'
                        value={value}
                        checked={personalityMode === value}
                        onChange={(e) => setPersonalityMode(e.target.value)}
                        className='sr-only'
                      />
                      <Icon size={18} className='text-primary' />
                      {label}
                    </label>
                  ))}
                </div>
                <p className='mt-3 text-sm text-ink-muted'>{activeMode.hint}</p>
              </fieldset>

              <button
                type='submit'
                disabled={isGenerating || !prompt.trim()}
                className='btn btn-primary w-full text-base'
              >
                {isGenerating ? (
                  <>
                    <span className='spinner' />
                    Generating…
                  </>
                ) : (
                  <>
                    <SparkleIcon size={18} />
                    Generate songs
                  </>
                )}
              </button>
            </form>

            {isGenerating && (
              <section
                className='panel'
                aria-busy='true'
                aria-label='Generating songs'
              >
                <div className='skeleton h-6 w-32' />
                <div className='skeleton mt-2 h-4 w-44' />
                <div className='mt-5 divide-y divide-line'>
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className='flex items-center gap-3 py-3'>
                      <div className='skeleton h-4 w-5' />
                      <div className='flex-1 space-y-2'>
                        <div className='skeleton h-3.5 w-1/2' />
                        <div className='skeleton h-3 w-1/3' />
                      </div>
                      <div className='skeleton size-4' />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {generatedSongs && !playlistResult && (
              <section className='panel' aria-labelledby='songs-heading'>
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div>
                    <h2
                      id='songs-heading'
                      className='font-display text-2xl font-bold'
                    >
                      Your songs
                    </h2>
                    <p className='mt-1 text-sm text-ink-muted tabular-nums'>
                      {selectedCount} of {generatedSongs.length} songs selected
                    </p>
                  </div>
                  <div className='flex gap-2'>
                    <button
                      onClick={() => setAllSelected(true)}
                      className='btn btn-ghost px-3 text-sm'
                    >
                      Select all
                    </button>
                    <button
                      onClick={() => setAllSelected(false)}
                      className='btn btn-ghost px-3 text-sm'
                    >
                      Deselect all
                    </button>
                  </div>
                </div>

                <ol className='-mx-2 mt-5 max-h-96 overflow-y-auto overscroll-contain border-y border-line py-1'>
                  {generatedSongs.map((song, index) => (
                    <li
                      key={index}
                      className='row'
                      style={{ '--i': index } as React.CSSProperties}
                    >
                      <label
                        className={`flex cursor-pointer items-center gap-3 rounded-sm px-2 py-2.5 transition-opacity duration-150 ${
                          song.selected ? '' : 'opacity-45'
                        }`}
                      >
                        <span className='w-6 text-sm text-ink-muted tabular-nums'>
                          {index + 1}
                        </span>
                        <div className='min-w-0 flex-1'>
                          <p className='truncate font-medium'>{song.track}</p>
                          <p className='truncate text-sm text-ink-muted'>
                            {song.artist}
                          </p>
                        </div>
                        <input
                          type='checkbox'
                          checked={song.selected}
                          onChange={() => toggleSongSelection(index)}
                          aria-label={`Select ${song.track} by ${song.artist}`}
                          className='size-4 shrink-0 accent-primary'
                        />
                      </label>
                    </li>
                  ))}
                </ol>

                <div className='mt-6 flex flex-col gap-3 sm:flex-row'>
                  <button
                    onClick={handleCreatePlaylist}
                    disabled={isCreatingPlaylist || selectedCount === 0}
                    className='btn btn-primary flex-1'
                  >
                    {isCreatingPlaylist ? (
                      <>
                        <span className='spinner' />
                        Creating playlist…
                      </>
                    ) : selectedCount === 0 ? (
                      'Select at least one song'
                    ) : (
                      <>
                        <SpotifyLogoIcon size={18} />
                        {`Create playlist · ${plural(selectedCount, 'song')}`}
                      </>
                    )}
                  </button>
                  <button onClick={handleStartOver} className='btn btn-ghost'>
                    <ArrowCounterClockwiseIcon size={16} />
                    Start over
                  </button>
                </div>
              </section>
            )}

            {playlistResult && !playlistResult.error && (
              <section className='panel text-center' aria-live='polite'>
                <div className='mx-auto flex size-12 items-center justify-center rounded-full bg-accent text-on-primary'>
                  <CheckIcon size={24} />
                </div>
                <h2 className='mt-4 font-display text-2xl font-bold'>
                  Playlist created
                </h2>
                <p className='mt-2 text-ink-muted tabular-nums'>
                  {playlistResult.tracksAdded ?? 0} of{' '}
                  {plural(playlistResult.totalSongs ?? 0, 'song')} added to your
                  Spotify library.
                </p>
                <div className='mt-6 flex flex-col justify-center gap-3 sm:flex-row'>
                  <a
                    href={playlistResult.playlistUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='btn btn-primary'
                  >
                    <ArrowSquareOutIcon size={18} />
                    Open in Spotify
                  </a>
                  <button onClick={handleStartOver} className='btn btn-ghost'>
                    Make another
                  </button>
                </div>
              </section>
            )}

            {playlistResult?.error && (
              <section className='panel text-center' role='alert'>
                <div className='mx-auto flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary'>
                  <WarningCircleIcon size={26} />
                </div>
                <h2 className='mt-4 font-display text-2xl font-bold'>
                  Something went wrong
                </h2>
                <p className='mt-2 text-ink-muted'>{playlistResult.error}</p>
                <div className='mt-6 flex flex-col justify-center gap-3 sm:flex-row'>
                  <button
                    onClick={() => setPlaylistResult(null)}
                    className='btn btn-primary'
                  >
                    Try again
                  </button>
                  <button onClick={handleStartOver} className='btn btn-ghost'>
                    Start over
                  </button>
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
