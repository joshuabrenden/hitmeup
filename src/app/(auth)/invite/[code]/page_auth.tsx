'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// Direct login mapping for invite codes
const DIRECT_LOGIN_MAP = {
  'jj-direct': {
    email: 'joshuabrenden@gmail.com',
    password: 'jj123!',
    name: 'JJ'
  },
  'cc-direct': {
    email: 'christym90@gmail.com', 
    password: 'cc123!',
    name: 'CC'
  }
} as const;

export default function DirectInvitePage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const inviteCode = params.code as string;

  useEffect(() => {
    async function handleDirectLogin() {
      if (!inviteCode) {
        setError('Invalid invite code');
        setLoading(false);
        return;
      }

      const loginInfo = DIRECT_LOGIN_MAP[inviteCode as keyof typeof DIRECT_LOGIN_MAP];
      if (!loginInfo) {
        setError('Invalid or expired invite code');
        setLoading(false);
        return;
      }

      try {
        // Sign in the user directly
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: loginInfo.email,
          password: loginInfo.password,
        });

        if (authError || !data.user) {
          throw new Error(authError?.message || 'Login failed');
        }

        // Redirect to the main conversation
        router.push('/chat/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to access chat');
        console.error('Direct login error:', err);
      } finally {
        setLoading(false);
      }
    }

    handleDirectLogin();
  }, [inviteCode, supabase, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-brutal-white p-8 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-2xl font-bold uppercase">LOGGING YOU IN...</div>
            <p className="mt-4">Setting up your chat access...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    const loginInfo = DIRECT_LOGIN_MAP[inviteCode as keyof typeof DIRECT_LOGIN_MAP];
    
    return (
      <div className="min-h-screen bg-brutal-white p-8 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-2xl font-bold uppercase text-brutal-red mb-4">
              ACCESS ERROR
            </div>
            <p className="mb-4">{error}</p>
            
            {loginInfo && (
              <div className="mt-4 p-4 bg-gray-100 border-2 border-brutal-black text-left">
                <p className="font-bold">Manual Login Info:</p>
                <p>Email: {loginInfo.email}</p>
                <p>Password: {loginInfo.password}</p>
              </div>
            )}
            
            <div className="mt-4 space-y-2">
              <Button onClick={() => window.location.reload()}>
                TRY AGAIN
              </Button>
              <Button variant="outline" onClick={() => router.push('/')}>
                BACK TO HOME
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brutal-white p-8 flex items-center justify-center">
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-2xl font-bold uppercase">REDIRECTING...</div>
        </CardContent>
      </Card>
    </div>
  );
}