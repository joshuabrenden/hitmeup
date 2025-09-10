export interface User {
  id: string
  email: string
  name: string
  created_at: string
  is_admin: boolean
  avatar_url?: string
}

export interface Chat {
  id: string
  name?: string
  is_group: boolean
  created_at: string
  created_by: string
}

export interface ChatParticipant {
  chat_id: string
  user_id: string
  joined_at: string
  role: 'admin' | 'member'
}

export interface Message {
  id: string
  chat_id: string
  user_id: string | null
  content: string
  created_at: string
  updated_at: string
  is_ai: boolean
  message_type: 'text' | 'system' | 'ai'
  reply_to: string | null
}

export interface Invite {
  id: string
  code: string
  created_by: string
  used_by?: string
  created_at: string
  used_at?: string
  expires_at: string
}

export interface UserTyping {
  chat_id: string
  user_id: string
  last_typed_at: string
}

// Supabase Database Types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Omit<User, 'id' | 'created_at'>
        Update: Partial<Omit<User, 'id' | 'created_at'>>
      }
      chats: {
        Row: Chat
        Insert: Omit<Chat, 'id' | 'created_at'>
        Update: Partial<Omit<Chat, 'id' | 'created_at'>>
      }
      chat_participants: {
        Row: ChatParticipant
        Insert: Omit<ChatParticipant, 'joined_at'>
        Update: Partial<Omit<ChatParticipant, 'joined_at'>>
      }
      messages: {
        Row: Message
        Insert: Omit<Message, 'id' | 'created_at'>
        Update: Partial<Omit<Message, 'id' | 'created_at'>>
      }
      invites: {
        Row: Invite
        Insert: Omit<Invite, 'id' | 'created_at'>
        Update: Partial<Omit<Invite, 'id' | 'created_at'>>
      }
      user_typing: {
        Row: UserTyping
        Insert: UserTyping
        Update: Partial<UserTyping>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}