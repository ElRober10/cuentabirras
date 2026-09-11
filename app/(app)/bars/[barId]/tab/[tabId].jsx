import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, FAB, Snackbar, Text, useTheme } from 'react-native-paper';

import { AddDrinkModal } from '../../../../../src/presentation/components/AddDrinkModal';
import { AppButton } from '../../../../../src/presentation/components/AppButton';
import { ConfirmDialog } from '../../../../../src/presentation/components/ConfirmDialog';
import { SetPriceDialog } from '../../../../../src/presentation/components/SetPriceDialog';
import { TabItemRow } from '../../../../../src/presentation/components/TabItemRow';
import { useTabScreen } from '../../../../../src/presentation/hooks/useTabScreen';
import { centsToEuros } from '../../../../../src/shared/utils/money';

// La pantalla de la cuenta abierta: un "recibo" con una fila por cada
// bebida que ya has añadido (tantos iconos como unidades, numerados, y un
// botón para quitar la última si te equivocas). El botón "+" flotante abre
// el selector de iconos para añadir una bebida (nueva o ya conocida).
//
// Toda la lógica (consultas, mutaciones, datos derivados) vive en
// useTabScreen — aquí solo queda el render.
export default function TabScreen() {
  const { barId, tabId } = useLocalSearchParams();
  const theme = useTheme();
  const tab = useTabScreen({ barId, tabId });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <View style={styles.totalBlock}>
          <Text variant="headlineSmall">{centsToEuros(tab.totalCents)} €</Text>
          {tab.missingPrices ? (
            <Text style={[styles.missingPricesWarning, { color: theme.colors.error }]}>
              Faltan precios, el total puede no ser exacto
            </Text>
          ) : null}
        </View>
        <AppButton mode="outlined" onPress={tab.closeTab}>
          Cerrar cuenta
        </AppButton>
      </View>

      {tab.linkPartnerFirstName ? (
        <View style={[styles.linkedBanner, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons
            name="link-variant"
            size={16}
            color={theme.colors.onPrimaryContainer}
          />
          <Text
            style={[styles.linkedBannerText, { color: theme.colors.onPrimaryContainer }]}
            numberOfLines={1}
          >
            Vinculada con {tab.linkPartnerFirstName}
          </Text>
          <Pressable onPress={tab.openUnlinkConfirm} disabled={tab.unlinkPending} hitSlop={8}>
            <Text style={[styles.unlinkText, { color: theme.colors.onPrimaryContainer }]}>
              {tab.unlinkPending ? 'Desvinculando…' : 'Desvincular'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {tab.isLoading ? (
        <ActivityIndicator style={styles.spinner} />
      ) : (
        <FlatList
          data={tab.tabRows}
          keyExtractor={(row) => row.catalogItem.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: row }) => (
            <TabItemRow
              catalogItem={row.catalogItem}
              quantity={row.quantity}
              timestamps={tab.timestampsByItem[row.catalogItem.id]}
              onAddOne={() => tab.requestAdd(row.catalogItem, 1)}
              onRemoveOne={() => tab.removeOne(row.catalogItem.id)}
              disabled={tab.removeOnePending || tab.addExistingPending}
            />
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              Apunta lo que te tomes y yo llevo la cuenta. ¡Añade tu primera bebida con el botón +!
            </Text>
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
        onPress={tab.openAddDrink}
      />

      <AddDrinkModal
        key={tab.modalVisible ? 'add-drink-open' : 'add-drink-closed'}
        visible={tab.modalVisible}
        onDismiss={tab.closeAddDrinkModal}
        existingCatalogItems={tab.catalogItems}
        iconPopularity={tab.iconPopularity}
        onSubmit={tab.submitAddDrink}
        onSetPriceOnly={tab.setPriceOnly}
      />

      <SetPriceDialog
        key={
          tab.pricePrompt
            ? `set-price-${tab.pricePrompt.item.id}-${tab.pricePrompt.token}`
            : 'set-price-closed'
        }
        visible={!!tab.pricePrompt}
        drinkName={tab.pricePrompt?.item?.name}
        initialPriceCents={tab.pricePrompt?.mode === 'edit' ? tab.pricePrompt.item.priceCents : null}
        onDismiss={tab.closePricePrompt}
        onSubmit={tab.submitPrice}
        onSkip={tab.pricePrompt?.mode === 'add' ? tab.skipPrice : undefined}
      />

      <Snackbar visible={!!tab.errorMessage} onDismiss={tab.dismissError} duration={4000}>
        {tab.errorMessage}
      </Snackbar>

      <ConfirmDialog
        visible={tab.unlinkConfirmVisible}
        title="¿Desvincular cuenta?"
        confirmLabel="Desvincular"
        confirmLoading={tab.unlinkPending}
        onCancel={tab.cancelUnlink}
        onConfirm={tab.confirmUnlink}
      >
        <Text>Dejaréis de compartir el fondo común. Podréis volver a vincularos más adelante si queréis.</Text>
      </ConfirmDialog>
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
    fontSize: 17,
    marginTop: 2,
  },
  linkedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  linkedBannerText: {
    flex: 1,
    fontSize: 15,
  },
  unlinkText: {
    fontSize: 15,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
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
    // 1mm ≈ 6.3dp en móvil — había quedado muy alto tras subirlo 8mm
    // (~50dp) en su día, así que ahora se baja ~6mm (~38dp) de vuelta: 66 - 38 = 28.
    bottom: 28,
  },
});
