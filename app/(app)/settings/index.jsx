import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';

import { nearbyRadiusSetting } from '../../../src/infrastructure/settings/nearbyRadiusSetting';
import { useAuth } from '../../../src/presentation/hooks/useAuth';

// Menú de Ajustes: aquí es donde se irán añadiendo más opciones de
// configuración en el futuro.
export default function SettingsScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // Radio de bares cercanos: se guarda como texto mientras se edita (para
  // poder dejarlo momentáneamente vacío o a medio escribir, ej. "2."), y
  // solo se valida/guarda de verdad al salir del campo (onBlur).
  const [radiusInput, setRadiusInput] = useState('');

  useEffect(() => {
    nearbyRadiusSetting.get().then((km) => setRadiusInput(String(km)));
  }, []);

  const handleRadiusChange = (text) => {
    // Solo dígitos y un punto decimal — evita guardar cualquier otra cosa
    // por error (el teclado numérico ya ayuda, pero por si acaso).
    setRadiusInput(text.replace(',', '.').replace(/[^0-9.]/g, ''));
  };

  const handleRadiusBlur = () => {
    const parsed = Number(radiusInput);
    if (Number.isFinite(parsed) && parsed > 0) {
      nearbyRadiusSetting.set(parsed);
      // Sin esto, la lista de bares (pantalla de inicio) no reflejaría el
      // radio nuevo hasta su próximo refresco automático (staleTime de 30s).
      queryClient.invalidateQueries({ queryKey: ['bars'] });
    } else {
      // Vacío o no numérico: se vuelve al último valor guardado en vez de
      // dejar el campo en un estado inválido.
      nearbyRadiusSetting.get().then((km) => setRadiusInput(String(km)));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.option, { borderColor: theme.colors.outlineVariant }]}>
        <MaterialCommunityIcons name="map-marker-radius-outline" size={26} color={theme.colors.primary} />
        <View style={styles.optionText}>
          <Text variant="titleMedium">Radio de bares cercanos</Text>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Solo se enseñan los bares dentro de esta distancia</Text>
        </View>
        <TextInput
          value={radiusInput}
          onChangeText={handleRadiusChange}
          onBlur={handleRadiusBlur}
          keyboardType="decimal-pad"
          mode="outlined"
          dense
          right={<TextInput.Affix text="km" />}
          style={styles.radiusInput}
        />
      </View>

      <Pressable
        onPress={() => router.push('/settings/edit-profile')}
        style={[styles.option, { borderColor: theme.colors.outlineVariant }]}
      >
        <MaterialCommunityIcons name="account-edit-outline" size={26} color={theme.colors.primary} />
        <View style={styles.optionText}>
          <Text variant="titleMedium">Editar datos personales</Text>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Nombre, email, teléfono y contraseña</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
      </Pressable>

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

      {/* La protección de verdad está en el RPC (comprueba is_admin y
          lanza si no lo eres) — esto solo evita que alguien que no es
          admin vea la entrada, no es la barrera de seguridad real. */}
      {user?.isAdmin ? (
        <Pressable
          onPress={() => router.push('/settings/admin')}
          style={[styles.option, { borderColor: theme.colors.outlineVariant }]}
        >
          <MaterialCommunityIcons name="shield-crown-outline" size={26} color={theme.colors.primary} />
          <View style={styles.optionText}>
            <Text variant="titleMedium">Panel de administración</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>Cifras generales de toda la app</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
        </Pressable>
      ) : null}
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
  radiusInput: {
    width: 90,
    height: 44,
  },
});
