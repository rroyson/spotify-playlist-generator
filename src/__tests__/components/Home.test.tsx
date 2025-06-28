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
        expect(screen.getByText('✅ Create Spotify Playlist')).toBeInTheDocument()
      })

      const createPlaylistButton = screen.getByText('✅ Create Spotify Playlist')
      fireEvent.click(createPlaylistButton)

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/api/create-playlist', {
          songs: mockSongs,
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
  })
})