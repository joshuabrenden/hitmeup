'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'

interface UserContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

interface UserProviderProps {
  children: ReactNode
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    console.log('🚀 UserContext initializing...')
    
    // Set a timeout to ensure loading doesn't hang forever
    const timeoutId = setTimeout(() => {
      console.log('⏰ UserContext timeout - forcing isLoading to false')
      setIsLoading(false)
    }, 10000) // 10 second timeout

    // Check for existing session
    checkUser().finally(() => {
      clearTimeout(timeoutId)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', event, session?.user?.id)
      try {
        if (session?.user) {
          await fetchUserProfile(session.user.id)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('❌ Error in auth state change:', error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    })

    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const checkUser = async () => {
    try {
      console.log('🔍 Checking user session...')
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('❌ Error getting session:', error)
        throw error
      }
      
      if (session?.user) {
        console.log('✅ Session found, fetching profile for:', session.user.id)
        await fetchUserProfile(session.user.id)
      } else {
        console.log('ℹ️ No session found')
        setUser(null)
      }
    } catch (error) {
      console.error('❌ Error checking user:', error)
      setUser(null)
    } finally {
      console.log('✅ checkUser completed, setting isLoading to false')
      setIsLoading(false)
    }
  }

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('👤 Fetching user profile for:', userId)
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      )
      
      const fetchPromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any

      if (error) {
        console.error('❌ Error fetching user profile:', error)
        throw error
      }
      
      console.log('✅ User profile fetched:', data)
      setUser(data)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (errorMessage === 'Profile fetch timeout') {
        console.warn('⚠️ Profile fetch timeout (background refresh)')
      } else {
        console.error('❌ fetchUserProfile failed:', error)
      }
      // Don't clear user on timeout - might be background refresh
      if (errorMessage !== 'Profile fetch timeout') {
        setUser(null)
      }
    }
  }

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      console.log('🔑 Attempting login for:', email)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('❌ Login error:', error)
        throw error
      }

      console.log('✅ Login successful, fetching profile...')
      if (data.user) {
        await fetchUserProfile(data.user.id)
      }
      setIsLoading(false)
    } catch (error) {
      console.error('❌ Login failed:', error)
      setIsLoading(false)
      throw error
    }
  }

  const signUp = async (email: string, password: string, name: string) => {
    setIsLoading(true)
    try {
      console.log('🆕 Attempting signup for:', email)
      // First, sign up the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      })

      if (error) {
        console.error('❌ Signup error:', error)
        throw error
      }

      console.log('✅ Supabase auth signup successful:', data.user?.id)

      if (data.user) {
        console.log('📝 Creating user profile in database...')
        // Create user profile
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email,
            name,
            is_admin: false
          })

        if (profileError) {
          console.error('❌ Profile creation error:', profileError)
          throw profileError
        }

        console.log('✅ Profile created, fetching user data...')
        await fetchUserProfile(data.user.id)
      }
      setIsLoading(false)
      console.log('✅ Signup complete!')
    } catch (error) {
      console.error('❌ Signup failed:', error)
      setIsLoading(false)
      throw error
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
    } catch (error) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const value: UserContextType = {
    user,
    isLoading,
    login,
    logout,
    signUp
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}