import { MaterialCommunityIcons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Dialog,
  HelperText,
  Portal,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { linkInvitationEmailSchema } from '../../../src/application/invitations/linkInvitationEmailSchema';
import { sendLinkInvitationByEmail } from '../../../src/application/invitations/sendLinkInvitationByEmail';
import { sendLinkInvitationByPhone } from '../../../src/application/invitations/sendLinkInvitationByPhone';
import { container } from '../../../src/di/container';
import { AppButton } from '../../../src/presentation/components/AppButton';
import { LinkedAccountBanner } from '../../../src/presentation/components/LinkedAccountBanner';
import { usePendingLinkInvitations } from '../../../src/presentation/hooks/usePendingLinkInvitations';

// Pantalla "Vincular cuenta": cuatro estados posibles, mutuamente
// excluyentes salvo el 2 (nunca puedes tener a la vez un vínculo activo Y
// una invitación enviada pendiente — lo impide send_link_invitation en la
// migración 0019 — pero SÍ podrías tener a la vez una enviada por ti y otra
// recibida de otra persona, por eso la 2 se comprueba primero):
// 1. Ya vinculado → LinkedAccountBanner + desvincular.
// 2. Invitación RECIBIDA pendiente por responder → tarjeta aceptar/rechazar.
//    Antes esto solo se veía en el diálogo automático de _layout.jsx, que
//    solo se comprueba una vez al abrir la app — si no lo pillabas en ese
//    momento, entrar aquí a mano no mostraba nada. Con esto ya no depende
//    de haber visto el diálogo a tiempo.
// 3. Invitación ENVIADA pendiente → tarjeta de estado + cancelar.
// 4. Ninguno de los anteriores → elegir un contacto (abre WhatsApp para
//    avisar) o invitar por email a mano.
export default function LinkAccountScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [unlinkConfirmVisible, setUnlinkConfirmVisible] = useState(false);

  const linkQuery = useQuery({
    queryKey: ['myAccountLink'],
    queryFn: () => container.accountLinkRepository.getMyLink(),
  });

  const pendingInvitationsQuery = usePendingLinkInvitations(true);
  const incomingInvitation = pendingInvitationsQuery.data?.[0] ?? null;

  const respondMutation = useMutation({
    mutationFn: ({ requestId, accept }) =>
      container.accountLinkRepository.respondToInvitation({ requestId, accept }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pendingLinkInvitations'] });
      queryClient.invalidateQueries({ queryKey: ['myAccountLink'] });
      container.accountLinkRepository
        .notifyInvitationResponded(variables.requestId)
        .catch((error) => {
          console.warn('No se pudo enviar el push de respuesta:', error);
        });
    },
  });

  const sentInvitationQuery = useQuery({
    queryKey: ['mySentLinkInvitation'],
    // Solo hace falta comprobar esto si no estás ya vinculado.
    enabled: linkQuery.data === null,
    queryFn: () => container.accountLinkRepository.getMySentInvitation(),
  });

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(linkInvitationEmailSchema),
    defaultValues: { email: '' },
  });

  const sendMutation = useMutation({
    mutationFn: (email) => sendLinkInvitationByEmail({ email }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mySentLinkInvitation'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (requestId) => container.accountLinkRepository.cancelInvitation(requestId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mySentLinkInvitation'] }),
  });

  const unlinkMutation = useMutation({
    mutationFn: (linkId) => container.accountLinkRepository.unlink(linkId),
    onSuccess: () => {
      setUnlinkConfirmVisible(false);
      queryClient.invalidateQueries({ queryKey: ['myAccountLink'] });
    },
  });

  // Elegir contacto + enviar invitación + abrir WhatsApp son un solo paso
  // para el usuario, así que van en una sola mutación (ver
  // sendLinkInvitationByPhone). Si cancela el selector, o el contacto no
  // tiene teléfono guardado, pickContact devuelve null y aquí no se hace
  // nada — no hace falta molestar con un error por cancelar.
  const phoneMutation = useMutation({
    mutationFn: async () => {
      const contact = await container.contactsRepository.pickContact();
      if (!contact) return null;
      return sendLinkInvitationByPhone({ phone: contact.phone });
    },
    onSuccess: (result) => {
      if (result) queryClient.invalidateQueries({ queryKey: ['mySentLinkInvitation'] });
    },
  });

  const onSubmit = ({ email }) => sendMutation.mutate(email);

  if (linkQuery.isLoading) {
    return <ActivityIndicator style={styles.spinner} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {linkQuery.data ? (
        <LinkedAccountBanner
          link={linkQuery.data}
          onUnlink={() => setUnlinkConfirmVisible(true)}
          isUnlinking={unlinkMutation.isPending}
        />
      ) : incomingInvitation ? (
        <View
          style={[
            styles.card,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
          ]}
        >
          <View style={[styles.iconBadge, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons
              name="link-variant"
              size={30}
              color={theme.colors.onPrimaryContainer}
            />
          </View>
          <Text variant="titleLarge" style={styles.centerText}>
            Invitación recibida
          </Text>
          <Text style={[styles.centerText, { color: theme.colors.onSurfaceVariant }]}>
            {incomingInvitation.senderFirstName} {incomingInvitation.senderLastName} te ha invitado
            a vincular vuestras cuentas, para compartir gasto entre las dos sin tener que repartir.
          </Text>
          <View style={styles.respondRow}>
            <AppButton
              mode="outlined"
              loading={respondMutation.isPending && respondMutation.variables?.accept === false}
              disabled={respondMutation.isPending}
              onPress={() =>
                respondMutation.mutate({ requestId: incomingInvitation.requestId, accept: false })
              }
              style={styles.respondButton}
            >
              Rechazar
            </AppButton>
            <AppButton
              mode="contained"
              loading={respondMutation.isPending && respondMutation.variables?.accept === true}
              disabled={respondMutation.isPending}
              onPress={() =>
                respondMutation.mutate({ requestId: incomingInvitation.requestId, accept: true })
              }
              style={styles.respondButton}
            >
              Aceptar
            </AppButton>
          </View>
        </View>
      ) : sentInvitationQuery.isLoading ? (
        <ActivityIndicator style={styles.spinner} />
      ) : sentInvitationQuery.data ? (
        <View
          style={[
            styles.card,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
          ]}
        >
          <View style={[styles.iconBadge, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={30}
              color={theme.colors.onPrimaryContainer}
            />
          </View>
          <Text variant="titleLarge" style={styles.centerText}>
            Invitación enviada
          </Text>
          <Text style={[styles.centerText, { color: theme.colors.onSurfaceVariant }]}>
            {sentInvitationQuery.data.recipientFirstName
              ? `Esperando respuesta de ${sentInvitationQuery.data.recipientFirstName}`
              : 'Esperando respuesta'}
          </Text>
          <Text
            style={[styles.centerText, styles.expiry, { color: theme.colors.onSurfaceVariant }]}
          >
            Caduca el {formatDateTime(sentInvitationQuery.data.expiresAt)}
          </Text>
          <AppButton
            mode="outlined"
            loading={cancelMutation.isPending}
            onPress={() => cancelMutation.mutate(sentInvitationQuery.data.requestId)}
            style={styles.stretchButton}
          >
            Cancelar invitación
          </AppButton>
        </View>
      ) : (
        <>
          <Text style={[styles.intro, { color: theme.colors.onSurfaceVariant }]}>
            Vincula tu cuenta con la de otra persona: así, entre los dos, podéis ir añadiendo a la
            misma cuenta.
          </Text>

          <Pressable
            onPress={() => phoneMutation.mutate()}
            disabled={phoneMutation.isPending}
            style={[
              styles.option,
              { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={[styles.optionIcon, { backgroundColor: theme.colors.primaryContainer }]}>
              {phoneMutation.isPending ? (
                <ActivityIndicator size={20} />
              ) : (
                <MaterialCommunityIcons
                  name="whatsapp"
                  size={24}
                  color={theme.colors.onPrimaryContainer}
                />
              )}
            </View>
            <View style={styles.optionText}>
              <Text variant="titleMedium">Invitar por WhatsApp</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                Elige un contacto de tu agenda
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color={theme.colors.onSurfaceVariant}
            />
          </Pressable>
          {phoneMutation.isError ? (
            <HelperText type="error" visible>
              {phoneMutation.error?.message ?? 'No se pudo enviar la invitación.'}
            </HelperText>
          ) : null}

          <Text style={[styles.separator, { color: theme.colors.onSurfaceVariant }]}>
            o por email
          </Text>

          <View
            style={[
              styles.emailCard,
              { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.emailCardHeader}>
              <View style={[styles.optionIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                <MaterialCommunityIcons
                  name="email-outline"
                  size={24}
                  color={theme.colors.onPrimaryContainer}
                />
              </View>
              <Text variant="titleMedium">Invitar por email</Text>
            </View>

            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <TextInput
                  label="Email"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={!!errors.email}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
              )}
            />
            <HelperText type="error" visible={!!errors.email}>
              {errors.email?.message}
            </HelperText>

            {sendMutation.isError ? (
              <HelperText type="error" visible>
                {sendMutation.error?.message ?? 'No se pudo enviar la invitación.'}
              </HelperText>
            ) : null}

            <AppButton
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting || sendMutation.isPending}
              style={styles.stretchButton}
            >
              Enviar invitación
            </AppButton>
          </View>
        </>
      )}

      <Snackbar
        visible={cancelMutation.isError || unlinkMutation.isError}
        onDismiss={() => {
          cancelMutation.reset();
          unlinkMutation.reset();
        }}
        duration={4000}
      >
        {cancelMutation.error?.message ??
          unlinkMutation.error?.message ??
          'No se pudo completar la acción.'}
      </Snackbar>

      <Portal>
        <Dialog visible={unlinkConfirmVisible} onDismiss={() => setUnlinkConfirmVisible(false)}>
          <Dialog.Title>¿Desvincular cuenta?</Dialog.Title>
          <Dialog.Content>
            <Text>
              Dejaréis de compartir el fondo común. Podréis volver a vincularos más adelante si
              queréis.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <AppButton mode="text" onPress={() => setUnlinkConfirmVisible(false)}>
              Cancelar
            </AppButton>
            <AppButton
              mode="contained"
              loading={unlinkMutation.isPending}
              onPress={() => unlinkMutation.mutate(linkQuery.data.linkId)}
            >
              Desvincular
            </AppButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  spinner: {
    marginTop: 24,
  },
  intro: {
    marginBottom: 20,
    textAlign: 'center',
  },
  // Tarjeta de estado (invitación enviada pendiente) — mismo lenguaje
  // visual que LinkedAccountBanner: icono en una insignia circular, texto
  // centrado, botón a todo lo ancho.
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  centerText: {
    textAlign: 'center',
  },
  expiry: {
    fontSize: 15,
    marginTop: 8,
  },
  stretchButton: {
    marginTop: 20,
    alignSelf: 'stretch',
  },
  respondRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    alignSelf: 'stretch',
  },
  respondButton: {
    flex: 1,
  },
  // Fila de "Invitar por WhatsApp": mismo patrón que las opciones de
  // bars/[barId]/edit.jsx (icono + texto + chevron, tarjeta con borde).
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
  separator: {
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emailCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  emailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 4,
  },
  input: {
    marginTop: 16,
  },
});
