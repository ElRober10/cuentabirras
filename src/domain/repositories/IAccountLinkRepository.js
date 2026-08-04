// Contrato para "vincular cuenta" (1:1, ver la migración
// 0019_account_linking.sql). Implementación real:
// infrastructure/supabase/repositories/SupabaseAccountLinkRepository.js
/**
 * @typedef {Object} SentLinkInvitationResult
 * @property {string} requestId
 * @property {string|null} matchedUserId - Si ya existía un perfil con ese teléfono/email.
 * @property {string|null} matchedFirstName
 * @property {string|null} matchedLastName
 *
 * @typedef {Object} PendingLinkInvitation
 * @property {string} requestId
 * @property {string} senderId
 * @property {string} senderFirstName
 * @property {string} senderLastName
 * @property {string|null} senderAvatarUrl
 * @property {string} createdAt
 * @property {string} expiresAt
 *
 * @typedef {Object} SentLinkInvitation
 * @property {string} requestId
 * @property {string|null} recipientUserId
 * @property {string|null} recipientFirstName
 * @property {string|null} recipientLastName
 * @property {string|null} recipientPhone
 * @property {string|null} recipientEmail
 * @property {string} createdAt
 * @property {string} expiresAt
 *
 * @typedef {Object} AccountLink
 * @property {string} linkId
 * @property {string} linkedSince
 * @property {string} partnerId
 * @property {string} partnerFirstName
 * @property {string} partnerLastName
 * @property {string|null} partnerAvatarUrl
 *
 * @typedef {Object} IAccountLinkRepository
 * @property {(params: {phone?: string, email?: string}) => Promise<SentLinkInvitationResult>} sendInvitation - Invita a otra persona por teléfono o por email (uno de los dos). Lanza si te invitas a ti mismo, si ya tienes una invitación pendiente enviada, si ya estás vinculado, o si el destinatario ya está vinculado con otra persona.
 * @property {(params: {requestId: string, accept: boolean}) => Promise<void>} respondToInvitation - Acepta o rechaza una invitación que te han enviado a ti.
 * @property {(requestId: string) => Promise<void>} cancelInvitation - Cancela una invitación que TÚ enviaste, mientras siga pendiente.
 * @property {(linkId: string) => Promise<void>} unlink - Desvincula tu cuenta vinculada actual (lo puede hacer cualquiera de los dos).
 * @property {() => Promise<AccountLink|null>} getMyLink - Tu vínculo activo (con el nombre de la otra persona), o `null` si no estás vinculado.
 * @property {() => Promise<PendingLinkInvitation[]>} getMyPendingInvitations - Invitaciones pendientes dirigidas a ti (por id ya resuelto, o por coincidencia de tu propio teléfono/email). Se llama tras cada login.
 * @property {() => Promise<SentLinkInvitation|null>} getMySentInvitation - Tu invitación pendiente enviada (para poder cancelarla), o `null` si no tienes ninguna.
 */

export {};
