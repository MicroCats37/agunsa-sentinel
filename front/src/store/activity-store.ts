import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistedStorage } from './storage';

/** Historial de acciones y auditoría de cambios (módulo de administración). */
export interface ActivityEntry {
  id: string;
  at: string;
  actorId: string;
  action: string;
  target: string;
  detail: string;
  kind: 'operacion' | 'configuracion' | 'incidente' | 'sistema';
}

interface ActivityState {
  entries: ActivityEntry[];
  log: (entry: Omit<ActivityEntry, 'id'>) => void;
  clear: () => void;
}

let sequence = 0;

export const useActivityStore = create<ActivityState>()(
  persist(
    (set) => ({
      entries: [],
      log: (entry) =>
        set((state) => ({
          entries: [
            { ...entry, id: `act-${String(++sequence).padStart(4, '0')}` },
            ...state.entries,
          ].slice(0, 200),
        })),
      clear: () => set({ entries: [] }),
    }),
    {
      name: 'agunsa-sentinel:activity',
      version: 1,
      storage: persistedStorage,
      skipHydration: true,
      partialize: (state) => ({ entries: state.entries }),
    },
  ),
);

export function selectActivity(state: ActivityState): ActivityEntry[] {
  return state.entries;
}
