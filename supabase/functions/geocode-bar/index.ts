// La llama SOLO el trigger de la base de datos (migración
// 0037_bar_location_hierarchy.sql) vía pg_net, con la service role key
// guardada en Vault — nunca el cliente, así que aquí no hace falta
// comprobar "quién llama" (mismo criterio que notify-admin-new-custom-drink).
//
// Traduce lat/lng a país/comunidad autónoma/provincia/ciudad usando
// Nominatim (OpenStreetMap), gratis y sin API key — a cambio exige un
// User-Agent identificable y no más de 1 petición/segundo, lo cual nos
// sobra porque esto se dispara una vez por cada bar nuevo (no en bloque;
// el relleno masivo de bares antiguos va aparte, en
// scripts/backfillBarLocations.mjs, con su propia pausa entre peticiones).
import { createSupabaseAdminClient } from '../_shared/supabaseAdminClient.ts';

const NOMINATIM_USER_AGENT = 'CuentaBirras/1.0 (contacto: elrober23@gmail.com)';

Deno.serve(async (req) => {
  try {
    const { barId, latitude, longitude } = await req.json();
    if (!barId || latitude == null || longitude == null) {
      return new Response(JSON.stringify({ error: 'Faltan barId/latitude/longitude' }), { status: 400 });
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=es&zoom=14`;
    const response = await fetch(url, { headers: { 'User-Agent': NOMINATIM_USER_AGENT } });
    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Nominatim respondió ${response.status}` }), { status: 502 });
    }

    const data = await response.json();
    // La forma exacta del objeto `address` varía según lo detallado que esté
    // el mapa en esa zona en OpenStreetMap — se prueban varias claves
    // alternativas de arriba a abajo, quedándose con la primera que exista.
    const address = data.address ?? {};

    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from('bars')
      .update({
        country: address.country ?? null,
        region: address.state ?? null,
        province: address.province ?? address.state_district ?? address.county ?? null,
        // El orden importa: en zonas rurales, Nominatim a veces etiqueta el
        // asentamiento real y pequeño como "hamlet" y el municipio grande
        // del que depende como "village" — probamos hamlet ANTES que
        // village para quedarnos con el nombre más local/reconocible.
        city: address.city ?? address.town ?? address.hamlet ?? address.village ?? address.municipality ?? null,
      })
      .eq('id', barId);
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('geocode-bar failed:', error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
