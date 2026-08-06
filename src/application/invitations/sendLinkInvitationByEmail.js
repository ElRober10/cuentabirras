import { container } from '../../di/container';

// Igual que por teléfono (ver sendLinkInvitationByPhone.js): enviar la
// invitación y avisar van siempre juntos. Los avisos son "best effort" — si
// fallan, la invitación ya se creó igualmente (se ve en Ajustes y al
// iniciar sesión), así que no deben bloquear ni deshacer nada, solo se
// registra el error.
export async function sendLinkInvitationByEmail({ email }) {
  const result = await container.accountLinkRepository.sendInvitation({ email });

  container.accountLinkRepository.sendInvitationEmail(result.requestId).catch((error) => {
    console.warn('No se pudo enviar el email de invitación:', error);
  });

  // El push (Fase D2) solo tiene sentido si el destinatario ya tiene
  // cuenta — si no, no hay ningún push_token al que mandar nada.
  if (result.matchedUserId) {
    container.accountLinkRepository.notifyInvitationCreated(result.requestId).catch((error) => {
      console.warn('No se pudo enviar el push de invitación:', error);
    });
  }

  return result;
}
