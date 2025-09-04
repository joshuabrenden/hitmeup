export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          display_name: string
          avatar_url: string | null
          is_admin: boolean
          created_at: string
          invited_by: string | null
        }
        Insert: {
          id: string
          email: string
          display_name: string
          avatar_url?: string | null
          is_admin?: boolean
          created_at?: string
          invited_by?: string | null
        }
        Update: {
          id?: string
          email?: string
          display_name?: string
          avatar_url?: string | null
          is_admin?: boolean
          created_at?: string
          invited_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      conversations: {
        Row: {
          id: string
          name: string
          created_by: string
          invite_code: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by: string
          invite_code: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          invite_code?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          user_id: string | null
          content: string
          message_type: string
          ai_response_to: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id?: string | null
          content: string
          message_type?: string
          ai_response_to?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          user_id?: string | null
          content?: string
          message_type?: string
          ai_response_to?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_ai_response_to_fkey"
            columns: ["ai_response_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          conversation_id: string
          user_id: string
          joined_at?: string
        }
        Update: {
          conversation_id?: string
          user_id?: string
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      invitations: {
        Row: {
          id: string
          conversation_id: string
          invite_code: string
          created_by: string
          expires_at: string
          used_by: string | null
          used_at: string | null
        }
        Insert: {
          id?: string
          conversation_id: string
          invite_code: string
          created_by: string
          expires_at: string
          used_by?: string | null
          used_at?: string | null
        }
        Update: {
          id?: string
          conversation_id?: string
          invite_code?: string
          created_by?: string
          expires_at?: string
          used_by?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      ai_usage_logs: {
        Row: {
          id: string
          user_id: string
          conversation_id: string
          tokens_input: number
          tokens_output: number
          cost_cents: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          conversation_id: string
          tokens_input: number
          tokens_output: number
          cost_cents: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          conversation_id?: string
          tokens_input?: number
          tokens_output?: number
          cost_cents?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      app_metrics: {
        Row: {
          id: string
          metric_name: string
          metric_value: number
          metadata: Json | null
          recorded_at: string
        }
        Insert: {
          id?: string
          metric_name: string
          metric_value: number
          metadata?: Json | null
          recorded_at?: string
        }
        Update: {
          id?: string
          metric_name?: string
          metric_value?: number
          metadata?: Json | null
          recorded_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invite_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}