import { createJSONStorage, persist } from 'zustand/middleware';
import { create } from 'zustand';
import type { SceneHour } from '@/domain/types';

/** Preferencias de interfaz que sobreviven a la recarga. */
export type GridLayout = 1 | 4 | 9 | 16;
/**
 * Representación del mapa perimetral.
 *
 * - `2d`: plano SVG del proyecto (papel técnico).
 * - `3d`: escena isométrica de Three.js.
 * - `geo`: vista geoespacial de Cesium sobre el terreno real.
 */
export type MapMode = '2d' | '3d' | 'geo';

interface UiState {
  gridLayout: GridLayout;
  monitoringPage: number;
  sectorFilter: string;
  mapMode: MapMode;
  /**
   * Hora forzada de la escena (0–24).
   *
   * `null` = seguir el reloj de la plataforma. Cuando el operador fija una
   * hora desde la vista de mapa, el feed y la escena 3D responden a esa hora.
   */
  sceneHour: SceneHour;
  /** Paneles laterales plegables, indexados por identificador. */
  collapsedPanels: Record<string, boolean>;
  setGridLayout: (layout: GridLayout) => void;
  setMonitoringPage: (page: number) => void;
  setSectorFilter: (sectorId: string) => void;
  setMapMode: (mode: MapMode) => void;
  setSceneHour: (hour: SceneHour) => void;
  togglePanel: (key: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      gridLayout: 4,
      monitoringPage: 0,
      sectorFilter: 'todos',
      mapMode: '2d',
      sceneHour: null,
      collapsedPanels: {},
      setGridLayout: (gridLayout) => set({ gridLayout, monitoringPage: 0 }),
      setMonitoringPage: (monitoringPage) => set({ monitoringPage }),
      setSectorFilter: (sectorFilter) => set({ sectorFilter, monitoringPage: 0 }),
      setMapMode: (mapMode) => set({ mapMode }),
      setSceneHour: (sceneHour) => set({ sceneHour }),
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
      version: 2,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        gridLayout: state.gridLayout,
        monitoringPage: state.monitoringPage,
        sectorFilter: state.sectorFilter,
        mapMode: state.mapMode,
        sceneHour: state.sceneHour,
        collapsedPanels: state.collapsedPanels,
      }),
    },
  ),
);
