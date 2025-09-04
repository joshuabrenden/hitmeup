'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';

export default function SimpleDirectAccess() {
  const params = useParams();
  const router = useRouter();
  const inviteCode = params.code as string;

  useEffect(() => {
    // Just redirect to the chat room immediately
    // Skip all auth - both users are pre-created and pre-added
    if (inviteCode === 'jj-direct' || inviteCode === 'cc-direct') {
      // Give a brief moment for the page to render, then redirect
      const timer = setTimeout(() => {
        router.push('/test-chat');
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      // Invalid code - show error after a moment
      const timer = setTimeout(() => {
        router.push('/');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [inviteCode, router]);

  if (inviteCode === 'jj-direct') {
    return (
      <div className="min-h-screen bg-brutal-white p-8 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-2xl font-bold uppercase mb-4">WELCOME JJ! 👋</div>
            <p>Redirecting to your chat room...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (inviteCode === 'cc-direct') {
    return (
      <div className="min-h-screen bg-brutal-white p-8 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-2xl font-bold uppercase mb-4">WELCOME CC! 👋</div>
            <p>Redirecting to your chat room...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brutal-white p-8 flex items-center justify-center">
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-2xl font-bold uppercase text-brutal-red mb-4">
            INVALID CODE
          </div>
          <p>Redirecting home...</p>
        </CardContent>
      </Card>
    </div>
  );
}