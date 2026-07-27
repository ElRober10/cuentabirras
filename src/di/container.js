import { supabaseAuthRepository } from '../infrastructure/supabase/repositories/SupabaseAuthRepository';

// Único punto donde application/presentation se conectan con infrastructure.
// Cambiar de Supabase a otra cosa (o a un mock en tests) solo requiere tocar aquí.
export const container = {
  authRepository: supabaseAuthRepository,
};
