import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';

import { listCatalogSortedByPopularity } from '../../application/catalog/listCatalogSortedByPopularity';
import { addDrinkToTab } from '../../application/tabs/addDrinkToTab';
import { computeTabTotalCents, hasMissingPrices } from '../../application/tabs/computeTabTotal';
import { container } from '../../di/container';

// Todo lo que necesita la pantalla de una cuenta abierta (bars/[barId]/tab/[tabId].jsx):
// las 4 consultas, las 6 mutaciones, los datos derivados (filas del recibo,
// total, si faltan precios) y los manejadores de cada acción. Antes vivía
// TODO esto dentro del componente de pantalla (más de 480 líneas mezclando
// "traer/mutar datos" con JSX) — separado en un hook, el componente se
// queda solo con el render y esto se puede razonar/testear aparte.
export function useTabScreen({ barId, tabId }) {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  // Cuándo hay que preguntar el precio de una bebida: 'add' (se acaba de
  // tocar para añadirla y todavía no tiene precio, así que al guardar el
  // precio también se añade) o 'edit' (solo poner/corregir el precio, sin
  // añadir nada — "Añadir precio" o el lápiz). `quantity` solo se usa en 'add'.
  const [pricePrompt, setPricePrompt] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [unlinkConfirmVisible, setUnlinkConfirmVisible] = useState(false);
  // Un simple contador para darle un `token` distinto a cada apertura del
  // diálogo de precio (se usa como parte de su `key`, ver el componente). No
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
    // La cuenta puede estar compartida con una pareja vinculada (ver
    // open_or_join_tab, migración 0026) y todavía no hay ningún canal en
    // tiempo real en la app — sin este sondeo, lo que añada la otra persona
    // no aparecería aquí hasta salir y volver a entrar a la pantalla.
    refetchInterval: 10 * 1000,
  });

  // Popularidad por icono en TODA la app (no solo este bar) — ordena el
  // selector de iconos del botón +.
  const iconPopularityQuery = useQuery({
    queryKey: ['iconPopularity'],
    queryFn: () => container.catalogRepository.getIconPopularity(),
  });

  // Fase E: si tienes una cuenta vinculada (Ajustes → Vincular cuenta), se
  // avisa aquí también, en CUALQUIER cuenta abierta — de momento sin el
  // matiz de "solo si la pareja también tiene cuenta abierta en este bar"
  // ni el toggle por-cuenta-individual (simplificación aceptada, ver
  // memoria de la Fase 3). Misma queryKey que link-account.jsx, así que
  // desvincular desde cualquiera de las dos pantallas refresca la otra sola.
  const linkQuery = useQuery({
    queryKey: ['myAccountLink'],
    queryFn: () => container.accountLinkRepository.getMyLink(),
  });

  const unlinkMutation = useMutation({
    mutationFn: (linkId) => container.accountLinkRepository.unlink(linkId),
    onSuccess: () => {
      setUnlinkConfirmVisible(false);
      queryClient.invalidateQueries({ queryKey: ['myAccountLink'] });
    },
    onError: (error) => setErrorMessage(error.message ?? 'No se pudo desvincular la cuenta.'),
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

  const totalCents = useMemo(
    () => computeTabTotalCents(tabItemsQuery.data ?? []),
    [tabItemsQuery.data],
  );
  const missingPrices = useMemo(
    () => hasMissingPrices(tabItemsQuery.data ?? []),
    [tabItemsQuery.data],
  );

  // Añadir una bebida que YA estaba en el catálogo. `priceCentsOverride`
  // solo viene informado cuando el precio se acaba de poner/corregir en el
  // diálogo — en ese caso también hay que refrescar el catálogo.
  const addExistingMutation = useMutation({
    mutationFn: ({ item, quantity, priceCentsOverride, allowMissingPrice }) =>
      addDrinkToTab({
        tabId,
        barId,
        existingItem: item,
        quantity,
        priceCentsOverride,
        allowMissingPrice,
      }),
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
    mutationFn: (catalogItemId) =>
      container.tabItemRepository.removeOneUnit({ tabId, catalogItemId }),
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
      addExistingMutation.mutate({
        item: pricePrompt.item,
        quantity: pricePrompt.quantity,
        priceCentsOverride: priceCents,
      });
    }
    setPricePrompt(null);
  };

  // "No sé el precio": añade igualmente, sin precio — solo tiene sentido en
  // modo 'add' (en 'edit' no hay nada que añadir, solo un precio que corregir).
  const handleSkipPrice = () => {
    addExistingMutation.mutate({
      item: pricePrompt.item,
      quantity: pricePrompt.quantity,
      allowMissingPrice: true,
    });
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

  const handleRemoveOne = (catalogItemId) => removeOneMutation.mutate(catalogItemId);

  const handleConfirmUnlink = () => unlinkMutation.mutate(linkQuery.data.linkId);

  return {
    // Datos para renderizar.
    isLoading: catalogQuery.isLoading || tabItemsQuery.isLoading,
    tabRows,
    timestampsByItem,
    totalCents,
    missingPrices,
    linkPartnerFirstName: linkQuery.data?.partnerFirstName,
    catalogItems: catalogQuery.data,
    iconPopularity: iconPopularityQuery.data,
    errorMessage,

    // Estado de los modales/diálogos.
    modalVisible,
    pricePrompt,
    unlinkConfirmVisible,
    unlinkPending: unlinkMutation.isPending,
    removeOnePending: removeOneMutation.isPending,
    addExistingPending: addExistingMutation.isPending,

    // Acciones.
    openAddDrink: handleOpenAddDrink,
    closeAddDrinkModal: () => setModalVisible(false),
    submitAddDrink: handleAddDrinkSubmit,
    setPriceOnly: handleSetPriceOnly,
    requestAdd: handleRequestAdd,
    removeOne: handleRemoveOne,
    closePricePrompt: () => setPricePrompt(null),
    submitPrice: handleSubmitPrice,
    skipPrice: handleSkipPrice,
    closeTab: handleCloseTab,
    openUnlinkConfirm: () => setUnlinkConfirmVisible(true),
    cancelUnlink: () => setUnlinkConfirmVisible(false),
    confirmUnlink: handleConfirmUnlink,
    dismissError: () => setErrorMessage(null),
  };
}
