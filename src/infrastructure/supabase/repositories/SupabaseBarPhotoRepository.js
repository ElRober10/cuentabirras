import { decode as base64ToArrayBuffer } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from '../client';

const BUCKET = 'bar-photos';

function mapBarPhoto(row) {
  return {
    id: row.id,
    barId: row.bar_id,
    userId: row.user_id,
    photoPath: row.photo_path,
    createdAt: row.created_at,
  };
}

async function getCurrentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session.user.id;
}

// La extensión del archivo debe coincidir con su contenido REAL — antes
// guardábamos siempre ".jpg" pase lo que pase, pero una foto hecha con la
// cámara puede salir en otro formato (PNG, sobre todo tras recortarla), y
// esa discrepancia hacía que la imagen no se pudiera leer luego. Mejor
// derivarla del mimeType que nos da expo-image-picker.
function extensionForMimeType(mimeType) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

/** @type {import('../../../domain/repositories/IBarPhotoRepository').IBarPhotoRepository} */
export const supabaseBarPhotoRepository = {
  async getForBar(barId) {
    const { data, error } = await supabase
      .from('bar_photos')
      .select('*')
      .eq('bar_id', barId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapBarPhoto(data) : null;
  },

  async setPhoto({ barId, localFileUri, mimeType = 'image/jpeg' }) {
    const userId = await getCurrentUserId();
    // Miramos si ya tenías una foto puesta ANTES de subir la nueva: si el
    // formato cambia (por ejemplo, la vieja era .jpg y la nueva sale .png),
    // la ruta también cambia, y el upsert de más abajo no la pisaría —
    // quedaría huérfana en Storage para siempre si no la borramos aparte.
    const previousPhoto = await this.getForBar(barId);

    // Ruta dentro del bucket: "miUserId/esteBarId.ext". Coincide con la
    // política de Storage de la migración 0004, que solo deja tocar
    // archivos cuya primera carpeta sea tu propio id de usuario.
    const path = `${userId}/${barId}.${extensionForMimeType(mimeType)}`;

    // OJO: usar fetch(localFileUri).arrayBuffer() aquí es un error conocido
    // en React Native — con archivos locales (sobre todo fotos recortadas
    // por la cámara/galería en Android) a veces "funciona" sin lanzar
    // ningún error pero sube un archivo vacío o corrupto, y la foto
    // resultante se queda en blanco. La forma fiable (recomendada por
    // Supabase para Expo) es leer el archivo como texto base64 con
    // expo-file-system y convertirlo a bytes reales antes de subirlo.
    const base64 = await FileSystem.readAsStringAsync(localFileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const arrayBuffer = base64ToArrayBuffer(base64);

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
      contentType: mimeType,
      upsert: true, // si ya había una foto en esa ruta, la reemplaza en vez de fallar
    });
    if (uploadError) throw uploadError;

    // Guardamos (o actualizamos) la fila en bar_photos apuntando a esa ruta.
    // onConflict indica qué columnas identifican "la misma fila" para saber
    // cuándo actualizar en vez de insertar (coincide con el unique(bar_id, user_id) de la migración).
    const { data, error } = await supabase
      .from('bar_photos')
      .upsert({ bar_id: barId, user_id: userId, photo_path: path }, { onConflict: 'bar_id,user_id' })
      .select()
      .single();
    if (error) throw error;

    if (previousPhoto && previousPhoto.photoPath !== path) {
      // Es un archivo distinto al nuevo (cambió la extensión) — lo borramos
      // para no dejarlo huérfano. Si fallara, no rompemos la subida (que ya
      // fue bien): solo lo avisamos por consola.
      const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([previousPhoto.photoPath]);
      if (cleanupError) console.warn('No se pudo borrar la foto anterior:', cleanupError);
    }

    return mapBarPhoto(data);
  },

  async getSignedUrlForBar(barId) {
    const photo = await this.getForBar(barId);
    if (!photo) return null;

    // El bucket es privado, así que no existe una URL pública fija para la
    // imagen: createSignedUrl genera una URL temporal (aquí, válida 1 hora)
    // que sí se puede usar directamente en un <Image source={{ uri }} />.
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(photo.photoPath, 3600);
    if (error) throw error;
    return data.signedUrl;
  },

  // Borra el archivo real del bucket. Supabase bloquea borrar filas de
  // storage.objects directamente por SQL ("Use the Storage API instead"),
  // así que este borrado tiene que hacerse desde aquí (la propia API de
  // Storage), no desde una función de base de datos.
  async deletePhotoFile(photoPath) {
    const { error } = await supabase.storage.from(BUCKET).remove([photoPath]);
    if (error) throw error;
  },
};
