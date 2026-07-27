import { z } from 'zod';

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, 'Obligatorio'),
    lastName: z.string().trim().min(1, 'Obligatorio'),
    email: z.string().trim().email('Email no válido'),
    phone: z.string().trim().optional(),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string().min(1, 'Obligatorio'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });
