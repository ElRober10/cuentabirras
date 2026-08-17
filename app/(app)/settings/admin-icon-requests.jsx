import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Dialog, Portal, Snackbar, Text, useTheme } from 'react-native-paper';

import { container } from '../../../src/di/container';
import { DRINK_ICONS } from '../../../src/shared/constants/drinkIcons';

// Lista de bebidas "Otro" (sin icono) agrupadas por nombre — ver
// supabase/migrations/0034_pending_icon_requests.sql. Al tocar una, se
// abre un selector con los iconos YA disponibles en la app (los de
// drinkIcons.js); elegir uno actualiza de golpe TODAS las catalog_items
// pendientes con ese nombre, en cualquier bar. Pensada para el flujo: el
// admin ve aquí qué nombres piden icono, dibuja/sube uno nuevo a
// drinkIcons.js, publica una actualización, y luego vuelve aquí a asignarlo.
export default function AdminIconRequestsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [targetName, setTargetName] = useState(null);
  const [isApplying, setIsApplying] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const requestsQuery = useQuery({
    queryKey: ['pendingIconRequests'],
    queryFn: () => container.adminRepository.getPendingIconRequests(),
  });

  const applyIcon = async (icon) => {
    if (!targetName) return;
    setIsApplying(true);
    try {
      const updated = await container.adminRepository.applyIconToPendingDrinks({ name: targetName, icon: icon.value });
      setFeedback(`"${targetName}" → ${icon.label}: ${updated} ${updated === 1 ? 'bebida actualizada' : 'bebidas actualizadas'}.`);
      setTargetName(null);
      queryClient.invalidateQueries({ queryKey: ['pendingIconRequests'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
    } catch (error) {
      setFeedback(error.message ?? 'No se pudo aplicar el icono.');
    } finally {
      setIsApplying(false);
    }
  };

  if (requestsQuery.isLoading) {
    return <ActivityIndicator style={styles.spinner} />;
  }

  if (requestsQuery.isError) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error }}>
          {requestsQuery.error?.message ?? 'No se pudo cargar la lista.'}
        </Text>
      </View>
    );
  }

  const requests = requestsQuery.data ?? [];

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
        style={{ backgroundColor: theme.colors.background }}
      >
        {requests.length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 24 }}>
            No hay ninguna bebida &quot;Otro&quot; pendiente de icono ahora mismo.
          </Text>
        ) : (
          requests.map((request) => (
            <Pressable
              key={request.name}
              onPress={() => setTargetName(request.name)}
              style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
            >
              <View style={[styles.iconBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                <MaterialCommunityIcons name="image-off-outline" size={26} color={theme.colors.onPrimaryContainer} />
              </View>
              <View style={styles.cardText}>
                <Text variant="titleMedium">{request.name}</Text>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  {request.pendingCount} {request.pendingCount === 1 ? 'bebida pendiente' : 'bebidas pendientes'}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
            </Pressable>
          ))
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={!!targetName} onDismiss={() => (isApplying ? null : setTargetName(null))}>
          <Dialog.Title>Elige el icono para &quot;{targetName}&quot;</Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScrollArea}>
            <ScrollView contentContainerStyle={styles.iconGrid}>
              {isApplying ? (
                <ActivityIndicator style={styles.spinner} />
              ) : (
                DRINK_ICONS.map((icon) => (
                  <Pressable key={icon.value} onPress={() => applyIcon(icon)} style={styles.iconTile}>
                    <Image source={icon.image} style={styles.iconImage} resizeMode="contain" />
                    <Text variant="bodySmall" style={styles.iconLabel} numberOfLines={1}>
                      {icon.label}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </Dialog.ScrollArea>
        </Dialog>
      </Portal>

      <Snackbar visible={!!feedback} onDismiss={() => setFeedback(null)} duration={4000}>
        {feedback}
      </Snackbar>
    </>
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
  dialogScrollArea: {
    maxHeight: 420,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 8,
  },
  iconTile: {
    width: 80,
    alignItems: 'center',
    gap: 4,
  },
  iconImage: {
    width: 56,
    height: 56,
  },
  iconLabel: {
    textAlign: 'center',
  },
});
