import { useUser } from '@/lib/user-context';
import { Loader2 } from 'lucide-react';
import Login from './Login';
import Dashboard from './Dashboard';

const Index = () => {
  const { authUser, loading } = useUser();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authUser) {
    return <Login />;
  }

  return <Dashboard />;
};

export default Index;
