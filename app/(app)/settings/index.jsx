import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

// Menú de Ajustes: aquí es donde se irán añadiendo más opciones de
// configuración en el futuro.
export default function SettingsScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Pressable
        onPress={() => router.push('/settings/link-account')}
        style={[styles.option, { borderColor: theme.colors.outlineVariant }]}
      >
        <MaterialCommunityIcons name="link-variant" size={26} color={theme.colors.primary} />
        <View style={styles.optionText}>
          <Text variant="titleMedium">Vincular cuenta</Text>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Comparte gasto con otra persona sin repartir</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
      </Pressable>

      <Pressable
        onPress={() => router.push('/settings/history')}
        style={[styles.option, { borderColor: theme.colors.outlineVariant }]}
      >
        <MaterialCommunityIcons name="history" size={26} color={theme.colors.primary} />
        <View style={styles.optionText}>
          <Text variant="titleMedium">Histórico de cuentas</Text>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Revisa cuentas pasadas y reábrelas si hace falta</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionText: {
    flex: 1,
  },
});
