// Rellena country/region/province/city de los bares que YA existían antes
// de la migración 0037 (el trigger nuevo, request_bar_geocoding, solo
// geocodifica los bares que se creen a partir de ahora). Ejecútalo a mano,
// después de aplicar esa migración y desplegar la función geocode-bar:
//
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=sb_secret_... node scripts/backfillBarLocations.mjs
//
// Sin argumentos, solo procesa los bares que aún no tienen country (los
// pendientes). Si le pasas ids de bar como argumentos, vuelve a
// geocodificar justo esos, aunque ya tuvieran datos — útil para corregir
// bares concretos después de ajustar la lógica de extracción:
//
//   node scripts/backfillBarLocations.mjs <barId> [barId2 ...]
//
// La service role key está en Supabase -> Settings -> API Keys -> Secret
// key (NUNCA la subas a git ni la pongas en .env — pásala solo en esta
// línea de comandos puntual). Nominatim (el servicio de geocodificación,
// gratis, sin API key) solo admite 1 petición por segundo, así que este
// script va bar a bar con una pausa entre cada uno — puede tardar varios
// minutos si hay muchos bares con ubicación.
import { createClient } from '@supabase/supabase-js';

const NOMINATIM_USER_AGENT = 'CuentaBirras/1.0 (contacto: elrober23@gmail.com)';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function reverseGeocode(latitude, longitude) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=es&zoom=14`;
  const response = await fetch(url, { headers: { 'User-Agent': NOMINATIM_USER_AGENT } });
  if (!response.ok) throw new Error(`Nominatim respondió ${response.status}`);
  const data = await response.json();
  return data.address ?? {};
}

const explicitBarIds = process.argv.slice(2);

async function run() {
  const baseQuery = supabase.from('bars').select('id, latitude, longitude').not('latitude', 'is', null);
  const { data: bars, error } =
    explicitBarIds.length > 0 ? await baseQuery.in('id', explicitBarIds) : await baseQuery.is('country', null);
  if (error) throw error;

  console.log(`${bars.length} bares por geocodificar.`);

  for (const [index, bar] of bars.entries()) {
    try {
      const address = await reverseGeocode(bar.latitude, bar.longitude);
      // El orden importa: en zonas rurales, Nominatim a veces etiqueta el
      // asentamiento real y pequeño como "hamlet" y el municipio grande del
      // que depende como "village" — probamos hamlet ANTES que village para
      // quedarnos con el nombre más local/reconocible (mismo criterio que
      // supabase/functions/geocode-bar/index.ts, que usa el mismo servicio
      // para los bares nuevos).
      const city = address.city ?? address.town ?? address.hamlet ?? address.village ?? address.municipality ?? null;
      const { error: updateError } = await supabase
        .from('bars')
        .update({
          country: address.country ?? null,
          region: address.state ?? null,
          province: address.province ?? address.state_district ?? address.county ?? null,
          city,
        })
        .eq('id', bar.id);
      if (updateError) throw updateError;
      console.log(`[${index + 1}/${bars.length}] ${bar.id} -> ${city ?? '?'}, ${address.state ?? '?'}, ${address.country ?? '?'}`);
    } catch (err) {
      console.error(`[${index + 1}/${bars.length}] ${bar.id} FALLÓ:`, err.message);
    }
    await sleep(1100);
  }

  console.log('Hecho.');
}

run();
