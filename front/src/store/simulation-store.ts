import { buildAmbientActors } from '@/data/ambient-actors';
import { CAMERAS } from '@/data/cameras';
import { RULES } from '@/data/rules';
import { VIRTUAL_LINES, ZONES } from '@/data/zones';
import { PLATFORM_NOW_MS } from '@/domain/clock';
import {
  SimulationEngine,
  STORYLINE,
  STORYLINE_DURATION_SEC,
  targetsByCamera,
  type SimIncident,
  type SimulationSnapshot,
} from '@/domain/simulation';
import type { CameraTrackTarget, Incident } from '@/domain/types';
import { create } from 'zustand';
import { useActivityStore } from './activity-store';
import { useCamerasStore } from './cameras-store';
import { useIncidentsStore } from './incidents-store';

/**
 * Reloj y reproducción de la noche simulada.
 *
 * El store es el único que puede mover el tiempo: el feed, el mapa, el
 * dashboard, el listado de incidentes y la línea de tiempo leen el mismo
 * reloj, de modo que nunca se contradicen entre sí.
 *
 * El motor (`domain/simulation`) es puro: este store sólo lo alimenta con las
 * reglas, las zonas y el guion, y traduce su salida a incidentes y estados de
 * cámara.
 */

/** Instante de arranque de la línea de tiempo: las 22:00 de la noche simulada. */
export const TIMELINE_START_MS = PLATFORM_NOW_MS - 14 * 60_000;
/** Instante final de la línea de tiempo. */
export const TIMELINE_END_MS = TIMELINE_START_MS + STORYLINE_DURATION_SEC * 1_000;

/** Motor de simulación: se construye una vez y es determinista. */
export const SIMULATION_ENGINE = new SimulationEngine({
  storyline: STORYLINE,
  ambientActors: buildAmbientActors(CAMERAS),
  rules: RULES,
  zones: ZONES,
  lines: VIRTUAL_LINES,
  cameras: CAMERAS.map((camera) => ({
    id: camera.id,
    zoneId: camera.zoneId,
    sectorId: camera.sectorId,
  })),
});

/** Cámaras que el guion de la noche gestiona (falla de equipo o incidente). */
const MANAGED_CAMERA_IDS: readonly string[] = Array.from(
  new Set(STORYLINE.beats.map((beat) => beat.cameraId)),
);

export const SIMULATION_SPEEDS = [1, 4, 15, 60] as const;
export type SimulationSpeed = (typeof SIMULATION_SPEEDS)[number];

interface SimulationState {
  /** Reloj de la plataforma simulado, en milisegundos. */
  clockMs: number;
  playing: boolean;
  speed: SimulationSpeed;
  /**
   * Tracks por cámara que alimentan los feeds.
   *
   * Sólo cambian cuando el reparto de actores visibles cambia, de modo que la
   * cuadrícula de monitoreo no se vuelve a renderizar en cada fotograma.
   */
  tracks: Record<string, CameraTrackTarget[]>;
  /** Firma del reparto de actores: detecta los cambios sin comparar arrays. */
  tracksSignature: string;
  tick: (deltaMs: number) => void;
  seek: (clockMs: number) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setSpeed: (speed: SimulationSpeed) => void;
  /** Vuelve al instante de referencia de la plataforma. */
  reset: () => void;
}

/** Segundo de la línea de tiempo que corresponde a un instante del reloj. */
export function timelineSecOf(clockMs: number): number {
  return (clockMs - TIMELINE_START_MS) / 1000;
}

/** Fotografía de la simulación en un instante concreto. */
export function snapshotAt(clockMs: number): SimulationSnapshot {
  return SIMULATION_ENGINE.snapshotAt(timelineSecOf(clockMs));
}

/** Traduce un incidente del motor al modelo de la plataforma. */
function toPlatformIncident(incident: SimIncident): Incident {
  const camera = CAMERAS.find((item) => item.id === incident.cameraId);
  const occurredAt = new Date(TIMELINE_START_MS + incident.atSec * 1000).toISOString();
  return {
    id: incident.id,
    occurredAt,
    cameraId: incident.cameraId,
    zoneId: camera?.zoneId ?? `zn-${incident.cameraId.toLowerCase()}`,
    sectorId: camera?.sectorId ?? 'sec-gambetta',
    category: incident.category,
    type: incident.title,
    severity: incident.severity,
    capability: 'operativo',
    objectType: incident.objectType,
    objectCount: incident.objectCount,
    confidence: incident.confidence,
    status: 'nuevo',
    assigneeId: null,
    notes: [
      {
        at: occurredAt,
        authorId: 'usr-004',
        text: incident.detail,
      },
    ],
    hasVideoClip: incident.clipDurationSec > 0,
    clipDurationSec: incident.clipDurationSec,
    simulated: true,
  };
}

