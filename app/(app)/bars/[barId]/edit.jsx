import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Asset } from 'expo-asset';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Dialog, HelperText, Portal, Text, useTheme } from 'react-native-paper';

import { container } from '../../../../src/di/container';
import { useAuth } from '../../../../src/presentation/hooks/useAuth';
import { BAR_PLACEHOLDER_PHOTOS } from '../../../../src/shared/constants/barPlaceholderPhotos';

// Menú de edición de un bar: "Cambiar foto" (la tuya, personal — abre el
// menú de siempre: cámara / galería / foto por defecto), "Editar precios"
// (navega a la lista completa del catálogo, ver settings.jsx) y, solo si
// eres admin, "Cambiar foto oficial" — la que ve todo el mundo que no se
// haya puesto la suya propia. Las dos opciones de foto reutilizan el MISMO
// diálogo; `photoTarget` decide a qué repositorio (personal u oficial) va
// la subida.
export default function BarEditScreen() {
  const { barId, name } = useLocalSearchParams();
  const theme = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [photoMenuVisible, setPhotoMenuVisible] = useState(false);
  const [photoTarget, setPhotoTarget] = useState('personal');
  // Dentro del mismo diálogo: false = menú de opciones, true = la rejilla
  // con las 10 fotos genéricas para elegir una.
  const [showDefaultPhotos, setShowDefaultPhotos] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(null);

  const uploadPhoto = async (asset) => {
    // OJO: no cerramos el diálogo aquí todavía — se queda abierto mostrando
    // un spinner mientras sube, y solo se cierra si todo fue bien.
    setPhotoError(null);
    setIsUploadingPhoto(true);
    try {
      const setPhoto =
        photoTarget === 'official' ? container.barPhotoRepository.setOfficialPhoto : container.barPhotoRepository.setPhoto;
      await setPhoto({
        barId,
        localFileUri: asset.uri,
        mimeType: asset.mimeType,
      });
      // La lista de bares (debajo, en la pila de navegación) tiene esta
      // misma query cacheada — al invalidarla aquí, se refresca sola en
      // cuanto volvamos a verla. Sirve para las dos (personal y oficial):
      // getSignedUrlForBar ya resuelve cuál enseñar.
      queryClient.invalidateQueries({ queryKey: ['barPhotoUrl', barId] });
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

  const openPhotoMenu = (target) => {
    setPhotoTarget(target);
    setPhotoError(null);
    setShowDefaultPhotos(false);
    setPhotoMenuVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Pressable onPress={() => openPhotoMenu('personal')} style={[styles.option, { borderColor: theme.colors.outlineVariant }]}>
        <MaterialCommunityIcons name="camera-outline" size={26} color={theme.colors.primary} />
        <View style={styles.optionText}>
          <Text variant="titleMedium">Cambiar foto</Text>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Hacer una foto, elegir de la galería o una por defecto</Text>
        </View>
      </Pressable>

      <Pressable
        onPress={() => router.push(`/bars/${barId}/settings`)}
        style={[styles.option, { borderColor: theme.colors.outlineVariant }]}
      >
        <MaterialCommunityIcons name="currency-eur" size={26} color={theme.colors.primary} />
        <View style={styles.optionText}>
          <Text variant="titleMedium">Editar precios</Text>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Revisa y corrige el precio de cada bebida del catálogo</Text>
        </View>
      </Pressable>

      {/* Igual que en Ajustes: la protección real está en la RLS de
          bar_official_photos y del bucket de Storage (solo admin puede
          escribir) — esto solo evita que alguien que no es admin vea la
          opción. */}
      {user?.isAdmin ? (
        <Pressable
          onPress={() => openPhotoMenu('official')}
          style={[styles.option, { borderColor: theme.colors.outlineVariant }]}
        >
          <MaterialCommunityIcons name="shield-crown-outline" size={26} color={theme.colors.primary} />
          <View style={styles.optionText}>
            <Text variant="titleMedium">Cambiar foto oficial</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              La ve todo el mundo que no se haya puesto su propia foto
            </Text>
          </View>
        </Pressable>
      ) : null}

      <Portal>
        <Dialog visible={photoMenuVisible} onDismiss={() => setPhotoMenuVisible(false)}>
          <Dialog.Title>
            {photoTarget === 'official' ? 'Foto oficial de' : 'Foto de'} &quot;{name}&quot;
          </Dialog.Title>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionText: {
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
