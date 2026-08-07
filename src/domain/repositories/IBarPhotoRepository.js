// Contrato para la foto privada de un bar.
// Implementación real: infrastructure/supabase/repositories/SupabaseBarPhotoRepository.js
/**
 * @typedef {Object} IBarPhotoRepository
 * @property {(barId: string) => Promise<BarPhoto|null>} getForBar - Tu propia foto para ese bar (RLS ya filtra por ti), o `null` si todavía no has puesto ninguna.
 * @property {(params: {barId: string, localFileUri: string, mimeType?: string}) => Promise<BarPhoto>} setPhoto - Sube una foto nueva (o la reemplaza si ya tenías una). `localFileUri` es la ruta de la imagen en el propio móvil, elegida con expo-image-picker, ANTES de subirla a Supabase Storage. `mimeType` (ej. "image/png") viene del propio resultado de expo-image-picker y decide la extensión con la que se guarda — importante para que el archivo se pueda leer luego correctamente.
 * @property {(barId: string) => Promise<string|null>} getSignedUrlForBar - Como el bucket es privado, no hay una URL pública fija: esto pide a Supabase una URL temporal (caduca sola) para poder pintar la imagen en pantalla. Tu foto personal manda si la tienes; si no, cae a la oficial (ver getOfficialForBar) antes de devolver `null`.
 * @property {(photoPath: string) => Promise<void>} deletePhotoFile - Borra el archivo real del bucket (no solo la fila de la base de datos). Hay que llamarlo justo antes de borrar un bar de verdad, si tenías foto puesta — si no, el archivo se queda huérfano en Storage para siempre.
 * @property {(barId: string) => Promise<BarPhoto|null>} getOfficialForBar - La foto "oficial" del bar (puesta por el admin, visible para cualquiera que vea el bar), o `null` si no hay ninguna.
 * @property {(params: {barId: string, localFileUri: string, mimeType?: string}) => Promise<BarPhoto>} setOfficialPhoto - Sube/reemplaza la foto oficial. Solo puede hacerlo el admin (lo exige la RLS de bar_official_photos y de Storage, no solo la interfaz).
 */

export {};
