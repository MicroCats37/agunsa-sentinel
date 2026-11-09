import { baselineGeospatialZones } from '@/data/geospatial/facility-layout';
import { VIRTUAL_LINES, ZONES } from '@/data/zones';
import type { GeospatialZone, VirtualLine, Zone } from '@/domain/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistedStorage } from './storage';

/**
 * Zonas inteligentes, líneas virtuales y zonas georreferenciadas.
 *
 * Conviven dos geometrías distintas y **no** intercambiables:
 *  - `zones`: polígonos normalizados dentro del encuadre de una cámara. Los
 *    usa el editor de zonas sobre la imagen y el motor de reglas.
 *  - `geospatialZones`: polígonos WGS84 sobre el terreno. Los dibuja el
 *    operador en la vista geoespacial (Cesium).
 *
 * Ambas se persisten en la misma tienda para que el operador tenga un único
 * punto de guardado al operar la plataforma.
 */
interface ZonesState {
  zones: Zone[];
  virtualLines: VirtualLine[];
  /** Zonas dibujadas sobre el terreno real (vista geoespacial). */
  geospatialZones: GeospatialZone[];
  updateZone: (zone: Zone) => void;
  addZone: (zone: Zone) => void;
  removeZone: (zoneId: string) => void;
  toggleZone: (zoneId: string, enabled: boolean) => void;
  updateLine: (line: VirtualLine) => void;
  addLine: (line: VirtualLine) => void;
  removeLine: (lineId: string) => void;
  toggleLine: (lineId: string, enabled: boolean) => void;
  addGeospatialZone: (zone: GeospatialZone) => void;
  updateGeospatialZone: (zone: GeospatialZone) => void;
  removeGeospatialZone: (zoneId: string) => void;
  toggleGeospatialZone: (zoneId: string, enabled: boolean) => void;
  clearGeospatialZones: () => void;
  resetAll: () => void;
}

export const useZonesStore = create<ZonesState>()(
  persist(
    (set) => ({
      zones: [...ZONES],
      virtualLines: [...VIRTUAL_LINES],
      geospatialZones: baselineGeospatialZones(),
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
        set((state) => ({
          virtualLines: state.virtualLines.filter((item) => item.id !== lineId),
        })),
      toggleLine: (lineId, enabled) =>
        set((state) => ({
          virtualLines: state.virtualLines.map((item) =>
            item.id === lineId ? { ...item, enabled } : item,
          ),
        })),
      addGeospatialZone: (zone) =>
        set((state) => ({ geospatialZones: [...state.geospatialZones, zone] })),
      updateGeospatialZone: (zone) =>
        set((state) => ({
          geospatialZones: state.geospatialZones.map((item) => (item.id === zone.id ? zone : item)),
        })),
      removeGeospatialZone: (zoneId) =>
        set((state) => ({
          geospatialZones: state.geospatialZones.filter((item) => item.id !== zoneId),
        })),
      toggleGeospatialZone: (zoneId, enabled) =>
        set((state) => ({
          geospatialZones: state.geospatialZones.map((item) =>
            item.id === zoneId ? { ...item, enabled } : item,
          ),
        })),
      clearGeospatialZones: () => set({ geospatialZones: [] }),
      resetAll: () =>
        set({
          zones: [...ZONES],
          virtualLines: [...VIRTUAL_LINES],
          geospatialZones: baselineGeospatialZones(),
        }),
    }),
    {
      name: 'agunsa-sentinel:zones',
      version: 2,
      storage: persistedStorage,
      skipHydration: true,
      partialize: (state) => ({
        zones: state.zones,
        virtualLines: state.virtualLines,
        geospatialZones: state.geospatialZones,
      }),
    },
  ),
);

export function selectZones(state: ZonesState): Zone[] {
  return state.zones;
}

export function selectVirtualLines(state: ZonesState): VirtualLine[] {
  return state.virtualLines;
}

export function selectGeospatialZones(state: ZonesState): GeospatialZone[] {
  return state.geospatialZones;
}
