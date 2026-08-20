import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';
import { Divider, HelperText, Text, TextInput, useTheme } from 'react-native-paper';

import { createBarSchema } from '../../../src/application/bars/createBarSchema';
import { findNearbyPublicBars } from '../../../src/application/bars/findNearbyPublicBar';
import { container } from '../../../src/di/container';
import { deviceLocation } from '../../../src/infrastructure/location/deviceLocation';
import { AppButton } from '../../../src/presentation/components/AppButton';
import { KeyboardAwareScreen } from '../../../src/presentation/components/KeyboardAwareScreen';

// Antes, esta pantalla era "escribe un nombre y crea" — solo DESPUÉS de
// enviar el formulario se comprobaba si había bares cerca y se
// interrumpía con un diálogo "¿es este?". El usuario pidió darle la
// vuelta: enseñar los bares que ya existen cerca de ti desde el principio
// (antes incluso de escribir nada), para elegir uno directamente, en vez
// de tener que escribir el nombre a ciegas y que la app te avise después.
export default function NewBarScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState(null);
  const [isJoining, setIsJoining] = useState(false);
  // Bares públicos a menos de 500m (ver findNearbyPublicBar.js) — se piden
  // UNA vez, en cuanto se resuelve tu ubicación, y a partir de ahí solo se
  // filtran en pantalla según lo que vayas escribiendo (sin volver a
  // pedirlos cada vez que tecleas).
  const [nearbyBars, setNearbyBars] = useState([]);

  // useState con una función como valor inicial ("inicializador perezoso")
  // se ejecuta UNA sola vez, en cuanto se monta la pantalla — así lanzamos
  // la petición de ubicación en segundo plano desde el primer instante.
  const [positionPromise] = useState(() => deviceLocation.getCurrentPosition());

  useEffect(() => {
    let cancelled = false;
    positionPromise.then(async (position) => {
      // findNearbyPublicBars ya sabe devolver [] si position es null (sin
      // permiso de ubicación) — se le pasa {} en ese caso solo para no
      // desestructurar sobre null.
      const bars = await findNearbyPublicBars(position ?? {});
      if (!cancelled) setNearbyBars(bars);
    });
    return () => {
      cancelled = true;
    };
  }, [positionPromise]);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createBarSchema),
    defaultValues: { name: '' },
  });

  // Sin escribir nada todavía, se enseñan TODOS los bares cercanos (para
  // poder elegir uno de un vistazo, sin tener que escribir su nombre
  // exacto); en cuanto escribes, se filtran por lo que coincida.
  const typedName = watch('name');
  const matchingBars = typedName.trim()
    ? nearbyBars.filter((bar) => bar.name.toLowerCase().includes(typedName.trim().toLowerCase()))
    : nearbyBars;

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      // La ubicación es opcional en todos los sentidos: si no hay permiso o
      // falla, `position` es null y el bar se crea igualmente, sin
      // coordenadas (queda privado). Reutilizamos la petición que ya
      // lanzamos al abrir la pantalla, en vez de pedirla de nuevo aquí.
      const position = await positionPromise;

      const bar = await container.barRepository.createBar({
        name: values.name,
        latitude: position?.latitude,
        longitude: position?.longitude,
      });

      // Lo metemos el primero en la lista que ya tenemos en caché, para que
      // se vea al instante en la pantalla principal sin esperar a una nueva
      // consulta (que además volvería a pedir la ubicación GPS — lenta).
      queryClient.setQueryData(['bars'], (previousBars) => [bar, ...(previousBars ?? [])]);
      // Y de todas formas disparamos un refresco real en segundo plano, para
      // que la próxima vez ya salga ordenado por distancia/visitas de verdad.
      queryClient.invalidateQueries({ queryKey: ['bars'] });

      // Al terminar de crear un bar, volvemos a la pantalla principal (no
      // entramos directo) — así lo ves en tu lista y decides tú cuándo entrar.
      router.back();
    } catch (error) {
      setServerError(error.message);
    }
  };

  // Unirse a un bar ya existente: hace falta llamar a joinBar (RPC
  // security definer, migración 0018) ANTES de navegar — hasta ese
  // momento no eres miembro, así que ni RLS te dejaría verlo ni te saldría
  // luego en tu lista. queryClient.invalidateQueries hace que la próxima
  // vez que vuelvas a la pantalla principal ya salga en tu lista.
  const handleUseExisting = async (barId) => {
    setServerError(null);
    setIsJoining(true);
    try {
      await container.barRepository.joinBar(barId);
      queryClient.invalidateQueries({ queryKey: ['bars'] });
      router.replace(`/bars/${barId}`);
    } catch (error) {
      setServerError(error.message);
      setIsJoining(false);
    }
  };

  return (
    <KeyboardAwareScreen>
      <Text variant="headlineSmall">Nuevo bar</Text>
      <Text style={[styles.intro, { color: theme.colors.onSurfaceVariant }]}>
        Busca un bar que ya exista cerca de ti, o escribe uno nuevo para crearlo.
      </Text>

      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <TextInput
            label="Nombre del bar"
            value={field.value}
            onChangeText={field.onChange}
            error={!!errors.name}
            style={styles.input}
          />
        )}
      />
      <HelperText type="error" visible={!!errors.name}>
        {errors.name?.message}
      </HelperText>

      {matchingBars.length > 0 ? (
        <View
          style={[styles.suggestions, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.suggestionsTitle, { color: theme.colors.onSurfaceVariant }]}>
            {typedName.trim() ? 'Bares que coinciden, cerca de ti' : 'Bares cerca de ti'}
          </Text>
          {matchingBars.map((bar, index) => (
            <View key={bar.id}>
              {index > 0 ? <Divider /> : null}
              <Pressable onPress={() => handleUseExisting(bar.id)} disabled={isJoining} style={styles.suggestionRow}>
                <Text variant="titleMedium">{bar.name}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {serverError ? (
        <HelperText type="error" visible>
          {serverError}
        </HelperText>
      ) : null}

      <AppButton mode="contained" onPress={handleSubmit(onSubmit)} loading={isSubmitting || isJoining} style={styles.button}>
        Crear bar nuevo
      </AppButton>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginTop: 4,
    marginBottom: 4,
  },
  input: {
    marginTop: 8,
  },
  button: {
    marginTop: 16,
  },
  suggestions: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
  },
  suggestionsTitle: {
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  suggestionRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
