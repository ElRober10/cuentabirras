// Este archivo crea UNA ÚNICA instancia del cliente de Supabase para toda la
// app (por eso se exporta como `supabase` y se importa desde otros sitios,
// nunca se vuelve a crear con `createClient`). Es el objeto que sabe hablar
// con nuestro proyecto de Supabase: hacer login, leer/escribir en la base de
// datos, suscribirse a cambios en tiempo real, etc.
import { createClient } from '@supabase/supabase-js';

import { env } from '../../config/env';
import { LargeSecureStore } from './largeSecureStore';

export const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    // Aquí le decimos a Supabase CÓMO debe guardar la sesión (el "estás
    // logueado") en el móvil entre aperturas de la app. Por defecto usaría
    // memoria (se perdería al cerrar la app) o AsyncStorage sin cifrar; en
    // vez de eso usamos nuestra propia clase LargeSecureStore (ver ese
    // archivo), que cifra el token antes de guardarlo.
    storage: new LargeSecureStore(),
    // Si el token de sesión caduca, Supabase lo renueva solo en segundo plano.
    autoRefreshToken: true,
    // Si no ponemos esto en true, habría que hacer login cada vez que se abre la app.
    persistSession: true,
    // Esto es para apps web (leer la sesión de la URL tras un redirect); en
    // una app móvil no aplica, así que lo desactivamos explícitamente.
    detectSessionInUrl: false,
  },
});
