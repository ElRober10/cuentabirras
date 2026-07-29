import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { HelperText, IconButton, Modal, Portal, SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';

import { DRINK_CATEGORIES, getDrinkCategory } from '../../shared/constants/drinkCategories';
import { DRINK_ICONS } from '../../shared/constants/drinkIcons';
import { centsToEuros } from '../../shared/utils/money';
import { AppButton } from './AppButton';

// 'otro' no es un valor de drinkIcons.js — es la opción de "ninguno de
// estos, deja que le ponga yo un nombre" dentro de este mismo selector.
const OTHER_ICON = 'otro';

// Tamaño "base" (scale 1) de cada icono — luego se multiplica por
// icon.scale para que un botellín se vea más pequeño que una jarra grande.
const TILE_BASE = { width: 56, height: 90 };
const DETAIL_IMAGE_BASE = { width: 160, height: 260 };

// Dos pasos para añadir una bebida nueva al catálogo del bar:
// 1) Elegir un icono (una de las ilustraciones, filtradas por Bebida/Comida,
//    u "Otro" para ponerle nombre a mano).
// 2) Una tarjeta grande con el nombre, el precio (el que ya tuviera
//    guardado ese icono en este bar, o "sin precio todavía") y un contador
//    para añadir de golpe más de una unidad.
//
// El componente se remonta entero cada vez que se abre (el padre le pasa un
// `key` distinto) — así todo el estado interno empieza limpio sin
// necesidad de resetearlo a mano con un efecto.
export function AddDrinkModal({ visible, onDismiss, existingCatalogItems, iconPopularity, onSubmit, onSetPriceOnly }) {
  const theme = useTheme();
  const [step, setStep] = useState('picker');
  const [categoryTab, setCategoryTab] = useState('bebida');
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [otherName, setOtherName] = useState('');
  const [otherNameError, setOtherNameError] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // Orden del selector: primero lo que más pides TÚ (en cualquier bar),
  // luego lo que más pide todo el mundo en la app, y por último alfabético.
  const iconsInTab = useMemo(() => {
    const popularityByIcon = new Map(
      (iconPopularity ?? []).map((row) => [row.icon, { mine: Number(row.my_quantity), total: Number(row.total_quantity) }]),
    );
    return DRINK_ICONS.filter((icon) => icon.category === categoryTab).sort((a, b) => {
      const popA = popularityByIcon.get(a.value) ?? { mine: 0, total: 0 };
      const popB = popularityByIcon.get(b.value) ?? { mine: 0, total: 0 };
      if (popA.mine !== popB.mine) return popB.mine - popA.mine;
      if (popA.total !== popB.total) return popB.total - popA.total;
      return a.label.localeCompare(b.label, 'es');
    });
  }, [categoryTab, iconPopularity]);

  const iconInfo = selectedIcon && selectedIcon !== OTHER_ICON ? DRINK_ICONS.find((i) => i.value === selectedIcon) : null;

  // Si ya existe una bebida con este icono en el catálogo de este bar, se
  // reutiliza (con su precio, si lo tenía) en vez de crear una duplicada.
  const existingItem = iconInfo ? (existingCatalogItems ?? []).find((item) => item.icon === iconInfo.value) : null;

  const handlePickIcon = (value) => {
    setSelectedIcon(value);
    setStep('detail');
  };

  // Común a "Añadir a la cuenta" y "Añadir precio": arma la descripción de
  // la bebida (existente o nueva) que necesita el padre para guardar. Si el
  // nombre es obligatorio y falta (caso "Otro"), devuelve null y ya deja
  // marcado el error en el propio campo.
  const buildDescriptor = () => {
    const name = iconInfo ? iconInfo.label : otherName.trim();
    if (!iconInfo && name.length === 0) {
      setOtherNameError('Obligatorio');
      return null;
    }
    const category = getDrinkCategory(categoryTab);
    return {
      existingItem: existingItem ?? null,
      name,
      icon: iconInfo ? iconInfo.value : null,
      category: category.value,
      color: category.defaultColor,
    };
  };

  const handleConfirm = () => {
    const descriptor = buildDescriptor();
    if (!descriptor) return;
    onSubmit({ ...descriptor, quantity });
  };

  const handleSetPriceOnly = () => {
    const descriptor = buildDescriptor();
    if (!descriptor) return;
    onSetPriceOnly(descriptor);
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
      >
        {step === 'picker' ? (
          <>
            <Text variant="titleMedium" style={styles.title}>
              Bebida nueva
            </Text>

            {categoryTab === 'comida' ? (
              <View style={styles.underConstruction}>
                <MaterialCommunityIcons name="hammer-wrench" size={40} color={theme.colors.onSurfaceVariant} />
                <Text style={styles.underConstructionText}>
                  Todavía no hay comidas — llegarán en una próxima versión de la app.
                </Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.iconGrid}>
                {iconsInTab.map((icon) => (
                  <Pressable key={icon.value} onPress={() => handlePickIcon(icon.value)} style={styles.iconTile}>
                    <Image
                      source={icon.image}
                      style={{ width: TILE_BASE.width * icon.scale, height: TILE_BASE.height * icon.scale }}
                      resizeMode="contain"
                    />
                  </Pressable>
                ))}
                <Pressable onPress={() => handlePickIcon(OTHER_ICON)} style={[styles.iconTile, styles.otherTile]}>
                  <MaterialCommunityIcons name="dots-horizontal" size={28} color={theme.colors.onSurfaceVariant} />
                  <Text style={styles.otherLabel}>Otro</Text>
                </Pressable>
              </ScrollView>
            )}

            <SegmentedButtons
              value={categoryTab}
              onValueChange={setCategoryTab}
              style={styles.segmented}
              buttons={DRINK_CATEGORIES.map((category) => ({ value: category.value, label: category.label }))}
            />
          </>
        ) : (
          <>
            <View style={styles.detailHeader}>
              <IconButton icon="arrow-left" onPress={() => setStep('picker')} style={styles.backButton} />
              <Text variant="titleMedium">{iconInfo ? iconInfo.label : 'Bebida nueva'}</Text>
            </View>

            {iconInfo ? (
              <Image
                source={iconInfo.image}
                style={[
                  styles.detailImage,
                  { width: DETAIL_IMAGE_BASE.width * iconInfo.scale, height: DETAIL_IMAGE_BASE.height * iconInfo.scale },
                ]}
                resizeMode="contain"
              />
            ) : (
              <>
                <TextInput
                  label="Nombre"
                  value={otherName}
                  onChangeText={(value) => {
                    setOtherName(value);
                    setOtherNameError(null);
                  }}
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
              <Text style={styles.priceText}>{centsToEuros(existingItem.priceCents)} €</Text>
            ) : (
              <View style={styles.noPriceRow}>
                <Text style={styles.priceText}>Sin precio todavía</Text>
                <AppButton mode="text" onPress={handleSetPriceOnly}>
                  Añadir precio
                </AppButton>
              </View>
            )}

            <View style={styles.stepper}>
              <IconButton
                icon="minus"
                mode="contained-tonal"
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              />
              <Text style={styles.quantity}>{quantity}</Text>
              <IconButton icon="plus" mode="contained-tonal" onPress={() => setQuantity((q) => q + 1)} />
            </View>

            <AppButton mode="contained" onPress={handleConfirm} style={styles.submitButton}>
              Añadir a la cuenta
            </AppButton>
          </>
        )}
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 24,
    padding: 20,
    borderRadius: 16,
    maxHeight: '85%',
  },
  title: {
    marginBottom: 12,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: 4,
  },
  // Todas las tarjetas miden IGUAL (para que la rejilla quede ordenada) —
  // lo que cambia de tamaño según icon.scale es el propio dibujo de dentro
  // (más pequeño para un botellín, más grande para una jarra grande),
  // centrado dentro de este mismo hueco fijo.
  iconTile: {
    width: 56,
    height: 90,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherTile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  underConstruction: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    gap: 12,
  },
  underConstructionText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  segmented: {
    marginTop: 16,
  },
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
  input: {
    marginTop: 24,
  },
  priceText: {
    textAlign: 'center',
    fontSize: 18,
    marginTop: 12,
    marginBottom: 8,
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
    fontSize: 18,
  },
  submitButton: {
    marginTop: 12,
  },
});
