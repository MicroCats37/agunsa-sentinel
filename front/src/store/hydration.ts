import { create } from 'zustand';

/**
 * Estado de hidratación del almacenamiento local.
 *
 * Las tiendas persistidas se rehidratan fuera del render (tras el montaje) para
 * que el HTML del servidor y el primer render del cliente coincidan siempre.
 */
interface HydrationState {
  hydrated: boolean;
  markHydrated: () => void;
}

export const useHydrationStore = create<HydrationState>((set) => ({
  hydrated: false,
  markHydrated: () => set({ hydrated: true }),
}));

export function useHydrated(): boolean {
  return useHydrationStore((state) => state.hydrated);
}
