import React from 'react'
import { Message, User } from '@/lib/supabase/types'

interface ChatMessageProps {
  message: Message & { user?: User }
  isOwn?: boolean
  showAvatar?: boolean
}

export const ChatMessage = ({ message, isOwn = false, showAvatar = true }: ChatMessageProps) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  const isAI = message.is_ai || message.message_type === 'ai'
  const displayName = isAI ? 'Jimmy (AI)' : message.user?.name || 'Unknown User'
  
  return (
    <div className={`flex items-start space-x-3 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`} data-testid="message">
      {showAvatar && (
        <div className="flex-shrink-0">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
            ${isAI 
              ? 'bg-purple-100 text-purple-600 border-2 border-purple-300'
              : isOwn 
                ? 'bg-blue-100 text-blue-600' 
                : 'bg-gray-100 text-gray-600'
            }
          `}>
            {isAI ? '🤖' : displayName.charAt(0).toUpperCase()}
          </div>
        </div>
      )}
      
      <div className={`flex-1 min-w-0 ${isOwn ? 'text-right' : ''}`}>
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-sm font-medium text-gray-900">
            {displayName}
          </span>
          <span className="text-xs text-gray-500">
            {formatTime(message.created_at)}
          </span>
        </div>
        
        <div className={`
          inline-block max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg text-sm
          ${isAI 
            ? 'bg-purple-50 text-purple-900 border border-purple-200'
            : isOwn 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-900'
          }
        `}>
          <p className="whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
        
        {message.message_type === 'system' && (
          <div className="text-xs text-gray-500 italic mt-1">
            System message
          </div>
        )}
      </div>
    </div>
  )
}