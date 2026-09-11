import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { Modal, Portal, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DRINK_ICONS } from '../../shared/constants/drinkIcons';
import { getDrinkCategory } from '../../shared/constants/drinkCategories';
import { DrinkDetailStep } from './DrinkDetailStep';
import { OTHER_ICON, DrinkIconPicker } from './DrinkIconPicker';
import { useDrinkGridLayout } from '../hooks/useDrinkGridLayout';

// Quita tildes y pasa a minúsculas, para que buscar "cana" encuentre "Caña"
// y dé igual cómo estén escritas mayúsculas/minúsculas en label/aliases.
function normalizeForSearch(text) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

// Dos pasos para añadir una bebida nueva al catálogo del bar:
// 1) Elegir un icono (una de las ilustraciones, filtradas por Bebida/Comida,
//    u "Otro" para ponerle nombre a mano) — ver DrinkIconPicker.
// 2) Una tarjeta grande con el nombre, el precio y un contador de unidades
//    — ver DrinkDetailStep.
//
// Este componente es el orquestador: mantiene el estado del formulario, la
// selección y las listas ya filtradas/ordenadas, y decide qué paso pintar.
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
  const { tileWidth, imageAreaSize, tileBase } = useDrinkGridLayout({
    windowWidth,
    windowHeight,
    insets,
  });

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
      {/* KeyboardAvoidingView: sin esto, al elegir "Otro" el teclado (por el
          autoFocus del campo "Nombre" de abajo) tapaba el propio campo —
          este Modal de Paper no evita el teclado por su cuenta.
          `style={absoluteFill}` + `pointerEvents="box-none"`: dentro de un
          Portal, si no ocupa toda la pantalla, la KAV se colapsa arriba (a
          partir de RN 0.86) y el modal salía como una tira en la cabecera;
          box-none deja que los toques fuera del modal lleguen al backdrop. */}
      <KeyboardAvoidingView
        testID="add-drink-kav"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={StyleSheet.absoluteFill}
        pointerEvents="box-none"
      >
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
            <DrinkIconPicker
              categoryTab={categoryTab}
              onCategoryChange={setCategoryTab}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              visibleIcons={visibleIcons}
              visibleCustomItems={visibleCustomItems}
              tileWidth={tileWidth}
              imageAreaSize={imageAreaSize}
              tileBase={tileBase}
              onPickIcon={handlePickIcon}
              onPickCustomItem={handlePickCustomItem}
            />
          ) : (
            <DrinkDetailStep
              iconInfo={iconInfo}
              customItemInfo={customItemInfo}
              otherName={otherName}
              onOtherNameChange={(value) => {
                setOtherName(value);
                setOtherNameError(null);
              }}
              otherNameError={otherNameError}
              existingItem={existingItem}
              quantity={quantity}
              onQuantityChange={setQuantity}
              onBack={() => setStep('picker')}
              onSetPriceOnly={handleSetPriceOnly}
              onConfirm={handleConfirm}
            />
          )}
        </Modal>
      </KeyboardAvoidingView>
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
});
