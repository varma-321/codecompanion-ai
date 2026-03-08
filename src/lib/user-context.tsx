import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase, getProfile, type Profile } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface UserContextType {
  authUser: User | null;
  profile: Profile | null;
  loading: boolean;
  setProfile: (p: Profile | null) => void;
}

const UserContext = createContext<UserContextType>({
  authUser: null,
  profile: null,
  loading: true,
  setProfile: () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setAuthUser(session?.user ?? null);
        if (session?.user) {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(async () => {
            const p = await getProfile(session.user.id);
            setProfile(p);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id).then(setProfile).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ authUser, profile, loading, setProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
