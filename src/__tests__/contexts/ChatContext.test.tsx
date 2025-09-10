import { renderHook, act, waitFor } from '@testing-library/react'
import { ChatProvider, useChat } from '@/lib/contexts/ChatContext'

// Create mock functions that we can access in tests
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  track: jest.fn().mockReturnThis(),
  untrack: jest.fn().mockReturnThis(),
  subscribe: jest.fn(() => Promise.resolve('SUBSCRIBED')),
  send: jest.fn(() => Promise.resolve()),
  unsubscribe: jest.fn(() => Promise.resolve())
}

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn().mockResolvedValue({ data: [], error: null })
        })),
        lt: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn().mockResolvedValue({ data: [], error: null })
          }))
        }))
      }))
    })),
    insert: jest.fn().mockResolvedValue({ data: [], error: null }),
    upsert: jest.fn().mockResolvedValue({ data: [], error: null })
  })),
  channel: jest.fn(() => mockChannel),
  removeChannel: jest.fn()
}

// Mock Supabase client with real-time functionality
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase
}))

describe('ChatContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Real-time Message Delivery', () => {
    it('should send message and broadcast to all clients', async () => {
      const mockMessage = {
        id: 'msg-1',
        content: 'Test message',
        user_id: 'user-1',
        chat_id: 'chat-1',
        created_at: new Date().toISOString(),
        is_ai: false
      }

      // Mock successful message insertion
      mockSupabase.from().insert.mockResolvedValue({
        data: [mockMessage],
        error: null
      })

      // Mock broadcast functionality
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        track: jest.fn().mockReturnThis(),
        untrack: jest.fn().mockReturnThis(),
        subscribe: jest.fn(() => Promise.resolve('SUBSCRIBED')),
        send: jest.fn(() => Promise.resolve()),
        unsubscribe: jest.fn(() => Promise.resolve())
      }
      mockSupabase.channel.mockReturnValue(mockChannel)

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ChatProvider>{children}</ChatProvider>
      )

      const { result } = renderHook(() => useChat(), { wrapper })

      // Test message sending
      await act(async () => {
        await result.current.sendMessage(
          'Test message',
          'chat-1',
          'user-1',
          { id: 'user-1', name: 'Test User', email: 'test@example.com', is_admin: false, created_at: new Date().toISOString() }
        )
      })

      // Verify message was inserted into database
      expect(mockSupabase.from).toHaveBeenCalledWith('messages')
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        content: 'Test message',
        chat_id: 'chat-1',
        user_id: 'user-1',
        is_ai: false
      })

      // Verify broadcast was sent
      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'new_message',
        payload: expect.objectContaining({
          content: 'Test message',
          chat_id: 'chat-1',
          user_id: 'user-1'
        })
      })
    })

    it('should receive broadcast messages from other clients', async () => {
      const mockIncomingMessage = {
        id: 'msg-2',
        content: 'Message from another client',
        user_id: 'user-2',
        chat_id: 'chat-1',
        created_at: new Date().toISOString(),
        is_ai: false,
        user: { name: 'Other User', email: 'other@example.com' }
      }

      // Mock channel with broadcast listener
      const mockChannel = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'broadcast' && callback) {
            // Simulate receiving a broadcast message
            setTimeout(() => {
              callback({
                event: 'new_message',
                payload: mockIncomingMessage
              })
            }, 100)
          }
          return mockChannel
        }),
        track: jest.fn().mockReturnThis(),
        untrack: jest.fn().mockReturnThis(),
        subscribe: jest.fn(() => Promise.resolve('SUBSCRIBED')),
        send: jest.fn(() => Promise.resolve()),
        unsubscribe: jest.fn(() => Promise.resolve())
      }
      mockSupabase.channel.mockReturnValue(mockChannel)

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ChatProvider>{children}</ChatProvider>
      )

      const { result } = renderHook(() => useChat(), { wrapper })

      // Load messages for a chat (this will set up the broadcast listener)
      await act(async () => {
        await result.current.loadMessages('chat-1')
      })

      // Wait for broadcast message to be received
      await waitFor(() => {
        expect(result.current.messages).toContainEqual(
          expect.objectContaining({
            content: 'Message from another client',
            user_id: 'user-2'
          })
        )
      }, { timeout: 500 })

      // Verify broadcast listener was set up
      expect(mockChannel.on).toHaveBeenCalledWith('broadcast', expect.any(Function))
    })

    it('should handle Jimmy AI responses with typing indicators', async () => {
      const userMessage = 'Hello @jimmy how are you?'
      const aiResponse = {
        id: 'ai-msg-1',
        content: 'Hello! I am doing well, thank you for asking!',
        user_id: 'jimmy-ai',
        chat_id: 'chat-1',
        created_at: new Date().toISOString(),
        is_ai: true,
        user: { name: 'Jimmy (AI)', email: null }
      }

      // Mock message insertion for user message
      mockSupabase.from().insert.mockResolvedValueOnce({
        data: [{ id: 'msg-1', content: userMessage, user_id: 'user-1', chat_id: 'chat-1' }],
        error: null
      })

      // Mock AI response insertion
      mockSupabase.from().insert.mockResolvedValueOnce({
        data: [aiResponse],
        error: null
      })

      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        track: jest.fn().mockReturnThis(),
        untrack: jest.fn().mockReturnThis(),
        subscribe: jest.fn(() => Promise.resolve('SUBSCRIBED')),
        send: jest.fn(() => Promise.resolve()),
        unsubscribe: jest.fn(() => Promise.resolve())
      }
      mockSupabase.channel.mockReturnValue(mockChannel)

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ChatProvider>{children}</ChatProvider>
      )

      const { result } = renderHook(() => useChat(), { wrapper })

      // Send message with @jimmy mention
      await act(async () => {
        await result.current.sendMessage(
          userMessage,
          'chat-1',
          'user-1',
          { id: 'user-1', name: 'Test User', email: 'test@example.com', is_admin: false, created_at: new Date().toISOString() }
        )
      })

      // Verify typing indicator was broadcast for Jimmy
      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: 'jimmy-ai',
          name: 'Jimmy (AI)',
          chatId: 'chat-1',
          isTyping: true
        }
      })

      // Verify AI response was processed and broadcast
      await waitFor(() => {
        expect(mockSupabase.from().insert).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.stringContaining('Hello'),
            user_id: 'jimmy-ai',
            is_ai: true
          })
        )
      }, { timeout: 5000 }) // AI responses may take a few seconds
    })
  })

  describe('Message Pagination', () => {
    it('should load recent messages on chat open', async () => {
      const mockMessages = [
        { id: 'msg-1', content: 'First message', created_at: '2025-09-10T10:00:00Z' },
        { id: 'msg-2', content: 'Second message', created_at: '2025-09-10T10:01:00Z' },
        { id: 'msg-3', content: 'Third message', created_at: '2025-09-10T10:02:00Z' }
      ]

      // Mock recent messages query
      mockSupabase.from().select().eq().order().limit.mockResolvedValue({
        data: mockMessages,
        error: null
      })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ChatProvider>{children}</ChatProvider>
      )

      const { result } = renderHook(() => useChat(), { wrapper })

      // Load messages for chat
      await act(async () => {
        await result.current.loadMessages('chat-1')
      })

      // Verify query was made for recent messages
      expect(mockSupabase.from).toHaveBeenCalledWith('messages')
      expect(mockSupabase.from().select).toHaveBeenCalledWith(`
        *,
        user:users(name, email, avatar_url)
      `)

      // Verify messages were loaded
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(3)
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should load more older messages when requested', async () => {
      const olderMessages = [
        { id: 'msg-old-1', content: 'Older message 1', created_at: '2025-09-10T09:58:00Z' },
        { id: 'msg-old-2', content: 'Older message 2', created_at: '2025-09-10T09:59:00Z' }
      ]

      // Mock older messages query
      mockSupabase.from().select().eq().lt().order().limit.mockResolvedValue({
        data: olderMessages,
        error: null
      })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ChatProvider>{children}</ChatProvider>
      )

      const { result } = renderHook(() => useChat(), { wrapper })

      // Simulate having some existing messages
      await act(async () => {
        // First load recent messages
        await result.current.loadMessages('chat-1')
      })

      // Load more messages
      await act(async () => {
        await result.current.loadMoreMessages()
      })

      // Verify older messages query was made
      expect(mockSupabase.from().select().eq().lt().order().limit).toHaveBeenCalled()

      // Verify isLoadingMore state was managed
      expect(result.current.isLoadingMore).toBe(false)
    })
  })

  describe('Typing Indicators', () => {
    it('should broadcast and receive typing indicators', async () => {
      const mockChannel = {
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'broadcast' && callback) {
            // Simulate receiving typing indicator
            setTimeout(() => {
              callback({
                event: 'typing',
                payload: {
                  userId: 'user-2',
                  name: 'Other User',
                  chatId: 'chat-1',
                  isTyping: true
                }
              })
            }, 100)
          }
          return mockChannel
        }),
        track: jest.fn().mockReturnThis(),
        untrack: jest.fn().mockReturnThis(),
        subscribe: jest.fn(() => Promise.resolve('SUBSCRIBED')),
        send: jest.fn(() => Promise.resolve()),
        unsubscribe: jest.fn(() => Promise.resolve())
      }
      mockSupabase.channel.mockReturnValue(mockChannel)

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ChatProvider>{children}</ChatProvider>
      )

      const { result } = renderHook(() => useChat(), { wrapper })

      // Set up chat subscription
      await act(async () => {
        await result.current.loadMessages('chat-1')
      })

      // Send typing indicator
      await act(async () => {
        result.current.updateTyping('chat-1', 'user-1', 'Test User')
      })

      // Verify typing was broadcast
      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: 'user-1',
          name: 'Test User',
          chatId: 'chat-1',
          isTyping: true
        }
      })

      // Wait for incoming typing indicator
      await waitFor(() => {
        expect(result.current.typingUsers).toContainEqual(
          expect.objectContaining({
            userId: 'user-2',
            name: 'Other User'
          })
        )
      }, { timeout: 500 })
    })
  })
})