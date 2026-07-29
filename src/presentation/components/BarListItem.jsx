import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Asset } from 'expo-asset';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Animated, Image, Pressable, StyleSheet, View } from 'react-native';
import { Dialog, HelperText, IconButton, Portal, Text, useTheme } from 'react-native-paper';

import { container } from '../../di/container';
import { BAR_PLACEHOLDER_PHOTOS, getBarPlaceholderPhoto } from '../../shared/constants/barPlaceholderPhotos';
import { usePressScale } from '../hooks/usePressScale';

// Una fila de la lista de bares: tu foto privada de ese bar (si le pusiste
// una; si no, una foto de bar "genérica" siempre la misma para ese bar), su
// nombre, "Entrar al bar", y un botón para quitarlo de tu lista. Mantener
// pulsada la foto abre las opciones para cambiarla (cámara o galería).
export function BarListItem({ bar, onPress, onRequestRemove }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { scale, onPressIn, onPressOut } = usePressScale({ pressedScale: 0.97 });
  const [photoMenuVisible, setPhotoMenuVisible] = useState(false);
  // Dentro del mismo diálogo: false = menú de opciones, true = la rejilla
  // con las 10 fotos genéricas para elegir una.
  const [showDefaultPhotos, setShowDefaultPhotos] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  // Si la URL firmada carga pero la imagen en sí no se puede pintar (por
  // ejemplo, un archivo corrupto de una subida anterior), esto evita que se
  // quede en blanco para siempre: caemos a la foto genérica.
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);

  const { data: photoUrl } = useQuery({
    queryKey: ['barPhotoUrl', bar.id],
    queryFn: () => container.barPhotoRepository.getSignedUrlForBar(bar.id),
  });

  // Si aún no hay fotos genéricas configuradas (BAR_PLACEHOLDER_PHOTOS vacío),
  // esto es null y caemos en el icono de antes como último respaldo.
  const placeholderPhoto = getBarPlaceholderPhoto(bar.id);

  const uploadPhoto = async (asset) => {
    // OJO: no cerramos el diálogo aquí todavía — se queda abierto mostrando
    // un spinner mientras sube, y solo se cierra si todo fue bien. Antes lo
    // cerrábamos al instante y, si la subida fallaba, no había forma de
    // enterarse (la foto se quedaba en blanco sin ninguna pista).
    setPhotoError(null);
    setIsUploadingPhoto(true);
    try {
      await container.barPhotoRepository.setPhoto({
        barId: bar.id,
        localFileUri: asset.uri,
        mimeType: asset.mimeType,
      });
      setPhotoLoadFailed(false);
      queryClient.invalidateQueries({ queryKey: ['barPhotoUrl', bar.id] });
      setPhotoMenuVisible(false);
      setShowDefaultPhotos(false);
    } catch (error) {
      console.warn('No se pudo subir la foto del bar:', error);
      setPhotoError(error.message ?? 'No se pudo subir la foto.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setPhotoMenuVisible(false);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.6, // 0-1: bajamos algo la calidad para que la foto pese menos y suba rápido
      allowsEditing: true,
      aspect: [1, 1], // fuerza un recorte cuadrado, a juego con el hueco circular/cuadrado de la tarjeta
    });
    if (result.canceled) {
      setPhotoMenuVisible(false);
      return;
    }
    await uploadPhoto(result.assets[0]);
  };

  const handlePickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setPhotoMenuVisible(false);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.6,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) {
      setPhotoMenuVisible(false);
      return;
    }
    await uploadPhoto(result.assets[0]);
  };

  // Las fotos genéricas están empaquetadas dentro de la propia app
  // (require(...)), no son un archivo suelto en el móvil — expo-asset las
  // "descarga" a la caché local (aunque ya vengan incluidas) para darnos
  // una ruta de archivo real que sí se puede leer con expo-file-system,
  // igual que si la hubieras elegido de la galería.
  const handlePickDefaultPhoto = async (photoModule) => {
    const asset = Asset.fromModule(photoModule);
    await asset.downloadAsync();
    await uploadPhoto({ uri: asset.localUri ?? asset.uri, mimeType: 'image/jpeg' });
  };

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[styles.card, { backgroundColor: theme.colors.surface, transform: [{ scale }] }]}>
        {/* Pressable propio para la foto (con onPress Y onLongPress): así un
            toque corto sigue entrando al bar igual que el resto de la
            tarjeta, pero mantenerla pulsada abre las opciones de cambiarla. */}
        <Pressable
          onPress={onPress}
          onLongPress={() => {
            setPhotoError(null);
            setShowDefaultPhotos(false);
            setPhotoMenuVisible(true);
          }}
          style={styles.photoWrapper}
        >
          {isUploadingPhoto ? (
            <View style={[styles.photoPlaceholder, { backgroundColor: theme.colors.surfaceVariant }]}>
              <ActivityIndicator size="small" />
            </View>
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
        </Pressable>

        <View style={styles.info}>
          <Text variant="titleMedium" numberOfLines={1}>
            {bar.name}
          </Text>
          <Text style={{ color: theme.colors.primary }}>Entrar al bar</Text>
        </View>

        {/* IconButton ya es su propio elemento tocable, así que al pulsarlo
            no dispara también el onPress de la tarjeta entera que lo
            envuelve (React Native le da la respuesta táctil al más interno). */}
        <IconButton icon="trash-can-outline" size={20} onPress={() => onRequestRemove(bar)} />
      </Animated.View>

      <Portal>
        <Dialog visible={photoMenuVisible} onDismiss={() => setPhotoMenuVisible(false)}>
          <Dialog.Title>Foto de &quot;{bar.name}&quot;</Dialog.Title>
          <Dialog.Content>
            {isUploadingPhoto ? (
              <View style={styles.uploadingRow}>
                <ActivityIndicator size="small" />
                <Text>Subiendo foto...</Text>
              </View>
            ) : showDefaultPhotos ? (
              <>
                <Pressable onPress={() => setShowDefaultPhotos(false)} style={styles.menuOption}>
                  <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.primary} />
                  <Text style={styles.menuOptionText}>Volver</Text>
                </Pressable>
                <View style={styles.defaultPhotoGrid}>
                  {BAR_PLACEHOLDER_PHOTOS.map((photoModule, index) => (
                    <Pressable key={index} onPress={() => handlePickDefaultPhoto(photoModule)}>
                      <Image source={photoModule} style={styles.defaultPhotoThumb} />
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <>
                <Pressable onPress={handleTakePhoto} style={styles.menuOption}>
                  <MaterialCommunityIcons name="camera" size={22} color={theme.colors.primary} />
                  <Text style={styles.menuOptionText}>Hacer una foto</Text>
                </Pressable>
                <Pressable onPress={handlePickFromGallery} style={styles.menuOption}>
                  <MaterialCommunityIcons name="image-multiple" size={22} color={theme.colors.primary} />
                  <Text style={styles.menuOptionText}>Elegir de la galería</Text>
                </Pressable>
                <Pressable onPress={() => setShowDefaultPhotos(true)} style={styles.menuOption}>
                  <MaterialCommunityIcons name="view-grid-outline" size={22} color={theme.colors.primary} />
                  <Text style={styles.menuOptionText}>Elegir una foto por defecto</Text>
                </Pressable>
              </>
            )}
            {photoError ? (
              <HelperText type="error" visible>
                {photoError}
              </HelperText>
            ) : null}
          </Dialog.Content>
        </Dialog>
      </Portal>
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
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  menuOptionText: {
    fontSize: 16,
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  defaultPhotoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 8,
    paddingBottom: 4,
  },
  defaultPhotoThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
  },
});
