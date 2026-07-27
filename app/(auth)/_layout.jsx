import { Redirect, Stack } from 'expo-router';

import { useAuth } from '../../src/presentation/hooks/useAuth';

export default function AuthLayout() {
  const { user, isLoading } = useAuth();

  if (!isLoading && user) {
    return <Redirect href="/(app)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
