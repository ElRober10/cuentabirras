import { Dialog, Portal } from 'react-native-paper';

import { AppButton } from './AppButton';

// Diálogo genérico de "¿seguro?": título + cuerpo opcional (texto libre,
// puede incluir un HelperText de error) + Cancelar/Confirmar. Se usa en
// TODOS los sitios de la app que preguntan antes de una acción (cerrar
// sesión, quitar un bar, desvincular cuenta, reabrir una cuenta...) — antes
// cada pantalla tenía su propia copia de este mismo <Dialog>, hasta el
// punto de que "¿Desvincular cuenta?" estaba literalmente duplicado en dos
// sitios distintos. Al cambiar algo (texto, comportamiento) ahora solo hay
// un componente que tocar.
export function ConfirmDialog({
  visible,
  title,
  children,
  cancelLabel = 'Cancelar',
  confirmLabel,
  onCancel,
  onConfirm,
  confirmLoading = false,
}) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onCancel}>
        <Dialog.Title>{title}</Dialog.Title>
        {children ? <Dialog.Content>{children}</Dialog.Content> : null}
        <Dialog.Actions>
          <AppButton mode="text" onPress={onCancel}>
            {cancelLabel}
          </AppButton>
          <AppButton mode="contained" loading={confirmLoading} onPress={onConfirm}>
            {confirmLabel}
          </AppButton>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
