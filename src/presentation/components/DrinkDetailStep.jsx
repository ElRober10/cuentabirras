import { Image, StyleSheet, View } from 'react-native';
import { HelperText, IconButton, Text, TextInput, useTheme } from 'react-native-paper';

import { GENERIC_DRINK_ICON_IMAGE } from '../../shared/constants/drinkIcons';
import { centsToEuros } from '../../shared/utils/money';
import { AppButton } from './AppButton';

const DETAIL_IMAGE_BASE = { width: 160, height: 260 };

// Paso 2 de AddDrinkModal: una tarjeta grande con el nombre, el precio (el
// que ya tuviera guardado ese icono en este bar, o "sin precio todavía") y
// un contador para añadir de golpe más de una unidad.
export function DrinkDetailStep({
  iconInfo,
  customItemInfo,
  otherName,
  onOtherNameChange,
  otherNameError,
  existingItem,
  quantity,
  onQuantityChange,
  onBack,
  onSetPriceOnly,
  onConfirm,
}) {
  const theme = useTheme();

  return (
    <>
      <View style={styles.detailHeader}>
        <IconButton icon="arrow-left" onPress={onBack} style={styles.backButton} />
        <Text variant="titleMedium">
          {iconInfo ? iconInfo.label : customItemInfo ? customItemInfo.name : 'Bebida nueva'}
        </Text>
      </View>

      {iconInfo ? (
        <Image
          source={iconInfo.image}
          style={[
            styles.detailImage,
            {
              width: DETAIL_IMAGE_BASE.width * iconInfo.scale,
              height: DETAIL_IMAGE_BASE.height * iconInfo.scale,
            },
          ]}
          resizeMode="contain"
        />
      ) : customItemInfo ? (
        <View style={[styles.customDetailIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Image source={GENERIC_DRINK_ICON_IMAGE} style={styles.customDetailImage} resizeMode="contain" />
        </View>
      ) : (
        <>
          <TextInput
            label="Nombre"
            value={otherName}
            onChangeText={onOtherNameChange}
            error={!!otherNameError}
            style={styles.input}
            autoFocus
          />
          <HelperText type="error" visible={!!otherNameError}>
            {otherNameError}
          </HelperText>
        </>
      )}

      {existingItem?.priceCents != null ? (
        <View style={styles.priceRow}>
          <Text style={styles.priceText}>{centsToEuros(existingItem.priceCents)} €</Text>
          <IconButton icon="pencil-outline" size={18} onPress={onSetPriceOnly} />
        </View>
      ) : (
        <View style={styles.noPriceRow}>
          <Text style={styles.priceText}>Sin precio todavía</Text>
          <AppButton mode="text" onPress={onSetPriceOnly}>
            Añadir precio
          </AppButton>
        </View>
      )}

      <View style={styles.stepper}>
        <IconButton
          icon="minus"
          mode="contained-tonal"
          onPress={() => onQuantityChange(Math.max(1, quantity - 1))}
          disabled={quantity <= 1}
        />
        <Text style={styles.quantity}>{quantity}</Text>
        <IconButton icon="plus" mode="contained-tonal" onPress={() => onQuantityChange(quantity + 1)} />
      </View>

      <AppButton mode="contained" onPress={onConfirm} style={styles.submitButton}>
        Añadir a la cuenta
      </AppButton>
    </>
  );
}

const styles = StyleSheet.create({
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    marginLeft: -8,
  },
  detailImage: {
    alignSelf: 'center',
    marginVertical: 12,
  },
  // Bebida "Otro" ya existente: sin ilustración propia, así que se muestra
  // el icono genérico de su categoría dentro de una insignia circular, en
  // vez del dibujo grande de las bebidas con icono de verdad.
  customDetailIcon: {
    alignSelf: 'center',
    marginVertical: 12,
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customDetailImage: {
    width: 64,
    height: 64,
  },
  input: {
    marginTop: 24,
  },
  priceText: {
    textAlign: 'center',
    fontSize: 20,
    marginTop: 12,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPriceRow: {
    alignItems: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quantity: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 20,
  },
  submitButton: {
    marginTop: 12,
  },
});
