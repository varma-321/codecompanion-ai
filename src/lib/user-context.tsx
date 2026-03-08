import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { DbUser } from '@/lib/supabase';

interface UserContextType {
  user: DbUser | null;
  setUser: (user: DbUser | null) => void;
}

const UserContext = createContext<UserContextType>({ user: null, setUser: () => {} });

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DbUser | null>(() => {
    const stored = localStorage.getItem('dsa_lab_user_session');
    return stored ? JSON.parse(stored) : null;
  });

  const handleSetUser = useCallback((u: DbUser | null) => {
    setUser(u);
    if (u) {
      localStorage.setItem('dsa_lab_user_session', JSON.stringify(u));
    } else {
      localStorage.removeItem('dsa_lab_user_session');
    }
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser: handleSetUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
