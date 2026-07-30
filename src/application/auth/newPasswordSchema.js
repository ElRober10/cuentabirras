// Mismas reglas que la contraseña de registerSchema.js (mínimo 8, y que
// coincida con su confirmación) — aquí separado porque esta pantalla
// (reset-password) no tiene ni email ni nombre, solo la contraseña nueva.
import { z } from 'zod';

export const newPasswordSchema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string().min(1, 'Obligatorio'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });
