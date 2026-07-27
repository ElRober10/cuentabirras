import { useCallback, useEffect } from 'react';

import { container } from '../../di/container';
import { useSessionStore } from '../stores/sessionStore';

export function useAuth() {
  const user = useSessionStore((state) => state.user);
  const isLoading = useSessionStore((state) => state.isLoading);
  const setUser = useSessionStore((state) => state.setUser);
  const clearUser = useSessionStore((state) => state.clearUser);

  useEffect(() => {
    const unsubscribe = container.authRepository.onAuthStateChange((nextUser) => {
      if (nextUser) setUser(nextUser);
      else clearUser();
    });
    return unsubscribe;
  }, [setUser, clearUser]);

  const register = useCallback(
    async (params) => {
      const result = await container.authRepository.signUpWithPassword(params);
      if (result.user) setUser(result.user);
      return result;
    },
    [setUser],
  );

  const login = useCallback(
    async (params) => {
      const nextUser = await container.authRepository.signInWithPassword(params);
      setUser(nextUser);
      return nextUser;
    },
    [setUser],
  );

  const logout = useCallback(async () => {
    await container.authRepository.signOut();
    clearUser();
  }, [clearUser]);

  return { user, isLoading, register, login, logout };
}
