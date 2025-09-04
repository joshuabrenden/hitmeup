'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCost, formatTokens } from '@/lib/utils';

interface DashboardStats {
  totalUsers: number;
  totalConversations: number;
  totalMessages: number;
  totalAiRequests: number;
  totalCostCents: number;
  activeUsersToday: number;
  messagesLastHour: number;
  averageTokensPerRequest: number;
}

export default function AdminDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (authLoading) return;

    if (!user || !profile?.is_admin) {
      router.push('/');
      return;
    }

    loadDashboardStats();
  }, [user, profile, authLoading, router]);

  const loadDashboardStats = async () => {
    try {
      // Get basic counts
      const [
        usersCount,
        conversationsCount,
        messagesCount,
        aiLogsCount
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('conversations').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true }),
        supabase.from('ai_usage_logs').select('*', { count: 'exact', head: true })
      ]);

      // Get AI usage stats
      const { data: aiUsageData } = await supabase
        .from('ai_usage_logs')
        .select('cost_cents, tokens_input, tokens_output');

      const totalCost = aiUsageData?.reduce((sum, log) => sum + log.cost_cents, 0) || 0;
      const totalInputTokens = aiUsageData?.reduce((sum, log) => sum + log.tokens_input, 0) || 0;
      const totalOutputTokens = aiUsageData?.reduce((sum, log) => sum + log.tokens_output, 0) || 0;
      const averageTokens = aiUsageData?.length 
        ? Math.round((totalInputTokens + totalOutputTokens) / aiUsageData.length)
        : 0;

      // Get active users today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: activeUsers } = await supabase
        .from('messages')
        .select('user_id')
        .gte('created_at', todayStart.toISOString())
        .not('user_id', 'is', null);

      const uniqueActiveUsers = new Set(activeUsers?.map(m => m.user_id)).size;

      // Get messages in last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const { count: recentMessagesCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneHourAgo.toISOString());

      setStats({
        totalUsers: usersCount.count || 0,
        totalConversations: conversationsCount.count || 0,
        totalMessages: messagesCount.count || 0,
        totalAiRequests: aiLogsCount.count || 0,
        totalCostCents: totalCost,
        activeUsersToday: uniqueActiveUsers,
        messagesLastHour: recentMessagesCount || 0,
        averageTokensPerRequest: averageTokens,
      });
    } catch (err) {
      setError('Failed to load dashboard stats');
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateInvite = async () => {
    try {
      // For demo purposes, create a test conversation and invite
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          name: `Test Conversation ${Date.now()}`,
          created_by: user!.id,
          invite_code: Math.random().toString(36).substring(2, 15),
        })
        .select()
        .single();

      if (convError || !conversation) {
        throw new Error('Failed to create test conversation');
      }

      // Add admin as participant
      await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversation.id,
          user_id: user!.id,
        });

      // Create invite
      const inviteCode = Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const { error: inviteError } = await supabase
        .from('invitations')
        .insert({
          conversation_id: conversation.id,
          invite_code: inviteCode,
          created_by: user!.id,
          expires_at: expiresAt.toISOString(),
        });

      if (inviteError) {
        throw new Error('Failed to create invite');
      }

      // Copy invite link to clipboard
      const inviteUrl = `${window.location.origin}/invite/${inviteCode}`;
      await navigator.clipboard.writeText(inviteUrl);
      alert(`Invite link copied to clipboard!\\n${inviteUrl}`);
    } catch (err) {
      console.error('Error generating invite:', err);
      alert('Failed to generate invite link');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-brutal-white p-8 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-2xl font-bold uppercase">LOADING ADMIN...</div>
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

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-brutal-white">
      {/* Header */}
      <div className="border-b-4 border-brutal-black bg-brutal-pink p-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold uppercase text-brutal-white">
              HITMEUP ADMIN
            </h1>
            <p className="text-brutal-white font-bold">
              System Dashboard & Analytics
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={generateInvite} variant="secondary">
              GENERATE INVITE
            </Button>
            <Button onClick={() => router.push('/')} variant="outline">
              BACK TO APP
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-8 space-y-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">TOTAL USERS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-brutal-black">
                {stats.totalUsers}
              </div>
              <Badge variant="success" className="mt-2">
                {stats.activeUsersToday} ACTIVE TODAY
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">CONVERSATIONS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-brutal-black">
                {stats.totalConversations}
              </div>
              <Badge variant="default" className="mt-2">
                {stats.messagesLastHour} MSG/HOUR
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">TOTAL MESSAGES</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-brutal-black">
                {stats.totalMessages.toLocaleString()}
              </div>
              <Badge variant="secondary" className="mt-2">
                ALL TIME
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI REQUESTS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-brutal-black">
                {stats.totalAiRequests}
              </div>
              <Badge variant="warning" className="mt-2">
                {formatTokens(stats.averageTokensPerRequest)} AVG TOKENS
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Cost Tracking */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>AI COST TRACKING</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-3xl font-bold text-brutal-red">
                  {formatCost(stats.totalCostCents)}
                </div>
                <p className="text-brutal-black/60">Total AI Costs</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Average per request:</span>
                  <span className="font-bold">
                    {stats.totalAiRequests > 0 
                      ? formatCost(Math.round(stats.totalCostCents / stats.totalAiRequests))
                      : '$0.0000'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated monthly:</span>
                  <span className="font-bold">
                    {formatCost(stats.totalCostCents * 30)}
                  </span>
                </div>
              </div>
              
              <Badge variant="destructive">
                MONITOR USAGE
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SYSTEM HEALTH</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Supabase Free Tier:</span>
                  <Badge variant="success">ACTIVE</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Vercel Free Tier:</span>
                  <Badge variant="success">ACTIVE</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Claude API:</span>
                  <Badge variant="success">CONNECTED</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Real-time Messaging:</span>
                  <Badge variant="success">ONLINE</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>ADMIN ACTIONS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => router.push('/admin/users')}
                className="w-full"
              >
                MANAGE USERS
              </Button>
              <Button
                onClick={() => router.push('/admin/analytics')}
                variant="secondary"
                className="w-full"
              >
                DETAILED ANALYTICS
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="w-full"
              >
                REFRESH DATA
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}