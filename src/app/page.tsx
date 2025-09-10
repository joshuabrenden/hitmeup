import Link from 'next/link'
import { Button, Card, CardContent } from '@/components/ui'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full mx-4 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">HitMeUp</h1>
          <p className="text-gray-600">Mobile-friendly chat with AI assistant</p>
        </div>
        
        <div className="space-y-4">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-green-800 mb-2">✅ Stage 4.0 Complete</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Real AI Integration with Claude API ✅</li>
                <li>• Smart context-aware responses ✅</li>
                <li>• Fallback error handling ✅</li>
                <li>• Industry-standard chat architecture ✅</li>
                <li>• Multi-chat support with invite system ✅</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-blue-800 mb-3">🚀 Start Chatting</h3>
              <div className="space-y-2">
                <Link href="/signup" className="block">
                  <Button className="w-full" variant="primary">
                    🆕 Create Account
                  </Button>
                </Link>
                <Link href="/login" className="block">
                  <Button className="w-full" variant="secondary">
                    🔑 Sign In
                  </Button>
                </Link>
                <div className="text-xs text-blue-700 mt-2 p-2 bg-blue-100 rounded">
                  🤖 <strong>AI-Powered:</strong> Chat with Jimmy, your intelligent AI assistant!
                </div>
                <Link href="/home" className="block">
                  <Button className="w-full" variant="ghost" size="sm">
                    🏠 Chat Dashboard (Login Required)
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <p className="text-sm text-gray-500">
              Ready for Stage 5 - Mobile Optimization & Advanced Features!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}