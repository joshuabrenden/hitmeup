export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  is_admin: boolean;
  created_at: string;
  invited_by?: string;
}

export interface Conversation {
  id: string;
  name: string;
  created_by: string;
  invite_code: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  user_id?: string;
  content: string;
  message_type: 'user' | 'ai';
  ai_response_to?: string;
  created_at: string;
  user?: User;
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  joined_at: string;
  user?: User;
}

export interface Invitation {
  id: string;
  conversation_id: string;
  invite_code: string;
  created_by: string;
  expires_at: string;
  used_by?: string;
  used_at?: string;
}

export interface AIUsageLog {
  id: string;
  user_id: string;
  conversation_id: string;
  tokens_input: number;
  tokens_output: number;
  cost_cents: number;
  created_at: string;
}

export interface AppMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  metadata?: Record<string, any>;
  recorded_at: string;
}