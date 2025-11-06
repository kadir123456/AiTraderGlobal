import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { getAllUsers, setUserSubscription, setUserRole, AdminUserData, UserSubscription } from '@/lib/firebaseAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Users, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { AdminRoleManager } from '@/components/AdminRoleManager';

const Admin = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error('Access denied. Admin only.');
      navigate('/dashboard');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionChange = async (userId: string, tier: 'free' | 'pro' | 'enterprise') => {
    try {
      setUpdating(userId);
      const subscription: UserSubscription = {
        tier,
        startDate: new Date().toISOString(),
        status: 'active',
        endDate: tier === 'free' ? undefined : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };
      
      await setUserSubscription(userId, subscription);
      toast.success(`Subscription updated to ${tier}`);
      await loadUsers();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('Failed to update subscription');
    } finally {
      setUpdating(null);
    }
  };

  const handleRoleChange = async (userId: string, role: 'admin' | 'user') => {
    try {
      setUpdating(userId);
      await setUserRole(userId, role);
      toast.success(`Role updated to ${role}`);
      await loadUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    } finally {
      setUpdating(null);
    }
  };

  if (adminLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Shield className="h-8 w-8 text-primary" />
                {t('admin.title')}
              </h1>
              <p className="text-muted-foreground mt-1">{t('admin.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Admin Role Manager */}
        <div className="mb-8">
          <AdminRoleManager onRoleAssigned={loadUsers} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('admin.total_users')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{users.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('admin.free_users')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">
                {users.filter(u => u.subscription.tier === 'free').length}
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('admin.pro_users')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">
                {users.filter(u => u.subscription.tier === 'pro').length}
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('admin.enterprise_users')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">
                {users.filter(u => u.subscription.tier === 'enterprise').length}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.users_management')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.email')}</TableHead>
                      <TableHead>{t('admin.name')}</TableHead>
                      <TableHead>{t('admin.role')}</TableHead>
                      <TableHead>{t('admin.subscription')}</TableHead>
                      <TableHead>{t('admin.status')}</TableHead>
                      <TableHead>{t('admin.joined')}</TableHead>
                      <TableHead>{t('admin.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.uid}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{user.displayName}</TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(value) => handleRoleChange(user.uid, value as 'admin' | 'user')}
                            disabled={updating === user.uid}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.subscription.tier}
                            onValueChange={(value) => handleSubscriptionChange(user.uid, value as any)}
                            disabled={updating === user.uid}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                              <SelectItem value="enterprise">Enterprise</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.subscription.status === 'active' ? 'default' : 'secondary'}>
                            {user.subscription.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {updating === user.uid && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;