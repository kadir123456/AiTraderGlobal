import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ref, set } from 'firebase/database';
import { database } from '@/lib/firebase';

const AdminSetup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [setupKey, setSetupKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basit bir setup key - production'da daha güvenli olmalı
    const SETUP_KEY = 'admin123setup';

    if (setupKey !== SETUP_KEY) {
      toast.error('Invalid setup key');
      return;
    }

    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    try {
      setLoading(true);

      // Set admin role in Firebase
      const roleRef = ref(database, `user_roles/${user.uid}`);
      await set(roleRef, {
        role: 'admin',
        email: user.email,
        createdAt: new Date().toISOString(),
      });

      toast.success('Admin role assigned successfully!');

      // Redirect to admin page
      setTimeout(() => {
        navigate('/admin');
      }, 1500);

    } catch (error) {
      console.error('Error setting up admin:', error);
      toast.error('Failed to setup admin role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">Admin Setup</CardTitle>
          <CardDescription className="text-center">
            Enter the setup key to assign admin role to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!user ? (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">You must be logged in to setup admin</p>
              <Button onClick={() => navigate('/auth')} className="w-full">
                Go to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSetup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Current User</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="setupKey">Setup Key</Label>
                <Input
                  id="setupKey"
                  type="password"
                  placeholder="Enter setup key"
                  value={setupKey}
                  onChange={(e) => setSetupKey(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Default key: <code className="bg-muted px-1 py-0.5 rounded">admin123setup</code>
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Setup Admin
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate('/dashboard')}
              >
                Back to Dashboard
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSetup;
