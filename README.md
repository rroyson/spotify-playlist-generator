# 🎵 AI Spotify Playlist Generator

A modern web application that uses AI to generate personalized Spotify playlists. Built with Next.js, TypeScript, Tailwind CSS, and integrated with Spotify Web API and OpenAI.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)

## ✨ Features

- **🎧 Spotify Integration**: Secure OAuth authentication with Spotify
- **🤖 AI-Powered**: Uses OpenAI GPT to generate song recommendations
- **📱 Responsive Design**: Beautiful, mobile-first UI with Tailwind CSS
- **🎯 Two-Step Process**: Preview AI-generated songs before creating playlists
- **🔒 Secure**: Environment-based configuration and secure cookie handling
- **🚀 Performance**: Built with Next.js App Router for optimal performance
- **🧪 Well Tested**: Comprehensive unit tests with Jest and React Testing Library

## 🚀 Demo

1. **Login**: Connect your Spotify account
2. **Describe**: Tell the AI what kind of music you want
3. **Preview**: Review the AI-generated song recommendations
4. **Create**: Add approved songs to your Spotify playlist

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **API Integration**: 
  - [Spotify Web API](https://developer.spotify.com/documentation/web-api/)
  - [OpenAI API](https://platform.openai.com/docs/api-reference)
- **HTTP Client**: [Axios](https://axios-http.com/)
- **Testing**: [Jest](https://jestjs.io/) + [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- **Linting**: [ESLint](https://eslint.org/) with Next.js config

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- npm, yarn, pnpm, or bun
- Spotify Developer Account
- OpenAI API Account

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/spotify-playlist-generator.git
   cd spotify-playlist-generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Spotify API Configuration
   SPOTIFY_CLIENT_ID=your_spotify_client_id_here
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
   SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback

   # OpenAI API Configuration
   OPENAI_API_KEY=your_openai_api_key_here

   # Next.js Configuration
   NEXTAUTH_URL=http://127.0.0.1:3000
   NEXTAUTH_SECRET=your_nextauth_secret_here
   ```

4. **Configure Spotify App**
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create a new app
   - Add `http://127.0.0.1:3000/api/auth/callback` to Redirect URIs
   - Copy Client ID and Client Secret to your `.env.local`

5. **Get OpenAI API Key**
   - Sign up at [OpenAI Platform](https://platform.openai.com/)
   - Generate an API key
   - Add it to your `.env.local`

6. **Generate NextAuth Secret**
   ```bash
   openssl rand -base64 32
   ```
   Add the output to `NEXTAUTH_SECRET` in `.env.local`

## 🚀 Development

Start the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) in your browser.

## 🧪 Testing

Run the test suite:

```bash
# Run tests once
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🔍 Code Quality

```bash
# Run linting
npm run lint

# Run type checking
npm run type-check

# Build the application
npm run build
```

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts       # Spotify OAuth login
│   │   │   ├── callback/route.ts    # OAuth callback handler
│   │   │   ├── check/route.ts       # Authentication status
│   │   │   └── logout/route.ts      # Logout handler
│   │   ├── generate-songs/route.ts  # AI song generation
│   │   └── create-playlist/route.ts # Spotify playlist creation
│   ├── globals.css                  # Global styles
│   ├── layout.tsx                   # Root layout
│   └── page.tsx                     # Main page component
└── __tests__/
    ├── api/                         # API route tests
    └── components/                  # Component tests
```

## 🔄 User Flow

1. **Authentication**: User clicks "Login with Spotify" → Redirected to Spotify → Authorized → Redirected back
2. **Song Generation**: User describes playlist → AI generates 20 songs → Songs displayed for review
3. **Playlist Creation**: User approves songs → Playlist created in Spotify → Success confirmation

## 🔒 Security Features

- **Environment Variables**: Sensitive data stored in environment variables
- **Secure Cookies**: HttpOnly cookies for token storage
- **CSRF Protection**: State parameter in OAuth flow
- **Input Validation**: Server-side validation of all inputs
- **Error Handling**: Comprehensive error handling without exposing sensitive data

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Update Spotify app redirect URI to your production domain
5. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Node.js:
- Netlify
- Railway
- Heroku
- AWS
- Google Cloud

Remember to:
- Set all environment variables
- Update redirect URIs in Spotify app settings
- Use production-grade secrets

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📊 CI/CD

This project uses GitHub Actions for continuous integration and Vercel for deployment:

**GitHub Actions CI Pipeline:**
- **Linting**: ESLint checks on every push/PR
- **Testing**: Jest test suite with coverage on Node.js 18.x & 20.x
- **Type Checking**: TypeScript compilation verification
- **Build**: Production build verification
- **Security**: npm audit for dependency vulnerabilities

**Vercel Deployment:**
- **Auto-deployment**: Configured to auto-deploy on push to main/development branches
- **Preview deployments**: Automatic preview URLs for pull requests
- **Environment management**: Production and preview environment variables

## 🐛 Troubleshooting

### Common Issues

1. **"Invalid Redirect URI" Error**
   - Ensure redirect URI in Spotify app matches exactly
   - Use `127.0.0.1` instead of `localhost` if needed

2. **Environment Variables Not Loading**
   - Restart development server after changing `.env.local`
   - Ensure no spaces around `=` in environment variables

3. **OpenAI API Errors**
   - Check API key validity
   - Verify sufficient API credits
   - Check rate limits

4. **Spotify API Errors**
   - Verify app is not in development mode restriction
   - Check token expiration (1 hour default)
   - Ensure user has Spotify Premium for some features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Spotify Web API](https://developer.spotify.com/documentation/web-api/) for music integration
- [OpenAI](https://openai.com/) for AI-powered recommendations
- [Next.js](https://nextjs.org/) for the amazing framework
- [Tailwind CSS](https://tailwindcss.com/) for beautiful styling

## 📞 Support

If you have any questions or run into issues, please:
1. Check the [troubleshooting section](#-troubleshooting)
2. Search existing [GitHub issues](https://github.com/yourusername/spotify-playlist-generator/issues)
3. Create a new issue with detailed information

---

Made with ❤️ and 🎵 by [Your Name](https://github.com/yourusername)