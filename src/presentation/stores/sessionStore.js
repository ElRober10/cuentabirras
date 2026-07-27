// "zustand" es una librería de ESTADO GLOBAL: un sitio donde guardar datos
// que necesitan varias pantallas a la vez, sin tener que pasarlos a mano de
// componente en componente (esto se llama "prop drilling" y es un dolor).
// Aquí guardamos "quién está logueado ahora mismo" para que CUALQUIER
// pantalla pueda leerlo con solo llamar a `useSessionStore()`.
import { create } from 'zustand';

// `create(...)` recibe una función que define el estado inicial y las
// funciones para modificarlo ("acciones"). `set` cambia el estado, `get` lee
// el estado actual desde dentro de una acción.
export const useSessionStore = create((set, get) => ({
  // Estado inicial: nadie logueado, y "isLoading: true" porque, al abrir la
  // app, todavía no sabemos si hay una sesión guardada o no (tarda unos
  // milisegundos en comprobarlo). Mientras isLoading es true, la app muestra
  // un spinner en vez de decidir precipitadamente "mándale al login".
  user: null,
  isLoading: true,

  // Esta función la llama useAuth.js cada vez que Supabase avisa de un
  // cambio de sesión (login, o renovación automática del token).
  setUser: (user) => {
    // Supabase dispara onAuthStateChange también al renovar el token (mismo
    // usuario). Si ya teníamos ese mismo usuario cargado, no reemplazamos la
    // referencia: así los efectos que dependen de `user` (p. ej. el desbloqueo
    // biométrico) no se vuelven a disparar en mitad de una sesión ya abierta.
    const current = get().user;
    if (current && current.id === user.id) {
      set({ isLoading: false });
      return;
    }
    set({ user, isLoading: false });
  },

  clearUser: () => set({ user: null, isLoading: false }),
}));

// Cómo se usa desde un componente:
//   const user = useSessionStore((state) => state.user);
// Ese "selector" (state => state.user) hace que el componente solo se
// vuelva a renderizar cuando CAMBIE `user`, no cuando cambie cualquier otra
// cosa del store — es más eficiente que leer todo el store entero.
