import { zodResolver } from '@hookform/resolvers/zod';
import { useURL } from 'expo-linking';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Platform, StyleSheet } from 'react-native';
import { ActivityIndicator, HelperText, Text, TextInput } from 'react-native-paper';

import { newPasswordSchema } from '../src/application/auth/newPasswordSchema';
import { AppButton } from '../src/presentation/components/AppButton';
import { KeyboardAwareScreen } from '../src/presentation/components/KeyboardAwareScreen';
import { useAuth } from '../src/presentation/hooks/useAuth';

// Saca los pares clave=valor de un trozo de URL (lo que hay después de `?` o
// de `#`), a mano, sin depender de URLSearchParams (Hermes no lo trae
// incluido siempre y este proyecto no tiene el polyfill instalado).
function parseParams(paramString) {
  if (!paramString) return {};
  const params = {};
  for (const pair of paramString.split('&')) {
    if (!pair) continue;
    const [key, value = ''] = pair.split('=');
    params[decodeURIComponent(key)] = decodeURIComponent(value);
  }
  return params;
}

// El enlace de recuperación de Supabase puede traer los datos de dos formas
// distintas según la configuración del proyecto: access_token/refresh_token
// después de `#` (flujo "implicit"), o un `code` después de `?` (flujo
// "PKCE"). Miramos los dos trozos de la URL y aceptamos cualquiera de las
// dos formas, para no depender de esa configuración.
function extractRecoveryParams(url) {
  if (!url) return {};
  const [beforeHash, afterHash] = url.split('#');
  const [, afterQuery] = beforeHash.split('?');
  return { ...parseParams(afterQuery), ...parseParams(afterHash) };
}

// Pantalla de la ruta "/reset-password" — a propósito FUERA de los grupos
// (auth) y (app): (auth)/_layout.jsx redirige a "(app)" a cualquiera que ya
// tenga sesión iniciada, y aquí necesitamos poder tener una sesión (aunque
// sea la temporal del enlace de recuperación) sin que eso nos saque de esta
// pantalla antes de escribir la contraseña nueva. El enlace del email
// (configurado en SupabaseAuthRepository.requestPasswordReset) abre la app
// directamente en esta ruta, vía el esquema propio `cuentabirras://` (ver
// app.json → expo.scheme).
export default function ResetPasswordScreen() {
  const url = useURL();
  const { establishRecoverySession, updatePassword, logout } = useAuth();
  // 'checking' (aún resolviendo la URL / validando el enlace) → 'ready'
  // (sesión de recuperación ok, mostramos el formulario) → 'done'. O
  // 'invalid' si el enlace no traía nada usable o Supabase lo rechazó.
  const [status, setStatus] = useState('checking');
  const [linkError, setLinkError] = useState(null);
  const [serverError, setServerError] = useState(null);

  useEffect(() => {
    // Mientras `url` siga siendo null (expo-linking todavía resolviendo la
    // URL de arranque) nos quedamos esperando, en vez de marcar error de
    // inmediato — por eso el `return` sin tocar `status`.
    if (!url || status !== 'checking') return;

    const { access_token: accessToken, refresh_token: refreshToken, code } = extractRecoveryParams(url);
    if (!accessToken && !code) {
      setStatus('invalid');
      setLinkError('El enlace no es válido o ha caducado. Pide uno nuevo.');
      return;
    }

    establishRecoverySession({ accessToken, refreshToken, code })
      .then(() => setStatus('ready'))
      .catch((error) => {
        setStatus('invalid');
        setLinkError(error.message);
      });
  }, [url, status, establishRecoverySession]);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async ({ password }) => {
    setServerError(null);
    try {
      await updatePassword(password);
      // Cerramos la sesión temporal de recuperación: a partir de aquí toca
      // volver a entrar ya con la contraseña nueva, como un login normal.
      await logout();
      setStatus('done');
    } catch (error) {
      setServerError(error.message);
    }
  };

  if (status === 'checking') {
    return (
      <KeyboardAwareScreen>
        <ActivityIndicator />
        <Text style={styles.subtitle}>Comprobando el enlace...</Text>
      </KeyboardAwareScreen>
    );
  }

  if (status === 'invalid') {
    return (
      <KeyboardAwareScreen>
        <Text variant="titleMedium">Enlace no válido</Text>
        <Text style={styles.subtitle}>{linkError}</Text>
        <Link href="/(auth)/forgot-password" asChild>
          <AppButton mode="contained" style={styles.button}>
            Pedir un enlace nuevo
          </AppButton>
        </Link>
      </KeyboardAwareScreen>
    );
  }

  if (status === 'done') {
    return (
      <KeyboardAwareScreen>
        <Text variant="titleMedium">¡Contraseña actualizada!</Text>
        <Text style={styles.subtitle}>Ya puedes iniciar sesión con tu contraseña nueva.</Text>
        <Link href="/(auth)/login" asChild>
          <AppButton mode="contained" style={styles.button}>
            Ir a iniciar sesión
          </AppButton>
        </Link>
      </KeyboardAwareScreen>
    );
  }

  return (
    <KeyboardAwareScreen>
      <Text variant="headlineSmall">Nueva contraseña</Text>

      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextInput
            label="Contraseña nueva"
            value={field.value}
            onChangeText={field.onChange}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            error={!!errors.password}
            style={[styles.input, styles.passwordInput]}
          />
        )}
      />
      <HelperText type="error" visible={!!errors.password}>
        {errors.password?.message}
      </HelperText>

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field }) => (
          <TextInput
            label="Confirmar contraseña"
            value={field.value}
            onChangeText={field.onChange}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            error={!!errors.confirmPassword}
            style={[styles.input, styles.passwordInput]}
          />
        )}
      />
      <HelperText type="error" visible={!!errors.confirmPassword}>
        {errors.confirmPassword?.message}
      </HelperText>

      {serverError ? (
        <HelperText type="error" visible>
          {serverError}
        </HelperText>
      ) : null}

      <AppButton mode="contained" onPress={handleSubmit(onSubmit)} loading={isSubmitting} style={styles.button}>
        Guardar contraseña
      </AppButton>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  input: {
    marginTop: 8,
  },
  // Ver el comentario en login.jsx: Metal Mania no es legible para
  // contraseñas, así que aquí se fuerza la fuente normal del sistema.
  passwordInput: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  button: {
    marginTop: 16,
  },
  subtitle: {
    marginVertical: 12,
    textAlign: 'center',
  },
});
