import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "editor" | null;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const restoreInFlightRef = useRef<Promise<void> | null>(null);

  const fetchRole = useCallback(async (userId: string): Promise<AppRole> => {
    try {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();

      return (data?.role as AppRole) ?? null;
    } catch (err) {
      console.warn("fetchRole failed", err);
      return null;
    }
  }, []);

  const applyAuthState = useCallback(
    async (nextSession: Session | null) => {
      if (!mountedRef.current) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setRole(null);
        return;
      }

      const nextRole = await fetchRole(nextSession.user.id);
      if (mountedRef.current) {
        setRole(nextRole);
      }
    },
    [fetchRole],
  );

  const restoreAuthState = useCallback(
    async ({ forceRefresh = false }: { forceRefresh?: boolean } = {}) => {
      if (restoreInFlightRef.current) {
        return restoreInFlightRef.current;
      }

      setLoading(true);

      const restorePromise = (async () => {
        try {
          const {
            data: { session: storedSession },
          } = await supabase.auth.getSession();
          let nextSession = storedSession ?? null;

          if (forceRefresh && storedSession) {
            const { data, error } = await supabase.auth.refreshSession();
            if (error) {
              console.warn("refreshSession failed", error);
            } else {
              nextSession = data.session ?? nextSession;
            }
          }

          await applyAuthState(nextSession);
        } catch (err) {
          console.warn("restoreAuthState failed", err);
          await applyAuthState(null);
        } finally {
          restoreInFlightRef.current = null;
          if (mountedRef.current) {
            setLoading(false);
          }
        }
      })();

      restoreInFlightRef.current = restorePromise;
      return restorePromise;
    },
    [applyAuthState],
  );

  useEffect(() => {
    mountedRef.current = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setLoading(true);
      await applyAuthState(nextSession);
      if (mountedRef.current && !restoreInFlightRef.current) {
        setLoading(false);
      }
    });

    void restoreAuthState();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void restoreAuthState({ forceRefresh: false });
      }
    };

    const handleFocus = () => {
      void restoreAuthState({ forceRefresh: false });
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleFocus);

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleFocus);
    };
  }, [applyAuthState, restoreAuthState]);

  // Safety timeout: force loading=false after 5s to prevent infinite spinner
  useEffect(() => {
    if (!loading) return;
    const timeout = setTimeout(() => {
      console.warn("Auth initialization timed out, forcing loading to false");
      setLoading(false);
    }, 3000);
    return () => clearTimeout(timeout);
  }, [loading]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signIn, signOut }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
