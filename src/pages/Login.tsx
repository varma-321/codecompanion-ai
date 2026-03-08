import { useState } from 'react';
import { Code2, Terminal, Cpu, Loader2, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signUp, signIn, supabase } from '@/lib/supabase';

const Login = () => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!email.trim()) { setError('Email is required'); return; }

    if (mode === 'forgot') {
      setLoading(true);
      try {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) throw resetError;
        setResetSent(true);
      } catch (err: any) {
        setError(err?.message || 'Failed to send reset email');
      }
      setLoading(false);
      return;
    }

    if (!password.trim()) { setError('Password is required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

    if (mode === 'signup') {
      const trimmedUsername = username.trim();
      if (!trimmedUsername) { setError('Username is required'); return; }
      if (trimmedUsername.length < 3) { setError('Username must be at least 3 characters'); return; }
      if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) { setError('Username can only contain letters, numbers, and underscores'); return; }
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUp(email.trim(), password, username.trim());
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary">
            <Code2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground">AI Java DSA Lab</h1>
          <p className="text-sm text-muted-foreground">Your personal AI-powered DSA practice environment</p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Terminal className="h-3.5 w-3.5" /> Java Runtime</span>
            <span className="flex items-center gap-1"><Cpu className="h-3.5 w-3.5" /> AI Powered</span>
            <span className="flex items-center gap-1"><Code2 className="h-3.5 w-3.5" /> Monaco Editor</span>
          </div>

          <h2 className="mb-4 text-lg font-semibold text-foreground">
            {mode === 'forgot' ? 'Reset Password' : mode === 'signup' ? 'Create Account' : 'Sign In'}
          </h2>

          {mode === 'forgot' && (
            <button onClick={() => { setMode('login'); setError(''); setResetSent(false); }} className="mb-3 flex items-center gap-1 text-xs text-primary hover:underline">
              <ArrowLeft className="h-3 w-3" /> Back to sign in
            </button>
          )}

          {resetSent ? (
            <div className="rounded-md bg-success/10 p-4 text-center">
              <p className="text-sm font-medium text-success">Reset link sent!</p>
              <p className="mt-1 text-xs text-muted-foreground">Check your email for a password reset link.</p>
            </div>
          ) : (
            <>
              {mode === 'signup' && (
                <div className="mb-3">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={username} onChange={e => { setUsername(e.target.value); setError(''); }} placeholder="e.g. dev_coder" className="pl-9 font-mono" disabled={loading} />
                  </div>
                </div>
              )}

              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} placeholder="you@example.com" className="pl-9" disabled={loading} />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div className="mb-4">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} onKeyDown={e => e.key === 'Enter' && !loading && handleSubmit()} placeholder="••••••••" className="pl-9" disabled={loading} />
                  </div>
                </div>
              )}

              {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

              <Button onClick={handleSubmit} className="w-full" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {mode === 'forgot' ? 'Sending...' : mode === 'signup' ? 'Creating Account...' : 'Signing In...'}</>
                ) : (
                  mode === 'forgot' ? 'Send Reset Link' : mode === 'signup' ? 'Create Account' : 'Sign In'
                )}
              </Button>

              <div className="mt-4 flex flex-col items-center gap-2">
                {mode === 'login' && (
                  <button onClick={() => { setMode('forgot'); setError(''); }} className="text-xs text-muted-foreground hover:text-primary hover:underline" disabled={loading}>
                    Forgot password?
                  </button>
                )}
                <button
                  onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); }}
                  className="text-xs text-primary hover:underline"
                  disabled={loading}
                >
                  {mode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Your problems and solutions are saved securely in the cloud.
        </p>
      </div>
    </div>
  );
};

export default Login;
