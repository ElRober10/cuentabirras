// Se llama por cron (ver migración 0020_expire_link_invitations_cron.sql),
// NUNCA desde la app — a diferencia de las demás funciones, esta no
// comprueba "quién llama" porque nadie del cliente debe poder dispararla a
// mano: solo la alcanza pg_cron, con la service role key guardada en Vault,
// nunca expuesta al móvil.
//
// El `update ... returning` es atómico: reclama de golpe TODAS las
// invitaciones pendientes ya caducadas y las marca 'expired' en el mismo
// paso, así que aunque el cron se solape alguna vez con alguien
// respondiendo justo en ese instante (respond_to_link_invitation también
// comprueba expires_at con su propio `for update`), nunca se manda el
// aviso de caducidad dos veces para la misma invitación.
import { sendExpoPush } from '../_shared/expoPush.ts';
import { createSupabaseAdminClient } from '../_shared/supabaseAdminClient.ts';

Deno.serve(async (_req) => {
  try {
    const admin = createSupabaseAdminClient();

    const { data: expired, error } = await admin
      .from('account_link_requests')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())
      .select('id, sender_id');

    if (error) throw error;
    if (!expired || expired.length === 0) {
      return new Response(JSON.stringify({ ok: true, expired: 0 }), { status: 200 });
    }

    const senderIds = [...new Set(expired.map((row) => row.sender_id))];
    const { data: senders } = await admin.from('profiles').select('id, push_token').in('id', senderIds);
    const pushTokenBySender = new Map((senders ?? []).map((sender) => [sender.id, sender.push_token]));

    await Promise.all(
      expired.map((row) => {
        const token = pushTokenBySender.get(row.sender_id);
        if (!token) return Promise.resolve();
        return sendExpoPush(
          token,
          'Invitación caducada',
          'Tu invitación para vincular cuenta ha caducado sin respuesta.',
          { type: 'link_invitation_expired', requestId: row.id },
        );
      }),
    );

    return new Response(JSON.stringify({ ok: true, expired: expired.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('expire-link-invitations failed:', error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
