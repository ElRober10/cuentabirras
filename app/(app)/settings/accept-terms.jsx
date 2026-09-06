import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Checkbox, HelperText, Text, useTheme } from 'react-native-paper';
import { router } from 'expo-router';

import { AppButton } from '../../../src/presentation/components/AppButton';
import { useAuth } from '../../../src/presentation/hooks/useAuth';
import { LEGAL_LINKS } from '../../../src/shared/constants/legalLinks';

// Pantalla mínima para el único paso que falta a quien entra con Google o
// Apple y todavía no aceptó términos: SOLO el checkbox. A diferencia de
// "Editar datos personales" (edit-profile.jsx), aquí NO se piden ni se
// muestran campos de nombre/apellidos/email para editar — Sign in with
// Apple (y Google) ya nos dieron esos datos, y Apple rechaza la app
// (guideline 4) si, tras usarlo, se le vuelve a pedir al usuario información
// que el framework ya proporcionó. Nombre/apellidos/email ya quedaron
// guardados en el perfil por SupabaseAuthRepository.signInWithApple/Google
// antes de llegar aquí.
export default function AcceptTermsScreen() {
  const theme = useTheme();
  const { user, updateProfile } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const onContinue = async () => {
    if (!accepted) {
      setShowError(true);
      return;
    }
    setServerError(null);
    setIsSubmitting(true);
    try {
      // Solo marcamos la aceptación — nombre/apellidos/teléfono se mandan
      // sin cambios, tal cual ya están en el perfil.
      await updateProfile({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        acceptTerms: true,
      });
      router.replace('/(app)');
    } catch (error) {
      setServerError(error.message ?? 'No se pudo guardar la aceptación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.content, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineSmall" style={styles.title}>
        Un último paso
      </Text>
      <Text style={styles.body}>
        Antes de continuar, acepta los términos y condiciones y la política de privacidad.
      </Text>

      <View style={styles.termsRow}>
        <Checkbox
          status={accepted ? 'checked' : 'unchecked'}
          onPress={() => {
            setAccepted((v) => !v);
            setShowError(false);
          }}
        />
        <Text style={styles.termsText} onPress={() => setAccepted((v) => !v)}>
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
      <HelperText type="error" visible={showError}>
        Tienes que aceptar los términos y la política de privacidad
      </HelperText>

      {serverError ? (
        <HelperText type="error" visible>
          {serverError}
        </HelperText>
      ) : null}

      <AppButton mode="contained" onPress={onContinue} loading={isSubmitting} style={styles.button}>
        Continuar
      </AppButton>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    marginBottom: 8,
  },
  body: {
    marginBottom: 16,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  termsText: {
    flex: 1,
  },
  termsLink: {
    textDecorationLine: 'underline',
    fontWeight: 'bold',
  },
  button: {
    marginTop: 16,
  },
});
