import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase, getProfile, type Profile } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface ExtendedProfile extends Profile {
  status?: string;
  ban_until?: string | null;
  github_token?: string | null;
  github_repo?: string | null;
  github_auto_push?: boolean;
}

interface UserContextType {
  authUser: User | null;
  profile: ExtendedProfile | null;
  loading: boolean;
  isGuest: boolean;
  isAdmin: boolean;
  isModerator: boolean;
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
  isModerator: false,
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

async function checkRole(userId: string, role: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', role)
    .maybeSingle();
  return !!data;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ExtendedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);

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
            const [p, admin, moderator] = await Promise.all([
              fetchExtendedProfile(session.user.id),
              checkRole(session.user.id, 'admin'),
              checkRole(session.user.id, 'moderator')
            ]);
            setProfile(p);
            setIsAdmin(admin);
            setIsModerator(moderator);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setIsModerator(false);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setAuthUser(session?.user ?? null);
      if (session?.user) {
        try {
          const [p, admin, moderator] = await Promise.all([
            fetchExtendedProfile(session.user.id),
            checkRole(session.user.id, 'admin'),
            checkRole(session.user.id, 'moderator')
          ]);
          setProfile(p);
          setIsAdmin(admin);
          setIsModerator(moderator);
        } catch (e) {
          console.error("Error loading user context:", e);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const userStatus = profile?.status ?? null;

  return (
    <UserContext.Provider value={{ authUser, profile, loading, isGuest, isAdmin, isModerator, userStatus, setProfile, enterGuestMode, exitGuestMode }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
