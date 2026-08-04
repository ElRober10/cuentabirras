import { supabase } from '../client';

// Esta es la implementación REAL del contrato IAccountLinkRepository
// (domain/repositories/IAccountLinkRepository.js). Todas las funciones son
// llamadas RPC (`security definer` en la base de datos, ver la migración
// 0019_account_linking.sql) — no hay ningún select/insert/update directo
// sobre las tablas, porque la propia RLS de account_link_requests/
// account_links/account_link_members está pensada para forzar justo eso.
/** @type {import('../../../domain/repositories/IAccountLinkRepository').IAccountLinkRepository} */
export const supabaseAccountLinkRepository = {
  async sendInvitation({ phone, email }) {
    const { data, error } = await supabase.rpc('send_link_invitation', {
      target_phone: phone ?? null,
      target_email: email ?? null,
    });
    if (error) throw error;
    const row = data[0];
    return {
      requestId: row.request_id,
      matchedUserId: row.matched_user_id,
      matchedFirstName: row.matched_first_name,
      matchedLastName: row.matched_last_name,
    };
  },

  async respondToInvitation({ requestId, accept }) {
    const { error } = await supabase.rpc('respond_to_link_invitation', {
      target_request_id: requestId,
      accept,
    });
    if (error) throw error;
  },

  async cancelInvitation(requestId) {
    const { error } = await supabase.rpc('cancel_link_invitation', { target_request_id: requestId });
    if (error) throw error;
  },

  async unlink(linkId) {
    const { error } = await supabase.rpc('unlink_account', { target_link_id: linkId });
    if (error) throw error;
  },

  async getMyLink() {
    const { data, error } = await supabase.rpc('get_my_account_link');
    if (error) throw error;
    const row = data[0];
    if (!row) return null;
    return {
      linkId: row.link_id,
      linkedSince: row.linked_since,
      partnerId: row.partner_id,
      partnerFirstName: row.partner_first_name,
      partnerLastName: row.partner_last_name,
      partnerAvatarUrl: row.partner_avatar_url,
    };
  },

  async getMyPendingInvitations() {
    const { data, error } = await supabase.rpc('get_my_pending_link_invitations');
    if (error) throw error;
    return data.map((row) => ({
      requestId: row.request_id,
      senderId: row.sender_id,
      senderFirstName: row.sender_first_name,
      senderLastName: row.sender_last_name,
      senderAvatarUrl: row.sender_avatar_url,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    }));
  },

  async getMySentInvitation() {
    const { data, error } = await supabase.rpc('get_my_sent_link_invitation');
    if (error) throw error;
    const row = data[0];
    if (!row) return null;
    return {
      requestId: row.request_id,
      recipientUserId: row.recipient_user_id,
      recipientFirstName: row.recipient_first_name,
      recipientLastName: row.recipient_last_name,
      recipientPhone: row.recipient_phone,
      recipientEmail: row.recipient_email,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  },
};
