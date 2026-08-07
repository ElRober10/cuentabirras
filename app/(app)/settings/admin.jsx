import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { container } from '../../../src/di/container';

// Panel de administración: solo cifras generales de toda la app, de
// momento (Fase 1). La AUTORIZACIÓN de verdad vive en el RPC
// (get_admin_dashboard_stats comprueba is_admin y lanza si no lo eres) — el
// guardado del menú de Ajustes (que no enseña la entrada a quien no es
// admin) es solo comodidad de interfaz, no la protección real.
const STATS = [
  { key: 'totalUsers', label: 'Usuarios registrados', icon: 'account-group' },
  { key: 'totalBars', label: 'Bares creados', icon: 'store' },
  { key: 'totalTabs', label: 'Cuentas abiertas en total', icon: 'receipt' },
  { key: 'totalDrinks', label: 'Bebidas pedidas en total', icon: 'glass-mug-variant' },
];

export default function AdminDashboardScreen() {
  const theme = useTheme();

  const statsQuery = useQuery({
    queryKey: ['adminDashboardStats'],
    queryFn: () => container.adminRepository.getDashboardStats(),
  });

  if (statsQuery.isLoading) {
    return <ActivityIndicator style={styles.spinner} />;
  }

  if (statsQuery.isError) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error }}>
          {statsQuery.error?.message ?? 'No se pudieron cargar las estadísticas.'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      style={{ backgroundColor: theme.colors.background }}
    >
      {STATS.map((stat) => (
        <View key={stat.key} style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
          <View style={[styles.iconBadge, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons name={stat.icon} size={26} color={theme.colors.onPrimaryContainer} />
          </View>
          <View style={styles.cardText}>
            <Text variant="headlineSmall">{statsQuery.data[stat.key]}</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>{stat.label}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginTop: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
  },
});
