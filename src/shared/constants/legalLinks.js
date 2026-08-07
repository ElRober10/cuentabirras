// URLs públicas (GitHub Pages, carpeta docs/ de este mismo repositorio) de
// los textos legales — hace falta una URL real y estable para el enlace
// desde el registro, y porque Play Store exige una URL de política de
// privacidad en la ficha de la app.
export const LEGAL_LINKS = {
  terms: 'https://elrober10.github.io/cuentabirras/terminos.html',
  privacy: 'https://elrober10.github.io/cuentabirras/privacidad.html',
  // A donde manda Supabase el enlace de confirmación del email de registro
  // (ver signUpWithPassword en SupabaseAuthRepository.js) — sin esto,
  // Supabase usa la "Site URL" por defecto del proyecto, que no apunta a
  // ninguna página real.
  emailConfirmed: 'https://elrober10.github.io/cuentabirras/confirmado.html',
};
