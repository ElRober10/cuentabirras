import { QueryClient } from '@tanstack/react-query';

// Una única instancia para toda la app (igual que `supabase` en client.js).
// React Query es una librería de "estado de servidor": cachea lo que
// pedimos (bares, catálogo, cuentas), evita pedir lo mismo dos veces sin
// necesidad, y permite "invalidar" (refrescar) datos concretos cuando
// cambian — por ejemplo, al añadir una bebida, refrescamos solo la cuenta
// afectada, no toda la app.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // los datos se consideran "frescos" 30s antes de volver a pedirlos de nuevo
      retry: 1,
    },
  },
});
