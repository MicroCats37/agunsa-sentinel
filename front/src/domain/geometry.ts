import type { Point } from './types';

/** Utilidades geométricas puras: polígonos, cruce de líneas y normalización de encuadres. */

export function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/** Algoritmo ray-casting. El borde se considera interior. */
export function pointInPolygon(point: Point, polygon: readonly Point[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (a === undefined || b === undefined) continue;
    const intersects =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y || Number.EPSILON) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function polygonCentroid(polygon: readonly Point[]): Point {
  if (polygon.length === 0) return { x: 0.5, y: 0.5 };
  let sx = 0;
  let sy = 0;
  for (const p of polygon) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / polygon.length, y: sy / polygon.length };
}

export function polygonBounds(polygon: readonly Point[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const p of polygon) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Detecta el sentido de cruce de un segmento (a → b) sobre una línea virtual.
 * Devuelve `null` cuando el segmento no cruza la línea.
 */
export function crossingDirection(
  a: Point,
  b: Point,
  lineFrom: Point,
  lineTo: Point,
): 'entrada' | 'salida' | null {
  const d1 = cross(lineFrom, lineTo, a);
  const d2 = cross(lineFrom, lineTo, b);
  const d3 = cross(a, b, lineFrom);
  const d4 = cross(a, b, lineTo);

  if (
    ((d1 > 0 && d2 <= 0) || (d1 <= 0 && d2 > 0)) &&
    ((d3 > 0 && d4 <= 0) || (d3 <= 0 && d4 > 0))
  ) {
    // El lado del plano perimetral decide si el movimiento es ingreso o salida.
    return d3 > 0 ? 'entrada' : 'salida';
  }
  return null;
}

function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/** Convierte un punto del plano (unidades de plano) al encuadre normalizado de una cámara. */
export function planToFrame(
  point: Point,
  camera: { position: Point; heading: number; fov: number },
  frameAspect: number,
): Point {
  const rad = (camera.heading * Math.PI) / 180;
  const dx = point.x - camera.position.x;
  const dy = point.y - camera.position.y;
  // Sistema local de la cámara: eje X = frente de la cámara, eje Y = lateral.
  const forward = dx * Math.cos(rad) + dy * Math.sin(rad);
  const lateral = -dx * Math.sin(rad) + dy * Math.cos(rad);
  const halfFov = ((camera.fov / 2) * Math.PI) / 180;
  const depth = 60;
  const tan = Math.tan(halfFov);
  const nx = depth * (lateral / (depth * tan * frameAspect));
  const ny = (depth * (forward - depth)) / (depth * tan);
  return { x: clamp01(0.5 + nx), y: clamp01(0.5 + ny) };
}

/** Inversa de `planToFrame`: posiciona un punto normalizado del encuadre sobre el plano. */
export function frameToPlan(
  point: Point,
  camera: { position: Point; heading: number; fov: number },
  frameAspect: number,
): Point {
  const rad = (camera.heading * Math.PI) / 180;
  const halfFov = ((camera.fov / 2) * Math.PI) / 180;
  const tan = Math.tan(halfFov);
  const depth = 60;
  const lateral = (point.x - 0.5) * depth * tan * frameAspect;
  const forward = (point.y - 0.5) * depth * tan + depth;
  return {
    x: camera.position.x + lateral * -Math.sin(rad) + forward * Math.cos(rad),
    y: camera.position.y + lateral * Math.cos(rad) + forward * Math.sin(rad),
  };
}

/** Distancia euclidiana en unidades de plano. */
export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
