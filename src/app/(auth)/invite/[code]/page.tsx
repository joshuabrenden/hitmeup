'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface InviteData {
  id: string;
  conversation_id: string;
  invite_code: string;
  expires_at: string;
  used_by: string | null;
  conversation: {
    name: string;
    created_by: string;
  };
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [joiningLoading, setJoiningLoading] = useState(false);
  const supabase = createClient();

  const inviteCode = params.code as string;

  useEffect(() => {
    async function checkInvite() {
      if (!inviteCode) return;

      try {
        const { data, error } = await supabase
          .from('invitations')
          .select(`
            *,
            conversation:conversations(name, created_by)
          `)
          .eq('invite_code', inviteCode)
          .single();

        if (error || !data) {
          setError('Invalid or expired invitation link');
          return;
        }

        // Check if invitation is expired
        const expiresAt = new Date(data.expires_at);
        if (expiresAt < new Date()) {
          setError('This invitation has expired');
          return;
        }

        // Check if invitation is already used
        if (data.used_by) {
          setError('This invitation has already been used');
          return;
        }

        setInviteData(data as InviteData);
      } catch (err) {
        setError('Failed to load invitation');
        console.error('Error checking invite:', err);
      } finally {
        setLoading(false);
      }
    }

    checkInvite();
  }, [inviteCode, supabase]);

  const handleJoinConversation = async () => {
    if (!inviteData || !displayName.trim()) return;

    setJoiningLoading(true);
    try {
      // Create user account (anonymous-like but with display name)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: `${inviteCode}-${Date.now()}@invite.hitmeup.app`,
        password: Math.random().toString(36).substring(2, 15),
        options: {
          data: {
            display_name: displayName.trim(),
          }
        }
      });

      if (authError || !authData.user) {
        throw new Error('Failed to create account');
      }

      // Add user to conversation
      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: inviteData.conversation_id,
          user_id: authData.user.id,
        });

      if (participantError) {
        throw new Error('Failed to join conversation');
      }

      // Mark invitation as used
      const { error: updateError } = await supabase
        .from('invitations')
        .update({
          used_by: authData.user.id,
          used_at: new Date().toISOString(),
        })
        .eq('id', inviteData.id);

      if (updateError) {
        console.error('Failed to mark invitation as used:', updateError);
      }

      // Redirect to chat
      router.push(`/chat/${inviteData.conversation_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join conversation');
      console.error('Error joining conversation:', err);
    } finally {
      setJoiningLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brutal-white p-8 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-2xl font-bold uppercase">LOADING...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !inviteData) {
    return (
      <div className="min-h-screen bg-brutal-white p-8 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-2xl font-bold uppercase text-brutal-red mb-4">
              INVITATION ERROR
            </div>
            <p className="mb-4">{error}</p>
            <Button onClick={() => router.push('/')} variant="outline">
              BACK TO HOME
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brutal-white p-8 flex items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-4xl text-brutal-black">
              HITMEUP
            </CardTitle>
            <p className="font-bold text-brutal-black">INVITATION</p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>JOIN CONVERSATION</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Badge variant="success">VALID INVITE</Badge>
              <p className="font-bold">
                You've been invited to join: <br />
                <span className="text-brutal-pink">
                  {inviteData.conversation.name}
                </span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="font-bold text-sm uppercase">
                Your Display Name
              </label>
              <Input
                type="text"
                placeholder="Enter your name..."
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={joiningLoading}
              />
            </div>

            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={handleJoinConversation}
                disabled={!displayName.trim() || joiningLoading}
              >
                {joiningLoading ? 'JOINING...' : 'JOIN CONVERSATION'}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/')}
                disabled={joiningLoading}
              >
                BACK TO HOME
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}