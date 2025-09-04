'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCost, formatTokens } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface DailyStats {
  date: string;
  messages: number;
  aiRequests: number;
  costCents: number;
  activeUsers: number;
}

interface UserStats {
  user_id: string;
  display_name: string;
  messageCount: number;
  aiRequestCount: number;
  totalCostCents: number;
  lastActive: string;
}

const COLORS = ['#FFFF00', '#FF00FF', '#00FFFF', '#00FF00', '#FF8000', '#FF0000', '#0080FF'];

export default function AnalyticsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (authLoading) return;

    if (!user || !profile?.is_admin) {
      router.push('/');
      return;
    }

    loadAnalyticsData();
  }, [user, profile, authLoading, router]);

  const loadAnalyticsData = async () => {
    try {
      // Get daily stats for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get daily message counts
      const { data: messages } = await supabase
        .from('messages')
        .select('created_at, user_id')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Get daily AI usage
      const { data: aiUsage } = await supabase
        .from('ai_usage_logs')
        .select('created_at, cost_cents, user_id')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Process daily stats
      const dailyMap = new Map<string, DailyStats>();
      
      // Initialize all days
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyMap.set(dateStr, {
          date: dateStr,
          messages: 0,
          aiRequests: 0,
          costCents: 0,
          activeUsers: 0,
        });
      }

      // Populate message data
      const dailyActiveUsers = new Map<string, Set<string>>();
      messages?.forEach(msg => {
        const date = msg.created_at.split('T')[0];
        const stats = dailyMap.get(date);
        if (stats) {
          stats.messages += 1;
          if (msg.user_id) {
            if (!dailyActiveUsers.has(date)) {
              dailyActiveUsers.set(date, new Set());
            }
            dailyActiveUsers.get(date)!.add(msg.user_id);
          }
        }
      });

      // Populate AI usage data
      aiUsage?.forEach(usage => {
        const date = usage.created_at.split('T')[0];
        const stats = dailyMap.get(date);
        if (stats) {
          stats.aiRequests += 1;
          stats.costCents += usage.cost_cents;
        }
      });

      // Set active user counts
      dailyActiveUsers.forEach((users, date) => {
        const stats = dailyMap.get(date);
        if (stats) {
          stats.activeUsers = users.size;
        }
      });

      const dailyStatsArray = Array.from(dailyMap.values())
        .sort((a, b) => a.date.localeCompare(b.date));

      setDailyStats(dailyStatsArray);

      // Get user statistics
      const { data: users } = await supabase
        .from('users')
        .select('id, display_name, created_at');

      const userStatsMap = new Map<string, UserStats>();
      
      users?.forEach(user => {
        userStatsMap.set(user.id, {
          user_id: user.id,
          display_name: user.display_name,
          messageCount: 0,
          aiRequestCount: 0,
          totalCostCents: 0,
          lastActive: user.created_at,
        });
      });

      // Count user messages
      messages?.forEach(msg => {
        if (msg.user_id) {
          const userStat = userStatsMap.get(msg.user_id);
          if (userStat) {
            userStat.messageCount += 1;
            if (msg.created_at > userStat.lastActive) {
              userStat.lastActive = msg.created_at;
            }
          }
        }
      });

      // Count user AI usage
      aiUsage?.forEach(usage => {
        const userStat = userStatsMap.get(usage.user_id);
        if (userStat) {
          userStat.aiRequestCount += 1;
          userStat.totalCostCents += usage.cost_cents;
        }
      });

      const userStatsArray = Array.from(userStatsMap.values())
        .sort((a, b) => b.messageCount - a.messageCount);

      setUserStats(userStatsArray);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Error loading analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-brutal-white p-8 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-2xl font-bold uppercase">LOADING ANALYTICS...</div>
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

  const totalCost = dailyStats.reduce((sum, day) => sum + day.costCents, 0);
  const totalMessages = dailyStats.reduce((sum, day) => sum + day.messages, 0);
  const totalAiRequests = dailyStats.reduce((sum, day) => sum + day.aiRequests, 0);

  return (
    <div className="min-h-screen bg-brutal-white">
      {/* Header */}
      <div className="border-b-4 border-brutal-black bg-brutal-cyan p-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold uppercase text-brutal-black">
              DETAILED ANALYTICS
            </h1>
            <p className="text-brutal-black font-bold">
              Last 30 Days Performance Data
            </p>
          </div>
          <Button onClick={() => router.push('/admin')} variant="outline">
            BACK TO ADMIN
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-8 space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">30-DAY TOTALS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">{totalMessages}</div>
                <p className="text-sm text-brutal-black/60">Total Messages</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">AI USAGE</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">{totalAiRequests}</div>
                <p className="text-sm text-brutal-black/60">AI Requests</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">TOTAL COST</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-brutal-red">
                  {formatCost(totalCost)}
                </div>
                <p className="text-sm text-brutal-black/60">AI API Costs</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">EFFICIENCY</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {totalAiRequests > 0 
                    ? formatCost(Math.round(totalCost / totalAiRequests))
                    : '$0.0000'
                  }
                </div>
                <p className="text-sm text-brutal-black/60">Cost per AI Request</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Daily Messages Chart */}
          <Card>
            <CardHeader>
              <CardTitle>DAILY MESSAGE ACTIVITY</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#000000" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#000000"
                    fontSize={12}
                    tickFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <YAxis stroke="#000000" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#FFFFFF', 
                      border: '4px solid #000000',
                      fontFamily: 'Courier New, monospace',
                      fontWeight: 'bold'
                    }}
                  />
                  <Bar dataKey="messages" fill="#FFFF00" stroke="#000000" strokeWidth={2} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* AI Usage & Cost Chart */}
          <Card>
            <CardHeader>
              <CardTitle>AI USAGE & COSTS</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#000000" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#000000"
                    fontSize={12}
                    tickFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <YAxis stroke="#000000" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#FFFFFF', 
                      border: '4px solid #000000',
                      fontFamily: 'Courier New, monospace',
                      fontWeight: 'bold'
                    }}
                    formatter={(value, name) => {
                      if (name === 'costCents') {
                        return [formatCost(value as number), 'Daily Cost'];
                      }
                      return [value, 'AI Requests'];
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="aiRequests" 
                    stroke="#FF00FF" 
                    strokeWidth={3}
                    name="aiRequests"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="costCents" 
                    stroke="#FF0000" 
                    strokeWidth={3}
                    name="costCents"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>TOP USERS (BY ACTIVITY)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userStats.slice(0, 10).map((userStat, index) => (
                <div 
                  key={userStat.user_id} 
                  className="flex items-center justify-between p-4 border-4 border-brutal-black bg-brutal-white"
                >
                  <div className="flex items-center gap-4">
                    <Badge variant={index < 3 ? "warning" : "default"}>
                      #{index + 1}
                    </Badge>
                    <div>
                      <p className="font-bold">{userStat.display_name}</p>
                      <p className="text-sm text-brutal-black/60">
                        Last active: {new Date(userStat.lastActive).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex gap-4">
                      <span className="text-sm">
                        <strong>{userStat.messageCount}</strong> messages
                      </span>
                      <span className="text-sm">
                        <strong>{userStat.aiRequestCount}</strong> AI requests
                      </span>
                      <span className="text-sm text-brutal-red">
                        <strong>{formatCost(userStat.totalCostCents)}</strong> AI cost
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}