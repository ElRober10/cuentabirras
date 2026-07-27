// Mismo concepto que registerSchema.js (ver los comentarios de ese archivo),
// pero para el formulario de login: aquí no exigimos mínimo 8 caracteres en
// la contraseña (eso ya se comprobó al registrarse), solo que no esté vacía.
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Email no válido'),
  password: z.string().min(1, 'Obligatorio'),
});
