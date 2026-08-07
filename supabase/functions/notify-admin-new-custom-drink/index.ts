// La llama SOLO el trigger de la base de datos (migración
// 0025_notify_admin_new_custom_drink.sql) vía pg_net, con la service role
// key guardada en Vault — nunca el cliente, así que aquí no hace falta
// comprobar "quién llama" (a diferencia de las funciones de vincular
// cuenta, que sí las invoca la app directamente).
import { sendExpoPush } from '../_shared/expoPush.ts';
import { createSupabaseAdminClient } from '../_shared/supabaseAdminClient.ts';

Deno.serve(async (req) => {
  try {
    const { catalogItemId } = await req.json();
    if (!catalogItemId) {
      return new Response(JSON.stringify({ error: 'Falta catalogItemId' }), { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const { data: item, error: itemError } = await admin
      .from('catalog_items')
      .select('name, bar_id')
      .eq('id', catalogItemId)
      .single();
    if (itemError || !item) {
      return new Response(JSON.stringify({ error: 'Bebida no encontrada' }), { status: 404 });
    }

    const [{ data: bar }, { data: admins }] = await Promise.all([
      admin.from('bars').select('name').eq('id', item.bar_id).single(),
      admin.from('profiles').select('push_token').eq('is_admin', true),
    ]);

    const barName = bar?.name ?? 'un bar';

    await Promise.all(
      (admins ?? [])
        .filter((row) => row.push_token)
        .map((row) =>
          sendExpoPush(
            row.push_token,
            'Bebida nueva sin icono',
            `Se ha añadido "${item.name}" en ${barName} sin icono propio. Le vendría bien uno.`,
            { type: 'new_custom_drink', catalogItemId },
          ),
        ),
    );

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('notify-admin-new-custom-drink failed:', error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
