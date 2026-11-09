import { CAMERAS } from '@/data/cameras';
import type { Camera } from '@/domain/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistedStorage } from './storage';

/**
 * Registro de cámaras en ejecución.
 *
 * Sólo se persisten las *modificaciones* respecto del inventario base
 * (`data/cameras.ts`). Así, un cambio en el catálogo simulado no invalida el
 * almacenamiento local del navegador.
 */
export interface CameraOverride {
  status?: Camera['status'];
  alertSeverity?: Camera['alertSeverity'];
  hasAlert?: boolean;
  lastSeen?: string;
}

interface CamerasState {
  overrides: Record<string, CameraOverride>;
  highlightedCameraId: string | null;
  setHighlight: (cameraId: string | null) => void;
  setOverride: (cameraId: string, patch: CameraOverride) => void;
  clearOverride: (cameraId: string) => void;
  resetAll: () => void;
}

export const useCamerasStore = create<CamerasState>()(
  persist(
    (set) => ({
      overrides: {},
      highlightedCameraId: null,
      setHighlight: (cameraId) => set({ highlightedCameraId: cameraId }),
      setOverride: (cameraId, patch) =>
        set((state) => ({
          overrides: {
            ...state.overrides,
            [cameraId]: { ...state.overrides[cameraId], ...patch },
          },
        })),
      clearOverride: (cameraId) =>
        set((state) => {
          const next = { ...state.overrides };
          delete next[cameraId];
          return { overrides: next };
        }),
      resetAll: () => set({ overrides: {}, highlightedCameraId: null }),
    }),
    {
      name: 'agunsa-sentinel:cameras',
      version: 1,
      storage: persistedStorage,
      skipHydration: true,
      partialize: (state) => ({ overrides: state.overrides }),
    },
  ),
);

/** Aplica los overrides al inventario base. */
export function resolveCameras(overrides: Record<string, CameraOverride>): Camera[] {
  return CAMERAS.map((camera) => {
    const override = overrides[camera.id];
    return override ? { ...camera, ...override } : camera;
  });
}

export function selectCameras(state: CamerasState): Camera[] {
  return resolveCameras(state.overrides);
}
