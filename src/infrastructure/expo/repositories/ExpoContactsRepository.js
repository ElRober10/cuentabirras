import { Contact, ContactField, requestPermissionsAsync } from 'expo-contacts';

// Esta es la implementación REAL del contrato IContactsRepository
// (domain/repositories/IContactsRepository.js). Vive en infrastructure/expo/
// (no infrastructure/supabase/) porque no habla con Supabase — es una
// integración con el propio dispositivo, como biometricAuth.js.
//
// Usa la API "next" de expo-contacts (Contact.presentPicker), no la vieja
// (getContactsAsync/presentContactPickerAsync sueltos — esas ahora están
// obsoletas y lanzan un error en tiempo de ejecución si se llaman desde el
// import normal). presentPicker() abre el selector NATIVO del sistema (como
// el selector de fotos) y en sí mismo NO pide permiso — pero, probado en
// real, `contact.getDetails(...)` para leer el teléfono del contacto
// elegido SÍ lo necesita (en Android falla con "Missing
// android.permission.READ_CONTACTS permission" si no se ha pedido antes),
// así que hay que pedirlo de todas formas antes de leer nada.
/** @type {import('../../../domain/repositories/IContactsRepository').IContactsRepository} */
export const expoContactsRepository = {
  async pickContact() {
    const { status } = await requestPermissionsAsync();
    if (status !== 'granted') return null;

    const contact = await Contact.presentPicker();
    if (!contact) return null;

    const details = await contact.getDetails([ContactField.FULL_NAME, ContactField.PHONES]);
    const phone = details.phones?.[0]?.number;
    if (!phone) return null;

    return { name: details.fullName ?? null, phone };
  },
};
