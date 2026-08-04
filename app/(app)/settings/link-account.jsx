import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, HelperText, Snackbar, Text, TextInput, useTheme } from 'react-native-paper';

import { linkInvitationEmailSchema } from '../../../src/application/invitations/linkInvitationEmailSchema';
import { container } from '../../../src/di/container';
import { AppButton } from '../../../src/presentation/components/AppButton';
import { LinkedAccountBanner } from '../../../src/presentation/components/LinkedAccountBanner';

// Pantalla "Vincular cuenta": tres estados posibles, mutuamente excluyentes
// (nunca puedes tener a la vez un vínculo activo Y una invitación enviada
// pendiente — lo impide send_link_invitation en la migración 0019):
// 1. Ya vinculado → LinkedAccountBanner + desvincular.
// 2. Invitación enviada pendiente → estado + cancelar.
// 3. Ninguno de los dos → formulario para invitar por email.
export default function LinkAccountScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const linkQuery = useQuery({
    queryKey: ['myAccountLink'],
    queryFn: () => container.accountLinkRepository.getMyLink(),
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
    mutationFn: (email) => container.accountLinkRepository.sendInvitation({ email }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mySentLinkInvitation'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (requestId) => container.accountLinkRepository.cancelInvitation(requestId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mySentLinkInvitation'] }),
  });

  const unlinkMutation = useMutation({
    mutationFn: (linkId) => container.accountLinkRepository.unlink(linkId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myAccountLink'] }),
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
          onUnlink={() => unlinkMutation.mutate(linkQuery.data.linkId)}
          isUnlinking={unlinkMutation.isPending}
        />
      ) : sentInvitationQuery.isLoading ? (
        <ActivityIndicator style={styles.spinner} />
      ) : sentInvitationQuery.data ? (
        <View style={[styles.pendingBox, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text variant="titleMedium" style={styles.pendingText}>
            Invitación enviada
            {sentInvitationQuery.data.recipientFirstName ? ` a ${sentInvitationQuery.data.recipientFirstName}` : ''},
            esperando respuesta.
          </Text>
          <AppButton
            mode="outlined"
            loading={cancelMutation.isPending}
            onPress={() => cancelMutation.mutate(sentInvitationQuery.data.requestId)}
          >
            Cancelar invitación
          </AppButton>
        </View>
      ) : (
        <>
          <Text variant="titleMedium" style={styles.title}>
            Invitar por email
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            Vincula tu cuenta con la de otra persona para compartir gasto sin repartir entre las dos.
          </Text>

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
            style={styles.button}
          >
            Enviar invitación
          </AppButton>
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
        {cancelMutation.error?.message ?? unlinkMutation.error?.message ?? 'No se pudo completar la acción.'}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  spinner: {
    marginTop: 24,
  },
  title: {
    marginBottom: 4,
  },
  input: {
    marginTop: 16,
  },
  button: {
    marginTop: 16,
  },
  pendingBox: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  pendingText: {
    marginBottom: 4,
  },
});
