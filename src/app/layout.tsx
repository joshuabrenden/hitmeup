import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { UserProvider } from '@/lib/contexts/UserContext'
import { ChatProvider } from '@/lib/contexts/ChatContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HitMeUp - Chat App',
  description: 'Mobile-friendly chat application with AI assistant',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <UserProvider>
          <ChatProvider>
            <main className="min-h-screen bg-background">
              {children}
            </main>
          </ChatProvider>
        </UserProvider>
      </body>
    </html>
  )
}