import { createClient } from 'jsr:@supabase/supabase-js@2';

// Averigua QUIÉN llama de verdad a la función, a partir del token que la
// propia app adjunta sola en cada `supabase.functions.invoke(...)`. Se usa
// para comprobar permisos dentro de la función (p. ej. "solo el remitente
// de esta invitación puede disparar su aviso") — el cliente admin
// (supabaseAdminClient.ts) se salta RLS por completo, así que NO sirve para
// esto, hace falta uno aparte con el token de quien llama.
export async function getCallerUser(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await client.auth.getUser();
  return user;
}
