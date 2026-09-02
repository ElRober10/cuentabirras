import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { HelperText, Text, TextInput, useTheme } from 'react-native-paper';

import { container } from '../../../src/di/container';
import { AppButton } from '../../../src/presentation/components/AppButton';
import { KeyboardAwareScreen } from '../../../src/presentation/components/KeyboardAwareScreen';
import { useAuth } from '../../../src/presentation/hooks/useAuth';

// Palabra que el usuario debe teclear para habilitar el botón: una barrera
// simple contra borrados accidentales (Apple permite pasos de confirmación,
// lo que no permite es exigir llamar/escribir a soporte).
const CONFIRM_WORD = 'BORRAR';

export default function DeleteAccountScreen() {
  const theme = useTheme();
  const { deleteAccount } = useAuth();
  const linkQuery = useQuery({
    queryKey: ['myAccountLink'],
    queryFn: () => container.accountLinkRepository.getMyLink(),
  });
  const partner = linkQuery.data ?? null;

  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const canDelete = confirmText.trim() === CONFIRM_WORD && !isDeleting;

  const runDeletion = async () => {
    setServerError(null);
    setIsDeleting(true);
    try {
      await deleteAccount();
      router.replace('/(auth)/login');
    } catch (error) {
      setServerError(error.message ?? 'No se pudo borrar la cuenta. Inténtalo de nuevo.');
      setIsDeleting(false);
    }
  };

  const confirmAndDelete = () => {
    Alert.alert(
      '¿Seguro que quieres borrar tu cuenta?',
      'Esta acción es permanente y no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar', style: 'destructive', onPress: runDeletion },
      ],
    );
  };

  return (
    <KeyboardAwareScreen contentContainerStyle={styles.content}>
      <Text variant="headlineSmall">Borrar mi cuenta</Text>

      <Text style={styles.paragraph}>
        Se borrará de forma permanente e inmediata: tu perfil (nombre, email y
        teléfono), tus cuentas de bar y consumiciones, tu histórico y tu
        vínculo con otra cuenta.
      </Text>
      <Text style={styles.paragraph}>
        Se conservan de forma anónima los precios que hayas aportado al
        catálogo compartido de cada bar, porque son datos que usa el resto de
        gente del bar.
      </Text>
      {partner ? (
        <Text style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
          Tu cuenta está vinculada con la de {partner.partnerFirstName}. Al
          borrarte, se desvinculará automáticamente.
        </Text>
      ) : null}

      <TextInput
        label={`Escribe ${CONFIRM_WORD} para confirmar`}
        value={confirmText}
        onChangeText={setConfirmText}
        autoCapitalize="characters"
        autoCorrect={false}
        style={styles.input}
      />

      {serverError ? (
        <HelperText type="error" visible>
          {serverError}
        </HelperText>
      ) : null}

      <AppButton
        mode="contained"
        buttonColor={theme.colors.error}
        onPress={confirmAndDelete}
        disabled={!canDelete}
        loading={isDeleting}
        style={styles.button}
      >
        Borrar mi cuenta
      </AppButton>

      <AppButton mode="text" onPress={() => router.back()} disabled={isDeleting}>
        Cancelar
      </AppButton>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'flex-start',
  },
  paragraph: {
    marginTop: 12,
  },
  input: {
    marginTop: 24,
  },
  button: {
    marginTop: 16,
  },
});
