import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

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

  // Tope máximo del radio. Más que de sobra (media España) y evita que el
  // número se salga del campo o que se guarden barbaridades por un cero de más.
  const MAX_RADIUS_KM = 9999;

  const handleRadiusChange = (text) => {
    // Solo dígitos y un punto decimal — evita guardar cualquier otra cosa
    // por error (el teclado numérico ya ayuda, pero por si acaso).
    const cleaned = text.replace(',', '.').replace(/[^0-9.]/g, '');
    const parsed = Number(cleaned);
    // Si ya se pasa del tope mientras escribe, recortar en el acto.
    setRadiusInput(Number.isFinite(parsed) && parsed > MAX_RADIUS_KM ? String(MAX_RADIUS_KM) : cleaned);
  };

  const handleRadiusBlur = () => {
    const parsed = Math.min(Number(radiusInput), MAX_RADIUS_KM);
    if (Number.isFinite(parsed) && parsed > 0) {
      setRadiusInput(String(parsed));
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
        {/* TextInput plano de React Native (no el de Paper): el de Paper, en
            modo "outlined", fuerza una altura mínima grande pensada para
            albergar su etiqueta flotante — aquí no hay etiqueta y quedaba un
            recuadro desproporcionado. Con uno plano controlamos el alto y el
            "km" va en la misma línea que el número. */}
        <View style={[styles.radiusField, { borderColor: theme.colors.outline }]}>
          <TextInput
            value={radiusInput}
            onChangeText={handleRadiusChange}
            onBlur={handleRadiusBlur}
            keyboardType="decimal-pad"
            maxLength={6}
            selectionColor={theme.colors.primary}
            style={[styles.radiusFieldInput, { color: theme.colors.onSurface }]}
          />
          <Text style={{ color: theme.colors.onSurfaceVariant }}>km</Text>
        </View>
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

      <Pressable
        onPress={() => router.push('/settings/delete-account')}
        style={[styles.option, { borderColor: theme.colors.outlineVariant }]}
      >
        <MaterialCommunityIcons name="account-remove-outline" size={26} color={theme.colors.error} />
        <View style={styles.optionText}>
          <Text variant="titleMedium" style={{ color: theme.colors.error }}>
            Borrar mi cuenta
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            Elimina tu cuenta y tus datos de forma permanente
          </Text>
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
  radiusField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 120,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  radiusFieldInput: {
    flex: 1,
    textAlign: 'right',
    fontSize: 16,
    paddingVertical: 0,
  },
});
