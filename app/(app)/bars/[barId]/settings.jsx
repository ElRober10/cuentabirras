import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Divider, Snackbar, Text, useTheme } from 'react-native-paper';

import { container } from '../../../../src/di/container';
import { SetPriceDialog } from '../../../../src/presentation/components/SetPriceDialog';
import { getDrinkCategory } from '../../../../src/shared/constants/drinkCategories';
import { DRINK_ICONS, GENERIC_DRINK_ICON_IMAGE, getUnitImage } from '../../../../src/shared/constants/drinkIcons';
import { centsToEuros } from '../../../../src/shared/utils/money';

// Pantalla de ajustes del bar: el catálogo completo de precios, para poder
// revisarlos/corregirlos todos de una sentada. La lista de bebidas es la
// MISMA que sale en el selector de "Bebida nueva" (DRINK_ICONS) — no solo
// las que este bar ya tiene guardadas — así se puede poner precio de
// antemano a una bebida que todavía nadie ha pedido aquí. Si además hay
// bebidas "Otro" (nombre a mano, sin icono de la lista) ya creadas en este
// bar, también se listan al final.
export default function BarSettingsScreen() {
  const { barId } = useLocalSearchParams();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [editingRow, setEditingRow] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  // Mismo motivo que en [tabId].jsx: un token distinto por apertura para
  // poder darle a SetPriceDialog una `key` nueva cada vez (así resetea su
  // campo de texto sin necesidad de un efecto).
  const promptTokenRef = useRef(0);

  const catalogQuery = useQuery({
    queryKey: ['catalogAll', barId],
    queryFn: () => container.catalogRepository.listByBar(barId),
  });

  // Une DRINK_ICONS (la lista maestra, categoría "bebida") con lo que este
  // bar ya tenga guardado en su catálogo: por icono, si ya existe fila la
  // reutiliza (con su precio); si no, la fila es "nueva" (sin catalogItem
  // todavía, se creará al guardar el primer precio). Al final se añaden las
  // bebidas "Otro" de este bar (icono null) que no vienen en DRINK_ICONS.
  const rows = useMemo(() => {
    const catalogItems = catalogQuery.data ?? [];
    const byIcon = new Map(catalogItems.filter((item) => item.icon).map((item) => [item.icon, item]));

    const fromDrinkIcons = DRINK_ICONS.filter((icon) => icon.category === 'bebida').map((icon) => ({
      key: icon.value,
      name: icon.label,
      icon,
      catalogItem: byIcon.get(icon.value) ?? null,
    }));

    // Además de "Otro" (icon null), cubre el caso raro de un icono que este
    // bar tenga guardado pero que ya no exista en DRINK_ICONS (renombrado o
    // quitado de la lista maestra) — así no desaparece de la pantalla.
    const customItems = catalogItems
      .filter((item) => !item.icon || !DRINK_ICONS.some((icon) => icon.value === item.icon))
      .map((item) => ({ key: item.id, name: item.name, icon: null, catalogItem: item }));

    return [...fromDrinkIcons, ...customItems].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [catalogQuery.data]);

  const saveMutation = useMutation({
    mutationFn: ({ row, priceCents }) => {
      if (row.catalogItem) {
        return container.catalogRepository.updatePrice({ catalogItemId: row.catalogItem.id, priceCents });
      }
      // Esta bebida (de DRINK_ICONS) todavía no tenía fila en el catálogo de
      // este bar — se crea directamente ya con el precio puesto.
      const category = getDrinkCategory('bebida');
      return container.catalogRepository.createItem({
        barId,
        name: row.name,
        category: category.value,
        color: category.defaultColor,
        icon: row.icon.value,
        priceCents,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogAll', barId] });
      queryClient.invalidateQueries({ queryKey: ['catalogSorted', barId] });
    },
    onError: (error) => setErrorMessage(error.message ?? 'No se pudo guardar el precio.'),
  });

  const handleEditPrice = (row) => {
    promptTokenRef.current += 1;
    setEditingRow({ ...row, token: promptTokenRef.current });
  };

  const handleSubmitPrice = (priceCents) => {
    saveMutation.mutate({ row: editingRow, priceCents });
    setEditingRow(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {catalogQuery.isLoading ? (
        <ActivityIndicator style={styles.spinner} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.key}
          ItemSeparatorComponent={Divider}
          contentContainerStyle={styles.list}
          renderItem={({ item: row }) => {
            const priceCents = row.catalogItem?.priceCents ?? null;
            return (
              <Pressable onPress={() => handleEditPrice(row)} style={styles.row}>
                <Image
                  source={row.icon ? getUnitImage(row.icon, 1) : GENERIC_DRINK_ICON_IMAGE}
                  style={styles.icon}
                  resizeMode="contain"
                />
                <Text variant="titleMedium" style={styles.name} numberOfLines={1}>
                  {row.name}
                </Text>
                {priceCents == null ? (
                  <Text style={{ color: theme.colors.error }}>Sin precio</Text>
                ) : (
                  <Text variant="titleMedium">{centsToEuros(priceCents)} €</Text>
                )}
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={18}
                  color={theme.colors.onSurfaceVariant}
                  style={styles.editIcon}
                />
              </Pressable>
            );
          }}
        />
      )}

      <SetPriceDialog
        key={editingRow ? `settings-price-${editingRow.key}-${editingRow.token}` : 'settings-price-closed'}
        visible={!!editingRow}
        drinkName={editingRow?.name}
        initialPriceCents={editingRow?.catalogItem?.priceCents ?? null}
        onDismiss={() => setEditingRow(null)}
        onSubmit={handleSubmitPrice}
      />

      <Snackbar visible={!!errorMessage} onDismiss={() => setErrorMessage(null)} duration={4000}>
        {errorMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  spinner: {
    marginTop: 24,
  },
  // 1mm ≈ 6.3dp en móvil (160dp = 1 pulgada = 25.4mm) — 8mm de aire para que
  // la última fila no quede pegada a los botones de gestos/navegación.
  list: {
    paddingBottom: 50,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  icon: {
    width: 28,
    height: 45,
  },
  name: {
    flex: 1,
  },
  editIcon: {
    marginLeft: 4,
  },
});
