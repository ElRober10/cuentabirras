import { supabaseAuthRepository } from '../infrastructure/supabase/repositories/SupabaseAuthRepository';

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
// Lo usa: src/presentation/hooks/useAuth.js
export const container = {
  authRepository: supabaseAuthRepository,
};
