import { pointInPolygon } from './geometry';
import type { Point } from './types';

/**
 * Cálculo de permanencia (dwell) y merodeo.
 *
 * Una permanencia prolongada NO implica por sí sola una amenaza: la regla que
 * decide si la supera es la que define el tiempo máximo permitido por zona.
 */

export interface TrackSample {
  /** Segundos relativos al inicio del track. */
  t: number;
  position: Point;
}

export interface DwellResult {
  /** Segundos acumulados dentro de la zona. */
  secondsInside: number;
  /** Segundos totales observados. */
  secondsObserved: number;
  /** Instante (segundos) en el que se entró por última vez a la zona. */
  lastEntryAt: number;
  /** `true` si la última observación sigue dentro de la zona. */
  inside: boolean;
  /** Porcentaje de permanencia sobre el total observado (0..100). */
  ratio: number;
}

export function evaluateDwell(
  samples: readonly TrackSample[],
  isInside: (point: Point) => boolean,
): DwellResult {
  if (samples.length === 0) {
    return { secondsInside: 0, secondsObserved: 0, lastEntryAt: 0, inside: false, ratio: 0 };
  }

  let secondsInside = 0;
  let lastEntryAt = 0;
  let inside = false;

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    if (sample === undefined) continue;
    const nowInside = isInside(sample.position);
    if (nowInside) {
      if (!inside) {
        lastEntryAt = sample.t;
        secondsInside += 0;
      } else {
        const previous = samples[i - 1];
        if (previous) secondsInside += Math.max(0, sample.t - previous.t);
      }
      inside = true;
    } else {
      inside = false;
    }
  }

  const first = samples[0];
  const last = samples[samples.length - 1];
  const secondsObserved = first && last ? Math.max(0, last.t - first.t) : 0;

  return {
    secondsInside,
    secondsObserved,
    lastEntryAt,
    inside,
    ratio: secondsObserved > 0 ? Math.min(100, (secondsInside / secondsObserved) * 100) : 0,
  };
}

/** Verifica si un track supera el tiempo máximo de permanencia permitido en una zona. */
export function exceedsDwellLimit(
  samples: readonly TrackSample[],
  isInside: (point: Point) => boolean,
  maxSeconds: number | null,
): boolean {
  if (maxSeconds === null) return false;
  return evaluateDwell(samples, isInside).secondsInside >= maxSeconds;
}

/** Construye el predicado de pertenencia a una zona poligonal normalizada. */
export function zonePredicate(polygon: readonly Point[]): (point: Point) => boolean {
  return (point) => pointInPolygon(point, polygon);
}

/**
 * Detecta merodeo: varias pasadas por la misma zona dentro de una ventana de
 * tiempo, sin registrado un ingreso a la instalación.
 */
export interface LoiteringResult {
  passes: number;
  detected: boolean;
}

export function evaluateLoitering(
  samples: readonly TrackSample[],
  isInside: (point: Point) => boolean,
  windowSeconds: number,
  minPasses: number,
): LoiteringResult {
  if (samples.length === 0) return { passes: 0, detected: false };

  const entries: number[] = [];
  let wasInside = false;
  for (const sample of samples) {
    const nowInside = isInside(sample.position);
    if (nowInside && !wasInside) entries.push(sample.t);
    wasInside = nowInside;
  }

  if (entries.length < 2) return { passes: entries.length, detected: false };

  const first = entries[0];
  const last = entries[entries.length - 1];
  if (first === undefined || last === undefined) return { passes: entries.length, detected: false };

  const withinWindow = last - first <= windowSeconds;
  return { passes: entries.length, detected: withinWindow && entries.length >= minPasses };
}
