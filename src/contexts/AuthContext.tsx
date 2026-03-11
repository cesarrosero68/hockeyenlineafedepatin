import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "editor" | null;
type RestoreSessionOptions = { forceRefresh?: boolean };

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  restoreSession: (options?: RestoreSessionOptions) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_TIMEOUT_MS = 7000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const restoreInFlightRef = useRef<Promise<void> | null>(null);

  const fetchRole = useCallback(async (userId: string): Promise<AppRole> => {
    try {
      const { data, error } = await withTimeout(
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
        AUTH_TIMEOUT_MS,
        "fetchRole",
      );
      if (error) {
        console.warn("fetchRole failed", error);
        return null;
      }
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
    async ({ forceRefresh = false }: RestoreSessionOptions = {}) => {
      if (restoreInFlightRef.current) {
        return restoreInFlightRef.current;
      }
      if (mountedRef.current) {
        setLoading(true);
      }

      const restorePromise = (async () => {
        try {
          const {
            data: { session: storedSession },
          } = await withTimeout(supabase.auth.getSession(), AUTH_TIMEOUT_MS, "getSession");

          let nextSession = storedSession ?? null;

          if (forceRefresh && storedSession) {
            const { data, error } = await withTimeout(
              supabase.auth.refreshSession(),
              AUTH_TIMEOUT_MS,
              "refreshSession",
            );
            if (error) {
              console.warn("refreshSession failed", error);
              nextSession = null;
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
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mountedRef.current) return;

      // Avoid async Supabase calls directly in this callback to prevent client deadlocks.
      if (!nextSession?.user) {
        setSession(null);
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      setSession(nextSession);
      setUser(nextSession.user);
      setLoading(true);

      window.setTimeout(() => {
        void restoreAuthState({ forceRefresh: event !== "SIGNED_OUT" });
      }, 0);
    });

    void restoreAuthState();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void restoreAuthState({ forceRefresh: true });
      }
    };

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        void restoreAuthState({ forceRefresh: true });
      }
    };

    const handleOnline = () => {
      void restoreAuthState({ forceRefresh: true });
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
    };
  }, [restoreAuthState]);

  useEffect(() => {
    if (!loading) return;
    const timeout = setTimeout(() => {
      if (mountedRef.current) {
        setLoading(false);
      }
    }, 10_000);
    return () => clearTimeout(timeout);
  }, [loading]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error && mountedRef.current) {
      setLoading(false);
    }
    return { error: error as Error | null };
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn("signOut failed", error);
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{ session, user, role, loading, signIn, signOut, restoreSession: restoreAuthState }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
