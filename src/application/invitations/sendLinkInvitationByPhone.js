import { Linking } from 'react-native';

import { container } from '../../di/container';
import { APP_DOWNLOAD_LINKS } from '../../shared/constants/appDownloadLinks';
import { normalizePhoneWithCountryCode } from './normalizePhoneWithCountryCode';

// Invitar por teléfono junta varios pasos que SIEMPRE van juntos: (1)
// asegurarse de que el número lleva prefijo de país, adivinándolo por
// geolocalización si el contacto no lo tenía guardado (ver
// normalizePhoneWithCountryCode.js), (2) enviar la invitación de verdad
// (igual que por email) y (3) abrir WhatsApp con un mensaje ya escrito para
// que el propio usuario le dé a enviar. No hay ningún envío automático de
// WhatsApp: la única forma "gratis" de mandarlo solo requiere una API de
// pago (Meta) o un cliente no oficial que arriesga que baneen el número —
// así que esto es lo acordado: un enlace `wa.me`.
export async function sendLinkInvitationByPhone({ phone }) {
  const normalizedPhone = await normalizePhoneWithCountryCode(phone);

  const result = await container.accountLinkRepository.sendInvitation({ phone: normalizedPhone });

  // El push (Fase D2) solo tiene sentido si el destinatario ya tiene cuenta
  // — si no, no hay ningún push_token al que mandar nada (para ese caso ya
  // está el propio WhatsApp de aquí abajo). "Best effort": no bloquea nada.
  if (result.matchedUserId) {
    container.accountLinkRepository.notifyInvitationCreated(result.requestId).catch((error) => {
      console.warn('No se pudo enviar el push de invitación:', error);
    });
  }

  const digitsOnly = normalizedPhone.replace(/[^0-9]/g, '');
  const message = buildInvitationMessage();
  await Linking.openURL(`https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`);

  return result;
}

function buildInvitationMessage() {
  const intro = 'Te he mandado una invitación en CuentaBirras: así, entre los dos, podemos ir añadiendo a la misma cuenta.';
  const cta = 'Ábrela o descárgate la app para responder a la invitación.';

  const { android, ios } = APP_DOWNLOAD_LINKS;
  const stores = [android && `Android: ${android}`, ios && `iPhone: ${ios}`].filter(Boolean).join('\n');

  return stores ? `${intro} ${cta}\n${stores}` : `${intro} ${cta}`;
}
