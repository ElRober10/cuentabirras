import { create } from 'zustand';

export const useSessionStore = create((set, get) => ({
  user: null,
  isLoading: true,
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
