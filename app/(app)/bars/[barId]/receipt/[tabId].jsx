import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Snackbar, Text, useTheme } from 'react-native-paper';

import { computeTabTotalCents, hasMissingPrices } from '../../../../../src/application/tabs/computeTabTotal';
import { container } from '../../../../../src/di/container';
import { AppButton } from '../../../../../src/presentation/components/AppButton';
import { centsToEuros } from '../../../../../src/shared/utils/money';

// El ticket que se ve justo después de "Cerrar cuenta": un resumen de solo
// lectura de lo consumido (agrupado por bebida) y el total. Si alguna
// bebida se añadió sin saber su precio, esa línea lo indica y además sale
// un aviso general de que el ticket no es del todo fiable.
export default function ReceiptScreen() {
  const { barId, tabId } = useLocalSearchParams();
  const theme = useTheme();
  const [errorMessage, setErrorMessage] = useState(null);

  const tabItemsQuery = useQuery({
    queryKey: ['tabItems', tabId],
    queryFn: () => container.tabItemRepository.listByTab(tabId),
  });

  const catalogQuery = useQuery({
    queryKey: ['catalog', barId],
    queryFn: () => container.catalogRepository.listByBar(barId),
  });

  const tabItems = tabItemsQuery.data;
  const catalogItems = catalogQuery.data;

  // Agrupa las líneas de la cuenta por bebida. Ojo: no basta con coger "el"
  // precio de cada bebida y multiplicarlo por la cantidad total — si en
  // algún momento se añadió sin precio (o el precio cambió a mitad de
  // sesión), hay que sumar cada fila con SU propio precio, y marcar la
  // línea como incompleta si alguna de esas unidades no tenía.
  const lines = useMemo(() => {
    if (!tabItems || !catalogItems) return [];
    const totals = new Map();
    for (const item of tabItems) {
      const current = totals.get(item.catalogItemId) ?? { quantity: 0, subtotalCents: 0, hasMissing: false };
      current.quantity += item.quantity;
      if (item.priceCentsAtAdd == null) {
        current.hasMissing = true;
      } else {
        current.subtotalCents += item.priceCentsAtAdd * item.quantity;
      }
      totals.set(item.catalogItemId, current);
    }
    return [...totals.entries()].map(([catalogItemId, info]) => ({
      catalogItemId,
      name: catalogItems.find((c) => c.id === catalogItemId)?.name ?? 'Bebida',
      ...info,
    }));
  }, [tabItems, catalogItems]);

  const totalCents = useMemo(() => computeTabTotalCents(tabItems ?? []), [tabItems]);
  const missingPrices = useMemo(() => hasMissingPrices(tabItems ?? []), [tabItems]);

  const isLoading = tabItemsQuery.isLoading || catalogQuery.isLoading;

  const handleCancelClose = async () => {
    try {
      await container.tabRepository.reopenTab(tabId);
      router.replace(`/bars/${barId}/tab/${tabId}`);
    } catch (error) {
      setErrorMessage(error.message ?? 'No se pudo deshacer el cierre.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineSmall" style={styles.title}>
        Ticket
      </Text>

      {isLoading ? (
        <ActivityIndicator style={styles.spinner} />
      ) : (
        <FlatList
          data={lines}
          keyExtractor={(line) => line.catalogItemId}
          contentContainerStyle={styles.list}
          renderItem={({ item: line }) => (
            <View style={styles.line}>
              <Text style={styles.lineName}>
                {line.quantity}× {line.name}
              </Text>
              {line.hasMissing ? (
                <Text style={[styles.linePrice, { color: theme.colors.error }]}>Sin precio</Text>
              ) : (
                <Text style={styles.linePrice}>{centsToEuros(line.subtotalCents)} €</Text>
              )}
            </View>
          )}
        />
      )}

      {missingPrices ? (
        <Text style={[styles.warning, { color: theme.colors.error }]}>
          Este ticket no es correcto: falta el precio de alguna bebida.
        </Text>
      ) : null}

      <View style={[styles.totalRow, { borderTopColor: theme.colors.outlineVariant }]}>
        <Text variant="titleLarge">Total</Text>
        <Text variant="titleLarge">{centsToEuros(totalCents)} €</Text>
      </View>

      <AppButton mode="contained" onPress={() => router.replace('/')} style={styles.doneButton}>
        Cerrar cuenta y volver a mis bares
      </AppButton>
      <AppButton mode="text" onPress={handleCancelClose} style={styles.cancelButton}>
        Cancelar cierre, volver a mi cuenta
      </AppButton>

      <Snackbar visible={!!errorMessage} onDismiss={() => setErrorMessage(null)} duration={4000}>
        {errorMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    // 1mm ≈ 6.3dp en móvil, así que bajarlo ~8mm son unos 50dp más arriba.
    marginTop: 50,
    marginBottom: 12,
    textAlign: 'center',
  },
  spinner: {
    marginTop: 24,
  },
  list: {
    paddingBottom: 8,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  lineName: {
    flex: 1,
    marginRight: 8,
  },
  linePrice: {
    fontWeight: 'bold',
  },
  warning: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 8,
  },
  doneButton: {
    marginTop: 20,
  },
  cancelButton: {
    marginTop: 4,
    // Subirlo ~8mm (≈50dp) respecto al borde inferior.
    marginBottom: 50,
  },
});
