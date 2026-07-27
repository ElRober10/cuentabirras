// "zod" es una librería de VALIDACIÓN: describes la forma que debe tener un
// objeto (qué campos, de qué tipo, con qué reglas) y luego le puedes pedir
// que compruebe un dato real contra esa forma. Como no usamos TypeScript,
// esta es nuestra única red de seguridad para asegurarnos de que, por
// ejemplo, la contraseña tiene al menos 8 caracteres antes de enviarla a
// Supabase.
//
// Este archivo vive en `application/` (no en `domain/` ni en la pantalla)
// porque es una REGLA DE NEGOCIO ("una contraseña válida tiene mínimo 8
// caracteres"), no un detalle de cómo se ve el formulario ni de cómo
// hablamos con Supabase.
import { z } from 'zod';

// z.object({...}) define la "forma" del formulario de registro, campo a campo.
export const registerSchema = z
  .object({
    // z.string() = debe ser texto. .trim() quita espacios al principio/final
    // antes de validar. .min(1, 'mensaje') = no puede estar vacío, y ese
    // 'mensaje' es lo que verá el usuario si falla.
    firstName: z.string().trim().min(1, 'Obligatorio'),
    lastName: z.string().trim().min(1, 'Obligatorio'),
    // .email(...) comprueba que tenga forma de email (algo@algo.algo).
    email: z.string().trim().email('Email no válido'),
    // .optional() = este campo puede no venir relleno (el teléfono es opcional).
    phone: z.string().trim().optional(),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string().min(1, 'Obligatorio'),
  })
  // .refine(...) añade una regla que depende de VARIOS campos a la vez (aquí,
  // que password y confirmPassword sean iguales). "path" le dice a
  // react-hook-form en qué campo concreto debe mostrarse el mensaje de error
  // (en confirmPassword, no en password).
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

// Este `registerSchema` se usa en app/(auth)/register.jsx así:
//   useForm({ resolver: zodResolver(registerSchema), ... })
// zodResolver conecta zod con react-hook-form: antes de llamar a nuestro
// onSubmit, react-hook-form valida los datos con este esquema y, si algo
// falla, rellena `errors.email`, `errors.password`, etc. automáticamente.
