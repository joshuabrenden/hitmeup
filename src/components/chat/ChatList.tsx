import React, { useEffect, useRef, useState, useCallback } from 'react'
import { ChatMessage } from './ChatMessage'
import { Message, User } from '@/lib/supabase/types'

interface ChatListProps {
  messages: (Message & { user?: User })[]
  currentUserId?: string
  isLoading?: boolean
  autoScroll?: boolean
  onLoadMore?: () => Promise<void>
  hasMoreMessages?: boolean
  isLoadingMore?: boolean
}

export const ChatList = ({ 
  messages, 
  currentUserId, 
  isLoading = false, 
  autoScroll = true,
  onLoadMore,
  hasMoreMessages = false,
  isLoadingMore = false
}: ChatListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastMessageCountRef = useRef(messages.length)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true)

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'auto' 
    })
  }, [])

  const checkScrollPosition = useCallback(() => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      
      // Consider "near bottom" if within 100px of bottom
      const nearBottom = distanceFromBottom < 100
      setIsNearBottom(nearBottom)
      setShowScrollButton(!nearBottom && messages.length > 0)
      
      // Enable auto-scroll only if user is near bottom
      setIsAutoScrollEnabled(nearBottom)
    }
  }, [messages.length])

  const handleScroll = useCallback(async () => {
    if (containerRef.current) {
      const { scrollTop } = containerRef.current
      
      // Check scroll position for auto-scroll behavior
      checkScrollPosition()
      
      // Load more messages when scrolled to top
      if (scrollTop < 50 && onLoadMore && hasMoreMessages && !isLoadingMore) {
        const currentScrollHeight = containerRef.current.scrollHeight
        
        await onLoadMore()
        
        // Maintain scroll position after loading more messages
        setTimeout(() => {
          if (containerRef.current) {
            const newScrollHeight = containerRef.current.scrollHeight
            const scrollDiff = newScrollHeight - currentScrollHeight
            containerRef.current.scrollTop = scrollTop + scrollDiff
          }
        }, 100)
      }
    }
  }, [onLoadMore, hasMoreMessages, isLoadingMore, checkScrollPosition])

  // Auto-scroll effect for new messages
  useEffect(() => {
    const hasNewMessages = messages.length > lastMessageCountRef.current
    
    if (autoScroll && hasNewMessages && isAutoScrollEnabled) {
      // Scroll immediately for optimistic updates, smoothly for real messages
      const shouldScrollSmooth = messages.length - lastMessageCountRef.current === 1
      scrollToBottom(shouldScrollSmooth)
    }
    
    lastMessageCountRef.current = messages.length
  }, [messages, autoScroll, isAutoScrollEnabled, scrollToBottom])

  // Initial scroll position check
  useEffect(() => {
    checkScrollPosition()
  }, [checkScrollPosition])

  // Scroll to bottom on initial load
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      setTimeout(() => scrollToBottom(false), 100)
    }
  }, [messages.length > 0 && !isLoading, scrollToBottom])

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-500 text-sm">Loading messages...</p>
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
          <p className="text-gray-500 text-sm">Start the conversation by sending a message below!</p>
          <p className="text-gray-400 text-xs mt-2">💡 Try mentioning @jimmy to chat with the AI assistant</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col relative">
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onScroll={handleScroll}
        data-testid="chat-container"
      >
        {/* Load more indicator */}
        {isLoadingMore && (
          <div className="text-center py-4">
            <svg className="animate-spin h-5 w-5 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-gray-400 text-xs mt-1">Loading more messages...</p>
          </div>
        )}
        
        {/* Load more button for when there are more messages */}
        {hasMoreMessages && !isLoadingMore && messages.length > 0 && (
          <div className="text-center py-2">
            <button 
              onClick={() => onLoadMore && onLoadMore()}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Load more messages
            </button>
          </div>
        )}

      {messages.map((message, index) => {
        const isOwn = currentUserId === message.user_id
        const showAvatar = index === 0 || messages[index - 1].user_id !== message.user_id

        return (
          <ChatMessage
            key={message.id}
            message={message}
            isOwn={isOwn}
            showAvatar={showAvatar}
          />
        )
      })}

        <div ref={messagesEndRef} />
      </div>
      
      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-all duration-200 z-10"
          aria-label="Scroll to bottom"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}
    </div>
  )
}