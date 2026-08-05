import { expoContactsRepository } from '../infrastructure/expo/repositories/ExpoContactsRepository';
import { supabaseAccountLinkRepository } from '../infrastructure/supabase/repositories/SupabaseAccountLinkRepository';
import { supabaseAuthRepository } from '../infrastructure/supabase/repositories/SupabaseAuthRepository';
import { supabaseBarPhotoRepository } from '../infrastructure/supabase/repositories/SupabaseBarPhotoRepository';
import { supabaseBarRepository } from '../infrastructure/supabase/repositories/SupabaseBarRepository';
import { supabaseCatalogRepository } from '../infrastructure/supabase/repositories/SupabaseCatalogRepository';
import { supabaseTabItemRepository } from '../infrastructure/supabase/repositories/SupabaseTabItemRepository';
import { supabaseTabRepository } from '../infrastructure/supabase/repositories/SupabaseTabRepository';

// "DI" = Dependency Injection ("inyección de dependencias"). Suena
// complicado pero aquí es muy simple: en vez de que cada pantalla haga
// `import { supabaseAuthRepository } from '.../SupabaseAuthRepository'`
// directamente, todas importan de AQUÍ (`container.authRepository`).
//
// ¿Por qué? Si mañana quisiéramos cambiar de Supabase a otro proveedor, o
// crear una versión falsa para hacer tests sin conexión real, solo
// tendríamos que cambiar la línea de abajo — ninguna pantalla ni hook
// tendría que tocarse. Es el único sitio de todo el proyecto donde se junta
// el "contrato" (domain/) con la "implementación real" (infrastructure/).
//
// Lo usa: src/presentation/hooks/useAuth.js, y a partir de ahora también los
// casos de uso de application/bars/ y application/tabs/, y las pantallas de bares.
export const container = {
  accountLinkRepository: supabaseAccountLinkRepository,
  authRepository: supabaseAuthRepository,
  contactsRepository: expoContactsRepository,
  barRepository: supabaseBarRepository,
  catalogRepository: supabaseCatalogRepository,
  tabRepository: supabaseTabRepository,
  tabItemRepository: supabaseTabItemRepository,
  barPhotoRepository: supabaseBarPhotoRepository,
};
