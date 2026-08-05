import * as Location from 'expo-location';

import { deviceLocation } from '../../infrastructure/location/deviceLocation';
import { COUNTRY_CALLING_CODES } from '../../shared/constants/countryCallingCodes';

// España es el mercado principal de la app — si no hay forma de saber el
// país de verdad, se asume este por defecto en vez de dejar el número sin
// prefijo.
const DEFAULT_DIAL_CODE = '34';

// Si un contacto de la agenda tiene el teléfono guardado SIN prefijo de
// país (algo muy habitual: la mayoría de la gente se guarda los números
// locales tal cual, "612345678", no "+34612345678"), tanto la búsqueda en
// profiles como el enlace de WhatsApp necesitan uno para funcionar bien.
// Aquí se adivina por geolocalización — pero reutilizando la ÚLTIMA
// posición que ya se consiguió al entrar a la pantalla principal
// (listBarsSortedByDistance ya la pide para ordenar los bares por
// cercanía), no pidiendo una nueva: ver deviceLocation.getLastKnownPosition().
// Si todavía no hay ninguna guardada (permiso denegado, o la lista de
// bares aún no ha cargado), se asume España directamente.
//
// OJO — limitación conocida, no resuelta aquí: esto NO quita un posible
// "0" de marcación nacional que algunos países exigen delante del número
// local (Reino Unido, Francia...) al anteponer el prefijo internacional.
// España no lo necesita (por eso el caso por defecto siempre es correcto),
// pero el caso "detectado por geolocalización" podría dar un número mal
// formado en países que sí usan ese "0". Solucionarlo de verdad requeriría
// una librería de parseo de teléfonos (tipo libphonenumber-js).
export async function normalizePhoneWithCountryCode(phone) {
  const trimmed = phone.trim();
  if (trimmed.startsWith('+')) return trimmed;
  if (trimmed.startsWith('00')) return `+${trimmed.slice(2)}`;

  const dialCode = await guessDialCodeFromLocation();
  return `+${dialCode}${trimmed}`;
}

async function guessDialCodeFromLocation() {
  const position = deviceLocation.getLastKnownPosition();
  if (!position) return DEFAULT_DIAL_CODE;

  try {
    const [place] = await Location.reverseGeocodeAsync(position);
    return (place?.isoCountryCode && COUNTRY_CALLING_CODES[place.isoCountryCode]) || DEFAULT_DIAL_CODE;
  } catch {
    return DEFAULT_DIAL_CODE;
  }
}
