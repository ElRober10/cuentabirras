import { z } from 'zod';

// Mismo espíritu que registerSchema.js, pero para el formulario "Editar
// datos personales": la contraseña aquí es OPCIONAL (dejarla en blanco
// significa "no la cambies") — por eso los dos refine() de abajo, en vez de
// un simple .min(8) en el propio campo, que la haría obligatoria.
//
// `requireTerms`: true cuando el usuario todavía no aceptó los términos
// (típicamente, se creó la cuenta con Google, que nunca pasa por la
// casilla del registro normal) — en ese caso la casilla aquí también es
// obligatoria. Es una función (no un objeto fijo) porque esa obligatoriedad
// depende de datos del usuario que solo se conocen al abrir la pantalla.
export function createEditProfileSchema(requireTerms) {
  return z
    .object({
      firstName: z.string().trim().min(1, 'Obligatorio'),
      lastName: z.string().trim().min(1, 'Obligatorio'),
      email: z.string().trim().email('Email no válido'),
      phone: z.string().trim().optional(),
      newPassword: z.string().optional(),
      confirmNewPassword: z.string().optional(),
      termsAccepted: z.boolean().optional(),
    })
    .refine((data) => !data.newPassword || data.newPassword.length >= 8, {
      message: 'Mínimo 8 caracteres',
      path: ['newPassword'],
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
      message: 'Las contraseñas no coinciden',
      path: ['confirmNewPassword'],
    })
    .refine((data) => !requireTerms || data.termsAccepted === true, {
      message: 'Tienes que aceptar los términos y la política de privacidad',
      path: ['termsAccepted'],
    });
}
