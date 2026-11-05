import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { IlluminationPreference } from '@/domain/types';

/** Preferencias de interfaz que sobreviven a la recarga. */
export type GridLayout = 1 | 4 | 9 | 16;
export type MapMode = '2d' | '3d';

interface UiState {
  gridLayout: GridLayout;
  monitoringPage: number;
  sectorFilter: string;
  mapMode: MapMode;
  /** Preferencia de iluminación del feed (Auto sigue el reloj de la plataforma). */
  illumination: IlluminationPreference;
  /** Paneles laterales plegables, indexados por identificador. */
  collapsedPanels: Record<string, boolean>;
  setGridLayout: (layout: GridLayout) => void;
  setMonitoringPage: (page: number) => void;
  setSectorFilter: (sectorId: string) => void;
  setMapMode: (mode: MapMode) => void;
  setIllumination: (illumination: IlluminationPreference) => void;
  togglePanel: (key: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      gridLayout: 4,
      monitoringPage: 0,
      sectorFilter: 'todos',
      mapMode: '2d',
      illumination: 'auto',
      collapsedPanels: {},
      setGridLayout: (gridLayout) => set({ gridLayout, monitoringPage: 0 }),
      setMonitoringPage: (monitoringPage) => set({ monitoringPage }),
      setSectorFilter: (sectorFilter) => set({ sectorFilter, monitoringPage: 0 }),
      setMapMode: (mapMode) => set({ mapMode }),
      setIllumination: (illumination) => set({ illumination }),
      togglePanel: (key) =>
        set((state) => ({
          collapsedPanels: {
            ...state.collapsedPanels,
            [key]: !state.collapsedPanels[key],
          },
        })),
    }),
    {
      name: 'agunsa-sentinel:ui',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        gridLayout: state.gridLayout,
        monitoringPage: state.monitoringPage,
        sectorFilter: state.sectorFilter,
        mapMode: state.mapMode,
        illumination: state.illumination,
        collapsedPanels: state.collapsedPanels,
      }),
    },
  ),
);
