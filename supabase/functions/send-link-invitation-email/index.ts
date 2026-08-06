// Se llama desde la app justo después de que send_link_invitation()
// funcione, SOLO en el camino de invitar por email (por teléfono se manda
// WhatsApp en el propio móvil, sin backend — ver
// src/application/invitations/sendLinkInvitationByPhone.js). Manda un email
// de verdad al destinatario avisándole de la invitación, usando el SMTP de
// Gmail que el proyecto ya tenía pensado para esto (ver CUENTABIRRAS_GMAIL_*
// en el `.env` del repo — aquí se leen como *secrets* de la función, no del
// `.env`, hay que darlos de alta aparte con `supabase secrets set`).
//
// Deliberadamente "best effort": si esto falla, la invitación ya se creó
// igualmente en la base de datos (se ve en Ajustes y al iniciar sesión) —
// el email es solo un aviso adicional, nunca la única vía.
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

import { getCallerUser } from '../_shared/getCallerUser.ts';
import { createSupabaseAdminClient } from '../_shared/supabaseAdminClient.ts';

const GMAIL_EMAIL = Deno.env.get('CUENTABIRRAS_GMAIL_EMAIL') ?? '';
const GMAIL_APP_PASSWORD = Deno.env.get('CUENTABIRRAS_GMAIL_APP_PASSWORD') ?? '';
// Igual que src/shared/constants/appDownloadLinks.js — se rellenan cuando
// la app se publique de verdad. Aquí, al ser secretos de una Edge Function,
// no se puede compartir el mismo fichero de constantes con la app: hay que
// darlos de alta con `supabase secrets set` cuando toque.
const DOWNLOAD_LINK_ANDROID = Deno.env.get('APP_DOWNLOAD_LINK_ANDROID') ?? '';
const DOWNLOAD_LINK_IOS = Deno.env.get('APP_DOWNLOAD_LINK_IOS') ?? '';

function buildEmailHtml(senderName: string) {
  const stores = [
    DOWNLOAD_LINK_ANDROID && `<p>Android: <a href="${DOWNLOAD_LINK_ANDROID}">${DOWNLOAD_LINK_ANDROID}</a></p>`,
    DOWNLOAD_LINK_IOS && `<p>iPhone: <a href="${DOWNLOAD_LINK_IOS}">${DOWNLOAD_LINK_IOS}</a></p>`,
  ]
    .filter(Boolean)
    .join('');

  return `
    <p>${senderName} te ha mandado una invitación en CuentaBirras: así, entre los dos, podréis ir añadiendo a la misma cuenta.</p>
    <p>Abre la app para responder a la invitación${stores ? ', o descárgatela aquí si todavía no la tienes:' : '.'}</p>
    ${stores}
  `;
}

Deno.serve(async (req) => {
  try {
    const { requestId } = await req.json();
    if (!requestId) {
      return new Response(JSON.stringify({ error: 'Falta requestId' }), { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const { data: invitation, error: invitationError } = await admin
      .from('account_link_requests')
      .select('sender_id, recipient_email, status')
      .eq('id', requestId)
      .single();

    if (invitationError || !invitation) {
      return new Response(JSON.stringify({ error: 'Invitación no encontrada' }), { status: 404 });
    }

    // Comprobación de quién llama: solo el propio remitente puede disparar
    // el email de SU invitación (si no, cualquier usuario autenticado con
    // el UUID de una invitación ajena podría hacer que se reenviase).
    const caller = await getCallerUser(req);
    if (!caller || caller.id !== invitation.sender_id) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403 });
    }

    if (invitation.status !== 'pending' || !invitation.recipient_email) {
      // Ya no está pendiente, o se invitó por teléfono (sin email) — nada que mandar.
      return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });
    }

    const { data: sender } = await admin
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', invitation.sender_id)
      .single();
    const senderName = sender ? `${sender.first_name} ${sender.last_name}` : 'Alguien';

    const client = new SMTPClient({
      connection: {
        hostname: 'smtp.gmail.com',
        port: 465,
        tls: true,
        auth: { username: GMAIL_EMAIL, password: GMAIL_APP_PASSWORD },
      },
    });

    await client.send({
      from: GMAIL_EMAIL,
      to: invitation.recipient_email,
      subject: `${senderName} te ha invitado a vincular cuentas en CuentaBirras`,
      html: buildEmailHtml(senderName),
    });

    await client.close();

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-link-invitation-email failed:', error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
