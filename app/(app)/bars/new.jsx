import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';
import { Dialog, Divider, HelperText, Portal, Text, TextInput } from 'react-native-paper';

import { createBarSchema } from '../../../src/application/bars/createBarSchema';
import { findNearbyPublicBars } from '../../../src/application/bars/findNearbyPublicBar';
import { container } from '../../../src/di/container';
import { deviceLocation } from '../../../src/infrastructure/location/deviceLocation';
import { AppButton } from '../../../src/presentation/components/AppButton';
import { KeyboardAwareScreen } from '../../../src/presentation/components/KeyboardAwareScreen';

export default function NewBarScreen() {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState(null);
  // Bares públicos cercanos encontrados justo antes de crear (array vacío
  // si no hay ninguno, o si no tenemos ubicación para comprobarlo).
  const [nearbyBars, setNearbyBars] = useState([]);

  // useState con una función como valor inicial ("inicializador perezoso")
  // se ejecuta UNA sola vez, en cuanto se monta la pantalla — antes incluso
  // de que escribas el nombre del bar. Así lanzamos la petición de
  // ubicación en segundo plano desde el primer instante, y cuando llegue el
  // momento de crear el bar, si ya se resolvió la usamos al momento, y si
  // no, esperamos lo que quede (pero ya lleva un rato en marcha).
  const [positionPromise] = useState(() => deviceLocation.getCurrentPosition());

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createBarSchema),
    defaultValues: { name: '' },
  });

  // Se llama tanto al enviar el formulario la primera vez, como al confirmar
  // "crear uno nuevo de todas formas" tras ver el aviso de duplicado.
  const createBar = async (values, { skipDuplicateCheck = false } = {}) => {
    setServerError(null);
    try {
      // La ubicación es opcional en todos los sentidos: si no hay permiso o
      // falla, `position` es null y el bar se crea igualmente, sin
      // coordenadas (queda privado). Reutilizamos la petición que ya
      // lanzamos al abrir la pantalla, en vez de pedirla de nuevo aquí.
      const position = await positionPromise;

      if (!skipDuplicateCheck && position) {
        const candidates = await findNearbyPublicBars(position);
        if (candidates.length > 0) {
          setNearbyBars(candidates);
          return; // esperamos a que el usuario decida en el diálogo
        }
      }

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

  const onSubmit = (values) => createBar(values);

  // Unirse a un bar ya existente: hace falta llamar a joinBar (RPC
  // security definer, migración 0018) ANTES de navegar — hasta ese
  // momento no eres miembro, así que ni RLS te dejaría verlo ni te saldría
  // luego en tu lista. queryClient.invalidateQueries hace que la próxima
  // vez que vuelvas a la pantalla principal ya salga en tu lista.
  const handleUseExisting = async (barId) => {
    setNearbyBars([]);
    setServerError(null);
    try {
      await container.barRepository.joinBar(barId);
      queryClient.invalidateQueries({ queryKey: ['bars'] });
      router.replace(`/bars/${barId}`);
    } catch (error) {
      setServerError(error.message);
    }
  };

  const handleCreateAnyway = handleSubmit((values) => {
    setNearbyBars([]);
    createBar(values, { skipDuplicateCheck: true });
  });

  return (
    <KeyboardAwareScreen>
      <Text variant="headlineSmall">Nuevo bar</Text>

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

      {serverError ? (
        <HelperText type="error" visible>
          {serverError}
        </HelperText>
      ) : null}

      <AppButton mode="contained" onPress={handleSubmit(onSubmit)} loading={isSubmitting} style={styles.button}>
        Crear bar
      </AppButton>

      <Portal>
        <Dialog visible={nearbyBars.length > 0} onDismiss={() => setNearbyBars([])}>
          <Dialog.Title>¿Ya existe este bar?</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.nearbyIntro}>
              Hay {nearbyBars.length === 1 ? 'un bar muy cerca' : `${nearbyBars.length} bares muy cerca`}. Si es
              alguno de estos, entra directamente; si no, crea uno nuevo.
            </Text>
          </Dialog.Content>
          {nearbyBars.map((bar, index) => (
            <View key={bar.id}>
              {index > 0 ? <Divider /> : null}
              <Pressable onPress={() => handleUseExisting(bar.id)} style={styles.nearbyRow}>
                <Text variant="titleMedium">{bar.name}</Text>
              </Pressable>
            </View>
          ))}
          <Dialog.Actions>
            <AppButton mode="text" onPress={handleCreateAnyway}>
              Crear un bar nuevo
            </AppButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  input: {
    marginTop: 8,
  },
  button: {
    marginTop: 16,
  },
  nearbyIntro: {
    marginBottom: 4,
  },
  nearbyRow: {
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
});
