// Este archivo lee las variables de tu .env (SUPABASE_URL, SUPABASE_ANON_KEY)
// y las valida ANTES de que el resto de la app arranque. ¿Para qué? Si algún
// día borras el .env por error, o le cambias el nombre a una variable, es
// mucho mejor ver un error claro aquí al abrir la app ("falta
// EXPO_PUBLIC_SUPABASE_URL") que un error rarísimo más adelante intentando
// hacer login sin saber por qué falla.
import { z } from 'zod';

// EXPO_PUBLIC_SUPABASE_URL debe tener forma de URL válida; la anon key solo
// tiene que no estar vacía.
const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

// Ojo con el prefijo "EXPO_PUBLIC_": Expo solo mete en el bundle de la app
// (lo que se ve en el móvil) las variables de entorno que empiezan así.
// Cualquier otra variable de tu .env (como SUPABASE_DB_PASSWORD) se queda
// fuera del código de la app a propósito, por seguridad.
const parsed = envSchema.safeParse({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});

// safeParse (a diferencia de .parse) no lanza una excepción si falla, nos
// devuelve { success: false, error } para que decidamos qué hacer. Aquí
// decidimos "parar la app con un mensaje claro".
if (!parsed.success) {
  throw new Error(
    `Variables de entorno inválidas o ausentes. Revisa tu .env (copia .env.example si no existe):\n${parsed.error.message}`,
  );
}

// A partir de aquí, cualquier archivo que necesite estas variables importa
// `env` desde este fichero (ver src/infrastructure/supabase/client.js) en
// vez de leer `process.env` directamente.
export const env = parsed.data;
