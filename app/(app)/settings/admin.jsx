import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { container } from '../../../src/di/container';

// Panel de administración: solo cifras generales de toda la app, de
// momento (Fase 1). La AUTORIZACIÓN de verdad vive en el RPC
// (get_admin_dashboard_stats comprueba is_admin y lanza si no lo eres) — el
// guardado del menú de Ajustes (que no enseña la entrada a quien no es
// admin) es solo comodidad de interfaz, no la protección real.
// `getValue` es opcional — por defecto se enseña data[key] tal cual (un
// número); solo hace falta cuando el valor a mostrar no es un número
// suelto (la bebida más pedida junta nombre + cantidad en un mismo texto).
// "topDrink" no vive aquí: a diferencia del resto, es pulsable (lleva al
// ranking completo, admin-drink-ranking.jsx) así que se renderiza aparte,
// con Pressable en vez de View.
const STATS = [
  { key: 'totalUsers', label: 'Usuarios registrados', icon: 'account-group' },
  { key: 'newUsersLast7Days', label: 'Registros en los últimos 7 días', icon: 'account-plus' },
  { key: 'totalBars', label: 'Bares creados', icon: 'store' },
  { key: 'totalTabs', label: 'Cuentas abiertas en total', icon: 'receipt' },
  { key: 'totalDrinks', label: 'Bebidas pedidas en total', icon: 'glass-mug-variant' },
  { key: 'activeLinkedAccounts', label: 'Cuentas vinculadas activas', icon: 'link-variant' },
  { key: 'customDrinksPendingIcon', label: 'Bebidas "Otro" sin icono', icon: 'image-off-outline' },
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
      {STATS.slice(0, 5).map((stat) => (
        <View key={stat.key} style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
          <View style={[styles.iconBadge, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons name={stat.icon} size={26} color={theme.colors.onPrimaryContainer} />
          </View>
          <View style={styles.cardText}>
            <Text variant="headlineSmall">{stat.getValue ? stat.getValue(statsQuery.data) : statsQuery.data[stat.key]}</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>{stat.label}</Text>
          </View>
        </View>
      ))}

      <Pressable
        onPress={() => router.push('/settings/admin-drink-ranking')}
        style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
      >
        <View style={[styles.iconBadge, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons name="trophy-outline" size={26} color={theme.colors.onPrimaryContainer} />
        </View>
        <View style={styles.cardText}>
          <Text variant="headlineSmall">
            {statsQuery.data.topDrinkName ? `${statsQuery.data.topDrinkName} (${statsQuery.data.topDrinkCount})` : '—'}
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Bebida más pedida</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
      </Pressable>

      {STATS.slice(5).map((stat) => (
        <View key={stat.key} style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
          <View style={[styles.iconBadge, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons name={stat.icon} size={26} color={theme.colors.onPrimaryContainer} />
          </View>
          <View style={styles.cardText}>
            <Text variant="headlineSmall">{stat.getValue ? stat.getValue(statsQuery.data) : statsQuery.data[stat.key]}</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>{stat.label}</Text>
          </View>
        </View>
      ))}

      <Pressable
        onPress={() => router.push('/settings/admin-icon-requests')}
        style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
      >
        <View style={[styles.iconBadge, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons name="image-edit-outline" size={26} color={theme.colors.onPrimaryContainer} />
        </View>
        <View style={styles.cardText}>
          <Text variant="titleMedium">Solicitudes de icono</Text>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Ver el listado y asignar iconos nuevos</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
      </Pressable>

      <Pressable
        onPress={() => router.push('/settings/admin-bars-location')}
        style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
      >
        <View style={[styles.iconBadge, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons name="map-marker-radius-outline" size={26} color={theme.colors.onPrimaryContainer} />
        </View>
        <View style={styles.cardText}>
          <Text variant="titleMedium">Bares por ubicación</Text>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Ver dónde se han creado, de comunidad a ciudad</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
      </Pressable>
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
