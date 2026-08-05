import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, FAB, Snackbar, Text, useTheme } from 'react-native-paper';

import { listCatalogSortedByPopularity } from '../../../../../src/application/catalog/listCatalogSortedByPopularity';
import { addDrinkToTab } from '../../../../../src/application/tabs/addDrinkToTab';
import { computeTabTotalCents, hasMissingPrices } from '../../../../../src/application/tabs/computeTabTotal';
import { container } from '../../../../../src/di/container';
import { AddDrinkModal } from '../../../../../src/presentation/components/AddDrinkModal';
import { AppButton } from '../../../../../src/presentation/components/AppButton';
import { SetPriceDialog } from '../../../../../src/presentation/components/SetPriceDialog';
import { TabItemRow } from '../../../../../src/presentation/components/TabItemRow';
import { centsToEuros } from '../../../../../src/shared/utils/money';

// La pantalla de la cuenta abierta: un "recibo" con una fila por cada
// bebida que ya has añadido (tantos iconos como unidades, numerados, y un
// botón para quitar la última si te equivocas). El botón "+" flotante abre
// el selector de iconos para añadir una bebida (nueva o ya conocida).
export default function TabScreen() {
  const { barId, tabId } = useLocalSearchParams();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  // Cuándo hay que preguntar el precio de una bebida: 'add' (se acaba de
  // tocar para añadirla y todavía no tiene precio, así que al guardar el
  // precio también se añade) o 'edit' (solo poner/corregir el precio, sin
  // añadir nada — "Añadir precio" o el lápiz). `quantity` solo se usa en 'add'.
  const [pricePrompt, setPricePrompt] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  // Un simple contador para darle un `token` distinto a cada apertura del
  // diálogo de precio (se usa como parte de su `key`, ver más abajo). No
  // usamos Date.now(): el compilador de React no permite llamar a
  // funciones "impuras" así en medio de un render/handler — un ref que
  // solo se incrementa en respuesta a una acción del usuario sí vale.
  const promptTokenRef = useRef(0);

  const catalogQuery = useQuery({
    queryKey: ['catalogSorted', barId],
    queryFn: () => listCatalogSortedByPopularity(barId),
  });

  const tabItemsQuery = useQuery({
    queryKey: ['tabItems', tabId],
    queryFn: () => container.tabItemRepository.listByTab(tabId),
  });

  // Popularidad por icono en TODA la app (no solo este bar) — ordena el
  // selector de iconos del botón +.
  const iconPopularityQuery = useQuery({
    queryKey: ['iconPopularity'],
    queryFn: () => container.catalogRepository.getIconPopularity(),
  });

  // Cuántas unidades de cada bebida (agrupadas por catalogItemId) llevas ya
  // en esta cuenta.
  const countsByItem = useMemo(() => {
    const counts = {};
    for (const item of tabItemsQuery.data ?? []) {
      counts[item.catalogItemId] = (counts[item.catalogItemId] ?? 0) + item.quantity;
    }
    return counts;
  }, [tabItemsQuery.data]);

  // La hora a la que se pidió CADA unidad (para el icono "volteable" que
  // enseña la hora al tocarlo, ver TabItemRow/DrinkUnitIcon). Cada fila de
  // tab_items tiene su propio created_at; si se añadieron varias unidades
  // de golpe (quantity > 1), comparten esa misma hora — tiene sentido, se
  // pidieron a la vez. listByTab ya devuelve las filas ordenadas por
  // created_at, así que al ir "aplanando" quantity en el mismo orden, el
  // array de cada bebida queda también en orden cronológico.
  const timestampsByItem = useMemo(() => {
    const timestamps = {};
    for (const item of tabItemsQuery.data ?? []) {
      if (!timestamps[item.catalogItemId]) timestamps[item.catalogItemId] = [];
      for (let i = 0; i < item.quantity; i += 1) {
        timestamps[item.catalogItemId].push(item.createdAt);
      }
    }
    return timestamps;
  }, [tabItemsQuery.data]);

  // Una fila por cada bebida con al menos una unidad en esta cuenta, en el
  // orden en que se añadió cada tipo por primera vez.
  const tabRows = useMemo(() => {
    if (!tabItemsQuery.data || !catalogQuery.data) return [];
    const orderedIds = [];
    const seen = new Set();
    for (const item of tabItemsQuery.data) {
      if (!seen.has(item.catalogItemId)) {
        seen.add(item.catalogItemId);
        orderedIds.push(item.catalogItemId);
      }
    }
    return orderedIds
      .map((catalogItemId) => {
        const catalogItem = catalogQuery.data.find((item) => item.id === catalogItemId);
        const quantity = countsByItem[catalogItemId] ?? 0;
        return catalogItem && quantity > 0 ? { catalogItem, quantity } : null;
      })
      .filter(Boolean);
  }, [tabItemsQuery.data, catalogQuery.data, countsByItem]);

  const totalCents = useMemo(() => computeTabTotalCents(tabItemsQuery.data ?? []), [tabItemsQuery.data]);
  const missingPrices = useMemo(() => hasMissingPrices(tabItemsQuery.data ?? []), [tabItemsQuery.data]);

  // Añadir una bebida que YA estaba en el catálogo. `priceCentsOverride`
  // solo viene informado cuando el precio se acaba de poner/corregir en el
  // diálogo — en ese caso también hay que refrescar el catálogo.
  const addExistingMutation = useMutation({
    mutationFn: ({ item, quantity, priceCentsOverride, allowMissingPrice }) =>
      addDrinkToTab({ tabId, barId, existingItem: item, quantity, priceCentsOverride, allowMissingPrice }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tabItems', tabId] });
      queryClient.invalidateQueries({ queryKey: ['iconPopularity'] });
      if (variables.priceCentsOverride != null) {
        queryClient.invalidateQueries({ queryKey: ['catalogSorted', barId] });
      }
    },
    onError: (error) => setErrorMessage(error.message ?? 'No se pudo añadir la bebida.'),
  });

  const updatePriceMutation = useMutation({
    mutationFn: (params) => container.catalogRepository.updatePrice(params),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalogSorted', barId] }),
    onError: (error) => setErrorMessage(error.message ?? 'No se pudo guardar el precio.'),
  });

  // Se crea en el catálogo (sin precio todavía) y a continuación se abre el
  // diálogo de precio — en modo 'add' (quantity informado: también se añade
  // a la cuenta al guardar) o 'edit' (quantity null: solo se guarda el
  // precio, es lo que dispara "Añadir precio" sin tocar la cuenta).
  const addNewMutation = useMutation({
    mutationFn: ({ name, icon, category, color }) =>
      container.catalogRepository.createItem({ barId, name, icon, category, color }),
    onSuccess: (catalogItem, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catalogSorted', barId] });
      promptTokenRef.current += 1;
      setPricePrompt({
        mode: variables.quantity != null ? 'add' : 'edit',
        item: catalogItem,
        quantity: variables.quantity ?? null,
        token: promptTokenRef.current,
      });
    },
    onError: (error) => setErrorMessage(error.message ?? 'No se pudo crear la bebida.'),
  });

  const removeOneMutation = useMutation({
    mutationFn: (catalogItemId) => container.tabItemRepository.removeOneUnit({ tabId, catalogItemId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tabItems', tabId] });
      queryClient.invalidateQueries({ queryKey: ['iconPopularity'] });
    },
    onError: (error) => setErrorMessage(error.message ?? 'No se pudo quitar la bebida.'),
  });

  // Tocar "Añadir" en una tarjeta: si ya tiene precio, va directa a la
  // cuenta; si no, primero hay que preguntarlo.
  const handleRequestAdd = (item, quantity) => {
    if (item.priceCents == null) {
      promptTokenRef.current += 1;
      setPricePrompt({ mode: 'add', item, quantity, token: promptTokenRef.current });
      return;
    }
    addExistingMutation.mutate({ item, quantity });
  };

  const handleEditPrice = (item) => {
    promptTokenRef.current += 1;
    setPricePrompt({ mode: 'edit', item, quantity: null, token: promptTokenRef.current });
  };

  // El selector de iconos (botón +) puede devolver una bebida que YA
  // estaba en el catálogo de este bar (alguien más ya la había puesto con
  // ese mismo icono) o una completamente nueva.
  const handleAddDrinkSubmit = (payload) => {
    setModalVisible(false);
    if (payload.existingItem) {
      handleRequestAdd(payload.existingItem, payload.quantity);
      return;
    }
    addNewMutation.mutate(payload);
  };

  // "Añadir precio" desde el selector: solo poner el precio, sin añadir
  // nada a la cuenta todavía.
  const handleSetPriceOnly = (descriptor) => {
    setModalVisible(false);
    if (descriptor.existingItem) {
      handleEditPrice(descriptor.existingItem);
      return;
    }
    addNewMutation.mutate({ ...descriptor, quantity: null });
  };

  const handleSubmitPrice = (priceCents) => {
    if (pricePrompt.mode === 'edit') {
      updatePriceMutation.mutate({ catalogItemId: pricePrompt.item.id, priceCents });
    } else {
      addExistingMutation.mutate({ item: pricePrompt.item, quantity: pricePrompt.quantity, priceCentsOverride: priceCents });
    }
    setPricePrompt(null);
  };

  // "No sé el precio": añade igualmente, sin precio — solo tiene sentido en
  // modo 'add' (en 'edit' no hay nada que añadir, solo un precio que corregir).
  const handleSkipPrice = () => {
    addExistingMutation.mutate({ item: pricePrompt.item, quantity: pricePrompt.quantity, allowMissingPrice: true });
    setPricePrompt(null);
  };

  // Antes de abrir el selector, forzamos un refresco de la popularidad —
  // así el orden de los iconos siempre refleja lo último que has pedido tú
  // y el grupo, sin depender de que ninguna otra parte del código se haya
  // acordado de invalidar la caché en el momento justo.
  const handleOpenAddDrink = () => {
    queryClient.invalidateQueries({ queryKey: ['iconPopularity'] });
    setModalVisible(true);
  };

  const handleCloseTab = async () => {
    try {
      await container.tabRepository.closeTab(tabId);
      router.replace(`/bars/${barId}/receipt/${tabId}`);
    } catch (error) {
      setErrorMessage(error.message ?? 'No se pudo cerrar la cuenta.');
    }
  };

  const isLoading = catalogQuery.isLoading || tabItemsQuery.isLoading;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <View style={styles.totalBlock}>
          <Text variant="headlineSmall">{centsToEuros(totalCents)} €</Text>
          {missingPrices ? (
            <Text style={[styles.missingPricesWarning, { color: theme.colors.error }]}>
              Faltan precios, el total puede no ser exacto
            </Text>
          ) : null}
        </View>
        <AppButton mode="outlined" onPress={handleCloseTab}>
          Cerrar cuenta
        </AppButton>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.spinner} />
      ) : (
        <FlatList
          data={tabRows}
          keyExtractor={(row) => row.catalogItem.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: row }) => (
            <TabItemRow
              catalogItem={row.catalogItem}
              quantity={row.quantity}
              timestamps={timestampsByItem[row.catalogItem.id]}
              onRemoveOne={() => removeOneMutation.mutate(row.catalogItem.id)}
              disabled={removeOneMutation.isPending}
            />
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>Apunta lo que te tomes y yo llevo la cuenta. ¡Añade tu primera bebida con el botón +!</Text>
          }
        />
      )}

      {/* Como el fondo del FAB se fuerza a mano (theme.colors.primary), Paper
          no sabe de qué color pintar el "+" para que contraste bien — sin
          `color` explícito, en modo oscuro salía blanco sobre un ámbar ya
          claro de por sí, casi invisible. `onPrimary` es justo el color que
          el propio tema ya define para "texto/icono legible encima de
          primary" en los dos modos (tokens.js). */}
      <FAB
        icon="plus"
        color={theme.colors.onPrimary}
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={handleOpenAddDrink}
      />

      <AddDrinkModal
        key={modalVisible ? 'add-drink-open' : 'add-drink-closed'}
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        existingCatalogItems={catalogQuery.data}
        iconPopularity={iconPopularityQuery.data}
        onSubmit={handleAddDrinkSubmit}
        onSetPriceOnly={handleSetPriceOnly}
      />

      <SetPriceDialog
        key={pricePrompt ? `set-price-${pricePrompt.item.id}-${pricePrompt.token}` : 'set-price-closed'}
        visible={!!pricePrompt}
        drinkName={pricePrompt?.item?.name}
        initialPriceCents={pricePrompt?.mode === 'edit' ? pricePrompt.item.priceCents : null}
        onDismiss={() => setPricePrompt(null)}
        onSubmit={handleSubmitPrice}
        onSkip={pricePrompt?.mode === 'add' ? handleSkipPrice : undefined}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  // flex:1 (en vez de dejar que el texto crezca lo que necesite) obliga al
  // aviso a partirse en dos renglones dentro del hueco que quede, en lugar
  // de empujar el botón de "Cerrar cuenta" hacia fuera.
  totalBlock: {
    flex: 1,
    marginRight: 12,
  },
  missingPricesWarning: {
    fontSize: 15,
    marginTop: 2,
  },
  spinner: {
    marginTop: 24,
  },
  list: {
    paddingTop: 4,
    paddingBottom: 96,
  },
  empty: {
    textAlign: 'center',
    marginTop: 32,
    opacity: 0.7,
    paddingHorizontal: 24,
  },
  fab: {
    position: 'absolute',
    right: 16,
    // 1mm ≈ 6.3dp en móvil (la densidad "dp" se define así: 160dp = 1
    // pulgada = 25.4mm), así que subirlo ~8mm son unos 50dp más que antes.
    bottom: 66,
  },
});
