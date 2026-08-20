import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import {
  HelperText,
  IconButton,
  Modal,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DRINK_CATEGORIES, getDrinkCategory } from '../../shared/constants/drinkCategories';
import { DRINK_ICONS, GENERIC_DRINK_ICON_IMAGE } from '../../shared/constants/drinkIcons';
import { centsToEuros } from '../../shared/utils/money';
import { AppButton } from './AppButton';

// 'otro' no es un valor de drinkIcons.js — es la opción de "ninguno de
// estos, deja que le ponga yo un nombre" dentro de este mismo selector.
const OTHER_ICON = 'otro';

// Quita tildes y pasa a minúsculas, para que buscar "cana" encuentre "Caña"
// y dé igual cómo estén escritas mayúsculas/minúsculas en label/aliases.
function normalizeForSearch(text) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

const DETAIL_IMAGE_BASE = { width: 160, height: 260 };

// En vertical la rejilla tiene que caber en 4 columnas — por eso el tamaño
// de cada tarjeta no es un número fijo, se calcula a partir del ancho real
// de pantalla (ver modal.margin/padding más abajo, restados aquí para que
// el cálculo cuadre con el hueco disponible de verdad). En horizontal NO
// se reutilizan esas mismas 4 columnas (se verían gigantes, el ancho es
// mucho mayor): se mantiene el tamaño de tarjeta de vertical y se calculan
// más columnas para llenar el hueco, en vez de estirar 4 más grandes.
const GRID_COLUMNS = 4;
const GRID_GAP = 8;
// margin + padding FIJOS del modal, a cada lado — el hueco de más por el
// área segura (insets.left/right, los botones del sistema en horizontal)
// se suma aparte en el componente, porque varía según el móvil.
const MODAL_BASE_INSET = 2 * (24 + 20);

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
export function AddDrinkModal({
  visible,
  onDismiss,
  existingCatalogItems,
  iconPopularity,
  onSubmit,
  onSetPriceOnly,
}) {
  const theme = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  // El Modal se pinta a través de un Portal (más abajo), que vive FUERA del
  // árbol donde _layout.jsx ya reserva insets.left/right para el resto de
  // la app — así que aquí hay que sumarlos aparte, o en horizontal el
  // modal entero queda por debajo de los botones de navegación del móvil.
  const insets = useSafeAreaInsets();

  // El lado CORTO del móvil es el mismo gire como gire (es su ancho real en
  // vertical) — se usa como referencia para el tamaño "normal" de tarjeta,
  // en vez del ancho de pantalla actual, que en horizontal es el lado largo
  // y haría las tarjetas enormes si se repartiera igual en solo 4 columnas.
  const shortSide = Math.min(windowWidth, windowHeight);
  const referenceTileWidth =
    (shortSide - MODAL_BASE_INSET - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

  // Con el tamaño de tarjeta ya fijado (referenceTileWidth), se calculan
  // cuántas caben en el ancho REAL disponible ahora mismo — 4 en vertical
  // (coincide con GRID_COLUMNS, sin cambios respecto a antes) y más en
  // horizontal, en vez de estirar siempre las mismas 4.
  const availableWidth = windowWidth - MODAL_BASE_INSET - insets.left - insets.right;
  const columns = Math.max(
    GRID_COLUMNS,
    Math.floor((availableWidth + GRID_GAP) / (referenceTileWidth + GRID_GAP)),
  );
  const tileWidth = (availableWidth - GRID_GAP * (columns - 1)) / columns;
  const imageAreaSize = { width: tileWidth - 8, height: (tileWidth - 8) * 1.5 };
  const tileBase = { width: imageAreaSize.width / 1.3, height: imageAreaSize.height / 1.3 };

  const [step, setStep] = useState('picker');
  const [categoryTab, setCategoryTab] = useState('bebida');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(null);
  // Bebida "Otro" ya creada antes en este bar (nombre a mano, sin icono de
  // la lista) que el usuario elige directamente de la rejilla — distinto de
  // selectedIcon porque no viene de DRINK_ICONS.
  const [selectedCustomItemId, setSelectedCustomItemId] = useState(null);
  const [otherName, setOtherName] = useState('');
  const [otherNameError, setOtherNameError] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // Orden del selector: primero lo que más pides TÚ (en cualquier bar),
  // luego lo que más pide todo el mundo en la app, y por último alfabético.
  const iconsInTab = useMemo(() => {
    const popularityByIcon = new Map(
      (iconPopularity ?? []).map((row) => [
        row.icon,
        { mine: Number(row.my_quantity), total: Number(row.total_quantity) },
      ]),
    );
    return DRINK_ICONS.filter((icon) => icon.category === categoryTab).sort((a, b) => {
      const popA = popularityByIcon.get(a.value) ?? { mine: 0, total: 0 };
      const popB = popularityByIcon.get(b.value) ?? { mine: 0, total: 0 };
      if (popA.mine !== popB.mine) return popB.mine - popA.mine;
      if (popA.total !== popB.total) return popB.total - popA.total;
      return a.label.localeCompare(b.label, 'es');
    });
  }, [categoryTab, iconPopularity]);

  // El buscador filtra en cada tecleo, por el nombre de la bebida o por
  // cualquiera de sus `aliases` (ver drinkIcons.js) — así "cerveza" saca
  // botellín/cañas/jarras/tercios/sin alcohol aunque ninguna se llame así.
  const normalizedQuery = normalizeForSearch(searchQuery.trim());
  const visibleIcons = useMemo(() => {
    if (!normalizedQuery) return iconsInTab;
    return iconsInTab.filter((icon) => {
      const haystacks = [icon.label, ...(icon.aliases ?? [])];
      return haystacks.some((text) => normalizeForSearch(text).includes(normalizedQuery));
    });
  }, [iconsInTab, normalizedQuery]);

  const iconInfo =
    selectedIcon && selectedIcon !== OTHER_ICON
      ? DRINK_ICONS.find((i) => i.value === selectedIcon)
      : null;

  // Si ya existe una bebida con este icono en el catálogo de este bar, se
  // reutiliza (con su precio, si lo tenía) en vez de crear una duplicada.
  const existingItemFromIcon = iconInfo
    ? (existingCatalogItems ?? []).find((item) => item.icon === iconInfo.value)
    : null;

  // Bebidas "Otro" (nombre a mano, sin icono) que este bar ya tiene en su
  // catálogo — se ofrecen como tarjetas más en la rejilla, para no obligar
  // a reescribir el nombre exacto cada vez (y para no chocar con el
  // `unique(bar_id, name)` de la base de datos si lo haces).
  const customItemsInTab = useMemo(
    () =>
      (existingCatalogItems ?? [])
        .filter((item) => !item.icon && item.category === categoryTab)
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [existingCatalogItems, categoryTab],
  );
  const visibleCustomItems = useMemo(() => {
    if (!normalizedQuery) return customItemsInTab;
    return customItemsInTab.filter((item) =>
      normalizeForSearch(item.name).includes(normalizedQuery),
    );
  }, [customItemsInTab, normalizedQuery]);

  const customItemInfo = selectedCustomItemId
    ? (existingCatalogItems ?? []).find((item) => item.id === selectedCustomItemId)
    : null;

  const existingItem = customItemInfo ?? existingItemFromIcon;

  const handlePickIcon = (value) => {
    setSelectedIcon(value);
    setSelectedCustomItemId(null);
    setStep('detail');
  };

  const handlePickCustomItem = (item) => {
    setSelectedCustomItemId(item.id);
    setSelectedIcon(null);
    setStep('detail');
  };

  // Común a "Añadir a la cuenta" y "Añadir precio": arma la descripción de
  // la bebida (existente o nueva) que necesita el padre para guardar. Si el
  // nombre es obligatorio y falta (caso "Otro"), devuelve null y ya deja
  // marcado el error en el propio campo.
  const buildDescriptor = () => {
    const name = iconInfo
      ? iconInfo.label
      : customItemInfo
        ? customItemInfo.name
        : otherName.trim();
    if (!iconInfo && !customItemInfo && name.length === 0) {
      setOtherNameError('Obligatorio');
      return null;
    }
    const category = getDrinkCategory(categoryTab);

    // Red de seguridad: si escribiste a mano (paso "Otro") el mismo nombre
    // que una bebida "Otro" que este bar ya tiene, se reutiliza esa en vez
    // de intentar crear una duplicada — createItem fallaría por el
    // `unique(bar_id, name)` de la base de datos (era justo el bug: cerrar
    // una cuenta, abrir otra, y no poder volver a añadir la misma bebida
    // sin icono porque no aparecía en la rejilla y reescribir el nombre
    // chocaba con la que ya existía).
    const nameMatch =
      !iconInfo && !customItemInfo
        ? (existingCatalogItems ?? []).find(
            (item) => item.name.trim().toLowerCase() === name.toLowerCase(),
          )
        : null;

    return {
      existingItem: existingItem ?? nameMatch ?? null,
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
        contentContainerStyle={[
          styles.modal,
          {
            backgroundColor: theme.colors.surface,
            marginLeft: 24 + insets.left,
            marginRight: 24 + insets.right,
          },
        ]}
      >
        {step === 'picker' ? (
          <>
            <Text variant="titleMedium" style={styles.title}>
              Bebida nueva
            </Text>

            {categoryTab === 'comida' ? (
              <View style={styles.underConstruction}>
                <MaterialCommunityIcons
                  name="hammer-wrench"
                  size={40}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text style={styles.underConstructionText}>
                  Todavía no hay comidas — llegarán en una próxima versión de la app.
                </Text>
              </View>
            ) : (
              <>
                <TextInput
                  mode="outlined"
                  placeholder="Buscar bebida..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  left={<TextInput.Icon icon="magnify" />}
                  right={
                    searchQuery ? (
                      <TextInput.Icon icon="close" onPress={() => setSearchQuery('')} />
                    ) : null
                  }
                  dense
                  style={styles.searchInput}
                />
                <ScrollView contentContainerStyle={styles.iconGrid}>
                  {visibleIcons.map((icon) => (
                    <Pressable
                      key={icon.value}
                      onPress={() => handlePickIcon(icon.value)}
                      style={[styles.iconTile, { width: tileWidth }]}
                    >
                      <View style={[styles.iconImageArea, imageAreaSize]}>
                        <Image
                          source={icon.image}
                          style={{
                            width: tileBase.width * icon.scale,
                            height: tileBase.height * icon.scale,
                          }}
                          resizeMode="contain"
                        />
                      </View>
                      <Text style={styles.iconLabel} numberOfLines={2}>
                        {icon.label}
                      </Text>
                    </Pressable>
                  ))}
                  {visibleCustomItems.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => handlePickCustomItem(item)}
                      style={[styles.iconTile, { width: tileWidth }]}
                    >
                      <View style={[styles.iconImageArea, imageAreaSize]}>
                        <Image
                          source={GENERIC_DRINK_ICON_IMAGE}
                          style={{ width: tileBase.width, height: tileBase.height }}
                          resizeMode="contain"
                        />
                      </View>
                      <Text style={styles.iconLabel} numberOfLines={2}>
                        {item.name}
                      </Text>
                    </Pressable>
                  ))}
                  <Pressable
                    onPress={() => handlePickIcon(OTHER_ICON)}
                    style={[styles.iconTile, { width: tileWidth }]}
                  >
                    <View style={[styles.iconImageArea, imageAreaSize]}>
                      <MaterialCommunityIcons
                        name="dots-horizontal"
                        size={28}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </View>
                    <Text style={styles.iconLabel} numberOfLines={2}>
                      Otro
                    </Text>
                  </Pressable>
                </ScrollView>
              </>
            )}

            <SegmentedButtons
              value={categoryTab}
              onValueChange={setCategoryTab}
              style={styles.segmented}
              buttons={DRINK_CATEGORIES.map((category) => ({
                value: category.value,
                label: category.label,
              }))}
            />
          </>
        ) : (
          <>
            <View style={styles.detailHeader}>
              <IconButton
                icon="arrow-left"
                onPress={() => setStep('picker')}
                style={styles.backButton}
              />
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
              <View
                style={[styles.customDetailIcon, { backgroundColor: theme.colors.surfaceVariant }]}
              >
                <Image
                  source={GENERIC_DRINK_ICON_IMAGE}
                  style={styles.customDetailImage}
                  resizeMode="contain"
                />
              </View>
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
              <View style={styles.priceRow}>
                <Text style={styles.priceText}>{centsToEuros(existingItem.priceCents)} €</Text>
                <IconButton icon="pencil-outline" size={18} onPress={handleSetPriceOnly} />
              </View>
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
              <IconButton
                icon="plus"
                mode="contained-tonal"
                onPress={() => setQuantity((q) => q + 1)}
              />
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
    // Solo vertical aquí — marginLeft/marginRight se ponen en el propio
    // <Modal> (más arriba), sumando los insets del área segura del móvil.
    marginTop: 24,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    maxHeight: '85%',
  },
  title: {
    marginBottom: 12,
  },
  searchInput: {
    marginBottom: 10,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: GRID_GAP,
    paddingBottom: 4,
  },
  // El ancho de cada tarjeta (para que siempre entren 4 por fila) se calcula
  // en el componente (tileWidth) y se combina con este estilo base — igual
  // que imageAreaSize con iconImageArea. Todas las tarjetas miden IGUAL
  // (para que la rejilla quede ordenada); lo que cambia de tamaño según
  // icon.scale es el propio dibujo de dentro (más pequeño para un botellín,
  // más grande para una jarra grande), centrado dentro de este mismo hueco
  // de imagen. El nombre va debajo, a ancho completo de la tarjeta, y puede
  // ocupar hasta 2 líneas — nunca se corta con "...", para que se lea la
  // bebida entera (importante sobre todo en las que comparten dibujo
  // parecido, como las de una marca concreta).
  iconTile: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  iconImageArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLabel: {
    fontSize: 13,
    textAlign: 'center',
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
