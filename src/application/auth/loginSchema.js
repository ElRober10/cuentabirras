import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Email no válido'),
  password: z.string().min(1, 'Obligatorio'),
});
