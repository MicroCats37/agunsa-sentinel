import { VIRTUAL_LINES, ZONES } from '@/data/zones';
import type { VirtualLine, Zone } from '@/domain/types';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Zonas inteligentes y líneas virtuales configuradas por el operador. */
interface ZonesState {
  zones: Zone[];
  virtualLines: VirtualLine[];
  updateZone: (zone: Zone) => void;
  addZone: (zone: Zone) => void;
  removeZone: (zoneId: string) => void;
  toggleZone: (zoneId: string, enabled: boolean) => void;
  updateLine: (line: VirtualLine) => void;
  addLine: (line: VirtualLine) => void;
  removeLine: (lineId: string) => void;
  toggleLine: (lineId: string, enabled: boolean) => void;
  resetAll: () => void;
}

export const useZonesStore = create<ZonesState>()(
  persist(
    (set) => ({
      zones: [...ZONES],
      virtualLines: [...VIRTUAL_LINES],
      updateZone: (zone) =>
        set((state) => ({
          zones: state.zones.map((item) => (item.id === zone.id ? zone : item)),
        })),
      addZone: (zone) => set((state) => ({ zones: [...state.zones, zone] })),
      removeZone: (zoneId) =>
        set((state) => ({ zones: state.zones.filter((item) => item.id !== zoneId) })),
      toggleZone: (zoneId, enabled) =>
        set((state) => ({
          zones: state.zones.map((item) => (item.id === zoneId ? { ...item, enabled } : item)),
        })),
      updateLine: (line) =>
        set((state) => ({
          virtualLines: state.virtualLines.map((item) => (item.id === line.id ? line : item)),
        })),
      addLine: (line) => set((state) => ({ virtualLines: [...state.virtualLines, line] })),
      removeLine: (lineId) =>
        set((state) => ({ virtualLines: state.virtualLines.filter((item) => item.id !== lineId) })),
      toggleLine: (lineId, enabled) =>
        set((state) => ({
          virtualLines: state.virtualLines.map((item) =>
            item.id === lineId ? { ...item, enabled } : item,
          ),
        })),
      resetAll: () => set({ zones: [...ZONES], virtualLines: [...VIRTUAL_LINES] }),
    }),
    {
      name: 'agunsa-sentinel:zones',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({ zones: state.zones, virtualLines: state.virtualLines }),
    },
  ),
);

export function selectZones(state: ZonesState): Zone[] {
  return state.zones;
}

export function selectVirtualLines(state: ZonesState): VirtualLine[] {
  return state.virtualLines;
}
