'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { ChatList, ChatInput } from '@/components/chat'
import { Button } from '@/components/ui'
import { useChat } from '@/lib/contexts/ChatContext'
import { useUser } from '@/lib/contexts/UserContext'
import { createClient } from '@/lib/supabase/client'

interface ChatInfo {
  id: string
  name: string | null
  is_group: boolean
  created_by: string
  participant_count: number
  user_role: 'admin' | 'member'
}

export default function ChatPage() {
  const router = useRouter()
  const params = useParams()
  const chatId = params.chatId as string
  const { user, isLoading: isUserLoading, logout } = useUser()
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    loadMessages, 
    loadMoreMessages,
    hasMoreMessages,
    isLoadingMore,
    updateTyping, 
    typingUsers, 
    connectionState, 
    onlineUsers, 
    trackPresence 
  } = useChat()

  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null)
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [isLoadingAccess, setIsLoadingAccess] = useState(true)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login')
    }
  }, [user, isUserLoading, router])

  // Check chat access and load chat info
  useEffect(() => {
    if (user && chatId) {
      checkChatAccess()
    }
  }, [user, chatId])

  // Load messages when access is confirmed
  useEffect(() => {
    if (user && chatId && hasAccess) {
      loadMessages(chatId)
    }
  }, [loadMessages, user, chatId, hasAccess])

  // Track user presence in the chat
  useEffect(() => {
    if (connectionState === 'connected' && user && hasAccess) {
      trackPresence(user)
      console.log('🟢 User presence tracked for:', user.name)
    }
  }, [connectionState, user, hasAccess, trackPresence])

  const checkChatAccess = async () => {
    if (!user || !chatId) return

    try {
      setIsLoadingAccess(true)
      console.log('🔍 Checking access to chat:', chatId)

      // Check if user is a participant in this chat
      const { data: participant, error: participantError } = await supabase
        .from('chat_participants')
        .select('role')
        .eq('chat_id', chatId)
        .eq('user_id', user.id)
        .single()

      if (participantError && participantError.code !== 'PGRST116') {
        console.error('❌ Error checking participation:', participantError)
        throw participantError
      }

      if (!participant) {
        console.log('❌ User is not a participant in this chat')
        setHasAccess(false)
        return
      }

      console.log('✅ User has access to chat with role:', participant.role)

      // Get chat info
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .single()

      if (chatError) {
        console.error('❌ Error fetching chat info:', chatError)
        throw chatError
      }

      // Get participant count
      const { count: participantCount } = await supabase
        .from('chat_participants')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', chatId)

      setChatInfo({
        id: chat.id,
        name: chat.name,
        is_group: chat.is_group,
        created_by: chat.created_by,
        participant_count: participantCount || 0,
        user_role: participant.role
      })

      setHasAccess(true)
    } catch (error) {
      console.error('❌ Failed to check chat access:', error)
      setError('Failed to load chat')
      setHasAccess(false)
    } finally {
      setIsLoadingAccess(false)
    }
  }

  const generateInviteCode = async () => {
    if (!user || !chatId || !chatInfo) return

    setIsGeneratingInvite(true)
    setError('')

    try {
      console.log('🔗 Generating invite code for chat:', chatId)

      // Generate a random invite code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase()

      const { data: invite, error } = await supabase
        .from('invites')
        .insert({
          code,
          created_by: user.id,
          chat_id: chatId,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating invite:', error)
        throw error
      }

      console.log('✅ Invite created:', invite)
      setInviteCode(invite.code)
      setShowInviteForm(true)
    } catch (error: any) {
      console.error('❌ Failed to generate invite:', error)
      setError(error.message || 'Failed to generate invite code')
    } finally {
      setIsGeneratingInvite(false)
    }
  }

  const handleSendMessage = async (content: string) => {
    if (!user || !chatId) return
    
    try {
      await sendMessage(content, chatId, user.id, user)
    } catch (error) {
      console.error('Error sending message:', error)
      setError('Failed to send message')
    }
  }

  const handleTyping = () => {
    if (!user || !chatId) return
    updateTyping(chatId, user.id, user.name)
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const handleLeaveChat = async () => {
    if (!user || !chatId || !chatInfo) return

    if (!confirm('Are you sure you want to leave this chat?')) return

    try {
      const { error } = await supabase
        .from('chat_participants')
        .delete()
        .eq('chat_id', chatId)
        .eq('user_id', user.id)

      if (error) {
        console.error('❌ Error leaving chat:', error)
        throw error
      }

      console.log('✅ Left chat successfully')
      router.push('/home')
    } catch (error: any) {
      console.error('❌ Failed to leave chat:', error)
      setError(error.message || 'Failed to leave chat')
    }
  }

  // Show loading while checking authentication
  if (isUserLoading || isLoadingAccess) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-500">Loading chat...</p>
        </div>
      </div>
    )
  }

  // Redirect if not authenticated
  if (!user) {
    return null
  }

  // Show access denied if user doesn't have access
  if (hasAccess === false) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4 p-8 bg-white rounded-lg shadow-lg text-center">
          <div className="text-red-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V9a4 4 0 00-8 0v2m0 0V9a4 4 0 014-4 4 4 0 014 4v2m-6 0h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You don&apos;t have access to this chat room. You need to be invited to join.
          </p>
          <div className="space-y-2">
            <Link href="/home" className="block">
              <Button variant="primary" className="w-full">
                Back to Home
              </Button>
            </Link>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full text-red-600 hover:text-red-700"
            >
              Logout
            </Button>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!chatInfo) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading chat information...</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <Link href="/home">
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                  ←
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {chatInfo.name || 'Unnamed Chat'}
                </h1>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${
                      connectionState === 'connected' ? 'bg-green-500' :
                      connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                      connectionState === 'error' ? 'bg-red-500' : 'bg-gray-400'
                    }`} />
                    <span className="text-gray-600 capitalize">{connectionState}</span>
                  </div>
                  <span className="text-gray-500">{messages.length} messages</span>
                  <span className="text-gray-500">{chatInfo.participant_count} members</span>
                  {onlineUsers.length > 0 && (
                    <span className="text-green-600">{onlineUsers.length} online</span>
                  )}
                  {typingUsers.length > 0 && (
                    <span className="text-blue-500">
                      {typingUsers.map(u => u.name).join(', ')} typing...
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {chatInfo.user_role === 'admin' && (
              <Button
                onClick={generateInviteCode}
                variant="ghost" 
                size="sm"
                disabled={isGeneratingInvite}
                className="text-blue-600 hover:text-blue-700"
              >
                {isGeneratingInvite ? 'Generating...' : 'Invite'}
              </Button>
            )}
            <Button
              onClick={handleLeaveChat}
              variant="ghost" 
              size="sm"
              className="text-orange-600 hover:text-orange-700"
            >
              Leave
            </Button>
            <Button
              onClick={handleLogout}
              variant="ghost" 
              size="sm"
              className="text-red-600 hover:text-red-700"
            >
              Logout
            </Button>
            <div className="flex items-center space-x-2">
              <div className="text-sm font-medium text-gray-900">
                {user.name}
              </div>
              {user.is_admin && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Admin
                </span>
              )}
              {chatInfo.user_role === 'admin' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Chat Admin
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Invite Code Modal */}
      {showInviteForm && inviteCode && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">Invite Code Generated</p>
              <p className="text-sm text-blue-700">Share this code: <strong>{inviteCode}</strong></p>
            </div>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(inviteCode)
                setShowInviteForm(false)
              }}
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-700"
            >
              Copy & Close
            </Button>
          </div>
        </div>
      )}

      {/* Messages */}
      <ChatList
        messages={messages}
        currentUserId={user.id}
        isLoading={isLoading}
        autoScroll={true}
        onLoadMore={loadMoreMessages}
        hasMoreMessages={hasMoreMessages}
        isLoadingMore={isLoadingMore}
      />

      {/* Typing Indicators */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-t">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
            </div>
            <span>
              {typingUsers.map(u => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        placeholder={`Type a message in ${chatInfo.name || 'this chat'}... (try mentioning @jimmy)`}
        disabled={connectionState !== 'connected'}
      />
    </div>
  )
}