import Link from 'next/link'
import { Button, Card, CardContent } from '@/components/ui'
import ThemeToggle from '@/components/ThemeToggle'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Theme Toggle - Fixed Position */}
      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      
      <div className="max-w-md w-full mx-4 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">HitMeUp</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">Modern chat with AI intelligence</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Connect, collaborate, and chat with Jimmy - your AI assistant</p>
        </div>
        
        <div className="space-y-6">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700">
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <div className="text-3xl mb-2">🤖</div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Meet Jimmy</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Your intelligent AI assistant is ready to help, answer questions, and join your conversations.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-center">Get Started</h3>
              <div className="space-y-3">
                <Link href="/signup" className="block">
                  <Button className="w-full" variant="primary">
                    Create Account
                  </Button>
                </Link>
                <Link href="/login" className="block">
                  <Button className="w-full" variant="secondary">
                    Sign In
                  </Button>
                </Link>
                <div className="text-center pt-2 space-y-2">
                  <Link href="/home" className="block text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                    Already have an account? Go to dashboard →
                  </Link>
                  <div className="text-xs text-gray-400 dark:text-gray-500 border-t pt-2 mt-2">
                    <strong>Demo:</strong> Use test@example.com / password for testing
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <span className="text-green-500">●</span>
                <span>Real-time chat</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-blue-500">●</span>
                <span>AI assistant</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-purple-500">●</span>
                <span>Private rooms</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}