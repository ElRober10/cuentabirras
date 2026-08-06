// Se llama desde la app (el dispositivo del DESTINATARIO) justo después de
// que respond_to_link_invitation() funcione — manda un push al remitente
// contándole si se aceptó o se rechazó. "Best effort": la respuesta ya
// quedó guardada de todas formas, esto es solo el aviso.
import { getCallerUser } from '../_shared/getCallerUser.ts';
import { sendExpoPush } from '../_shared/expoPush.ts';
import { createSupabaseAdminClient } from '../_shared/supabaseAdminClient.ts';

Deno.serve(async (req) => {
  try {
    const { requestId } = await req.json();
    if (!requestId) {
      return new Response(JSON.stringify({ error: 'Falta requestId' }), { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: invitation, error: invitationError } = await admin
      .from('account_link_requests')
      .select('sender_id, recipient_user_id, status')
      .eq('id', requestId)
      .single();

    if (invitationError || !invitation) {
      return new Response(JSON.stringify({ error: 'Invitación no encontrada' }), { status: 404 });
    }

    // Solo quien respondió de verdad puede disparar este aviso — para
    // cuando se llama, respond_to_link_invitation ya ha dejado
    // recipient_user_id fijado a quien contestó (tanto si aceptó como si
    // rechazó), así que comparar contra ese campo ya vale.
    const caller = await getCallerUser(req);
    if (!caller || caller.id !== invitation.recipient_user_id) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403 });
    }

    if (invitation.status !== 'accepted' && invitation.status !== 'rejected') {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });
    }

    const [{ data: sender }, { data: recipient }] = await Promise.all([
      admin.from('profiles').select('push_token').eq('id', invitation.sender_id).single(),
      admin.from('profiles').select('first_name, last_name').eq('id', invitation.recipient_user_id).single(),
    ]);

    if (sender?.push_token) {
      const recipientName = recipient ? `${recipient.first_name} ${recipient.last_name}` : 'La persona que invitaste';
      const verb = invitation.status === 'accepted' ? 'ha aceptado' : 'ha rechazado';
      await sendExpoPush(sender.push_token, 'Respuesta a tu invitación', `${recipientName} ${verb} tu invitación para vincular cuentas.`, {
        type: 'link_invitation_responded',
        requestId,
        status: invitation.status,
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('notify-link-invitation-responded failed:', error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
