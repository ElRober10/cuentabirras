import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';

import { container } from '../../../src/di/container';

// Ranking completo de bebidas más pedidas de toda la app — amplía la cifra
// suelta "Bebida más pedida" del panel principal (get_admin_dashboard_stats)
// a un listado entero, ya ordenado de más a menos por el propio RPC
// (get_admin_drink_ranking, migración 0038). Las bebidas nunca pedidas ni
// aparecen (el RPC las descarta), así que no hace falta filtrarlas aquí.
export default function AdminDrinkRankingScreen() {
  const theme = useTheme();

  const rankingQuery = useQuery({
    queryKey: ['adminDrinkRanking'],
    queryFn: () => container.adminRepository.getDrinkRanking(),
  });

  if (rankingQuery.isLoading) {
    return <ActivityIndicator style={styles.spinner} />;
  }

  if (rankingQuery.isError) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error }}>
          {rankingQuery.error?.message ?? 'No se pudo cargar el ranking.'}
        </Text>
      </View>
    );
  }

  const ranking = rankingQuery.data ?? [];

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      style={{ backgroundColor: theme.colors.background }}
    >
      {ranking.length === 0 ? (
        <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 24 }}>
          Todavía no se ha pedido ninguna bebida.
        </Text>
      ) : (
        ranking.map((entry, index) => (
          <View
            key={entry.name}
            style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
          >
            <View style={[styles.rankBadge, { backgroundColor: theme.colors.primaryContainer }]}>
              {index < 3 ? (
                <MaterialCommunityIcons name="trophy" size={22} color={theme.colors.onPrimaryContainer} />
              ) : (
                <Text style={{ color: theme.colors.onPrimaryContainer }} variant="titleMedium">
                  {index + 1}
                </Text>
              )}
            </View>
            <View style={styles.cardText}>
              <Text variant="titleMedium">{entry.name}</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                {entry.totalCount} {entry.totalCount === 1 ? 'unidad pedida' : 'unidades pedidas'}
              </Text>
            </View>
          </View>
        ))
      )}
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
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
  },
});
