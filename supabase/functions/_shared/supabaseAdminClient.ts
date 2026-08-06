import { createClient } from 'jsr:@supabase/supabase-js@2';

// Cliente con la service role key: se salta RLS por completo (es el mismo
// nivel de acceso que un RPC `security definer`, pero desde fuera de
// Postgres). SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase
// automáticamente en el entorno de CADA Edge Function — no hace falta
// configurarlos a mano con `supabase secrets set`.
export function createSupabaseAdminClient() {
  return createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
}
