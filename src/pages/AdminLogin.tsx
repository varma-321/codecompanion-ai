import { useState } from 'react';
import { Loader2, Mail, Lock, ArrowLeft, ArrowRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/api';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!email.trim()) { setError('Email is required'); return; }
    if (!password.trim()) { setError('Password is required'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store JWT token
      localStorage.setItem('admin_token', data.token);
      navigate('/admin');
    } catch (err: any) {
      setError(err?.message || 'Authentication failed.');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
            <Shield className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Admin Portal</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Sign in with your admin credentials</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-7" style={{ boxShadow: 'var(--shadow-lg)' }}>
          <button onClick={() => navigate('/')} className="mb-5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" /> Back to main login
          </button>

          <div className="mb-3.5">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Admin Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} placeholder="admin@example.com" className="h-10 rounded-xl pl-9 text-sm" disabled={loading} />
            </div>
          </div>

          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} onKeyDown={e => e.key === 'Enter' && !loading && handleSubmit()} placeholder="••••••••" className="h-10 rounded-xl pl-9 text-sm" disabled={loading} />
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <Button onClick={handleSubmit} className="w-full h-10 rounded-xl text-sm font-medium" disabled={loading}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing In...</>
            ) : (
              <span className="flex items-center gap-2">
                Admin Sign In
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
