// Se llama desde la app justo después de que send_link_invitation() resuelva
// un usuario ya existente (matchedUserId informado) — por email o por
// teléfono, da igual. Manda un push de verdad al destinatario para que
// pueda aceptar/rechazar sin tener que abrir la app por casualidad. "Best
// effort": si esto falla, la invitación ya existe igualmente y se verá al
// iniciar sesión o en el diálogo de invitación pendiente.
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

    // Solo el propio remitente puede disparar el aviso de SU invitación.
    const caller = await getCallerUser(req);
    if (!caller || caller.id !== invitation.sender_id) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403 });
    }

    if (invitation.status !== 'pending' || !invitation.recipient_user_id) {
      // Ya no está pendiente, o el destinatario todavía no tiene cuenta
      // (se le avisó por WhatsApp/email, no hay a quién mandarle un push).
      return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });
    }

    const [{ data: sender }, { data: recipient }] = await Promise.all([
      admin.from('profiles').select('first_name, last_name').eq('id', invitation.sender_id).single(),
      admin.from('profiles').select('push_token').eq('id', invitation.recipient_user_id).single(),
    ]);

    if (recipient?.push_token) {
      const senderName = sender ? `${sender.first_name} ${sender.last_name}` : 'Alguien';
      await sendExpoPush(
        recipient.push_token,
        'Invitación para vincular cuenta',
        `${senderName} te ha invitado a vincular vuestras cuentas en CuentaBirras.`,
        { type: 'link_invitation_created', requestId },
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('notify-link-invitation-created failed:', error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
