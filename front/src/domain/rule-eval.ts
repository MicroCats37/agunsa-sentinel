import { evaluateDwell } from '@/domain/dwell';
import { crossingDirection, pointInPolygon } from '@/domain/geometry';
import { computeTrackedObjects } from '@/domain/track-motion';
import type { CameraTrackTarget, SecurityRule, VirtualLine, Zone } from '@/domain/types';

/**
 * Evaluación de una regla contra la escena simulada.
 *
 * Reproduce, sobre los tracks de las cámaras, qué reglas se dispararían ahora.
 * Sirve como vista previa del motor de reglas y deja explícito qué condición
 * (permanencia, cruce, presencia) dispara cada alerta.
 *
 * El módulo es puro y determinista: recibe el instante evaluado (`nowSec`) y
 * devuelve exactamente el mismo resultado siempre. Es la pieza que comparten
 * la vista previa de reglas y el motor de simulación.
 */

/** Datos mínimos de una cámara que necesita la evaluación. */
export interface RuleEvaluationCamera {
  id: string;
  name: string;
}

export interface RuleEvaluationContext {
  cameras: readonly RuleEvaluationCamera[];
  zones: readonly Zone[];
  lines: readonly VirtualLine[];
  tracks: ReadonlyMap<string, CameraTrackTarget[]>;
  /**
   * Instante evaluado, en segundos de línea de tiempo.
   *
   * Por defecto es 0: los tracks paramétricos heredados son relativos a este
   * instante. El motor de simulación pasa el segundo real de la línea de
   * tiempo, y los tracks con keyframes se interpolan en ese punto.
   */
  nowSec?: number;
}

export interface RuleEvaluation {
  cameraId: string;
  cameraName: string;
  scopeLabel: string;
  fired: boolean;
  reason: string;
  dwellSeconds: number;
  requiredSeconds: number;
  matchedObjects: number;
}

const DEFAULT_WINDOW_SECONDS = 180;
const STEP_SECONDS = 2;

export function evaluateRule(rule: SecurityRule, context: RuleEvaluationContext): RuleEvaluation[] {
  const nowSec = context.nowSec ?? 0;
  const cameras = resolveScopeCameras(rule, context);
  const evaluations: RuleEvaluation[] = [];

  // La ventana de análisis debe ser capaz de contener la permanencia exigida
  // por la regla: si no, un umbral de 300 s nunca podría cumplirse.
  const windowSeconds = Math.max(
    DEFAULT_WINDOW_SECONDS,
    rule.minDwellSeconds > 0 ? rule.minDwellSeconds + 60 : DEFAULT_WINDOW_SECONDS,
  );

  for (const camera of cameras) {
    const targets = (context.tracks.get(camera.id) ?? []).filter(
      (target) => target.objectType === rule.objectType,
    );
    if (targets.length === 0) {
      evaluations.push({
        cameraId: camera.id,
        cameraName: camera.name,
        scopeLabel: camera.name,
        fired: false,
        reason: 'Sin objetos del tipo esperado en el encuadre.',
        dwellSeconds: 0,
        requiredSeconds: rule.minDwellSeconds,
        matchedObjects: 0,
      });
      continue;
    }

    const zone = resolveZone(rule, camera, context);
    const samples = buildSamples(targets, nowSec, windowSeconds);
    const dwell = zone
      ? evaluateDwell(samples, (point) => pointInPolygon(point, zone.polygon))
      : { secondsInside: 0, inside: false };

    const crossed = hasCrossing(rule, camera, context, targets, nowSec, windowSeconds);
    const fired = decide(rule, dwell.secondsInside, crossed, targets.length);

    evaluations.push({
      cameraId: camera.id,
      cameraName: camera.name,
      scopeLabel: zone ? zone.name : camera.name,
      fired,
      reason: explain(rule, dwell.secondsInside, crossed, targets.length, fired),
      dwellSeconds: Math.round(dwell.secondsInside),
      requiredSeconds: rule.minDwellSeconds,
      matchedObjects: targets.length,
    });
  }

  return evaluations;
}

function resolveScopeCameras(
  rule: SecurityRule,
  context: RuleEvaluationContext,
): RuleEvaluationCamera[] {
  if (rule.scopeKind === 'camara') {
    const camera = context.cameras.find((item) => item.id === rule.scopeId);
    return camera ? [camera] : [];
  }
  const zone = context.zones.find((item) => item.id === rule.scopeId);
  if (!zone) return [];
  return context.cameras.filter((camera) => camera.id === zone.cameraId);
}

function resolveZone(
  rule: SecurityRule,
  camera: RuleEvaluationCamera,
  context: RuleEvaluationContext,
): Zone | undefined {
  if (rule.scopeKind === 'zona') {
    return context.zones.find((zone) => zone.id === rule.scopeId);
  }
  return (
    context.zones.find((zone) => zone.cameraId === camera.id && zone.kind === 'perimetro') ??
    context.zones.find((zone) => zone.cameraId === camera.id)
  );
}

