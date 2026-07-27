import { Redirect, Stack } from 'expo-router';

import { useAuth } from '../../src/presentation/hooks/useAuth';

// Este _layout envuelve las pantallas de login/registro. Su única lógica:
// si resulta que YA hay una sesión activa (por ejemplo, entras a mano a
// "/(auth)/login" estando ya logueado), te redirige al grupo (app) — no
// tiene sentido ver el formulario de login si ya has iniciado sesión.
export default function AuthLayout() {
  const { user, isLoading } = useAuth();

  // Esperamos a que isLoading sea false (ya sabemos si hay sesión o no)
  // antes de decidir. Si decidiéramos con isLoading todavía en true,
  // podríamos redirigir por error a alguien que en realidad SÍ tenía sesión.
  if (!isLoading && user) {
    return <Redirect href="/(app)" />;
  }

  // Si no hay sesión (el caso normal al abrir la app por primera vez),
  // mostramos el navegador con las pantallas de este grupo: login y register.
  return <Stack screenOptions={{ headerShown: false }} />;
}
