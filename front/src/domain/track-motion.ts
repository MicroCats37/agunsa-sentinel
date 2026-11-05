import { hashSeed } from '@/domain/rng';
import type { CameraTrackTarget, ObjectType } from '@/domain/types';

/**
 * Movimiento sintético de los objetos dentro del encuadre de una cámara.
 *
 * Vive en el dominio (y no en el renderizador) porque dos módulos lo
 * necesitan: el feed en canvas, que lo dibuja, y el evaluador de reglas, que
 * lo usa para saber si un objeto llevaría el tiempo de permanencia exigido.
 *
 * Dos modos de movimiento:
 *  - **keyframes**: trayectoria guionizada con instantes absolutos de la línea
 *    de tiempo. Es el modo que usa el motor de simulación: la misma posición
 *    alimenta el feed, la detección y el incidente.
 *  - **patrón paramétrico**: oscilación periódica usada por la vista previa del
 *    motor de reglas.
 */
export interface TrackedObject {
  id: string;
  objectType: ObjectType;
  /** Posición normalizada (0..1) dentro del encuadre. */
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  /** Oscilación vertical de la marcha. */
  bob: number;
}

function phaseOf(id: string): number {
  return (hashSeed(id) % 1000) / 1000;
}

function pingPong(value: number): number {
  const t = ((value % 2) + 2) % 2;
  return t < 1 ? t : 2 - t;
}

/** Interpola una trayectoria guionizada en el instante dado. */
export function interpolateKeyframes(
  keyframes: readonly { t: number; x: number; y: number }[],
  timeSec: number,
): { x: number; y: number } {
  if (keyframes.length === 0) return { x: 0.5, y: 0.7 };
  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];
  if (!first || !last) return { x: 0.5, y: 0.7 };
  if (timeSec <= first.t) return { x: first.x, y: first.y };
  if (timeSec >= last.t) return { x: last.x, y: last.y };

  for (let i = 1; i < keyframes.length; i++) {
    const a = keyframes[i - 1];
    const b = keyframes[i];
    if (!a || !b) continue;
    if (timeSec <= b.t) {
      const span = b.t - a.t;
      const ratio = span === 0 ? 0 : (timeSec - a.t) / span;
      return { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio };
    }
  }

  return { x: last.x, y: last.y };
}

export function computeTrackedObjects(
  targets: readonly CameraTrackTarget[],
  timeSec: number,
): TrackedObject[] {
  const objects: TrackedObject[] = [];

  for (const target of targets) {
    const phase = phaseOf(target.id);
    let x = target.origin.x;
    let y = target.origin.y;

    if (target.keyframes && target.keyframes.length > 0) {
      const position = interpolateKeyframes(target.keyframes, timeSec);
      x = position.x;
      y = position.y;
    } else {
      switch (target.pattern) {
        case 'caminata-horizontal': {
          const p = pingPong(timeSec * target.speed * 6 + phase * 2);
          x = target.origin.x + (p - 0.5) * 2 * target.amplitude;
          break;
        }
        case 'caminata-vertical': {
          const p = pingPong(timeSec * target.speed * 4 + phase * 2);
          y = target.origin.y - p * target.amplitude;
          break;
        }
        case 'acercamiento': {
          const p = pingPong(timeSec * target.speed * 5 + phase * 2);
          y = target.origin.y - p * target.amplitude * 0.8;
          x = target.origin.x + Math.sin(timeSec * 0.4 + phase * 6) * 0.02;
          break;
        }
        case 'estacionado': {
          const p = pingPong(timeSec * target.speed * 1.5 + phase * 2);
          x = target.origin.x + (p - 0.5) * target.amplitude * 0.18;
          break;
        }
        case 'circulacion': {
          const p = pingPong(timeSec * target.speed * 8 + phase * 2);
          x = target.origin.x + (p - 0.5) * 2 * target.amplitude;
          break;
        }
      }
    }

    const isVehicle = target.objectType === 'vehiculo';
    const width = isVehicle ? target.size : target.size * 0.55;
    const height = isVehicle ? target.size * 0.72 : target.size * 2.2;

    objects.push({
      id: target.id,
      objectType: target.objectType,
      x: clamp(x, -0.05, 1.05),
      y: clamp(y - height, -0.05, 1.05),
      width,
      height,
      confidence: target.confidence ?? 0.72 + (hashSeed(target.id) % 27) / 100,
      bob: isVehicle ? 0 : Math.sin(timeSec * 6 + phase * 6) * 0.004,
    });
  }

  return objects;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
