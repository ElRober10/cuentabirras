import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Dialog, Divider, Portal, Snackbar, Text, useTheme } from 'react-native-paper';

import { reopenClosedTab } from '../../../src/application/tabs/reopenClosedTab';
import { container } from '../../../src/di/container';
import { AppButton } from '../../../src/presentation/components/AppButton';
import { centsToEuros } from '../../../src/shared/utils/money';

// Histórico de cuentas: todas las tuyas, de cualquier bar, más reciente
// primero (getMyTabHistory ya las trae así). Tocar una ABIERTA te lleva
// directa a seguir añadiendo; tocar una CERRADA pregunta si quieres
// reabrirla (por si se cerró por error) — reopenClosedTab ya se encarga de
// no dejar reabrir si ese bar ya tiene otra cuenta abierta ahora mismo.
export default function TabHistoryScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  // Cuenta cerrada pendiente de confirmar reapertura (o null si no hay
  // ningún diálogo abierto ahora mismo).
  const [reopenCandidate, setReopenCandidate] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const historyQuery = useQuery({
    queryKey: ['myTabHistory'],
    queryFn: () => container.tabRepository.getMyTabHistory(),
  });

  const reopenMutation = useMutation({
    mutationFn: ({ tabId, barId }) => reopenClosedTab({ tabId, barId }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['myTabHistory'] });
      setReopenCandidate(null);
      router.push(`/bars/${variables.barId}/tab/${variables.tabId}`);
    },
    onError: (error) => {
      setErrorMessage(error.message ?? 'No se pudo reabrir la cuenta.');
      setReopenCandidate(null);
    },
  });

  const handlePressRow = (entry) => {
    if (entry.status === 'open') {
      router.push(`/bars/${entry.barId}/tab/${entry.tabId}`);
      return;
    }
    setReopenCandidate(entry);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {historyQuery.isLoading ? (
        <ActivityIndicator style={styles.spinner} />
      ) : (
        <FlatList
          data={historyQuery.data}
          keyExtractor={(entry) => entry.tabId}
          ItemSeparatorComponent={Divider}
          contentContainerStyle={styles.list}
          renderItem={({ item: entry }) => (
            <Pressable onPress={() => handlePressRow(entry)} style={styles.row}>
              <View style={styles.rowInfo}>
                <Text variant="titleMedium" numberOfLines={1}>
                  {entry.barName}
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>{formatDate(entry.createdAt)}</Text>
              </View>
              <View style={styles.rowEnd}>
                <Text variant="titleMedium">{centsToEuros(entry.totalCents)} €</Text>
                <Text
                  style={[
                    styles.statusBadge,
                    { color: entry.status === 'open' ? theme.colors.primary : theme.colors.onSurfaceVariant },
                  ]}
                >
                  {entry.status === 'open' ? 'Abierta' : 'Cerrada'}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Todavía no tienes ninguna cuenta.</Text>}
        />
      )}

      <Portal>
        <Dialog visible={!!reopenCandidate} onDismiss={() => setReopenCandidate(null)}>
          <Dialog.Title>¿Reabrir esta cuenta?</Dialog.Title>
          <Dialog.Content>
            <Text>
              Se volverá a poder añadir bebidas en &quot;{reopenCandidate?.barName}&quot;, como si nunca se hubiera
              cerrado.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <AppButton mode="text" onPress={() => setReopenCandidate(null)}>
              Cancelar
            </AppButton>
            <AppButton
              mode="contained"
              loading={reopenMutation.isPending}
              onPress={() => reopenMutation.mutate({ tabId: reopenCandidate.tabId, barId: reopenCandidate.barId })}
            >
              Reabrir
            </AppButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={!!errorMessage} onDismiss={() => setErrorMessage(null)} duration={4000}>
        {errorMessage}
      </Snackbar>
    </View>
  );
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  spinner: {
    marginTop: 24,
  },
  // 1mm ≈ 6.3dp en móvil — 8mm de aire para que la última fila no quede
  // pegada a los botones de gestos/navegación (mismo motivo que en
  // bars/[barId]/settings.jsx).
  list: {
    paddingBottom: 50,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowInfo: {
    flex: 1,
    marginRight: 12,
  },
  rowEnd: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  empty: {
    textAlign: 'center',
    marginTop: 32,
    opacity: 0.7,
    paddingHorizontal: 24,
  },
});
