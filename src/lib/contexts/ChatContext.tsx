'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Message, User } from '@/lib/supabase/types'
import { RealtimeChannel } from '@supabase/supabase-js'

interface OptimisticMessage extends Omit<Message, 'id' | 'created_at' | 'updated_at'> {
  id: string // temporary ID
  created_at: string
  updated_at: string
  isOptimistic: boolean
  error?: string
}

interface ChatContextType {
  messages: (Message & { user?: User })[]
  isLoading: boolean
  currentChatId: string | null
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error'
  onlineUsers: { userId: string; name: string }[]
  hasMoreMessages: boolean
  isLoadingMore: boolean
  sendMessage: (content: string, chatId: string, userId: string, user?: User) => Promise<void>
  loadMessages: (chatId: string) => Promise<void>
  loadMoreMessages: () => Promise<void>
  updateTyping: (chatId: string, userId: string, userName: string) => void
  trackPresence: (user: User) => void
  typingUsers: { userId: string; name: string }[]
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

interface ChatProviderProps {
  children: ReactNode
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [messages, setMessages] = useState<(Message & { user?: User })[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const [onlineUsers, setOnlineUsers] = useState<{ userId: string; name: string }[]>([])
  const [typingUsers, setTypingUsers] = useState<{ userId: string; name: string }[]>([])
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [oldestMessageId, setOldestMessageId] = useState<string | null>(null)
  
  // Create stable supabase client instance
  const supabase = useMemo(() => createClient(), [])

  // Setup real-time channel with broadcast and presence
  useEffect(() => {
    if (!currentChatId) {
      console.log('No currentChatId, skipping channel setup')
      if (channel) {
        supabase.removeChannel(channel)
        setChannel(null)
      }
      setConnectionState('disconnected')
      return
    }

    console.log('🚀 Setting up broadcast channel for chat:', currentChatId)
    setConnectionState('connecting')

    const channelName = `chat-${currentChatId}`
    const newChannel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false }, // Don't receive our own broadcasts
        presence: { key: 'user_id' }
      }
    })

    // Listen for new messages via broadcast
    newChannel
      .on('broadcast', { event: 'new_message' }, (payload) => {
        console.log('📨 Broadcast message received:', payload)
        const { message, user } = payload.payload
        
        const messageWithUser = {
          ...message,
          user: user || null
        }

        setMessages(prev => {
          // Remove any optimistic message with same temp ID
          const filtered = prev.filter(msg => {
            if (message.optimisticId && msg.id === message.optimisticId) {
              return false // Remove optimistic version
            }
            return msg.id !== message.id // Avoid actual duplicates
          })
          
          const newMessages = [...filtered, messageWithUser].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
          
          console.log('✅ Updated messages via broadcast, count:', newMessages.length)
          return newMessages
        })
      })

