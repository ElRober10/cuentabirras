import { z } from 'zod';

// Formulario de "vincular cuenta" por email (ver
// app/(app)/settings/link-account.jsx). El teléfono (Fase C, agenda de
// contactos) no pasa por un formulario a mano, así que no hace falta aquí.
export const linkInvitationEmailSchema = z.object({
  email: z.string().trim().email('Email no válido'),
});
