import { renderHook, act, waitFor } from '@testing-library/react'
import { UserProvider, useUser } from '@/lib/contexts/UserContext'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } }))
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      insert: jest.fn()
    }))
  })
}))

const mockSupabase = {
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } }))
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    insert: jest.fn()
  }))
}

// Mock createClient to return our mock
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase
}))

describe('UserContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('User Authentication Flow', () => {
    it('should sign up a new user and create profile in database', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
      }

      // Mock successful signup
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null
      })

      // Mock successful profile insertion
      mockSupabase.from().insert.mockResolvedValue({
        data: null,
        error: null
      })

      // Mock profile fetch
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          is_admin: false,
          created_at: new Date().toISOString()
        },
        error: null
      })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <UserProvider>{children}</UserProvider>
      )

      const { result } = renderHook(() => useUser(), { wrapper })

      // Test signup
      await act(async () => {
        await result.current.signUp('test@example.com', 'password123', 'Test User')
      })

      // Verify Supabase auth.signUp was called
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })

      // Verify profile was created in database
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        is_admin: false
      })
    })

    it('should sign in existing user and fetch profile from database', async () => {
      // Mock successful login
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'existing-user-id', email: 'existing@example.com' } },
        error: null
      })

      // Mock profile fetch
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'existing-user-id',
          email: 'existing@example.com',
          name: 'Existing User',
          is_admin: true,
          created_at: new Date().toISOString()
        },
        error: null
      })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <UserProvider>{children}</UserProvider>
      )

      const { result } = renderHook(() => useUser(), { wrapper })

      // Test login
      await act(async () => {
        await result.current.login('existing@example.com', 'password123')
      })

      // Verify Supabase auth.signInWithPassword was called
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'existing@example.com',
        password: 'password123'
      })

      // Verify profile was fetched from database
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
      expect(mockSupabase.from().select).toHaveBeenCalledWith('*')
    })

    it('should handle authentication errors properly', async () => {
      // Mock auth error
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid credentials' }
      })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <UserProvider>{children}</UserProvider>
      )

      const { result } = renderHook(() => useUser(), { wrapper })

      // Test login error handling
      await expect(
        act(async () => {
          await result.current.login('wrong@example.com', 'wrongpassword')
        })
      ).rejects.toEqual({ message: 'Invalid credentials' })

      // User should remain null
      expect(result.current.user).toBeNull()
    })

    it('should sign out user and clear session', async () => {
      // Mock successful signout
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null
      })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <UserProvider>{children}</UserProvider>
      )

      const { result } = renderHook(() => useUser(), { wrapper })

      // Test logout
      await act(async () => {
        await result.current.logout()
      })

      // Verify Supabase auth.signOut was called
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()

      // User should be null after logout
      expect(result.current.user).toBeNull()
    })
  })

  describe('Session Management', () => {
    it('should restore user session on app load', async () => {
      // Mock existing session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'session-user-id' } } },
        error: null
      })

      // Mock profile fetch
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'session-user-id',
          email: 'session@example.com',
          name: 'Session User',
          is_admin: false,
          created_at: new Date().toISOString()
        },
        error: null
      })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <UserProvider>{children}</UserProvider>
      )

      const { result } = renderHook(() => useUser(), { wrapper })

      // Wait for session restoration
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Verify session was checked
      expect(mockSupabase.auth.getSession).toHaveBeenCalled()
    })
  })
})