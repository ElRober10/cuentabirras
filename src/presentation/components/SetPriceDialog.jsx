import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Dialog, HelperText, Portal, Text, TextInput } from 'react-native-paper';

import { centsToEuros, eurosToCents } from '../../shared/utils/money';
import { AppButton } from './AppButton';

// Diálogo pequeño para poner o corregir el precio de UNA bebida del
// catálogo. Se usa en dos situaciones (el texto cambia un poco según cuál):
// - La bebida todavía no tiene precio guardado (se pregunta antes de
//   añadirla a la cuenta, y ese precio se guarda para las próximas veces).
//   Aquí además se puede "No sé el precio" (onSkip): añade la bebida
//   igualmente, sin precio, y la cuenta avisa de que el total puede no ser
//   exacto hasta que alguien lo corrija.
// - Ya tenía precio, pero el usuario quiere corregirlo (p. ej. ha subido) —
//   aquí no tiene sentido "no sé el precio", así que no se muestra
//   (onSkip no viene informado).
//
// OJO: quien use este componente debe montarlo con un `key` distinto cada
// vez que cambie de bebida (ver [tabId].jsx) — así, en vez de andar
// reseteando el texto con un efecto cada vez que cambian las props (lo que
// el compilador de React desaconseja), React simplemente lo vuelve a crear
// de cero con el valor inicial correcto.
export function SetPriceDialog({ visible, drinkName, initialPriceCents, onDismiss, onSubmit, onSkip }) {
  const [priceEuros, setPriceEuros] = useState(() => (initialPriceCents != null ? centsToEuros(initialPriceCents) : ''));
  const [error, setError] = useState(null);

  const handleSubmit = () => {
    // OJO: eurosToCents('') da 0, no null (Number('') es 0 en JS) — aquí el
    // precio SÍ es obligatorio (a diferencia del formulario de bebida
    // nueva), así que un campo vacío hay que rechazarlo aparte.
    if (priceEuros.trim() === '') {
      setError('Obligatorio');
      return;
    }
    const priceCents = eurosToCents(priceEuros);
    if (priceCents === null) {
      setError('Precio no válido');
      return;
    }
    onSubmit(priceCents);
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{initialPriceCents != null ? 'Corregir precio' : '¿Sabes el precio?'}</Dialog.Title>
        <Dialog.Content>
          <Text style={styles.intro}>
            {initialPriceCents != null
              ? `Nuevo precio de "${drinkName}":`
              : `"${drinkName}" todavía no tiene precio guardado. Si lo sabes, ponlo aquí — se guardará para la próxima vez.`}
          </Text>
          <TextInput label="Precio (€)" value={priceEuros} onChangeText={setPriceEuros} keyboardType="decimal-pad" error={!!error} autoFocus />
          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>
        </Dialog.Content>
        {/* Fila propia (no Dialog.Actions, que solo alinea a la derecha):
            Cancelar a la izquierda, Guardar a la derecha, y "No sé el
            precio" en medio, todos juntos en la misma fila. */}
        <View style={styles.actions}>
          <AppButton mode="text" onPress={onDismiss}>
            Cancelar
          </AppButton>
          {onSkip ? (
            <AppButton mode="text" onPress={onSkip}>
              No sé el precio
            </AppButton>
          ) : null}
          <AppButton mode="contained" onPress={handleSubmit}>
            Guardar
          </AppButton>
        </View>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});
