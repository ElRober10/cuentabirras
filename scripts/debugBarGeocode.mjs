// Diagnóstico puntual: para un bar dado, enseña el objeto `address` COMPLETO
// que devuelve Nominatim (no solo los campos que ya usamos en
// geocode-bar/index.ts y backfillBarLocations.mjs) — para poder ver con qué
// clave exacta viene la ciudad/pueblo cuando las que ya probamos
// (city/town/village/municipality) no encuentran nada.
//
// Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/debugBarGeocode.mjs <barId> [barId2 ...]
import { createClient } from '@supabase/supabase-js';

const NOMINATIM_USER_AGENT = 'CuentaBirras/1.0 (contacto: elrober23@gmail.com)';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const barIds = process.argv.slice(2);
if (!supabaseUrl || !serviceRoleKey || barIds.length === 0) {
  console.error('Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/debugBarGeocode.mjs <barId> [barId2 ...]');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const { data: bars, error } = await supabase.from('bars').select('id, name, latitude, longitude').in('id', barIds);
  if (error) throw error;

  for (const bar of bars) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${bar.latitude}&lon=${bar.longitude}&accept-language=es&zoom=14`;
    const response = await fetch(url, { headers: { 'User-Agent': NOMINATIM_USER_AGENT } });
    const data = await response.json();
    console.log(`\n=== ${bar.name} (${bar.id}) ===`);
    console.log(JSON.stringify(data.address, null, 2));
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }
}

run();
