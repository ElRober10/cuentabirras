import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Platform, StyleSheet, View } from 'react-native';
import { HelperText, Switch, Text, TextInput } from 'react-native-paper';

import { loginSchema } from '../../src/application/auth/loginSchema';
import { biometricAuth } from '../../src/infrastructure/auth/biometricAuth';
import { AppButton } from '../../src/presentation/components/AppButton';
import { KeyboardAwareScreen } from '../../src/presentation/components/KeyboardAwareScreen';
import { useAuth } from '../../src/presentation/hooks/useAuth';

// Pantalla de la ruta "/(auth)/login". Usa "react-hook-form" para gestionar
// el formulario (qué hay escrito, qué campos tienen error) y "zod" (a
// través de loginSchema) para validar antes de enviar.
export default function LoginScreen() {
  const { login } = useAuth();
  // serverError: para errores que vienen de Supabase (p. ej. "contraseña
  // incorrecta"), distintos de los errores de validación de zod (que
  // gestiona react-hook-form en `errors`).
  const [serverError, setServerError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  // Por defecto activado si el móvil lo soporta: como todo este interruptor
  // existe para "entrar rápido la próxima vez", lo más cómodo es que venga
  // ya marcado y el usuario lo desmarque si no lo quiere.
  const [enableBiometric, setEnableBiometric] = useState(true);

  useEffect(() => {
    biometricAuth.isSupported().then(setBiometricSupported);
  }, []);

  // useForm es el "cerebro" del formulario: `control` conecta cada campo,
  // `handleSubmit` valida antes de llamar a tu función, y `formState` te da
  // los errores y si se está enviando (isSubmitting).
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema), // aquí se conecta con el esquema de zod
    defaultValues: { email: '', password: '' },
  });

  // Esto solo se ejecuta si react-hook-form ya validó todo con éxito.
  const onSubmit = async (values) => {
    setServerError(null);
    try {
      await login(values); // llama a useAuth() → SupabaseAuthRepository
      // Guardamos la preferencia de biometría justo después de un login con
      // éxito: es el momento en que tiene sentido preguntarlo, ya con una
      // sesión real que desbloquear la próxima vez.
      if (biometricSupported) {
        await biometricAuth.setEnabled(enableBiometric);
      }
      router.replace('/(app)'); // navega a la pantalla principal, sin dejar "volver" al login
    } catch (error) {
      setServerError(error.message);
    }
  };

  return (
    <KeyboardAwareScreen>
      <Text style={styles.brandTitle}>CuentaBirras 🍺</Text>

      {/* <Controller> es el "puente" entre un campo de react-hook-form y un
          componente de UI (aquí, el TextInput de Paper). `field.value` y
          `field.onChange` son lo que conecta lo que ves en pantalla con el
          estado interno del formulario. */}
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
            // autoComplete/textContentType son pistas para el gestor de
            // contraseñas del móvil (Google Password Manager, iCloud
            // Keychain...), para que ofrezca guardar/autorellenar.
            autoComplete="email"
            textContentType="emailAddress"
            error={!!errors.email}
            style={styles.input}
          />
        )}
      />
      {/* HelperText solo se ve si `visible` es true; aquí mostramos el
          mensaje de error de zod (p. ej. "Email no válido") justo debajo del
          campo que falló. */}
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
            secureTextEntry={!showPassword} // oculta el texto como puntos, salvo que showPassword sea true
            autoComplete="current-password"
            textContentType="password"
            // El icono del ojo a la derecha del campo: al tocarlo, alterna
            // showPassword y cambia el icono (eye / eye-off).
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword((v) => !v)}
              />
            }
            error={!!errors.password}
            style={[styles.input, styles.passwordInput]}
          />
        )}
      />
      <HelperText type="error" visible={!!errors.password}>
        {errors.password?.message}
      </HelperText>

      <Link href="/(auth)/forgot-password" asChild>
        <AppButton mode="text" style={styles.forgotPassword}>
          ¿Has olvidado tu contraseña?
        </AppButton>
      </Link>

      {/* Igual que en la pantalla de inicio: este View reserva su espacio
          siempre, aunque esté vacío, para que nada "salte" mientras se
          comprueba si el móvil soporta biometría. */}
      <View style={[styles.switchRow, !biometricSupported && styles.switchRowHidden]}>
        <Text>Entrar con huella la próxima vez</Text>
        <Switch value={enableBiometric} onValueChange={setEnableBiometric} disabled={!biometricSupported} />
      </View>

      {serverError ? (
        <HelperText type="error" visible>
          {serverError}
        </HelperText>
      ) : null}

      {/* handleSubmit(onSubmit): primero valida con zod, y solo si todo está
          bien, llama a nuestro onSubmit con los valores ya validados.
          `loading={isSubmitting}` muestra un pequeño spinner en el botón
          mientras se está procesando el login. */}
      <AppButton mode="contained" onPress={handleSubmit(onSubmit)} loading={isSubmitting} style={styles.button}>
        Entrar
      </AppButton>

      {/* <Link asChild><AppButton>...</AppButton></Link>: expo-router "inyecta"
          la navegación directamente en el AppButton (en vez de renderizar un
          <a> por debajo), así que el botón navega a /(auth)/register al
          tocarlo, con el mismo aspecto y animación que el resto de botones. */}
      <Link href="/(auth)/register" asChild>
        <AppButton mode="text" style={styles.link}>
          ¿No tienes cuenta? Regístrate
        </AppButton>
      </Link>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  brandTitle: {
    fontFamily: 'MetalMania_400Regular',
    fontSize: 32,
  },
  input: {
    marginTop: 8,
  },
  // Metal Mania (la letra "cerveza" del resto de la app) es decorativa y
  // casi todo mayúsculas — perfecta para títulos, pero muy poco legible
  // para leer una contraseña mientras la escribes. Aquí forzamos la fuente
  // normal del sistema, solo en este campo.
  passwordInput: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  switchRowHidden: {
    opacity: 0,
  },
  forgotPassword: {
    alignSelf: 'center',
    marginTop: 4,
  },
  button: {
    marginTop: 16,
  },
  link: {
    marginTop: 16,
    alignSelf: 'center',
  },
});
