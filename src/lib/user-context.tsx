import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase, getProfile, type Profile } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface ExtendedProfile extends Profile {
  status?: string;
  ban_until?: string | null;
}

interface UserContextType {
  authUser: User | null;
  profile: ExtendedProfile | null;
  loading: boolean;
  isGuest: boolean;
  isAdmin: boolean;
  userStatus: string | null;
  setProfile: (p: ExtendedProfile | null) => void;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
}

const UserContext = createContext<UserContextType>({
  authUser: null,
  profile: null,
  loading: true,
  isGuest: false,
  isAdmin: false,
  userStatus: null,
  setProfile: () => {},
  enterGuestMode: () => {},
  exitGuestMode: () => {},
});

async function fetchExtendedProfile(userId: string): Promise<ExtendedProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, created_at, status, ban_until')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return data as ExtendedProfile;
}

async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();
  return !!data;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ExtendedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const enterGuestMode = useCallback(() => {
    setIsGuest(true);
    setLoading(false);
  }, []);

  const exitGuestMode = useCallback(() => {
    setIsGuest(false);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setAuthUser(session?.user ?? null);
        if (session?.user) {
          setIsGuest(false);
          setTimeout(async () => {
            const p = await fetchExtendedProfile(session.user.id);
            setProfile(p);
            const admin = await checkIsAdmin(session.user.id);
            setIsAdmin(admin);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ?? null);
      if (session?.user) {
        fetchExtendedProfile(session.user.id).then(p => {
          setProfile(p);
          checkIsAdmin(session.user.id).then(setIsAdmin);
        }).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const userStatus = profile?.status ?? null;

  return (
    <UserContext.Provider value={{ authUser, profile, loading, isGuest, isAdmin, userStatus, setProfile, enterGuestMode, exitGuestMode }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