    // Listen for typing indicators via broadcast
    newChannel
      .on('broadcast', { event: 'typing' }, (payload) => {
        console.log('⌨️ Typing broadcast received:', payload)
        const { userId, userName, isTyping } = payload.payload
        
        setTypingUsers(prev => {
          const filtered = prev.filter(u => u.userId !== userId)
          if (isTyping) {
            return [...filtered, { userId, name: userName }]
          }
          return filtered
        })

        // Auto-remove typing indicator after 3 seconds
        if (isTyping) {
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(u => u.userId !== userId))
          }, 3000)
        }
      })

    // Handle presence for online users
    newChannel
      .on('presence', { event: 'sync' }, () => {
        console.log('👥 Presence sync')
        const state = newChannel.presenceState()
        const users = Object.entries(state).map(([userId, presence]: [string, any]) => ({
          userId,
          name: presence[0]?.name || 'Unknown'
        }))
        setOnlineUsers(users)
        console.log('Online users:', users)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('👋 User joined:', key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('👋 User left:', key, leftPresences)
      })

    // Subscribe to the channel
    newChannel.subscribe(async (status) => {
      console.log('📡 Channel status:', status)
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully connected to real-time channel')
        setConnectionState('connected')
        
        // Track presence for current user (if we have user context)
        // For now, we'll track presence when sendMessage is called with user info
        
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Real-time channel failed')
        setConnectionState('error')
      } else if (status === 'TIMED_OUT') {
        console.error('⏰ Channel connection timed out')
        setConnectionState('error')
      } else if (status === 'CLOSED') {
        console.log('🔌 Channel closed')
        setConnectionState('disconnected')
      }
    })

    setChannel(newChannel)

    return () => {
      console.log('🧹 Cleaning up broadcast channel for chat:', currentChatId)
      if (newChannel) {
        supabase.removeChannel(newChannel)
      }
      setConnectionState('disconnected')
      setOnlineUsers([])
      setTypingUsers([])
    }
  }, [currentChatId, supabase])

  const loadMessages = useCallback(async (chatId: string) => {
    setIsLoading(true)
    setCurrentChatId(chatId)
    setHasMoreMessages(false)
    setOldestMessageId(null)

    try {
      console.log('📥 Loading initial messages for chat:', chatId)
      
      // Load the most recent 50 messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (messagesError) {
        console.error('Error fetching messages:', messagesError)
        throw messagesError
      }

      console.log('Found messages:', messagesData?.length || 0)

      if (!messagesData || messagesData.length === 0) {
        setMessages([])
        setHasMoreMessages(false)
        return
      }

      // Check if there are more messages (if we got 50, there might be more)
      if (messagesData.length === 50) {
        const { data: countData, error: countError } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('chat_id', chatId)
        
        if (!countError && countData && countData.length > 50) {
          setHasMoreMessages(true)
        }
      }

      // Reverse to show oldest first (for display)
      const sortedMessages = messagesData.reverse()
      
      // Set oldest message ID for pagination
      if (sortedMessages.length > 0) {
        setOldestMessageId(sortedMessages[0].id)
      }

      // Get unique user IDs and fetch user data separately
      const userIds = Array.from(new Set(messagesData.filter(m => m.user_id).map(m => m.user_id)))
      let usersData = []
      
      if (userIds.length > 0) {
        console.log('Fetching user data for:', userIds)
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('*')
          .in('id', userIds)
        
        if (usersError) {
          console.error('Error fetching users:', usersError)
        } else {
          usersData = users || []
          console.log('Found users:', usersData.length)
        }
      }

      // Combine messages with user data
      const messagesWithUsers = sortedMessages.map(message => ({
        ...message,
        user: message.user_id ? usersData.find(u => u.id === message.user_id) : null
      }))

      console.log('✅ Setting initial messages:', messagesWithUsers.length)
      setMessages(messagesWithUsers)
    } catch (error) {
      console.error('Error loading messages:', error)
      setMessages([])
      setHasMoreMessages(false)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  const sendMessage = useCallback(async (content: string, chatId: string, userId: string, user?: User) => {
    if (!channel) {
      console.error('❌ No channel available for sending message')
      throw new Error('Not connected to chat')
    }

    const optimisticId = `temp-${Date.now()}-${Math.random()}`
    const timestamp = new Date().toISOString()
    
    // Create optimistic message for immediate UI update
    const optimisticMessage: Message & { user?: User } = {
      id: optimisticId,
      chat_id: chatId,
      user_id: userId,
      content,
      message_type: 'text',
      is_ai: false,
      reply_to: null,
      created_at: timestamp,
      updated_at: timestamp,
      user: user || undefined
    }

    console.log('💬 Sending message with optimistic update:', { content, chatId, userId })
    
    // Add optimistic message to UI immediately
    setMessages(prev => {
      const newMessages = [...prev, optimisticMessage].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      console.log('⚡ Added optimistic message, count:', newMessages.length)
      return newMessages
    })

    try {
      // Save to database
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          user_id: userId,
          content,
          message_type: 'text',
          is_ai: false
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Failed to save message to database:', error)
        // Remove optimistic message and show error
        setMessages(prev => prev.filter(msg => msg.id !== optimisticId))
        throw error
      }

      console.log('✅ Message saved to database:', data.id)

      // Broadcast the real message to other clients
      const messageForBroadcast = {
        ...data,
        optimisticId, // Include temp ID so clients can replace optimistic versions
        user: user || null
      }

      const broadcastResult = await channel.send({
        type: 'broadcast',
        event: 'new_message',
        payload: {
          message: messageForBroadcast,
          user: user || null
        }
      })

      if (broadcastResult !== 'ok') {
        console.warn('⚠️ Broadcast may have failed:', broadcastResult)
      } else {
        console.log('📡 Message broadcasted successfully')
      }

      // Replace optimistic message with real message
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== optimisticId)
        const messageWithUser = { ...data, user: user || null }
        const newMessages = [...filtered, messageWithUser].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        console.log('🔄 Replaced optimistic with real message')
        return newMessages
      })

      // Handle @jimmy mentions
      if (content.toLowerCase().includes('@jimmy')) {
        console.log('🤖 @jimmy mentioned, triggering AI response')
        setTimeout(() => {
          handleJimmyResponse(chatId)
        }, 1500)
      }

    } catch (error) {
      console.error('❌ Error in sendMessage:', error)
      // Optimistic message already removed above
      throw error
    }
  }, [channel, supabase])

  const handleJimmyResponse = useCallback(async (chatId: string) => {
    if (!channel) return

    try {
      console.log('🤖 Jimmy is typing...')
      
      // Add Jimmy's typing indicator to local state immediately (for sender)
      setTypingUsers(prev => {
        const filtered = prev.filter(u => u.userId !== 'jimmy-ai')
        return [...filtered, { userId: 'jimmy-ai', name: 'Jimmy (AI)' }]
      })
      
      // Send typing indicator for Jimmy to other clients
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: 'jimmy-ai',
          userName: 'Jimmy (AI)',
          isTyping: true,
          timestamp: Date.now()
        }
      })
      
      // Simulate Jimmy thinking/typing for 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      console.log('🤖 Sending Jimmy response...')
      
      const aiContent = `Hi! I'm Jimmy, your AI assistant. I noticed you mentioned me! This is a demo response using the new broadcast architecture. Full AI integration comes in Stage 4!`
      
      const { data: aiData, error: aiError } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          user_id: null,
          content: aiContent,
          message_type: 'ai',
          is_ai: true
        })
        .select()
        .single()
        
      if (aiError) {
        console.error('❌ Failed to send AI response:', aiError)
        return
      }

      console.log('✅ Jimmy response saved:', aiData.id)

      // Add Jimmy's response to local state immediately (for sender)
      const jimmyMessageWithUser = {
        ...aiData,
        user: null
      }

      setMessages(prev => {
        const newMessages = [...prev, jimmyMessageWithUser].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        console.log('🤖 Added Jimmy response to local state')
        return newMessages
      })

      // Broadcast AI response to other clients
      await channel.send({
        type: 'broadcast',
        event: 'new_message',
        payload: {
          message: aiData,
          user: null // AI messages have no user
        }
      })
      
      console.log('🤖 Jimmy response broadcasted to other clients')
      
      // Clear Jimmy's typing indicator from local state (for sender)
      setTypingUsers(prev => prev.filter(u => u.userId !== 'jimmy-ai'))
      
      // Clear Jimmy's typing indicator for other clients
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: 'jimmy-ai',
          userName: 'Jimmy (AI)',
          isTyping: false,
          timestamp: Date.now()
        }
      })
      
      console.log('🤖 Cleared Jimmy typing indicator')
      
    } catch (error) {
      console.error('❌ Error in Jimmy response:', error)
      
      // Clear typing indicator even on error
      setTypingUsers(prev => prev.filter(u => u.userId !== 'jimmy-ai'))
      
      if (channel) {
        await channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            userId: 'jimmy-ai',
            userName: 'Jimmy (AI)',
            isTyping: false,
            timestamp: Date.now()
          }
        })
      }
    }
  }, [channel, supabase])

  const updateTyping = useCallback((chatId: string, userId: string, userName: string) => {
    if (!channel) {
      console.warn('⚠️ No channel available for typing indicator')
      return
    }

    try {
      // Broadcast typing indicator (much faster than database)
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId,
          userName,
          isTyping: true,
          timestamp: Date.now()
        }
      })
      
      console.log('⌨️ Typing indicator sent via broadcast')
    } catch (error) {
      console.error('❌ Error sending typing indicator:', error)
    }
  }, [channel])

  const loadMoreMessages = useCallback(async () => {
    if (!currentChatId || !oldestMessageId || isLoadingMore || !hasMoreMessages) {
      console.warn('⚠️ Cannot load more messages:', { 
        currentChatId, 
        oldestMessageId, 
        isLoadingMore, 
        hasMoreMessages 
      })
      return
    }

    setIsLoadingMore(true)

    try {
      console.log('📥 Loading more messages before:', oldestMessageId)

      // Get the timestamp of the oldest message for comparison
      const { data: oldestMessage } = await supabase
        .from('messages')
        .select('created_at')
        .eq('id', oldestMessageId)
        .single()

      if (!oldestMessage) {
        console.error('Could not find oldest message')
        setHasMoreMessages(false)
        return
      }

      // Load 20 more messages older than the current oldest
      const { data: olderMessages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', currentChatId)
        .lt('created_at', oldestMessage.created_at)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Error loading more messages:', error)
        throw error
      }

      console.log('📥 Found older messages:', olderMessages?.length || 0)

      if (!olderMessages || olderMessages.length === 0) {
        setHasMoreMessages(false)
        return
      }

      // Reverse to show oldest first
      const sortedOlderMessages = olderMessages.reverse()

      // Update oldest message ID
      setOldestMessageId(sortedOlderMessages[0].id)

      // Check if there are even more messages
      if (olderMessages.length < 20) {
        setHasMoreMessages(false)
      }

      // Get user data for the new messages
      const userIds = Array.from(new Set(olderMessages.filter(m => m.user_id).map(m => m.user_id)))
      let usersData = []
      
      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('*')
          .in('id', userIds)
        
        if (!usersError) {
          usersData = users || []
        }
      }

      // Combine older messages with user data
      const olderMessagesWithUsers = sortedOlderMessages.map(message => ({
        ...message,
        user: message.user_id ? usersData.find(u => u.id === message.user_id) : null
      }))

      // Prepend older messages to the current messages
      setMessages(prev => [...olderMessagesWithUsers, ...prev])
      
      console.log('✅ Added older messages:', olderMessagesWithUsers.length)
    } catch (error) {
      console.error('❌ Error loading more messages:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [currentChatId, oldestMessageId, isLoadingMore, hasMoreMessages, supabase])

  const trackPresence = useCallback((user: User) => {
    if (!channel || connectionState !== 'connected') {
      console.warn('⚠️ Cannot track presence: no channel or not connected')
      return
    }

    try {
      // Track user presence
      channel.track({
        user_id: user.id,
        name: user.name,
        online_at: new Date().toISOString()
      })
      
      console.log('👤 Tracking presence for:', user.name)
    } catch (error) {
      console.error('❌ Error tracking presence:', error)
    }
  }, [channel, connectionState])

  const value: ChatContextType = {
    messages,
    isLoading,
    currentChatId,
    connectionState,
    onlineUsers,
    hasMoreMessages,
    isLoadingMore,
    sendMessage,
    loadMessages,
    loadMoreMessages,
    updateTyping,
    trackPresence,
    typingUsers
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}