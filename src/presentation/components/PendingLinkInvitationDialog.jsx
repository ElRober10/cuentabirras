import { ActivityIndicator, Dialog, Portal, Text } from 'react-native-paper';

import { AppButton } from './AppButton';

// Se muestra nada más iniciar sesión (o desbloquear con huella) si hay
// alguna invitación de "vincular cuenta" pendiente dirigida a ti — ver
// app/(app)/_layout.jsx, que es quien la monta y quien maneja la mutación
// de aceptar/rechazar. Como mucho hay una pendiente a la vez (índice único
// en la migración 0019), así que solo se pinta la primera.
export function PendingLinkInvitationDialog({ invitation, onAccept, onReject, isResponding }) {
  if (!invitation) return null;

  return (
    <Portal>
      <Dialog visible dismissable={false}>
        <Dialog.Title>Invitación para vincular cuenta</Dialog.Title>
        <Dialog.Content>
          <Text>
            {invitation.senderFirstName} {invitation.senderLastName} te ha invitado a vincular vuestras cuentas,
            para compartir gasto entre las dos sin tener que repartir.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          {isResponding ? (
            <ActivityIndicator style={{ marginHorizontal: 16 }} />
          ) : (
            <>
              <AppButton mode="text" onPress={onReject}>
                Rechazar
              </AppButton>
              <AppButton mode="contained" onPress={onAccept}>
                Aceptar
              </AppButton>
            </>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
