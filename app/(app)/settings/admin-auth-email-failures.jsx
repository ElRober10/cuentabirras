import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';

import { container } from '../../../src/di/container';

// Incidencias de "no se pudo enviar el email de auth" — ver
// supabase/migrations/0040_notify_admin_auth_email_failure.sql. El cliente
// (SupabaseAuthRepository.js) las registra cuando GoTrue devuelve un 500 al
// mandar el email de confirmar registro / recuperar contraseña / cambiar
// email; al admin ya le llega un push (throttleado a 1 cada 15 min), esta
// pantalla es el historial consultable para ver el alcance.
const FLOW_LABEL = {
  signup: 'Confirmar registro',
  password_reset: 'Recuperar contraseña',
  email_change: 'Cambiar email de acceso',
};

function formatDate(iso) {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminAuthEmailFailuresScreen() {
  const theme = useTheme();

  const failuresQuery = useQuery({
    queryKey: ['adminAuthEmailFailures'],
    queryFn: () => container.adminRepository.getAuthEmailFailures(),
  });

  if (failuresQuery.isLoading) {
    return <ActivityIndicator style={styles.spinner} />;
  }

  if (failuresQuery.isError) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error }}>
          {failuresQuery.error?.message ?? 'No se pudo cargar la lista.'}
        </Text>
      </View>
    );
  }

  const failures = failuresQuery.data ?? [];

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      style={{ backgroundColor: theme.colors.background }}
    >
      {failures.length === 0 ? (
        <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 24 }}>
          No hay ningún fallo de envío de email en los últimos 30 días.
        </Text>
      ) : (
        failures.map((failure, index) => (
          <View
            key={`${failure.createdAt}-${index}`}
            style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
          >
            <View style={[styles.iconBadge, { backgroundColor: theme.colors.errorContainer }]}>
              <MaterialCommunityIcons name="email-alert-outline" size={26} color={theme.colors.onErrorContainer} />
            </View>
            <View style={styles.cardText}>
              <Text variant="titleMedium">{FLOW_LABEL[failure.flow] ?? failure.flow}</Text>
              {failure.email ? (
                <Text style={{ color: theme.colors.onSurfaceVariant }}>{failure.email}</Text>
              ) : null}
              <Text style={{ color: theme.colors.onSurfaceVariant }}>{formatDate(failure.createdAt)}</Text>
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
