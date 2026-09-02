import type { Metadata, Viewport } from 'next'
import { Geist, Urbanist } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const urbanist = Urbanist({
  variable: '--font-urbanist',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Playlist Generator for Spotify',
  description: 'Describe the vibe and get a Spotify playlist you can trim before saving.',
}

export const viewport: Viewport = {
  themeColor: '#fff9f8',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en'>
      <body className={`${geistSans.variable} ${urbanist.variable} antialiased`}>{children}</body>
    </html>
  )
}
