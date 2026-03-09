import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Shield, Users, UserCheck, UserX, Ban, Trash2, ArrowLeft, Loader2, Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';

interface UserRow {
  id: string;
  username: string;
  status: string;
  ban_until: string | null;
  created_at: string;
  email?: string;
  role?: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pending: { label: 'Pending', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
  approved: { label: 'Approved', variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
  blocked: { label: 'Blocked', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
  temporarily_banned: { label: 'Temp Banned', variant: 'outline', icon: <AlertTriangle className="h-3 w-3" /> },
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { authUser, isAdmin, loading: authLoading } = useUser();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionDialog, setActionDialog] = useState<{ type: string; user: UserRow | null }>({ type: '', user: null });
  const [banDays, setBanDays] = useState('7');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, username, status, ban_until, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch roles for all users
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const rolesMap = new Map<string, string>();
      roles?.forEach(r => rolesMap.set(r.user_id, r.role));

      const enriched: UserRow[] = (profiles || []).map(p => ({
        ...p,
        status: p.status || 'pending',
        role: rolesMap.get(p.id) || 'user',
      }));

      setUsers(enriched);
    } catch (err: any) {
      toast.error('Failed to load users');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && authUser && isAdmin) {
      fetchUsers();
    }
  }, [authLoading, authUser, isAdmin, fetchUsers]);

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && (!authUser || !isAdmin)) {
      navigate('/');
    }
  }, [authLoading, authUser, isAdmin, navigate]);

  const updateUserStatus = async (userId: string, status: string, banUntil?: string | null) => {
    setActionLoading(true);
    try {
      const updates: any = { status };
      if (banUntil !== undefined) updates.ban_until = banUntil;
      
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
      toast.success(`User status updated to ${status}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update user');
    }
    setActionLoading(false);
    setActionDialog({ type: '', user: null });
  };

  const handleApprove = (user: UserRow) => updateUserStatus(user.id, 'approved', null);
  const handleBlock = (user: UserRow) => updateUserStatus(user.id, 'blocked', null);
  
  const handleTempBan = (user: UserRow) => {
    const days = parseInt(banDays) || 7;
    const banUntil = new Date(Date.now() + days * 86400000).toISOString();
    updateUserStatus(user.id, 'temporarily_banned', banUntil);
  };

  const handleRemove = async (user: UserRow) => {
    setActionLoading(true);
    try {
      // Delete profile (will cascade via auth)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);
      
      // Note: We can't delete from auth.users directly, but blocking effectively removes access
      if (error) {
        // If delete fails due to RLS, block instead
        await updateUserStatus(user.id, 'blocked', null);
        toast.info('User has been blocked (permanent removal requires backend admin access)');
      } else {
        toast.success('User removed');
        fetchUsers();
      }
    } catch {
      toast.error('Failed to remove user');
    }
    setActionLoading(false);
    setActionDialog({ type: '', user: null });
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.id.includes(searchQuery)
  );

  const stats = {
    total: users.length,
    pending: users.filter(u => u.status === 'pending').length,
    approved: users.filter(u => u.status === 'approved').length,
    blocked: users.filter(u => u.status === 'blocked').length,
    banned: users.filter(u => u.status === 'temporarily_banned').length,
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              <h1 className="text-lg font-semibold text-foreground">Admin Dashboard</h1>
            </div>
          </div>
          <Button onClick={fetchUsers} variant="outline" size="sm" className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total Users', value: stats.total, icon: <Users className="h-4 w-4" />, color: 'text-foreground' },
            { label: 'Pending', value: stats.pending, icon: <Clock className="h-4 w-4" />, color: 'text-warning' },
            { label: 'Approved', value: stats.approved, icon: <UserCheck className="h-4 w-4" />, color: 'text-success' },
            { label: 'Blocked', value: stats.blocked, icon: <UserX className="h-4 w-4" />, color: 'text-destructive' },
            { label: 'Temp Banned', value: stats.banned, icon: <Ban className="h-4 w-4" />, color: 'text-warning' },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
              <div className={`flex items-center gap-2 mb-1 ${stat.color}`}>
                {stat.icon}
                <span className="text-2xl font-bold">{stat.value}</span>
              </div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search by username..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="max-w-sm h-9 rounded-lg text-sm"
          />
        </div>

        {/* Users Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Username</TableHead>
                <TableHead className="text-xs">Role</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Ban Until</TableHead>
                <TableHead className="text-xs">Joined</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map(user => {
                  const statusConf = STATUS_CONFIG[user.status] || STATUS_CONFIG.pending;
                  const isCurrentUser = user.id === authUser?.id;
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-sm">
                        {user.username}
                        {isCurrentUser && <span className="ml-1.5 text-[10px] text-muted-foreground">(you)</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'} className="text-[10px]">
                          {user.role === 'admin' ? 'Admin' : 'User'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConf.variant} className="gap-1 text-[10px]">
                          {statusConf.icon} {statusConf.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {user.ban_until ? new Date(user.ban_until).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {!isCurrentUser && (
                          <div className="flex items-center justify-end gap-1">
                            {user.status === 'pending' && (
                              <Button size="sm" variant="default" className="h-7 text-[11px] gap-1" onClick={() => handleApprove(user)}>
                                <CheckCircle className="h-3 w-3" /> Approve
                              </Button>
                            )}
                            {user.status !== 'approved' && user.status !== 'pending' && (
                              <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => handleApprove(user)}>
                                <CheckCircle className="h-3 w-3" /> Unblock
                              </Button>
                            )}
                            {user.status === 'approved' && (
                              <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => setActionDialog({ type: 'block', user })}>
                                <UserX className="h-3 w-3" /> Block
                              </Button>
                            )}
                            {user.status !== 'temporarily_banned' && (
                              <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => setActionDialog({ type: 'ban', user })}>
                                <Ban className="h-3 w-3" /> Ban
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1 text-destructive hover:text-destructive" onClick={() => setActionDialog({ type: 'remove', user })}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Action Dialogs */}
      <Dialog open={actionDialog.type === 'block'} onOpenChange={() => setActionDialog({ type: '', user: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block User</DialogTitle>
            <DialogDescription>
              Are you sure you want to block <strong>{actionDialog.user?.username}</strong>? They won't be able to log in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ type: '', user: null })}>Cancel</Button>
            <Button variant="destructive" onClick={() => actionDialog.user && handleBlock(actionDialog.user)} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Block User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialog.type === 'ban'} onOpenChange={() => setActionDialog({ type: '', user: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporarily Ban User</DialogTitle>
            <DialogDescription>
              Set ban duration for <strong>{actionDialog.user?.username}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 py-2">
            <Input type="number" value={banDays} onChange={e => setBanDays(e.target.value)} className="w-24 h-9" min="1" max="365" />
            <span className="text-sm text-muted-foreground">days</span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ type: '', user: null })}>Cancel</Button>
            <Button variant="destructive" onClick={() => actionDialog.user && handleTempBan(actionDialog.user)} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialog.type === 'remove'} onOpenChange={() => setActionDialog({ type: '', user: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove User</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently remove <strong>{actionDialog.user?.username}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ type: '', user: null })}>Cancel</Button>
            <Button variant="destructive" onClick={() => actionDialog.user && handleRemove(actionDialog.user)} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remove Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
