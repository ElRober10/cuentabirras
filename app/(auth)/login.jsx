import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet } from 'react-native';
import { HelperText, Text, TextInput } from 'react-native-paper';

import { loginSchema } from '../../src/application/auth/loginSchema';
import { AppButton } from '../../src/presentation/components/AppButton';
import { KeyboardAwareScreen } from '../../src/presentation/components/KeyboardAwareScreen';
import { useAuth } from '../../src/presentation/hooks/useAuth';

export default function LoginScreen() {
  const { login } = useAuth();
  const [serverError, setServerError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      await login(values);
      router.replace('/(app)');
    } catch (error) {
      setServerError(error.message);
    }
  };

  return (
    <KeyboardAwareScreen>
      <Text variant="headlineSmall">CuentaBirras 🍺</Text>

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

      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextInput
            label="Contraseña"
            value={field.value}
            onChangeText={field.onChange}
            secureTextEntry={!showPassword}
            autoComplete="current-password"
            textContentType="password"
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword((v) => !v)}
              />
            }
            error={!!errors.password}
            style={styles.input}
          />
        )}
      />
      <HelperText type="error" visible={!!errors.password}>
        {errors.password?.message}
      </HelperText>

      {serverError ? (
        <HelperText type="error" visible>
          {serverError}
        </HelperText>
      ) : null}

      <AppButton mode="contained" onPress={handleSubmit(onSubmit)} loading={isSubmitting} style={styles.button}>
        Entrar
      </AppButton>

      <Link href="/(auth)/register" asChild>
        <AppButton mode="text" style={styles.link}>
          ¿No tienes cuenta? Regístrate
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
  link: {
    marginTop: 16,
    alignSelf: 'center',
  },
});
