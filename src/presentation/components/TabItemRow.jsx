import { Image, StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';

import { GENERIC_DRINK_ICON_IMAGE, getDrinkIcon, getUnitImage } from '../../shared/constants/drinkIcons';
import { DrinkUnitIcon } from './DrinkUnitIcon';

// Mismo verde de DRINK_COLOR_PALETTE (drinkCategories.js) — para que el "+"
// destaque como acción positiva sin desentonar con la paleta ya usada en el
// resto de la app (el tema no tiene un color "verde" propio, solo el ámbar).
const ADD_COLOR = '#43A047';

// Tamaño "base" (scale 1) de cada unidad dentro de la fila.
const UNIT_BASE = { width: 38, height: 61 };
// Cuando no hay icono propio (bebida "Otro", creada a mano), se usa el
// dibujo genérico de respaldo (GENERIC_DRINK_ICON_IMAGE) en un hueco cuadrado.
const FALLBACK_UNIT_SIZE = { width: 32, height: 32 };

// Una fila del "recibo" de la cuenta: un tipo de bebida, con tantos iconos
// repetidos como unidades llevas de esa bebida (numerados debajo, 1, 2, 3...
// para poder contarlas de un vistazo, y volteables al tocarlos para ver a
// qué hora se pidió cada una — ver DrinkUnitIcon), y dos botones: uno para
// añadir una unidad MÁS de esta misma bebida sin pasar por el selector del
// botón + (más rápido que la primera vez, que sí necesita el selector para
// elegir cuál es), y otro para quitar la última (por si te equivocas al
// tocar). Los iconos ocupan todo el ancho disponible (flex:1) y los botones
// quedan pegados al borde derecho — como la fila entera alinea por abajo
// (alignItems: flex-end), siempre caen a la altura de la ÚLTIMA línea de
// iconos, tenga las que tenga.
export function TabItemRow({ catalogItem, quantity, timestamps, onAddOne, onRemoveOne, disabled }) {
  const theme = useTheme();
  const customIcon = catalogItem.icon ? getDrinkIcon(catalogItem.icon) : null;
  const unitSize = customIcon
    ? { width: UNIT_BASE.width * customIcon.scale, height: UNIT_BASE.height * customIcon.scale }
    : FALLBACK_UNIT_SIZE;

  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.outlineVariant }]}>
      <View style={styles.units}>
        {Array.from({ length: quantity }, (_, index) => (
          <View key={index} style={styles.unit}>
            <DrinkUnitIcon
              timestamp={timestamps?.[index]}
              size={unitSize}
              renderIcon={() => (
                <Image
                  source={customIcon ? getUnitImage(customIcon, index + 1) : GENERIC_DRINK_ICON_IMAGE}
                  style={unitSize}
                  resizeMode="contain"
                />
              )}
            />
            <Text style={styles.unitNumber}>{index + 1}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <IconButton
          icon="plus-circle"
          iconColor={ADD_COLOR}
          size={22}
          onPress={onAddOne}
          disabled={disabled}
          style={styles.actionButton}
        />
        <IconButton
          icon="close-circle"
          iconColor={theme.colors.error}
          size={22}
          onPress={onRemoveOne}
          disabled={disabled}
          style={styles.actionButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    // Raya de separación entre bebidas, sutil (poca opacidad) para que no
    // compita visualmente con los iconos.
    borderBottomWidth: 1,
  },
  units: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 0,
  },
  unit: {
    alignItems: 'center',
  },
  unitNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    opacity: 0.7,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'column',
    marginLeft: 4,
  },
  actionButton: {
    margin: 0,
  },
});
