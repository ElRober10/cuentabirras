import { Linking } from 'react-native';
import { Dialog, Portal, Text } from 'react-native-paper';

import { AppButton } from './AppButton';

// Se muestra si useAppUpdateCheck detecta una versión más nueva publicada
// en la tienda que la instalada. Nunca se instala sola (Android/iOS no lo
// permiten) — "Actualizar" solo abre la ficha de la tienda, donde el
// usuario le da a actualizar como con cualquier otra app.
export function UpdateAvailableDialog({ updateInfo, onDismiss }) {
  if (!updateInfo) return null;

  return (
    <Portal>
      <Dialog visible onDismiss={onDismiss}>
        <Dialog.Title>Hay una actualización disponible</Dialog.Title>
        <Dialog.Content>
          <Text>
            Ya tienes disponible una versión más reciente de CuentaBirras. Actualízala para tener las últimas
            mejoras.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <AppButton mode="text" onPress={onDismiss}>
            Ahora no
          </AppButton>
          <AppButton mode="contained" onPress={() => Linking.openURL(updateInfo.url)}>
            Actualizar
          </AppButton>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
