import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { AppButton } from './AppButton';

// "Cuenta vinculada con [nombre]" + botón para desvincular. Se usa en
// settings/link-account.jsx (Fase B) y, más adelante (Fase E), también en
// la pantalla de la cuenta abierta de un bar.
export function LinkedAccountBanner({ link, onUnlink, isUnlinking }) {
  const theme = useTheme();
  const linkedSince = new Date(link.linkedSince).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
      <View style={[styles.iconBadge, { backgroundColor: theme.colors.primaryContainer }]}>
        <MaterialCommunityIcons name="link-variant" size={30} color={theme.colors.onPrimaryContainer} />
      </View>
      <Text variant="titleLarge" style={styles.title}>
        Vinculada con {link.partnerFirstName} {link.partnerLastName}
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Compartís la cuenta desde el {linkedSince}
      </Text>
      <AppButton mode="outlined" onPress={onUnlink} loading={isUnlinking} style={styles.button}>
        Desvincular cuenta
      </AppButton>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 4,
  },
  button: {
    marginTop: 20,
    alignSelf: 'stretch',
  },
});
