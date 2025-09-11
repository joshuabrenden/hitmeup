import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { UserProvider } from '@/lib/contexts/UserContext'
import { ChatProvider } from '@/lib/contexts/ChatContext'
import { ThemeProvider } from '@/lib/contexts/ThemeContext'
import { PWAProvider } from '@/components/PWAProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HitMeUp - AI-Powered Chat',
  description: 'Modern chat application with AI assistant Jimmy. Create private rooms, chat in real-time, and get help from your intelligent AI companion.',
  keywords: ['chat', 'messaging', 'AI', 'real-time', 'communication', 'assistant'],
  authors: [{ name: 'HitMeUp Team' }],
  creator: 'HitMeUp',
  publisher: 'HitMeUp',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: '/manifest.json',
  themeColor: '#3b82f6',
  colorScheme: 'light',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover'
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HitMeUp',
    startupImage: [
      {
        url: '/icons/apple-splash-2048-2732.jpg',
        media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)'
      }
    ]
  },
  openGraph: {
    type: 'website',
    siteName: 'HitMeUp',
    title: 'HitMeUp - AI-Powered Chat',
    description: 'Modern chat application with AI assistant Jimmy',
    url: 'https://hitmeup.app',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'HitMeUp - AI-Powered Chat'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HitMeUp - AI-Powered Chat',
    description: 'Modern chat application with AI assistant Jimmy',
    images: ['/og-image.png']
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PWAProvider />
        <ThemeProvider>
          <UserProvider>
            <ChatProvider>
              <main className="min-h-screen bg-background">
                {children}
              </main>
            </ChatProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}