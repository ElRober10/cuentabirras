const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// supabase/functions/ son Edge Functions de Deno (TypeScript), no código de
// la app — sin excluirlas de aquí, Metro las detecta al escanear el
// proyecto y Expo activa su "auto-setup de TypeScript" (crea un
// tsconfig.json en la raíz), aunque este proyecto es JavaScript a
// propósito. Además, esos ficheros usan imports estilo Deno
// (`jsr:...`, `https://...`) que Metro ni siquiera sabría resolver.
config.resolver.blockList = [/supabase\/functions\/.*/];

module.exports = config;
