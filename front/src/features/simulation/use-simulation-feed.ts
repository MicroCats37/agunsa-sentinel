'use client';

import { useCallback } from 'react';
import type { CameraTrackTarget } from '@/domain/types';
import { SIMULATION_ENGINE, timelineSecOf, useSimulationStore } from '@/store/simulation-store';

/**
 * Puente entre el motor de simulación y los feeds en canvas.
 *
 * Devuelve tres cosas:
 *  - los tracks de los actores visibles en esa cámara;
 *  - un lector del segundo actual de la línea de tiempo;
 *  - el aviso de salud del equipo, si lo hay.
 *
 * El lector es estable y consulta el store en cada fotograma: así el feed se
 * mueve a 60 fps sin que la cuadrícula entera se vuelva a renderizar.
 */
export interface SimulationFeed {
  /** Actores visibles en la cámara, listos para el feed. */
  targets: CameraTrackTarget[];
  /** Segundo actual de la línea de tiempo. */
  getTimeSec: () => number;
  /** Reloj de la plataforma para la marca de tiempo del OSD. */
  getClockMs: () => number;
  /** Aviso de salud del equipo (desfase de reloj, por ejemplo). */
  healthWarning: string | null;
}

/** Aviso legible para cada estado de salud no operativo. */
const HEALTH_WARNING: Record<string, string> = {
  reloj_desfasado: 'NTP DESFASADO',
  sin_senal: 'SIN SEÑAL',
};

export function useSimulationFeed(cameraId: string): SimulationFeed {
  const tracks = useSimulationStore((state) => state.tracks);

  const getTimeSec = useCallback(() => timelineSecOf(useSimulationStore.getState().clockMs), []);
  const getClockMs = useCallback(() => useSimulationStore.getState().clockMs, []);

  const health = SIMULATION_ENGINE.cameraHealthAt(
    cameraId,
    timelineSecOf(useSimulationStore.getState().clockMs),
  );

  return {
    targets: tracks[cameraId] ?? [],
    getTimeSec,
    getClockMs,
    healthWarning: HEALTH_WARNING[health] ?? null,
  };
}
