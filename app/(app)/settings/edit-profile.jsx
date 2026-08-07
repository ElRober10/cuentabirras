import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet } from 'react-native';
import { HelperText, Snackbar, Text, TextInput, useTheme } from 'react-native-paper';

import { editProfileSchema } from '../../../src/application/auth/editProfileSchema';
import { AppButton } from '../../../src/presentation/components/AppButton';
import { KeyboardAwareScreen } from '../../../src/presentation/components/KeyboardAwareScreen';
import { useAuth } from '../../../src/presentation/hooks/useAuth';

// Pantalla "Editar datos personales": mismos campos que el registro
// (nombre, apellidos, email, teléfono, contraseña), pero para modificarlos
// después. Tres updates independientes, cada uno solo si hacía falta:
// 1. Nombre/apellidos/teléfono → updateProfile (directo sobre profiles).
// 2. Email → updateEmail SOLO si lo cambiaste; no es inmediato (Supabase
//    manda un enlace de confirmación a la dirección nueva), así que se
//    avisa aparte con un mensaje persistente, no con el Snackbar normal.
// 3. Contraseña → updatePassword SOLO si rellenaste "Nueva contraseña"
//    (dejarla en blanco significa "no la toques", ver editProfileSchema.js).
export default function EditProfileScreen() {
  const theme = useTheme();
  const { user, updateProfile, updateEmail, updatePassword } = useAuth();
  const [serverError, setServerError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [emailChangePending, setEmailChangePending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const onSubmit = async (values) => {
    setServerError(null);
    setSaved(false);
    try {
      if (values.firstName !== user.firstName || values.lastName !== user.lastName || (values.phone || null) !== (user.phone || null)) {
        await updateProfile({ firstName: values.firstName, lastName: values.lastName, phone: values.phone || null });
      }

      if (values.email !== user.email) {
        await updateEmail(values.email);
        setEmailChangePending(true);
      }

      if (values.newPassword) {
        await updatePassword(values.newPassword);
      }

      // La contraseña no se queda rellena tras guardar (ni tiene sentido
      // "recordarla" en el formulario, ni conviene dejarla visible en
      // memoria más de lo necesario).
      reset({ ...values, newPassword: '', confirmNewPassword: '' });
      setSaved(true);
    } catch (error) {
      setServerError(error.message ?? 'No se pudieron guardar los cambios.');
    }
  };

  return (
    <KeyboardAwareScreen contentContainerStyle={styles.content}>
      <Text variant="headlineSmall">Editar datos personales</Text>

      {emailChangePending ? (
        <Text style={[styles.emailNotice, { color: theme.colors.primary }]}>
          Te hemos mandado un enlace de confirmación al nuevo email. Hasta que no lo confirmes, sigues entrando con
          el actual.
        </Text>
      ) : null}

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

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Cambiar contraseña
      </Text>
      <Text style={{ color: theme.colors.onSurfaceVariant }}>Déjalo en blanco si no quieres cambiarla.</Text>

      <Controller
        control={control}
        name="newPassword"
        render={({ field }) => (
          <TextInput
            label="Nueva contraseña"
            value={field.value}
            onChangeText={field.onChange}
            secureTextEntry={!showPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword((v) => !v)} />}
            error={!!errors.newPassword}
            style={styles.input}
          />
        )}
      />
      <HelperText type="error" visible={!!errors.newPassword}>
        {errors.newPassword?.message}
      </HelperText>

      <Controller
        control={control}
        name="confirmNewPassword"
        render={({ field }) => (
          <TextInput
            label="Confirmar nueva contraseña"
            value={field.value}
            onChangeText={field.onChange}
            secureTextEntry={!showPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            error={!!errors.confirmNewPassword}
            style={styles.input}
          />
        )}
      />
      <HelperText type="error" visible={!!errors.confirmNewPassword}>
        {errors.confirmNewPassword?.message}
      </HelperText>

      {serverError ? (
        <HelperText type="error" visible>
          {serverError}
        </HelperText>
      ) : null}

      <AppButton mode="contained" onPress={handleSubmit(onSubmit)} loading={isSubmitting} style={styles.button}>
        Guardar cambios
      </AppButton>

      <Snackbar visible={saved} onDismiss={() => setSaved(false)} duration={3000}>
        Datos guardados.
      </Snackbar>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'flex-start',
  },
  input: {
    marginTop: 8,
  },
  sectionTitle: {
    marginTop: 20,
  },
  emailNotice: {
    marginTop: 12,
    marginBottom: 4,
  },
  button: {
    marginTop: 24,
  },
});
