import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  passwordRecovery: boolean;
}

interface AuthActions {
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  clearPasswordRecovery: () => void;
}

type AuthContextType = AuthState & AuthActions;

/**
 * Extract display name from Supabase user metadata.
 * Email sign-up stores it as `display_name`.
 * Google OAuth stores it as `full_name` or `name`.
 * Falls back to email prefix.
 */
export function getDisplayName(user: User | null): string {
  if (!user) return '';
  const meta = user.user_metadata;
  return meta?.display_name || meta?.full_name || meta?.name || user.email?.split('@')[0] || '';
}

/**
 * Extract avatar URL from user metadata (Google OAuth provides one).
 * Returns null for email sign-up users (no avatar).
 */
export function getAvatarUrl(user: User | null): string | null {
  if (!user) return null;
  return user.user_metadata?.avatar_url || null;
}

/**
 * Get the custom avatar ID from user metadata.
 * Returns the selected avatar ID (e.g., 'golem', 'prospector', 'mole', 'rieger', 'custom')
 * or null if no custom avatar is set.
 */
export function getAvatarId(user: User | null): string | null {
  if (!user) return null;
  return user.user_metadata?.avatar_id || null;
}

/**
 * Get the custom uploaded avatar data URL from user metadata.
 * Returns the base64 data URL or null if no custom avatar is uploaded.
 */
export function getCustomAvatarUrl(user: User | null): string | null {
  if (!user) return null;
  return user.user_metadata?.custom_avatar || null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

const noopResult = { error: null };
const noopAsync = async () => noopResult;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // Restore existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh, OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);

        // Detect password recovery flow (user clicked reset link in email)
        if (event === 'PASSWORD_RECOVERY') {
          setPasswordRecovery(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    });
    return { error };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    return { error };
  }, []);

  const signOutFn = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  const resetPasswordFn = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    return { error };
  }, []);

  const updatePasswordFn = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) {
      setPasswordRecovery(false);
    }
    return { error };
  }, []);

  const clearPasswordRecovery = useCallback(() => {
    setPasswordRecovery(false);
  }, []);

  // Graceful degradation: when Supabase isn't configured, return inert state
  if (!isSupabaseConfigured) {
    return (
      <AuthContext.Provider value={{
        user: null,
        session: null,
        loading: false,
        isConfigured: false,
        passwordRecovery: false,
        signUp: noopAsync,
        signIn: noopAsync,
        signInWithGoogle: noopAsync,
        signOut: noopAsync,
        resetPassword: noopAsync,
        updatePassword: noopAsync,
        clearPasswordRecovery: () => {},
      }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isConfigured: true,
      passwordRecovery,
      signUp,
      signIn,
      signInWithGoogle,
      signOut: signOutFn,
      resetPassword: resetPasswordFn,
      updatePassword: updatePasswordFn,
      clearPasswordRecovery,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
