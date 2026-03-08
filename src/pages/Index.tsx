import { useUser } from '@/lib/user-context';
import Login from './Login';
import Dashboard from './Dashboard';

const Index = () => {
  const { user } = useUser();

  if (!user) {
    return <Login />;
  }

  return <Dashboard />;
};

export default Index;
