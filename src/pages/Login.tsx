import { useState } from 'react';
import { Code2, Terminal, Cpu, Loader2, Mail, Lock, User, ArrowLeft, ArrowRight } from 'lucide-react';
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground">
            <Code2 className="h-7 w-7 text-background" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">AI Java DSA Lab</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Your AI-powered DSA practice environment</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-7" style={{ boxShadow: 'var(--shadow-lg)' }}>
          {/* Feature badges */}
          <div className="mb-6 flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1">
              <Terminal className="h-3 w-3" /> Java
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1">
              <Cpu className="h-3 w-3" /> AI
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1">
              <Code2 className="h-3 w-3" /> Monaco
            </span>
          </div>

          <h2 className="mb-5 text-center text-base font-semibold text-foreground">
            {mode === 'forgot' ? 'Reset Password' : mode === 'signup' ? 'Create Account' : 'Welcome Back'}
          </h2>

          {mode === 'forgot' && (
            <button onClick={() => { setMode('login'); setError(''); setResetSent(false); }} className="mb-4 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3 w-3" /> Back to sign in
            </button>
          )}

          {resetSent ? (
            <div className="rounded-xl bg-success/10 p-5 text-center">
              <p className="text-sm font-medium text-success">Reset link sent!</p>
              <p className="mt-1.5 text-xs text-muted-foreground">Check your email for a password reset link.</p>
            </div>
          ) : (
            <>
              {mode === 'signup' && (
                <div className="mb-3.5">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                    <Input value={username} onChange={e => { setUsername(e.target.value); setError(''); }} placeholder="e.g. dev_coder" className="h-10 rounded-xl pl-9 font-mono text-sm" disabled={loading} />
                  </div>
                </div>
              )}

              <div className="mb-3.5">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                  <Input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} placeholder="you@example.com" className="h-10 rounded-xl pl-9 text-sm" disabled={loading} />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div className="mb-5">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                    <Input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} onKeyDown={e => e.key === 'Enter' && !loading && handleSubmit()} placeholder="••••••••" className="h-10 rounded-xl pl-9 text-sm" disabled={loading} />
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2">
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}

              <Button onClick={handleSubmit} className="w-full h-10 rounded-xl text-sm font-medium" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {mode === 'forgot' ? 'Sending...' : mode === 'signup' ? 'Creating...' : 'Signing In...'}</>
                ) : (
                  <span className="flex items-center gap-2">
                    {mode === 'forgot' ? 'Send Reset Link' : mode === 'signup' ? 'Create Account' : 'Sign In'}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>

              <div className="mt-5 flex flex-col items-center gap-2">
                {mode === 'login' && (
                  <button onClick={() => { setMode('forgot'); setError(''); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors" disabled={loading}>
                    Forgot password?
                  </button>
                )}
                <button
                  onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); }}
                  className="text-xs font-medium text-foreground hover:underline"
                  disabled={loading}
                >
                  {mode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="mt-5 text-center text-[11px] text-muted-foreground/60">
          Your problems and solutions are saved securely in the cloud.
        </p>
      </div>
    </div>
  );
};

export default Login;
