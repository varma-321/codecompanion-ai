import { useUser } from '@/lib/user-context';
import { Loader2 } from 'lucide-react';
import Login from './Login';
import Dashboard from './Dashboard';
import GuestDashboard from './GuestDashboard';
import useNotificationReminders from '@/components/NotificationManager';
import AppShell from '@/components/AppShell';

const Index = () => {
  const { authUser, loading, isGuest, userStatus } = useUser();
  useNotificationReminders();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-foreground text-background flex items-center justify-center shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">JavaArena</span>
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Guest mode - show limited dashboard
  if (isGuest) {
    return <GuestDashboard />;
  }

  if (!authUser) {
    return <Login />;
  }

  // Check user status
  if (userStatus === 'pending') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center animate-fade-in">
          <div className="rounded-2xl border border-border bg-card p-8" style={{ boxShadow: 'var(--shadow-lg)' }}>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/20">
              <Loader2 className="h-7 w-7 text-warning" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Account Pending Approval</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Your account is awaiting admin approval. You'll receive access once an administrator approves your request.
            </p>
            <button
              onClick={async () => {
                const { signOut } = await import('@/lib/supabase');
                await signOut();
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (userStatus === 'blocked') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center animate-fade-in">
          <div className="rounded-2xl border border-destructive/30 bg-card p-8">
            <h2 className="text-lg font-semibold text-destructive mb-2">Account Blocked</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Your account has been blocked by an administrator. Please contact support if you believe this is an error.
            </p>
            <button
              onClick={async () => {
                const { signOut } = await import('@/lib/supabase');
                await signOut();
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (userStatus === 'temporarily_banned') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center animate-fade-in">
          <div className="rounded-2xl border border-warning/30 bg-card p-8">
            <h2 className="text-lg font-semibold text-warning mb-2">Temporarily Banned</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Your account has been temporarily suspended. Please try again later or contact support.
            </p>
            <button
              onClick={async () => {
                const { signOut } = await import('@/lib/supabase');
                await signOut();
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell bare>
      <Dashboard />
    </AppShell>
  );
};

export default Index;
