// La llama SOLO el RPC report_auth_email_failure (migración
// 0040_notify_admin_auth_email_failure.sql) vía pg_net, con la service role
// key guardada en Vault — nunca el cliente directamente (el cliente llama
// al RPC, no a esta función), así que aquí no hace falta comprobar "quién
// llama". Mismo patrón que notify-admin-new-custom-drink.
import { sendExpoPush } from '../_shared/expoPush.ts';
import { createSupabaseAdminClient } from '../_shared/supabaseAdminClient.ts';

const FLOW_LABEL: Record<string, string> = {
  signup: 'confirmar el registro',
  password_reset: 'recuperar la contraseña',
  email_change: 'cambiar el email de acceso',
};

Deno.serve(async (req) => {
  try {
    const { flow } = await req.json();
    const label = FLOW_LABEL[flow] ?? 'autenticación';

    const admin = createSupabaseAdminClient();

    // Incidencias de las últimas 24h, para dar contexto en el push ("no es
    // un caso aislado").
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [{ data: admins }, { count }] = await Promise.all([
      admin.from('profiles').select('push_token').eq('is_admin', true),
      admin
        .from('auth_email_failures')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since),
    ]);

    const total = count ?? 1;
    const body =
      total > 1
        ? `${total} usuarios no han podido ${label} en las últimas 24h porque no se les pudo enviar el email. Revisa la cuota de Brevo / el SMTP.`
        : `Un usuario no ha podido ${label}: no se le pudo enviar el email. Revisa la cuota de Brevo / el SMTP.`;

    await Promise.all(
      (admins ?? [])
        .filter((row) => row.push_token)
        .map((row) => sendExpoPush(row.push_token, 'Fallo al enviar emails', body, { type: 'auth_email_failure', flow })),
    );

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('notify-admin-auth-email-failure failed:', error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
