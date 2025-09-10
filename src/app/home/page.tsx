'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, Card, CardContent } from '@/components/ui'
import { useUser } from '@/lib/contexts/UserContext'
import { createClient } from '@/lib/supabase/client'

interface UserChat {
  id: string
  name: string | null
  is_group: boolean
  created_at: string
  participant_count: number
  last_message: string | null
  last_message_at: string | null
}

export default function HomePage() {
  const router = useRouter()
  const { user, isLoading: isUserLoading, logout } = useUser()
  const [userChats, setUserChats] = useState<UserChat[]>([])
  const [isLoadingChats, setIsLoadingChats] = useState(true)
  const [showCreateChat, setShowCreateChat] = useState(false)
  const [showJoinChat, setShowJoinChat] = useState(false)
  const [newChatName, setNewChatName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const supabase = createClient()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login')
    }
  }, [user, isUserLoading, router])

  // Load user's chats
  useEffect(() => {
    if (user) {
      loadUserChats()
    }
  }, [user])

  const loadUserChats = async () => {
    if (!user) return

    try {
      setIsLoadingChats(true)
      console.log('🔍 Loading chats for user:', user.id)

      const { data, error } = await supabase
        .from('chat_participants')
        .select(`
          chat_id,
          chats (
            id,
            name,
            is_group,
            created_at
          )
        `)
        .eq('user_id', user.id)

      if (error) {
        console.error('❌ Error loading user chats:', error)
        throw error
      }

      console.log('✅ Raw chat data:', data)

      // Transform the data and get additional info for each chat
      const chatPromises = data.map(async (item: any) => {
        const chat = item.chats
        
        // Get participant count
        const { count: participantCount } = await supabase
          .from('chat_participants')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chat.id)

        // Get last message
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        return {
          id: chat.id,
          name: chat.name,
          is_group: chat.is_group,
          created_at: chat.created_at,
          participant_count: participantCount || 0,
          last_message: lastMessage?.content || null,
          last_message_at: lastMessage?.created_at || null
        }
      })

      const chatsWithInfo = await Promise.all(chatPromises)
      console.log('✅ Processed chats:', chatsWithInfo)
      setUserChats(chatsWithInfo)
    } catch (error) {
      console.error('❌ Failed to load chats:', error)
      setError('Failed to load your chats')
    } finally {
      setIsLoadingChats(false)
    }
  }

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newChatName.trim()) return

    setIsSubmitting(true)
    setError('')

    try {
      console.log('🆕 Creating new chat:', newChatName)

      // Create the chat
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({
          name: newChatName.trim(),
          is_group: true,
          created_by: user.id
        })
        .select()
        .single()

      if (chatError) {
        console.error('❌ Error creating chat:', chatError)
        throw chatError
      }

      console.log('✅ Chat created:', chat)

      // Add user as admin to the chat
      const { error: participantError } = await supabase
        .from('chat_participants')
        .insert({
          chat_id: chat.id,
          user_id: user.id,
          role: 'admin'
        })

      if (participantError) {
        console.error('❌ Error adding user to chat:', participantError)
        throw participantError
      }

      console.log('✅ User added as admin to chat')

      // Refresh chat list
      await loadUserChats()
      
      // Reset form
      setNewChatName('')
      setShowCreateChat(false)

      // Navigate to the new chat
      router.push(`/chat/${chat.id}`)
    } catch (error: any) {
      console.error('❌ Failed to create chat:', error)
      setError(error.message || 'Failed to create chat')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleJoinChat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !inviteCode.trim()) return

    setIsSubmitting(true)
    setError('')

    try {
      console.log('🔗 Joining chat with invite code:', inviteCode)

      // Find and validate the invite
      const { data: invite, error: inviteError } = await supabase
        .from('invites')
        .select('*')
        .eq('code', inviteCode.trim())
        .is('used_by', null)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (inviteError || !invite) {
        throw new Error('Invalid or expired invite code')
      }

      console.log('✅ Valid invite found:', invite)

      // Check if user is already in the chat
      const { data: existingParticipant } = await supabase
        .from('chat_participants')
        .select('id')
        .eq('chat_id', invite.chat_id)
        .eq('user_id', user.id)
        .single()

      if (existingParticipant) {
        throw new Error('You are already in this chat')
      }

      // Add user to the chat
      const { error: participantError } = await supabase
        .from('chat_participants')
        .insert({
          chat_id: invite.chat_id,
          user_id: user.id,
          role: 'member'
        })

      if (participantError) {
        console.error('❌ Error joining chat:', participantError)
        throw participantError
      }

      // Mark invite as used
      const { error: updateError } = await supabase
        .from('invites')
        .update({
          used_by: user.id,
          used_at: new Date().toISOString()
        })
        .eq('id', invite.id)

      if (updateError) {
        console.error('⚠️ Error marking invite as used:', updateError)
        // Don't throw here - user successfully joined
      }

      console.log('✅ Successfully joined chat')

      // Refresh chat list
      await loadUserChats()
      
      // Reset form
      setInviteCode('')
      setShowJoinChat(false)

      // Navigate to the joined chat
      router.push(`/chat/${invite.chat_id}`)
    } catch (error: any) {
      console.error('❌ Failed to join chat:', error)
      setError(error.message || 'Failed to join chat')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  // Show loading while checking authentication
  if (isUserLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect if not authenticated
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">HitMeUp</h1>
            <p className="text-sm text-gray-600">Welcome back, {user.name}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleLogout}
              variant="ghost" 
              size="sm"
              className="text-red-600 hover:text-red-700"
            >
              Logout
            </Button>
            <Link href="/">
              <Button variant="ghost" size="sm">
                Home
              </Button>
            </Link>
            {user.is_admin && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Admin
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-8 flex flex-wrap gap-4">
          <Button
            onClick={() => setShowCreateChat(true)}
            variant="primary"
            className="flex-1 min-w-[200px]"
          >
            🆕 Create New Chat
          </Button>
          <Button
            onClick={() => setShowJoinChat(true)}
            variant="secondary"
            className="flex-1 min-w-[200px]"
          >
            🔗 Join with Invite Code
          </Button>
        </div>

        {/* Create Chat Form */}
        {showCreateChat && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Create New Chat</h3>
              <form onSubmit={handleCreateChat} className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Chat name"
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting || !newChatName.trim()}
                  >
                    {isSubmitting ? 'Creating...' : 'Create Chat'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowCreateChat(false)
                      setNewChatName('')
                      setError('')
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Join Chat Form */}
        {showJoinChat && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Join Chat with Invite Code</h3>
              <form onSubmit={handleJoinChat} className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Enter invite code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting || !inviteCode.trim()}
                  >
                    {isSubmitting ? 'Joining...' : 'Join Chat'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowJoinChat(false)
                      setInviteCode('')
                      setError('')
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* User's Chats */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Chats</h2>
          
          {isLoadingChats ? (
            <div className="text-center py-8">
              <svg className="animate-spin h-6 w-6 text-blue-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-gray-500">Loading your chats...</p>
            </div>
          ) : userChats.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No chats yet</h3>
                <p className="text-gray-600 mb-4">
                  You're not in any chat rooms yet. Create a new chat or join one with an invite code to get started!
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button
                    onClick={() => setShowCreateChat(true)}
                    variant="primary"
                  >
                    Create Your First Chat
                  </Button>
                  <Button
                    onClick={() => setShowJoinChat(true)}
                    variant="secondary"
                  >
                    Join with Code
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {userChats.map((chat) => (
                <Card key={chat.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 mb-1">
                          {chat.name || 'Unnamed Chat'}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                          <span>{chat.participant_count} {chat.participant_count === 1 ? 'member' : 'members'}</span>
                          <span>Created {new Date(chat.created_at).toLocaleDateString()}</span>
                        </div>
                        {chat.last_message && (
                          <p className="text-sm text-gray-600 mb-2 truncate">
                            Last: {chat.last_message}
                          </p>
                        )}
                      </div>
                      <Link href={`/chat/${chat.id}`}>
                        <Button variant="primary" size="sm">
                          Open Chat
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}