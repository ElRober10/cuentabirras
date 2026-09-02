import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';

import { container } from '../../../src/di/container';

const SPAIN = 'España';
const DIACRITICS_REGEX = /[̀-ͯ]/g;

// Comunidades autónomas (y ciudades autónomas) que solo tienen una
// provincia — para esas se salta directamente de comunidad autónoma a
// ciudad, sin pantalla intermedia de provincia (aunque los bares
// registrados hasta ahora estén todos en la misma provincia, una comunidad
// SÍ multiprovincial siempre enseña ese paso, por si se añaden bares en
// otra provincia más adelante). Se compara sin acentos/mayúsculas contra un
// fragmento del nombre porque Nominatim a veces devuelve el nombre oficial
// completo ("Comunidad de Madrid", "Región de Murcia"...).
const UNIPROVINCIAL_REGION_KEYWORDS = [
  'asturias',
  'cantabria',
  'rioja',
  'madrid',
  'murcia',
  'navarra',
  'balears',
  'baleares',
  'ceuta',
  'melilla',
];

function normalize(text) {
  return (text ?? '')
    .normalize('NFD')
    .replace(DIACRITICS_REGEX, '')
    .toLowerCase();
}

function isUniprovincial(region) {
  const normalized = normalize(region);
  return UNIPROVINCIAL_REGION_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

// Suma barCount agrupando por lo que devuelva keyFn, y ordena de más a
// menos bares (lo más relevante primero).
function groupCounts(rows, keyFn) {
  const totals = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    totals.set(key, (totals.get(key) ?? 0) + row.barCount);
  }
  return [...totals.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

function sumBarCount(rows) {
  return rows.reduce((total, row) => total + row.barCount, 0);
}

// Una sola pantalla para los cuatro niveles (país -> comunidad autónoma ->
// provincia -> ciudad): en vez de cuatro archivos de ruta, esta se navega a
// sí misma con router.push añadiendo un parámetro más cada vez
// (country, luego region, luego province). Así el gesto de "atrás"/el botón
// del sistema funciona solo, sin lógica propia — cada toque es una pantalla
// nueva en la pila de navegación.
export default function AdminBarsLocationScreen() {
  const theme = useTheme();
  const { country, region, province } = useLocalSearchParams();

  const barsQuery = useQuery({
    queryKey: ['adminBarsByLocation'],
    queryFn: () => container.adminRepository.getBarsByLocation(),
  });

  if (barsQuery.isLoading) {
    return <ActivityIndicator style={styles.spinner} />;
  }

  if (barsQuery.isError) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error }}>
          {barsQuery.error?.message ?? 'No se pudo cargar el desglose de bares.'}
        </Text>
      </View>
    );
  }

  const rows = barsQuery.data ?? [];
  const located = rows.filter((row) => row.hasLocation);

  let title;
  let breadcrumb = [];
  let items;
  let onSelectItem = null;

  if (!country) {
    // Primer nivel: países, pero SOLO si hay algún bar fuera de España —
    // si todos están en España (el caso normal), nos ahorramos ese paso y
    // vamos directos a comunidades autónomas.
    const foreignRows = located.filter((row) => row.country && row.country !== SPAIN);

    if (foreignRows.length > 0) {
      title = 'Países';
      items = groupCounts(
        located.filter((row) => row.country),
        (row) => row.country,
      );
      onSelectItem = (label) => router.push({ pathname: '/settings/admin-bars-location', params: { country: label } });
    } else {
      title = 'Comunidades autónomas';
      breadcrumb = [SPAIN];
      items = groupCounts(
        located.filter((row) => row.country === SPAIN && row.region),
        (row) => row.region,
      );
      onSelectItem = (label) =>
        router.push({ pathname: '/settings/admin-bars-location', params: { country: SPAIN, region: label } });
    }
  } else if (!region) {
    title = country === SPAIN ? 'Comunidades autónomas' : `Regiones de ${country}`;
    breadcrumb = [country];
    items = groupCounts(
      located.filter((row) => row.country === country && row.region),
      (row) => row.region,
    );
    onSelectItem = (label) =>
      router.push({ pathname: '/settings/admin-bars-location', params: { country, region: label } });
  } else if (country === SPAIN && !isUniprovincial(region) && !province) {
    title = `Provincias de ${region}`;
    breadcrumb = [country, region];
    items = groupCounts(
      located.filter((row) => row.country === country && row.region === region && row.province),
      (row) => row.province,
    );
    onSelectItem = (label) =>
      router.push({ pathname: '/settings/admin-bars-location', params: { country, region, province: label } });
  } else {
    // Nivel final: ciudades. Se llega aquí directamente desde una comunidad
    // autónoma uniprovincial, desde cualquier región fuera de España, o
    // tras elegir provincia dentro de España — no hay más niveles debajo.
    const withinProvince = province
      ? located.filter((row) => row.country === country && row.region === region && row.province === province)
      : located.filter((row) => row.country === country && row.region === region);

    title = `Ciudades en ${province ?? region}`;
    breadcrumb = province ? [country, region, province] : [country, region];
    items = groupCounts(
      withinProvince.filter((row) => row.city),
      (row) => row.city,
    );
  }

  // Notas al pie, solo en la primera pantalla: bares sin ubicación (nunca
  // se van a poder clasificar) y bares con coordenadas pero todavía sin
  // geocodificar (pasajero, se resuelve solo).
  const showFootnotes = !country;
  const withoutLocation = sumBarCount(rows.filter((row) => !row.hasLocation));
  const pendingGeocoding = sumBarCount(located.filter((row) => !row.country));

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      style={{ backgroundColor: theme.colors.background }}
    >
      {breadcrumb.length > 0 ? (
        <Text style={[styles.breadcrumb, { color: theme.colors.onSurfaceVariant }]}>{breadcrumb.join(' › ')}</Text>
      ) : null}
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>

      {items.length === 0 ? (
        <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 24 }}>
          No hay bares que mostrar aquí.
        </Text>
      ) : (
        items.map((item) => {
          const Row = onSelectItem ? Pressable : View;
          return (
            <Row
              key={item.label}
              onPress={onSelectItem ? () => onSelectItem(item.label) : undefined}
              style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
            >
              <View style={styles.cardText}>
                <Text variant="titleMedium">{item.label}</Text>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  {item.count} {item.count === 1 ? 'bar creado' : 'bares creados'}
                </Text>
              </View>
              {onSelectItem ? (
                <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
              ) : null}
            </Row>
          );
        })
      )}

      {showFootnotes && (withoutLocation > 0 || pendingGeocoding > 0) ? (
        <View style={styles.footnotes}>
          {withoutLocation > 0 ? (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              {withoutLocation} {withoutLocation === 1 ? 'bar creado' : 'bares creados'} sin ubicación (privados, sin
              coordenadas).
            </Text>
          ) : null}
          {pendingGeocoding > 0 ? (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              {pendingGeocoding} {pendingGeocoding === 1 ? 'bar' : 'bares'} con ubicación aún sin clasificar.
            </Text>
          ) : null}
        </View>
      ) : null}
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
  breadcrumb: {
    marginBottom: -4,
  },
  title: {
    marginBottom: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardText: {
    flex: 1,
  },
  footnotes: {
    marginTop: 8,
    gap: 4,
  },
});
