import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.SPOTIFY_CLIENT_ID = 'test_client_id'
process.env.SPOTIFY_CLIENT_SECRET = 'test_client_secret'
process.env.SPOTIFY_REDIRECT_URI = 'http://localhost:3000/api/auth/callback'
process.env.OPENAI_API_KEY = 'test_openai_key'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NEXTAUTH_SECRET = 'test_secret'

// Mock fetch globally
global.fetch = jest.fn()

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks()
})