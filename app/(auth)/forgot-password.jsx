import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet } from 'react-native';
import { HelperText, Text, TextInput } from 'react-native-paper';

import { forgotPasswordSchema } from '../../src/application/auth/forgotPasswordSchema';
import { AppButton } from '../../src/presentation/components/AppButton';
import { KeyboardAwareScreen } from '../../src/presentation/components/KeyboardAwareScreen';
import { useAuth } from '../../src/presentation/hooks/useAuth';

// Pantalla de la ruta "/(auth)/forgot-password". Mismo patrón que
// login.jsx/register.jsx: react-hook-form + zod, y un "return anticipado"
// (ver `sent` más abajo) que sustituye el formulario por un mensaje una vez
// enviado el email — igual que register.jsx hace con needsConfirmation.
export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth();
  const [serverError, setServerError] = useState(null);
  const [sent, setSent] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async ({ email }) => {
    setServerError(null);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (error) {
      setServerError(error.message);
    }
  };

  if (sent) {
    return (
      <KeyboardAwareScreen>
        <Text variant="titleMedium">Revisa tu email</Text>
        <Text style={styles.subtitle}>
          Si esa dirección tiene una cuenta, te hemos enviado un enlace para crear una contraseña
          nueva. Ábrelo desde el móvil donde tienes CuentaBirras instalada.
        </Text>
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
      <Text variant="headlineSmall">Recuperar contraseña</Text>
      <Text style={styles.subtitle}>
        Escribe tu email y te mandaremos un enlace para elegir una contraseña nueva.
      </Text>

      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextInput
            label="Email"
            value={field.value}
            onChangeText={field.onChange}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            error={!!errors.email}
            style={styles.input}
          />
        )}
      />
      <HelperText type="error" visible={!!errors.email}>
        {errors.email?.message}
      </HelperText>

      {serverError ? (
        <HelperText type="error" visible>
          {serverError}
        </HelperText>
      ) : null}

      <AppButton mode="contained" onPress={handleSubmit(onSubmit)} loading={isSubmitting} style={styles.button}>
        Enviar enlace
      </AppButton>

      <Link href="/(auth)/login" asChild>
        <AppButton mode="text" style={styles.link}>
          Volver a iniciar sesión
        </AppButton>
      </Link>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  input: {
    marginTop: 8,
  },
  button: {
    marginTop: 16,
  },
  subtitle: {
    marginVertical: 12,
  },
  link: {
    marginTop: 16,
    alignSelf: 'center',
  },
});
