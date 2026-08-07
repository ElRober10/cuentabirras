import { z } from 'zod';

// Mismo espíritu que registerSchema.js, pero para el formulario "Editar
// datos personales": la contraseña aquí es OPCIONAL (dejarla en blanco
// significa "no la cambies") — por eso los dos refine() de abajo, en vez de
// un simple .min(8) en el propio campo, que la haría obligatoria.
export const editProfileSchema = z
  .object({
    firstName: z.string().trim().min(1, 'Obligatorio'),
    lastName: z.string().trim().min(1, 'Obligatorio'),
    email: z.string().trim().email('Email no válido'),
    phone: z.string().trim().optional(),
    newPassword: z.string().optional(),
    confirmNewPassword: z.string().optional(),
  })
  .refine((data) => !data.newPassword || data.newPassword.length >= 8, {
    message: 'Mínimo 8 caracteres',
    path: ['newPassword'],
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmNewPassword'],
  });
