import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authBackend, backend } from '@/services';
import { setApiUser } from '@/services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(
    () =>
      authBackend.onChange((u) => {
        setApiUser(u);
        setUser(u);
        setInitializing(false);
      }),
    [],
  );

  const signIn = useCallback((email, password) => authBackend.signIn(email, password), []);
  const signUp = useCallback(async (name, email, password) => {
    const u = await authBackend.signUp(name, email, password);
    await backend.saveProfile({ uid: u.uid, email: u.email, displayName: name, createdAt: Date.now() }).catch(() => undefined);
    return u;
  }, []);
  const signOut = useCallback(() => authBackend.signOut(), []);

  const value = useMemo(() => ({ user, initializing, signIn, signUp, signOut }), [user, initializing, signIn, signUp, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Convenience for pages under ProtectedRoute, where a user is guaranteed. */
export function useUser() {
  const { user } = useAuth();
  if (!user) throw new Error('useUser called outside a protected route');
  return user;
}
