import { useCallback, useEffect } from 'react';

import { container } from '../../di/container';
import { useSessionStore } from '../stores/sessionStore';

// Este es el "hook" que usan las pantallas para todo lo relacionado con
// login: `const { user, login, register, logout } = useAuth();`. Por dentro
// conecta dos cosas que ya vimos: el store de sesión (sessionStore.js, "qué
// hay guardado") y el repositorio de auth (container.authRepository, "cómo
// se consigue ese dato"). Las pantallas no saben nada de Supabase, solo
// llaman a estas funciones.
export function useAuth() {
  // Nos suscribimos a 4 trocitos del store. Usar un selector por variable
  // (en vez de leer todo el store de golpe) hace que este componente solo
  // se vuelva a renderizar cuando cambie justo ese trocito.
  const user = useSessionStore((state) => state.user);
  const isLoading = useSessionStore((state) => state.isLoading);
  const setUser = useSessionStore((state) => state.setUser);
  const clearUser = useSessionStore((state) => state.clearUser);

  // useEffect con [] (o, como aquí, con dependencias estables) = "ejecuta
  // esto una vez, al montar el componente". Aquí nos suscribimos a los
  // cambios de sesión de Supabase (login/logout/renovación de token) y
  // guardamos lo que llegue en el store. El `return unsubscribe` es la
  // "función de limpieza": React la llama si el componente se desmonta, para
  // cortar la suscripción y no dejarla escuchando en el vacío.
  useEffect(() => {
    const unsubscribe = container.authRepository.onAuthStateChange((nextUser) => {
      if (nextUser) setUser(nextUser);
      else clearUser();
    });
    return unsubscribe;
  }, [setUser, clearUser]);

  // useCallback memoriza la función para que no se cree una nueva en cada
  // render (útil sobre todo porque se la pasamos a componentes hijos o la
  // usamos en useEffect de otros sitios).
  const register = useCallback(
    async (params) => {
      const result = await container.authRepository.signUpWithPassword(params);
      // Si needsEmailConfirmation es true, result.user es null y no hacemos
      // nada aquí — la pantalla de registro es quien decide qué mostrar.
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

  // Estas 3 son para la recuperación de contraseña — ver
  // app/(auth)/forgot-password.jsx y app/reset-password.jsx. No tocan
  // `setUser`/`clearUser` directamente: el cambio de sesión (si lo hay) ya
  // llega solo a través de onAuthStateChange, de arriba.
  const requestPasswordReset = useCallback(async (email) => {
    await container.authRepository.requestPasswordReset(email);
  }, []);

  const establishRecoverySession = useCallback(async (params) => {
    await container.authRepository.establishRecoverySession(params);
  }, []);

  const updatePassword = useCallback(async (newPassword) => {
    await container.authRepository.updatePassword(newPassword);
  }, []);

  // Esto es lo que reciben las pantallas al hacer useAuth().
  return {
    user,
    isLoading,
    register,
    login,
    logout,
    requestPasswordReset,
    establishRecoverySession,
    updatePassword,
  };
}
