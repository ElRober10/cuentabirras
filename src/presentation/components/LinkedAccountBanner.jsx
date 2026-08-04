import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { AppButton } from './AppButton';

// "Cuenta vinculada con [nombre]" + botón para desvincular. Se usa en
// settings/link-account.jsx (Fase B) y, más adelante (Fase E), también en
// la pantalla de la cuenta abierta de un bar.
export function LinkedAccountBanner({ link, onUnlink, isUnlinking }) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]}>
      <MaterialCommunityIcons name="link-variant" size={22} color={theme.colors.primary} />
      <Text variant="titleMedium" style={styles.text}>
        Cuenta vinculada con {link.partnerFirstName} {link.partnerLastName}
      </Text>
      <AppButton mode="outlined" onPress={onUnlink} loading={isUnlinking}>
        Desvincular cuenta
      </AppButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  text: {
    marginBottom: 4,
  },
});
