'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCost } from '@/lib/utils';

interface UserDetails {
  id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
  created_at: string;
  invited_by: string | null;
  inviter_name?: string;
  messageCount: number;
  aiRequestCount: number;
  totalCostCents: number;
  lastActive: string | null;
  conversationCount: number;
}

export default function UsersPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (authLoading) return;

    if (!user || !profile?.is_admin) {
      router.push('/');
      return;
    }

    loadUsersData();
  }, [user, profile, authLoading, router]);

  const loadUsersData = async () => {
    try {
      // Get all users with inviter information
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          *,
          inviter:invited_by(display_name)
        `);

      if (usersError) {
        throw usersError;
      }

      // Get message counts per user
      const { data: messageCounts } = await supabase
        .from('messages')
        .select('user_id')
        .not('user_id', 'is', null);

      // Get AI usage per user
      const { data: aiUsage } = await supabase
        .from('ai_usage_logs')
        .select('user_id, cost_cents');

      // Get conversation participation counts
      const { data: participationCounts } = await supabase
        .from('conversation_participants')
        .select('user_id');

      // Get last activity per user
      const { data: lastActivity } = await supabase
        .from('messages')
        .select('user_id, created_at')
        .not('user_id', 'is', null)
        .order('created_at', { ascending: false });

      // Process data
      const messageCountMap = new Map<string, number>();
      messageCounts?.forEach(msg => {
        if (msg.user_id) {
          messageCountMap.set(msg.user_id, (messageCountMap.get(msg.user_id) || 0) + 1);
        }
      });

      const aiUsageMap = new Map<string, { count: number; cost: number }>();
      aiUsage?.forEach(usage => {
        const existing = aiUsageMap.get(usage.user_id) || { count: 0, cost: 0 };
        aiUsageMap.set(usage.user_id, {
          count: existing.count + 1,
          cost: existing.cost + usage.cost_cents,
        });
      });

      const participationCountMap = new Map<string, number>();
      participationCounts?.forEach(participation => {
        participationCountMap.set(
          participation.user_id,
          (participationCountMap.get(participation.user_id) || 0) + 1
        );
      });

      const lastActivityMap = new Map<string, string>();
      lastActivity?.forEach(activity => {
        if (activity.user_id && !lastActivityMap.has(activity.user_id)) {
          lastActivityMap.set(activity.user_id, activity.created_at);
        }
      });

      // Combine all data
      const enrichedUsers: UserDetails[] = usersData?.map(user => {
        const aiStats = aiUsageMap.get(user.id) || { count: 0, cost: 0 };
        return {
          ...user,
          inviter_name: user.inviter?.display_name,
          messageCount: messageCountMap.get(user.id) || 0,
          aiRequestCount: aiStats.count,
          totalCostCents: aiStats.cost,
          lastActive: lastActivityMap.get(user.id) || null,
          conversationCount: participationCountMap.get(user.id) || 0,
        };
      }) || [];

      // Sort by message count (most active first)
      enrichedUsers.sort((a, b) => b.messageCount - a.messageCount);

      setUsers(enrichedUsers);
    } catch (err) {
      setError('Failed to load users data');
      console.error('Error loading users data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    if (userId === user!.id) {
      alert("You cannot change your own admin status");
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_admin: !currentStatus })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      // Reload data
      await loadUsersData();
    } catch (err) {
      console.error('Error toggling admin status:', err);
      alert('Failed to update admin status');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-brutal-white p-8 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-2xl font-bold uppercase">LOADING USERS...</div>
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
            <Button onClick={() => router.push('/admin')} variant="outline">
              BACK TO ADMIN
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalUsers = users.length;
  const adminUsers = users.filter(u => u.is_admin).length;
  const activeUsers = users.filter(u => u.lastActive).length;
  const totalMessages = users.reduce((sum, u) => sum + u.messageCount, 0);
  const totalAiCost = users.reduce((sum, u) => sum + u.totalCostCents, 0);

  return (
    <div className="min-h-screen bg-brutal-white">
      {/* Header */}
      <div className="border-b-4 border-brutal-black bg-brutal-lime p-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold uppercase text-brutal-black">
              USER MANAGEMENT
            </h1>
            <p className="text-brutal-black font-bold">
              {totalUsers} Total Users • {adminUsers} Admins • {activeUsers} Active
            </p>
          </div>
          <Button onClick={() => router.push('/admin')} variant="outline">
            BACK TO ADMIN
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-8 space-y-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">TOTAL USERS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalUsers}</div>
              <Badge variant="default" className="mt-2">
                {adminUsers} ADMINS
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">ACTIVE USERS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeUsers}</div>
              <Badge variant="success" className="mt-2">
                {Math.round((activeUsers / totalUsers) * 100)}% RATE
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">TOTAL MESSAGES</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalMessages.toLocaleString()}</div>
              <Badge variant="secondary" className="mt-2">
                {Math.round(totalMessages / totalUsers)} AVG/USER
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">AI COSTS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-brutal-red">
                {formatCost(totalAiCost)}
              </div>
              <Badge variant="warning" className="mt-2">
                ALL USERS
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>ALL USERS</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>USER</TableHead>
                  <TableHead>STATUS</TableHead>
                  <TableHead>ACTIVITY</TableHead>
                  <TableHead>AI USAGE</TableHead>
                  <TableHead>JOINED</TableHead>
                  <TableHead>ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-bold">{user.display_name}</div>
                        <div className="text-sm text-brutal-black/60">
                          {user.email}
                        </div>
                        {user.inviter_name && (
                          <div className="text-xs text-brutal-black/40">
                            Invited by: {user.inviter_name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {user.is_admin && (
                          <Badge variant="warning">ADMIN</Badge>
                        )}
                        <Badge variant={user.lastActive ? "success" : "outline"}>
                          {user.lastActive ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div>{user.messageCount} messages</div>
                        <div className="text-sm text-brutal-black/60">
                          {user.conversationCount} conversations
                        </div>
                        {user.lastActive && (
                          <div className="text-xs text-brutal-black/40">
                            Last: {new Date(user.lastActive).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div>{user.aiRequestCount} requests</div>
                        <div className="text-sm text-brutal-red">
                          {formatCost(user.totalCostCents)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={user.is_admin ? "destructive" : "secondary"}
                        onClick={() => toggleAdminStatus(user.id, user.is_admin)}
                        disabled={user.id === profile?.id}
                      >
                        {user.is_admin ? "REMOVE ADMIN" : "MAKE ADMIN"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}