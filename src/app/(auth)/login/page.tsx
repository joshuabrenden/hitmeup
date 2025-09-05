'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    setError(null);
    
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError || !data.user) {
        throw new Error(authError?.message || 'Login failed');
      }

      // Check if user is admin
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', data.user.id)
        .single();

      if (userError || !userData?.is_admin) {
        await supabase.auth.signOut();
        throw new Error('Access denied - Admin privileges required');
      }

      // Redirect to admin dashboard
      console.log('Login successful, redirecting to admin dashboard...');
      router.push('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-brutal-white p-8 flex items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-4xl text-brutal-black">
              HITMEUP
            </CardTitle>
            <p className="font-bold text-brutal-black">ADMIN LOGIN</p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ADMINISTRATOR ACCESS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-4 bg-brutal-red text-white font-bold text-center border-4 border-brutal-black">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="font-bold text-sm uppercase">
                Admin Email
              </label>
              <Input
                type="email"
                placeholder="Enter admin email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="font-bold text-sm uppercase">
                Password
              </label>
              <Input
                type="password"
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={handleLogin}
                disabled={!email.trim() || !password.trim() || loading}
              >
                {loading ? 'LOGGING IN...' : 'LOGIN AS ADMIN'}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/')}
                disabled={loading}
              >
                BACK TO HOME
              </Button>
            </div>

            <div className="text-center text-sm text-gray-600 pt-4 border-t-2 border-brutal-black">
              <p className="font-bold">DEFAULT CREDENTIALS:</p>
              <p>Email: joshuabrenden@gmail.com</p>
              <p>Password: admin123!</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}