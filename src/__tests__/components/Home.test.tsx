import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import axios from 'axios'
import Home from '../../app/page'

// Mock axios
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock window.location
delete (window as any).location
window.location = { href: '' } as any

describe('Home Component', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  describe('Authentication Flow', () => {
    it('should render login screen when not authenticated', async () => {
      // Mock fetch to return 401 (not authenticated)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('Connect to Spotify')).toBeInTheDocument()
        expect(screen.getByText('🎧 Login with Spotify')).toBeInTheDocument()
      })
    })

    it('should render playlist form when authenticated', async () => {
      // Mock fetch to return 200 (authenticated)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('Create Your Playlist')).toBeInTheDocument()
        expect(screen.getByLabelText(/Playlist Name/)).toBeInTheDocument()
        expect(screen.getByLabelText(/Describe your perfect playlist/)).toBeInTheDocument()
      })
    })

    it('should handle login button click', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      render(<Home />)

      await waitFor(() => {
        const loginButton = screen.getByText('🎧 Login with Spotify')
        fireEvent.click(loginButton)
        expect(window.location.href).toBe('/api/auth/login')
      })
    })

    it('should handle logout', async () => {
      // Initial auth check - authenticated
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      // Mock logout API call
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument()
      })

      const logoutButton = screen.getByText('Logout')
      fireEvent.click(logoutButton)

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/api/auth/logout')
      })
    })

    it('should handle authentication check errors', async () => {
      // Mock fetch to throw an error
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('Connect to Spotify')).toBeInTheDocument()
      })
    })

    it('should handle logout errors', async () => {
      // Initial auth check - authenticated
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      // Mock logout API call to fail
      mockedAxios.post.mockRejectedValueOnce(new Error('Logout failed'))

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument()
      })

      const logoutButton = screen.getByText('Logout')
      fireEvent.click(logoutButton)

      // Should still handle the error gracefully
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/api/auth/logout')
      })
    })

    it('should handle document visibility changes', async () => {
      // Mock authenticated state
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('Create Your Playlist')).toBeInTheDocument()
      })

      // Clear previous calls
      ;(global.fetch as jest.Mock).mockClear()

      // Simulate document visibility change
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false,
      })

      // Trigger visibility change event
      const event = new Event('visibilitychange')
      document.dispatchEvent(event)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/check')
      })
    })

    it('should handle window focus events', async () => {
      // Mock authenticated state
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('Create Your Playlist')).toBeInTheDocument()
      })

      // Clear previous calls
      ;(global.fetch as jest.Mock).mockClear()

      // Trigger window focus event
      const event = new Event('focus')
      window.dispatchEvent(event)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/check')
      })
    })
  })

  describe('Song Generation Flow', () => {
    beforeEach(async () => {
      // Mock authenticated state
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })
    })

    it('should generate songs when form is submitted', async () => {
      const mockSongs = [
        { artist: 'Test Artist 1', track: 'Test Song 1' },
        { artist: 'Test Artist 2', track: 'Test Song 2' },
      ]

      mockedAxios.post.mockResolvedValueOnce({
        data: { songs: mockSongs, success: true },
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Describe your perfect playlist/)).toBeInTheDocument()
      })

      const promptInput = screen.getByLabelText(/Describe your perfect playlist/)
      const generateButton = screen.getByText('✨ Generate Song Ideas')

      fireEvent.change(promptInput, { target: { value: 'upbeat workout music' } })
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/api/generate-songs', {
          prompt: 'upbeat workout music',
          songCount: 20,
          personalityMode: 'default',
        })
      })

      await waitFor(() => {
        expect(screen.getByText('🎵 Your AI-Generated Songs')).toBeInTheDocument()
        expect(screen.getByText('Test Song 1')).toBeInTheDocument()
        expect(screen.getByText('Test Artist 1')).toBeInTheDocument()
      })
    })

    it('should create playlist after song generation', async () => {
      const mockSongs = [
        { artist: 'Test Artist 1', track: 'Test Song 1' },
      ]

      // Mock song generation
      mockedAxios.post
        .mockResolvedValueOnce({
          data: { songs: mockSongs, success: true },
        })
        // Mock playlist creation
        .mockResolvedValueOnce({
          data: {
            success: true,
            playlistUrl: 'https://spotify.com/playlist/123',
            tracksAdded: 1,
            totalSongs: 1,
          },
        })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Describe your perfect playlist/)).toBeInTheDocument()
      })

      const promptInput = screen.getByLabelText(/Describe your perfect playlist/)
      const generateButton = screen.getByText('✨ Generate Song Ideas')

      fireEvent.change(promptInput, { target: { value: 'test music' } })
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('✅ Create Playlist (1 songs)')).toBeInTheDocument()
      })

      const createPlaylistButton = screen.getByText('✅ Create Playlist (1 songs)')
      fireEvent.click(createPlaylistButton)

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/api/create-playlist', {
          songs: mockSongs.map(song => ({ ...song, selected: true })),
          playlistName: 'AI Generated Playlist',
        })
      })

      await waitFor(() => {
        expect(screen.getByText('Playlist Created Successfully!')).toBeInTheDocument()
        expect(screen.getByText('🎧 Open in Spotify')).toBeInTheDocument()
      })
    })

    it('should handle errors during song generation', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('API Error'))

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Describe your perfect playlist/)).toBeInTheDocument()
      })

      const promptInput = screen.getByLabelText(/Describe your perfect playlist/)
      const generateButton = screen.getByText('✨ Generate Song Ideas')

      fireEvent.change(promptInput, { target: { value: 'test music' } })
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument()
        expect(screen.getByText('Failed to generate songs')).toBeInTheDocument()
      })
    })

    it('should validate form input', async () => {
      render(<Home />)

      await waitFor(() => {
        const generateButton = screen.getByText('✨ Generate Song Ideas')
        expect(generateButton).toBeDisabled()
      })

      const promptInput = screen.getByLabelText(/Describe your perfect playlist/)
      fireEvent.change(promptInput, { target: { value: 'test' } })

      await waitFor(() => {
        const generateButton = screen.getByText('✨ Generate Song Ideas')
        expect(generateButton).not.toBeDisabled()
      })
    })

    it('should use selected personality mode when generating songs', async () => {
      const mockSongs = [{ artist: 'Indie Artist', track: 'Hidden Gem' }]

      mockedAxios.post.mockResolvedValueOnce({
        data: { songs: mockSongs, success: true },
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Describe your perfect playlist/)).toBeInTheDocument()
      })

      // Select Discovery mode
      const discoveryRadio = screen.getByDisplayValue('discovery')
      fireEvent.click(discoveryRadio)

      const promptInput = screen.getByLabelText(/Describe your perfect playlist/)
      const generateButton = screen.getByText('✨ Generate Song Ideas')

      fireEvent.change(promptInput, { target: { value: 'indie music' } })
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/api/generate-songs', {
          prompt: 'indie music',
          songCount: 20,
          personalityMode: 'discovery',
        })
      })
    })
  })

  describe('UI Interactions', () => {
    beforeEach(async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })
    })

    it('should handle start over functionality', async () => {
      const mockSongs = [{ artist: 'Test Artist', track: 'Test Song' }]

      mockedAxios.post.mockResolvedValueOnce({
        data: { songs: mockSongs, success: true },
      })

      render(<Home />)

      // Generate songs first
      await waitFor(() => {
        expect(screen.getByLabelText(/Describe your perfect playlist/)).toBeInTheDocument()
      })

      const promptInput = screen.getByLabelText(/Describe your perfect playlist/)
      fireEvent.change(promptInput, { target: { value: 'test music' } })
      
      const generateButton = screen.getByText('✨ Generate Song Ideas')
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('🔄 Start Over')).toBeInTheDocument()
      })

      const startOverButton = screen.getByText('🔄 Start Over')
      fireEvent.click(startOverButton)

      await waitFor(() => {
        expect(screen.queryByText('🎵 Your AI-Generated Songs')).not.toBeInTheDocument()
        expect(promptInput).toHaveValue('')
      })
    })

    it('should update playlist name input', async () => {
      render(<Home />)

      await waitFor(() => {
        const playlistNameInput = screen.getByLabelText(/Playlist Name/)
        fireEvent.change(playlistNameInput, { target: { value: 'My Custom Playlist' } })
        expect(playlistNameInput).toHaveValue('My Custom Playlist')
      })
    })

    it('should handle song count changes', async () => {
      // Mock authenticated state
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Describe your perfect playlist/)).toBeInTheDocument()
      }, { timeout: 5000 })

      const songCountSelect = screen.getByLabelText(/Number of songs/)
      fireEvent.change(songCountSelect, { target: { value: '30' } })
      expect(songCountSelect).toHaveValue('30')
    })

    it('should handle personality mode changes', async () => {
      // Mock authenticated state
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Describe your perfect playlist/)).toBeInTheDocument()
      }, { timeout: 5000 })

      const discoveryRadio = screen.getByDisplayValue('discovery')
      fireEvent.click(discoveryRadio)
      expect(discoveryRadio).toBeChecked()
    })

    it('should handle individual song selection changes', async () => {
      // Mock authenticated state
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      const mockSongs = [
        { artist: 'Test Artist 1', track: 'Test Song 1' },
        { artist: 'Test Artist 2', track: 'Test Song 2' },
      ]

      mockedAxios.post.mockResolvedValueOnce({
        data: { songs: mockSongs, success: true },
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Describe your perfect playlist/)).toBeInTheDocument()
      }, { timeout: 5000 })

      // Generate songs first
      const promptInput = screen.getByLabelText(/Describe your perfect playlist/)
      const generateButton = screen.getByText('✨ Generate Song Ideas')

      fireEvent.change(promptInput, { target: { value: 'test music' } })
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('🎵 Your AI-Generated Songs')).toBeInTheDocument()
      })

      // Test individual song selection
      const firstSongCheckbox = screen.getByLabelText(/Select Test Song 1 by Test Artist 1/)
      fireEvent.click(firstSongCheckbox)
      expect(firstSongCheckbox).not.toBeChecked()
    })

    it('should handle select all and deselect all functionality', async () => {
      // Mock authenticated state
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      const mockSongs = [
        { artist: 'Test Artist 1', track: 'Test Song 1' },
        { artist: 'Test Artist 2', track: 'Test Song 2' },
      ]

      mockedAxios.post.mockResolvedValueOnce({
        data: { songs: mockSongs, success: true },
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Describe your perfect playlist/)).toBeInTheDocument()
      }, { timeout: 5000 })

      // Generate songs first
      const promptInput = screen.getByLabelText(/Describe your perfect playlist/)
      const generateButton = screen.getByText('✨ Generate Song Ideas')

      fireEvent.change(promptInput, { target: { value: 'test music' } })
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('🎵 Your AI-Generated Songs')).toBeInTheDocument()
      })

      // Test deselect all
      const deselectAllButton = screen.getByText('Deselect All')
      fireEvent.click(deselectAllButton)

      await waitFor(() => {
        expect(screen.getByText('0 of 2 songs selected')).toBeInTheDocument()
      })

      // Test select all
      const selectAllButton = screen.getByText('Select All')
      fireEvent.click(selectAllButton)

      await waitFor(() => {
        expect(screen.getByText('2 of 2 songs selected')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle playlist creation with no selected songs', async () => {
      // Mock authenticated state
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      const mockSongs = [
        { artist: 'Test Artist 1', track: 'Test Song 1' },
      ]

      mockedAxios.post.mockResolvedValueOnce({
        data: { songs: mockSongs, success: true },
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Describe your perfect playlist/)).toBeInTheDocument()
      }, { timeout: 5000 })

      // Generate songs first
      const promptInput = screen.getByLabelText(/Describe your perfect playlist/)
      const generateButton = screen.getByText('✨ Generate Song Ideas')

      fireEvent.change(promptInput, { target: { value: 'test music' } })
      fireEvent.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('🎵 Your AI-Generated Songs')).toBeInTheDocument()
      })

      // Deselect all songs
      const deselectAllButton = screen.getByText('Deselect All')
      fireEvent.click(deselectAllButton)

      // Try to create playlist with no songs selected
      const createPlaylistButton = screen.getByText('Select songs to create playlist')
      expect(createPlaylistButton).toBeDisabled()
    })
  })
})