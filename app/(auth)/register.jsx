import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Linking, StyleSheet, View } from 'react-native';
import { Checkbox, HelperText, Text, TextInput } from 'react-native-paper';

import { registerSchema } from '../../src/application/auth/registerSchema';
import { AppButton } from '../../src/presentation/components/AppButton';
import { KeyboardAwareScreen } from '../../src/presentation/components/KeyboardAwareScreen';
import { useAuth } from '../../src/presentation/hooks/useAuth';
import { LEGAL_LINKS } from '../../src/shared/constants/legalLinks';

// Pantalla de la ruta "/(auth)/register". Mismo patrón que login.jsx
// (Controller + react-hook-form + zod) — mira los comentarios de ese
// archivo si algo no queda claro aquí. Este archivo tiene 2 cosas de más:
// el campo "confirmar contraseña" y la pantalla de "revisa tu email".
export default function RegisterScreen() {
  const { register } = useAuth();
  const [serverError, setServerError] = useState(null);
  // needsConfirmation: cuando Supabase exige confirmar el email antes de
  // dejarte entrar, mostramos otro contenido en vez del formulario (ver más
  // abajo el "if (needsConfirmation) { ... }").
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      termsAccepted: false,
    },
  });

  // `{ confirmPassword: _confirmPassword, ...values }`: sacamos
  // confirmPassword fuera de los datos que le pasamos a `register(...)` —
  // solo servía para validar en el formulario, Supabase no necesita
  // recibirla (nombrarla `_confirmPassword` es solo una convención para
  // decir "sí, la extraigo a propósito, aunque no la use").
  const onSubmit = async ({ confirmPassword: _confirmPassword, ...values }) => {
    setServerError(null);
    try {
      const result = await register({ ...values, phone: values.phone || null });
      if (result.needsEmailConfirmation) {
        setNeedsConfirmation(true);
      } else {
        router.replace('/(app)');
      }
    } catch (error) {
      setServerError(error.message);
    }
  };

  // "Return anticipado": si ya nos registramos y toca confirmar el email,
  // esta función corta aquí y muestra solo este mensaje, sin llegar a
  // dibujar el formulario de más abajo.
  if (needsConfirmation) {
    return (
      <KeyboardAwareScreen>
        <Text variant="titleMedium">Revisa tu email</Text>
        <Text style={styles.subtitle}>
          Te hemos enviado un enlace de confirmación. Confírmalo y después inicia sesión.
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
      <Text variant="headlineSmall">Crear cuenta</Text>

      <Controller
        control={control}
        name="firstName"
        render={({ field }) => (
          <TextInput
            label="Nombre"
            value={field.value}
            onChangeText={field.onChange}
            error={!!errors.firstName}
            style={styles.input}
          />
        )}
      />
      <HelperText type="error" visible={!!errors.firstName}>
        {errors.firstName?.message}
      </HelperText>

      <Controller
        control={control}
        name="lastName"
        render={({ field }) => (
          <TextInput
            label="Apellidos"
            value={field.value}
            onChangeText={field.onChange}
            error={!!errors.lastName}
            style={styles.input}
          />
        )}
      />
      <HelperText type="error" visible={!!errors.lastName}>
        {errors.lastName?.message}
      </HelperText>

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

      {/* Sin `error`/HelperText porque es opcional: da igual si se queda
          vacío, zod no lo rechaza (ver registerSchema.js: phone es .optional()). */}
      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <TextInput
            label="Teléfono (opcional)"
            value={field.value}
            onChangeText={field.onChange}
            keyboardType="phone-pad"
            style={styles.input}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextInput
            label="Contraseña"
            value={field.value}
            onChangeText={field.onChange}
            secureTextEntry={!showPassword}
            // "new-password"/"newPassword" (en vez de "current-password" como
            // en login.jsx) le dice al gestor de contraseñas que esto es una
            // contraseña NUEVA que crear/guardar, no una que autorellenar.
            autoComplete="new-password"
            textContentType="newPassword"
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

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field }) => (
          <TextInput
            label="Confirmar contraseña"
            value={field.value}
            onChangeText={field.onChange}
            secureTextEntry={!showConfirmPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            right={
              <TextInput.Icon
                icon={showConfirmPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowConfirmPassword((v) => !v)}
              />
            }
            // Este error puede venir de dos sitios: el campo vacío (.min(1)) o
            // el .refine() de registerSchema.js que compara con "password".
            error={!!errors.confirmPassword}
            style={styles.input}
          />
        )}
      />
      <HelperText type="error" visible={!!errors.confirmPassword}>
        {errors.confirmPassword?.message}
      </HelperText>

      <Controller
        control={control}
        name="termsAccepted"
        render={({ field }) => (
          <View style={styles.termsRow}>
            <Checkbox status={field.value ? 'checked' : 'unchecked'} onPress={() => field.onChange(!field.value)} />
            {/* Text anidado dentro de Text: cada trozo puede tener su
                propio onPress, así que "términos" y "política de
                privacidad" abren cada uno su propio enlace, sin que el
                resto de la frase sea tocable. */}
            <Text style={styles.termsText} onPress={() => field.onChange(!field.value)}>
              He leído y acepto los{' '}
              <Text style={styles.termsLink} onPress={() => Linking.openURL(LEGAL_LINKS.terms)}>
                términos y condiciones
              </Text>{' '}
              y la{' '}
              <Text style={styles.termsLink} onPress={() => Linking.openURL(LEGAL_LINKS.privacy)}>
                política de privacidad
              </Text>
            </Text>
          </View>
        )}
      />
      <HelperText type="error" visible={!!errors.termsAccepted}>
        {errors.termsAccepted?.message}
      </HelperText>

      {serverError ? (
        <HelperText type="error" visible>
          {serverError}
        </HelperText>
      ) : null}

      <AppButton mode="contained" onPress={handleSubmit(onSubmit)} loading={isSubmitting} style={styles.button}>
        Registrarme
      </AppButton>

      <Link href="/(auth)/login" asChild>
        <AppButton mode="text" style={styles.link}>
          ¿Ya tienes cuenta? Inicia sesión
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  termsText: {
    flex: 1,
  },
  termsLink: {
    textDecorationLine: 'underline',
    fontWeight: 'bold',
  },
});