/** Un incidente sigue abierto mientras no esté resuelto ni descartado. */
function isOpen(status: Incident['status']): boolean {
  return status !== 'resuelto' && status !== 'descartado';
}

/**
 * Sincroniza el store con el estado del motor.
 *
 * Traduce tres cosas: los incidentes que ya ocurrieron en la línea de tiempo,
 * el estado de salud de las cámaras que el guion gestiona y el reparto de
 * actores que alimenta los feeds.
 */
function sync(clockMs: number): {
  tracks: Record<string, CameraTrackTarget[]>;
  signature: string;
} {
  const snapshot = SIMULATION_ENGINE.snapshotAt(timelineSecOf(clockMs));

  // 1. Incidentes de la línea de tiempo.
  const incidentsStore = useIncidentsStore.getState();
  const existing = new Set(incidentsStore.incidents.map((incident) => incident.id));
  for (const incident of snapshot.incidents) {
    if (existing.has(incident.id)) continue;
    incidentsStore.addIncident(toPlatformIncident(incident));
    useActivityStore.getState().log({
      at: new Date(clockMs).toISOString(),
      actorId: 'usr-004',
      action: 'Detección automática',
      target: `${incident.id} · ${incident.cameraId}`,
      detail: incident.title,
      kind: 'sistema',
    });
  }

  // 2. Estado de las cámaras que el guion gestiona.
  const camerasStore = useCamerasStore.getState();
  const platformIncidents = useIncidentsStore.getState().incidents;
  const openSeverity = new Map<string, SimIncident['severity']>();
  for (const incident of snapshot.incidents) {
    const platform = platformIncidents.find((item) => item.id === incident.id);
    if (!platform || !isOpen(platform.status)) continue;
    openSeverity.set(incident.cameraId, incident.severity);
  }

  for (const cameraId of MANAGED_CAMERA_IDS) {
    const health = snapshot.cameraHealth[cameraId];
    if (health === 'sin_senal') {
      camerasStore.setOverride(cameraId, { status: 'inactiva', hasAlert: false });
      continue;
    }
    const severity = openSeverity.get(cameraId);
    if (severity) {
      camerasStore.setOverride(cameraId, {
        status: 'alerta',
        hasAlert: true,
        alertSeverity: severity,
        lastSeen: new Date(clockMs).toISOString(),
      });
      continue;
    }
    camerasStore.clearOverride(cameraId);
  }

  // 3. Reparto de actores que alimenta los feeds.
  return {
    tracks: targetsByCamera(snapshot.actors),
    signature: snapshot.actors
      .map((state) => `${state.actor.cameraId}:${state.actor.id}`)
      .sort()
      .join('|'),
  };
}

export const useSimulationStore = create<SimulationState>()((set, get) => {
  const initial = sync(PLATFORM_NOW_MS);

  return {
    clockMs: PLATFORM_NOW_MS,
    playing: false,
    speed: 1,
    tracks: initial.tracks,
    tracksSignature: initial.signature,

    tick: (deltaMs) => {
      const state = get();
      if (!state.playing) return;
      const next = Math.min(TIMELINE_END_MS, state.clockMs + deltaMs * state.speed);
      const result = sync(next);
      set({
        clockMs: next,
        tracks: result.signature === state.tracksSignature ? state.tracks : result.tracks,
        tracksSignature: result.signature,
      });
      if (next >= TIMELINE_END_MS) set({ playing: false });
    },

    seek: (clockMs) => {
      const clamped = Math.max(TIMELINE_START_MS, Math.min(TIMELINE_END_MS, clockMs));
      const state = get();
      const result = sync(clamped);
      set({
        clockMs: clamped,
        tracks: result.signature === state.tracksSignature ? state.tracks : result.tracks,
        tracksSignature: result.signature,
      });
    },

    play: () => {
      const state = get();
      if (state.clockMs >= TIMELINE_END_MS) {
        state.seek(TIMELINE_START_MS);
      }
      set({ playing: true });
    },

    pause: () => set({ playing: false }),

    toggle: () => {
      const state = get();
      if (state.playing) state.pause();
      else state.play();
    },

    setSpeed: (speed) => set({ speed }),

    reset: () => {
      const state = get();
      state.seek(PLATFORM_NOW_MS);
      set({ playing: false });
    },
  };
});
