"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { AppRole } from "@/lib/auth";

export type { AppRole };

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
  initialRoles = [],
  initialUserId = null,
}: {
  children: ReactNode;
  initialRoles?: AppRole[];
  initialUserId?: string | null;
}) {
  // One browser client per provider instance (shares cookie storage).
  const [supabase] = useState(() => createClient());
  const [session, setSession] = useState<Session | null>(null);
  // Seed roles from the server (root layout) so the common page-load path never
  // queries user_roles from the browser — that direct REST call was the source
  // of the CORS console errors and an extra DB round-trip per load.
  const [roles, setRoles] = useState<AppRole[]>(initialRoles);
  const [loading, setLoading] = useState(true);
  const knownUserId = useRef<string | null>(initialUserId);

  async function fetchRoles(userId: string): Promise<AppRole[]> {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    return (data ?? []).map((r) => r.role);
  }

  useEffect(() => {
    // 1. Subscribe FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      const uid = newSession?.user?.id ?? null;
      if (!uid) {
        knownUserId.current = null;
        setRoles([]);
        return;
      }
      // Only hit the DB when the signed-in user differs from what the server
      // already rendered — the normal load path keeps the seeded roles.
      if (uid !== knownUserId.current) {
        knownUserId.current = uid;
        // Defer to avoid deadlocks inside the auth callback.
        setTimeout(() => {
          fetchRoles(uid).then(setRoles);
        }, 0);
      }
    });

    // 2. THEN bootstrap from local cookies (no network/DB round-trip).
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshRoles = async () => {
    if (session?.user) setRoles(await fetchRoles(session.user.id));
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        roles,
        loading,
        signOut,
        refreshRoles,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
