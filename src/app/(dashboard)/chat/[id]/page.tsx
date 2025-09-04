'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { Database } from '@/lib/supabase/types';

type Message = Database['public']['Tables']['messages']['Row'] & {
  user?: Database['public']['Tables']['users']['Row'];
};

type Conversation = Database['public']['Tables']['conversations']['Row'];
type ConversationParticipant = Database['public']['Tables']['conversation_participants']['Row'] & {
  user: Database['public']['Tables']['users']['Row'];
};

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [participants, setParticipants] = useState<ConversationParticipant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();
  const conversationId = params.id as string;

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/');
      return;
    }

    loadConversationData();
    subscribeToMessages();

    return () => {
      // Cleanup subscriptions
    };
  }, [conversationId, user, authLoading]);

  const loadConversationData = async () => {
    try {
      // Load conversation details
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError || !convData) {
        setError('Conversation not found');
        return;
      }

      // Check if user is a participant
      const { data: participantCheck } = await supabase
        .from('conversation_participants')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', user!.id)
        .single();

      if (!participantCheck) {
        setError('You are not a member of this conversation');
        return;
      }

      setConversation(convData);

      // Load participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('conversation_participants')
        .select(`
          *,
          user:users(*)
        `)
        .eq('conversation_id', conversationId);

      if (!participantsError && participantsData) {
        setParticipants(participantsData as ConversationParticipant[]);
      }

      // Load messages
      await loadMessages();
    } catch (err) {
      setError('Failed to load conversation');
      console.error('Error loading conversation:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        user:users(*)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (!error && data) {
      setMessages(data as Message[]);
    }
  };

  const subscribeToMessages = () => {
    const subscription = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !user) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          content: newMessage.trim(),
          message_type: 'user',
        });

      if (error) {
        throw error;
      }

      setNewMessage('');
      
      // Check if @Jimmy was mentioned
      if (newMessage.toLowerCase().includes('@jimmy')) {
        await handleJimmyMention(newMessage.trim());
      }
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleJimmyMention = async (message: string) => {
    try {
      // Get recent messages for context
      const recentMessages = messages
        .slice(-5)
        .map(m => `${m.user?.display_name || 'User'}: ${m.content}`)
        .concat([`${profile?.display_name || 'You'}: ${message}`]);

      const response = await fetch('/api/ai/jimmy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversationId,
          context: recentMessages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      // The AI response will be inserted via the API and appear through the subscription
    } catch (err) {
      console.error('Error getting Jimmy response:', err);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-brutal-white p-8 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-2xl font-bold uppercase">LOADING CHAT...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-brutal-white p-8 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-2xl font-bold uppercase text-brutal-red mb-4">
              {error}
            </div>
            <Button onClick={() => router.push('/')} variant="outline">
              BACK TO HOME
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brutal-white">
      {/* Header */}
      <div className="border-b-4 border-brutal-black bg-brutal-yellow p-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold uppercase text-brutal-black">
              {conversation?.name}
            </h1>
            <div className="flex gap-2 mt-2">
              {participants.map((participant) => (
                <Badge key={participant.user_id} variant="outline">
                  {participant.user.display_name}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            {profile?.is_admin && (
              <Button
                variant="secondary"
                onClick={() => router.push('/admin')}
              >
                ADMIN
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => router.push('/')}
            >
              LEAVE
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="mx-auto max-w-4xl p-4 space-y-4">
        <div className="space-y-4 min-h-[60vh] max-h-[60vh] overflow-y-auto">
          {messages.map((message) => (
            <Card 
              key={message.id}
              className={message.message_type === 'ai' ? 'bg-brutal-cyan' : ''}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={message.message_type === 'ai' ? 'secondary' : 'default'}
                    >
                      {message.message_type === 'ai' ? 'JIMMY' : message.user?.display_name || 'Unknown'}
                    </Badge>
                    <span className="text-sm text-brutal-black/60">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <p className="text-brutal-black whitespace-pre-wrap">
                  {message.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Message Input */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <Textarea
                placeholder="Type your message... (mention @Jimmy for AI help)"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={sending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <div className="flex justify-between items-center">
                <p className="text-sm text-brutal-black/60">
                  Press Enter to send, Shift+Enter for new line
                </p>
                <Button 
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                >
                  {sending ? 'SENDING...' : 'SEND MESSAGE'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}