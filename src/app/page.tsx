import Link from 'next/link'
import { Button, Card, CardContent } from '@/components/ui'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full mx-4 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">HitMeUp</h1>
          <p className="text-lg text-gray-600 mb-2">Modern chat with AI intelligence</p>
          <p className="text-sm text-gray-500">Connect, collaborate, and chat with Jimmy - your AI assistant</p>
        </div>
        
        <div className="space-y-6">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <div className="text-3xl mb-2">🤖</div>
                <h3 className="font-semibold text-blue-900 mb-2">Meet Jimmy</h3>
                <p className="text-sm text-blue-700">
                  Your intelligent AI assistant is ready to help, answer questions, and join your conversations.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 text-center">Get Started</h3>
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
                <div className="text-center pt-2">
                  <Link href="/home" className="text-sm text-gray-500 hover:text-gray-700">
                    Already have an account? Go to dashboard →
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
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