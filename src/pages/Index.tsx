import { useState } from 'react';
import { getUser, setUser } from '@/lib/store';
import Login from './Login';
import Dashboard from './Dashboard';

const Index = () => {
  const [username, setUsername] = useState<string | null>(getUser());

  const handleLogin = (name: string) => {
    setUser(name);
    setUsername(name);
  };

  const handleLogout = () => {
    localStorage.removeItem('dsa_lab_user');
    setUsername(null);
  };

  if (!username) {
    return <Login onLogin={handleLogin} />;
  }

  return <Dashboard username={username} onLogout={handleLogout} />;
};

export default Index;
