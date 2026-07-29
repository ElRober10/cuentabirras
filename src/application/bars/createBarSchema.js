import { z } from 'zod';

export const createBarSchema = z.object({
  name: z.string().trim().min(1, 'Obligatorio'),
});
