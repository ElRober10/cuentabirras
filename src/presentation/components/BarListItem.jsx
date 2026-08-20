import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';

import { getBarPlaceholderPhoto } from '../../shared/constants/barPlaceholderPhotos';
import { usePressScale } from '../hooks/usePressScale';

// Una fila de la lista de bares: tu foto privada de ese bar (si le pusiste
// una; si no, una foto de bar "genérica" siempre la misma para ese bar), su
// nombre, "Entrar al bar", un botón para editarlo (foto/precios, ver
// bars/[barId]/edit.jsx) y otro para quitarlo de tu lista.
//
// `photoUrl` e `isPhotoLoading` vienen del padre (HomeScreen), que pide las
// URLs firmadas de TODOS los bares de golpe en una sola consulta batched
// (ver getSignedUrlsForBars) en vez de que cada tarjeta pida la suya por
// separado — mucho más rápido con listas de varios bares.
export function BarListItem({ bar, photoUrl, isPhotoLoading, onPress, onRequestEdit, onRequestRemove }) {
  const theme = useTheme();
  const { scale, onPressIn, onPressOut } = usePressScale({ pressedScale: 0.97 });
  // Si la URL firmada carga pero la imagen en sí no se puede pintar (por
  // ejemplo, un archivo corrupto de una subida anterior), esto evita que se
  // quede en blanco para siempre: caemos a la foto genérica.
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);

  // Si aún no hay fotos genéricas configuradas (BAR_PLACEHOLDER_PHOTOS vacío),
  // esto es null y caemos en el icono de antes como último respaldo.
  const placeholderPhoto = getBarPlaceholderPhoto(bar.id);

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[styles.card, { backgroundColor: theme.colors.surface, transform: [{ scale }] }]}>
        <View style={styles.photoWrapper}>
          {isPhotoLoading ? (
            <View style={[styles.photoPlaceholder, { backgroundColor: theme.colors.surfaceVariant }]} />
          ) : photoUrl && !photoLoadFailed ? (
            <Image
              source={{ uri: photoUrl }}
              style={styles.photo}
              onError={(event) => {
                console.warn('No se pudo cargar la foto del bar:', event.nativeEvent.error);
                setPhotoLoadFailed(true);
              }}
            />
          ) : placeholderPhoto ? (
            <Image source={placeholderPhoto} style={styles.photo} />
          ) : (
            <View style={[styles.photoPlaceholder, { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons
                name={bar.latitude != null ? 'map-marker' : 'lock'}
                size={26}
                color={theme.colors.primary}
              />
            </View>
          )}
          {/* Un pequeño candado en la esquina para los bares privados — la
              foto ya no deja sitio a un icono grande, pero esto se ve igual. */}
          {bar.latitude == null ? (
            <View style={styles.privateBadge}>
              <MaterialCommunityIcons name="lock" size={12} color="#FFFFFF" />
            </View>
          ) : null}
        </View>

        <View style={styles.info}>
          <Text variant="titleMedium" numberOfLines={2}>
            {bar.name}
          </Text>
          <Text style={{ color: theme.colors.primary }}>Entrar al bar</Text>
        </View>

        {/* IconButton ya es su propio elemento tocable, así que al pulsarlo
            no dispara también el onPress de la tarjeta entera que lo
            envuelve (React Native le da la respuesta táctil al más interno). */}
        <IconButton icon="pencil-outline" size={20} onPress={() => onRequestEdit(bar)} />
        <IconButton icon="trash-can-outline" size={20} onPress={() => onRequestRemove(bar)} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 12,
    elevation: 1,
  },
  photoWrapper: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privateBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    padding: 2,
  },
  info: {
    flex: 1,
  },
});
