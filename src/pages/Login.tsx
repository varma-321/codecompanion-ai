import { useState } from 'react';
import { Code2, Terminal, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { setUser } from '@/lib/store';

interface LoginProps {
  onLogin: (username: string) => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    const trimmed = username.trim();
    if (!trimmed) {
      setError('Username is required');
      return;
    }
    if (trimmed.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }
    setUser(trimmed);
    onLogin(trimmed);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary">
            <Code2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground">
            AI Java DSA Lab
          </h1>
          <p className="text-sm text-muted-foreground">
            Your personal AI-powered DSA practice environment
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Terminal className="h-3.5 w-3.5" /> Java Runtime
            </span>
            <span className="flex items-center gap-1">
              <Cpu className="h-3.5 w-3.5" /> Ollama AI
            </span>
            <span className="flex items-center gap-1">
              <Code2 className="h-3.5 w-3.5" /> Monaco Editor
            </span>
          </div>

          <label className="mb-2 block text-sm font-medium text-foreground">
            Choose your username
          </label>
          <Input
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="e.g. dev_coder"
            className="mb-2 font-mono"
            autoFocus
          />
          {error && <p className="mb-3 text-xs text-destructive">{error}</p>}
          <Button onClick={handleLogin} className="w-full">
            Enter Lab
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Your problems and solutions are saved locally in your browser.
        </p>
      </div>
    </div>
  );
};

export default Login;
