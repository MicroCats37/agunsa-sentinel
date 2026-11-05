import type { CameraViewIntent, Point } from './types';

/**
 * Orientación de las cámaras sobre el plano.
 *
 * Una cámara perimetral vigila el **exterior** del recinto: su cono de visión
 * debe apuntar hacia la calle, no hacia el interior de la planta. Este módulo
 * concentra la geometría que lo garantiza, de forma pura y testeable.
 *
 * Convención de rumbo del plano (la misma que usa el resto del mockup):
 *   0° = este (+x) · 90° = sur (+y) · 180° = oeste (−x) · 270° = norte (−y).
 */

/** Normaliza un ángulo a [0, 360). */
export function normalizeDegrees(degrees: number): number {
  const value = degrees % 360;
  return value < 0 ? value + 360 : value;
}

/** Vector unitario en el plano a partir de un rumbo (0 = este, 90 = sur). */
export function vectorFromHeading(heading: number): { x: number; y: number } {
  const rad = (normalizeDegrees(heading) * Math.PI) / 180;
  return { x: Math.cos(rad), y: Math.sin(rad) };
}

/** Rumbo (0 = este, 90 = sur) de un vector del plano. */
export function headingFromVector(vector: Point): number {
  return normalizeDegrees((Math.atan2(vector.y, vector.x) * 180) / Math.PI);
}

/**
 * Normal exterior de un polígono en el punto dado.
 *
 * Proyecta el punto sobre el segmento más cercano y toma la normal de ese
 * segmento, orientada en sentido contrario al centroide: así el vector
 * resultante siempre apunta hacia fuera del recinto.
 */
export function outwardNormal(point: Point, polygon: readonly Point[]): { x: number; y: number } {
  if (polygon.length < 3) return { x: 0, y: -1 };

  const centroid = polygon.reduce(
    (acc, vertex) => ({ x: acc.x + vertex.x / polygon.length, y: acc.y + vertex.y / polygon.length }),
    { x: 0, y: 0 },
  );

  let best: { x: number; y: number; distance: number } | null = null;

  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    if (!a || !b) continue;

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) continue;

    const t = Math.max(
      0,
      Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared),
    );
    const projected = { x: a.x + dx * t, y: a.y + dy * t };
    const distance = Math.hypot(point.x - projected.x, point.y - projected.y);

    if (!best || distance < best.distance) {
      // Normal del segmento: perpendicular al vector de avance.
      const normal = { x: dy / Math.sqrt(lengthSquared), y: -dx / Math.sqrt(lengthSquared) };
      best = { x: projected.x + normal.x, y: projected.y + normal.y, distance };
    }
  }

  if (!best) return { x: 0, y: -1 };

  // Orienta la normal hacia fuera: lejos del centroide.
  const toPoint = { x: point.x - best.x, y: point.y - best.y };
  const outward = { x: best.x - centroid.x, y: best.y - centroid.y };
  const dot = toPoint.x * outward.x + toPoint.y * outward.y;
  if (dot < 0) return { x: -toPoint.x, y: -toPoint.y };

  const length = Math.hypot(toPoint.x, toPoint.y) || 1;
  return { x: toPoint.x / length, y: toPoint.y / length };
}

/**
 * Rumbo de una cámara a partir de su posición, el cerco y su intención.
 *
 * `exterior` y `acceso` apuntan hacia el exterior del recinto; `interior`
 * apunta hacia el centro de la planta, que es el único caso en que una
 * cámara perimetral vigila hacia adentro.
 */
export function headingForCamera(
  position: Point,
  fence: readonly Point[],
  intent: CameraViewIntent,
): number {
  const normal = outwardNormal(position, fence);
  const heading = headingFromVector(normal);
  return intent === 'interior' ? normalizeDegrees(heading + 180) : heading;
}

/**
 * Vértices del cono de visión sobre el plano.
 *
 * `heading` es el eje del cono y `fov` su apertura total, en grados.
 */
export function fovWedge(
  position: Point,
  heading: number,
  fov: number,
  radius: number,
  segments = 18,
): Point[] {
  const half = (fov * Math.PI) / 360;
  const base = (normalizeDegrees(heading) * Math.PI) / 180;
  const points: Point[] = [{ x: position.x, y: position.y }];

  for (let i = 0; i <= segments; i++) {
    const angle = base - half + (i / segments) * half * 2;
    points.push({
      x: position.x + Math.cos(angle) * radius,
      y: position.y + Math.sin(angle) * radius,
    });
  }

  return points;
}

/** Polígono SVG (o string de puntos) a partir de una lista de vértices. */
export function toPolygonPoints(points: readonly Point[]): string {
  return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
}