function buildSamples(
  targets: readonly CameraTrackTarget[],
  nowSec: number,
  windowSeconds: number,
) {
  const samples: { t: number; position: { x: number; y: number } }[] = [];
  for (let t = nowSec - windowSeconds; t <= nowSec; t += STEP_SECONDS) {
    for (const object of computeTrackedObjects(targets, t)) {
      samples.push({
        t,
        position: { x: object.x + object.width / 2, y: object.y + object.height / 2 },
      });
    }
  }
  return samples;
}

/**
 * Detecta un cruce de línea virtual dentro de la ventana analizada.
 *
 * La muestra `a` es siempre la más antigua y `b` la más reciente: así el
 * sentido calculado (ingreso/salida) es estable.
 */
function hasCrossing(
  rule: SecurityRule,
  camera: RuleEvaluationCamera,
  context: RuleEvaluationContext,
  targets: readonly CameraTrackTarget[],
  nowSec: number,
  windowSeconds: number,
): boolean {
  if (rule.event !== 'cruce_linea' && rule.event !== 'sentido_contrario') return false;
  const lines = context.lines.filter((line) => line.cameraId === camera.id && line.enabled);
  if (lines.length === 0) return false;

  for (const target of targets) {
    let previous = computeTrackedObjects([target], nowSec - windowSeconds)[0];
    for (let t = nowSec - windowSeconds + STEP_SECONDS; t <= nowSec; t += STEP_SECONDS) {
      const current = computeTrackedObjects([target], t)[0];
      if (!previous || !current) continue;
      const from = { x: previous.x + previous.width / 2, y: previous.y + previous.height / 2 };
      const to = { x: current.x + current.width / 2, y: current.y + current.height / 2 };
      for (const line of lines) {
        if (line.direction !== 'cualquiera' && rule.direction !== 'cualquiera') {
          if (line.direction !== rule.direction) continue;
        }
        const direction = crossingDirection(from, to, line.from, line.to);
        if (direction === null) continue;
        if (rule.direction === 'cualquiera' || line.direction === 'cualquiera') return true;
        if (direction === rule.direction) return true;
      }
      previous = current;
    }
  }
  return false;
}

/**
 * Condición de disparo según el tipo de evento de la regla.
 *
 * - `permanencia` / `estacionamiento` / `acercamiento_perimetro`: el objeto
 *   supera el tiempo de permanencia exigido dentro de la zona.
 * - `cruce_linea` / `sentido_contrario`: se cruzó una línea virtual.
 * - `acceso_restringido`: hay presencia dentro de la zona restringida.
 * - `agrupacion`: hay dos o más objetos del tipo esperado.
 * - `presencia`: hay al menos un objeto del tipo esperado.
 */
function decide(
  rule: SecurityRule,
  dwellSeconds: number,
  crossed: boolean,
  objectCount: number,
): boolean {
  switch (rule.event) {
    case 'permanencia':
    case 'estacionamiento':
    case 'acercamiento_perimetro':
      return rule.minDwellSeconds > 0 && dwellSeconds >= rule.minDwellSeconds;
    case 'cruce_linea':
    case 'sentido_contrario':
      return crossed;
    case 'acceso_restringido':
      return rule.minDwellSeconds > 0 ? dwellSeconds >= rule.minDwellSeconds : dwellSeconds > 0;
    case 'agrupacion':
      return objectCount >= 2;
    case 'presencia':
      return objectCount > 0;
    default:
      return objectCount > 0;
  }
}

function explain(
  rule: SecurityRule,
  dwellSeconds: number,
  crossed: boolean,
  objectCount: number,
  fired: boolean,
): string {
  switch (rule.event) {
    case 'permanencia':
    case 'estacionamiento':
    case 'acercamiento_perimetro':
      return fired
        ? `Permanencia de ${Math.round(dwellSeconds)} s ≥ ${rule.minDwellSeconds} s exigidos.`
        : `Permanencia actual de ${Math.round(dwellSeconds)} s; se exigen ${rule.minDwellSeconds} s.`;
    case 'cruce_linea':
      return crossed
        ? 'Se detectó un cruce de la línea virtual en el sentido configurado.'
        : 'Sin cruces de línea virtual en la ventana analizada.';
    case 'sentido_contrario':
      return crossed
        ? 'Se detectó una circulación en sentido contrario al configurado.'
        : 'Sin circulación en sentido contrario en la ventana analizada.';
    case 'acceso_restringido':
      return fired
        ? `Presencia dentro de la zona restringida (${Math.round(dwellSeconds)} s).`
        : 'Sin presencia en la zona restringida.';
    case 'agrupacion':
      return fired
        ? `${objectCount} objetos del tipo esperado en el mismo encuadre.`
        : 'No hay agrupación de objetos en el encuadre.';
    case 'presencia':
      return fired
        ? `${objectCount} objeto(s) del tipo esperado detectados en el encuadre.`
        : 'Sin objetos del tipo esperado en el encuadre.';
    default:
      return fired
        ? 'La condición de la regla se cumple en la escena simulada.'
        : 'La condición de la regla no se cumple en la escena simulada.';
  }
}
