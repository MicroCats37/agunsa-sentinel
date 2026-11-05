import type { CameraTrackTarget } from '@/domain/types';
import type { SimActorState, Storyline } from './types';

/**
 * Módulo profundo del motor de simulación.
 *
 * Toda la lógica de la noche simulada vive detrás de esta única interfaz
 * pública: el guion, el motor y los tipos que el store y las features
 * necesitan. El resto del código nunca importa `engine.ts` ni `storyline.ts`
 * directamente.
 */
export { SimulationEngine, actorPositionAt, isActorActive } from './engine';
export type { SimCameraDescriptor, SimulationEngineOptions } from './engine';
export { STORYLINE, STORYLINE_DURATION_SEC, STORYLINE_ACTORS } from './storyline';
export type {
  SimActor,
  SimActorState,
  SimBeat,
  SimCameraHealth,
  SimDetection,
  SimEvent,
  SimEventKind,
  SimIncident,
  SimRuleFire,
  SimulationSnapshot,
  Storyline,
} from './types';

/**
 * Convierte los actores visibles en los tracks que consume el feed en canvas.
 *
 * Es el puente que hace que **la silueta que se ve sea la detección**: el
 * feed dibuja exactamente los actores que el motor ha evaluado.
 */
export function actorStatesToTargets(actors: readonly SimActorState[]): CameraTrackTarget[] {
  return actors.map((state) => ({
    id: state.actor.id,
    objectType: state.actor.objectType,
    pattern: 'caminata-horizontal' as const,
    origin: { x: state.x, y: state.y },
    amplitude: 0,
    speed: 0,
    dwellSeconds: 120,
    size: state.actor.size,
    keyframes: state.actor.keyframes,
    confidence: state.actor.confidence,
    ambient: state.actor.ambient,
  }));
}

/**
 * Agrupa los tracks por cámara.
 *
 * El reparto sólo cambia cuando un actor entra o sale del encuadre, así que
 * la cuadrícula de monitoreo puede memoizar sobre esta estructura.
 */
export function targetsByCamera(
  actors: readonly SimActorState[],
): Record<string, CameraTrackTarget[]> {
  const grouped: Record<string, CameraTrackTarget[]> = {};
  for (const state of actors) {
    const list = grouped[state.actor.cameraId] ?? [];
    list.push({
      id: state.actor.id,
      objectType: state.actor.objectType,
      pattern: 'caminata-horizontal' as const,
      origin: { x: state.x, y: state.y },
      amplitude: 0,
      speed: 0,
      dwellSeconds: 120,
      size: state.actor.size,
      keyframes: state.actor.keyframes,
      confidence: state.actor.confidence,
      ambient: state.actor.ambient,
    });
    grouped[state.actor.cameraId] = list;
  }
  return grouped;
}

/** Filtra los actores visibles de una cámara concreta. */
export function actorsForCamera(
  actors: readonly SimActorState[],
  cameraId: string,
): SimActorState[] {
  return actors.filter((state) => state.actor.cameraId === cameraId);
}

/** Actor con guion visible en una cámara concreta. */
export function scriptedActorFor(
  actors: readonly SimActorState[],
  cameraId: string,
): SimActorState | undefined {
  return actors.find((state) => state.actor.cameraId === cameraId && !state.actor.ambient);
}

/** Etiqueta corta de un guion de simulación. */
export function storylineLabel(storyline: Storyline): string {
  return storyline.title;
}
