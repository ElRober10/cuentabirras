import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';

import { DRINK_CATEGORIES } from '../../shared/constants/drinkCategories';
import { GENERIC_DRINK_ICON_IMAGE } from '../../shared/constants/drinkIcons';
import { GRID_GAP } from '../hooks/useDrinkGridLayout';

// 'otro' no es un valor de drinkIcons.js — es la opción de "ninguno de
// estos, deja que le ponga yo un nombre" dentro de este mismo selector.
export const OTHER_ICON = 'otro';

// Paso 1 de AddDrinkModal: la rejilla de iconos (filtrada por Bebida/Comida
// y por el buscador) más la tarjeta "Otro". Puramente presentacional — toda
// la lista ya viene filtrada/ordenada desde el padre.
export function DrinkIconPicker({
  categoryTab,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  visibleIcons,
  visibleCustomItems,
  tileWidth,
  imageAreaSize,
  tileBase,
  onPickIcon,
  onPickCustomItem,
}) {
  const theme = useTheme();

  return (
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
            onChangeText={onSearchChange}
            left={<TextInput.Icon icon="magnify" />}
            right={searchQuery ? <TextInput.Icon icon="close" onPress={() => onSearchChange('')} /> : null}
            dense
            style={styles.searchInput}
          />
          <ScrollView contentContainerStyle={styles.iconGrid}>
            {visibleIcons.map((icon) => (
              <Pressable
                key={icon.value}
                onPress={() => onPickIcon(icon.value)}
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
                onPress={() => onPickCustomItem(item)}
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
              onPress={() => onPickIcon(OTHER_ICON)}
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
        onValueChange={onCategoryChange}
        style={styles.segmented}
        buttons={DRINK_CATEGORIES.map((category) => ({
          value: category.value,
          label: category.label,
        }))}
      />
    </>
  );
}

const styles = StyleSheet.create({
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
  // en useDrinkGridLayout (tileWidth) y se combina con este estilo base —
  // igual que imageAreaSize con iconImageArea. Todas las tarjetas miden
  // IGUAL (para que la rejilla quede ordenada); lo que cambia de tamaño
  // según icon.scale es el propio dibujo de dentro (más pequeño para un
  // botellín, más grande para una jarra grande), centrado dentro de este
  // mismo hueco de imagen. El nombre va debajo, a ancho completo de la
  // tarjeta, y puede ocupar hasta 2 líneas — nunca se corta con "...", para
  // que se lea la bebida entera (importante sobre todo en las que comparten
  // dibujo parecido, como las de una marca concreta).
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
});
