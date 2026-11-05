import { normalizeDegrees } from './facing';
import type { CameraViewIntent, GeoPoint } from './types';

/**
 * Geometría de la vista geoespacial.
 *
 * Es el equivalente geodésico de `facing.ts`: allí el rumbo se mide sobre el
 * plano de la instalación (0 = este, 90 = sur); aquí se mide como **azimut**
 * real (0 = norte, sentido horario). La regla de fondo es la misma: una
 * cámara perimetral vigila el **exterior** del recinto, y sólo las cámaras
 * de cobertura interior apuntan hacia adentro.
 *
 * Módulo puro: no conoce Cesium ni el estado de la aplicación.
 */

/** Longitud de un grado de longitud en metros, a una latitud dada. */
export function metersPerDegreeLongitude(latitude: number): number {
  return 111_320 * Math.cos((latitude * Math.PI) / 180);
}

/** Longitud de un grado de latitud en metros. */
export const METERS_PER_DEGREE_LATITUDE = 111_320;

/** Distancia en metros entre dos puntos geográficos (planar, suficiente a escala de recinto). */
export function geoDistanceMeters(a: GeoPoint, b: GeoPoint): number {
  const latitude = (a.latitude + b.latitude) / 2;
  const east = (b.longitude - a.longitude) * metersPerDegreeLongitude(latitude);
  const north = (b.latitude - a.latitude) * METERS_PER_DEGREE_LATITUDE;
  return Math.hypot(east, north);
}

/**
 * Desplazamiento en metros Este/Norte a partir de un punto geográfico.
 *
 * El eje Norte local es el meridiano; el Este local es el paralelo.
 */
export function offsetMeters(origin: GeoPoint, eastMeters: number, northMeters: number): GeoPoint {
  return {
    latitude: origin.latitude + northMeters / METERS_PER_DEGREE_LATITUDE,
    longitude: origin.longitude + eastMeters / metersPerDegreeLongitude(origin.latitude),
  };
}

/** Vector unitario en el plano local (Este, Norte) a partir de un azimut. */
export function vectorFromAzimuth(azimuth: number): { east: number; north: number } {
  const rad = (normalizeDegrees(azimuth) * Math.PI) / 180;
  return { east: Math.sin(rad), north: Math.cos(rad) };
}

/** Azimut (0 = norte, horario) de un vector en el plano local. */
export function azimuthFromVector(vector: { east: number; north: number }): number {
  return normalizeDegrees((Math.atan2(vector.east, vector.north) * 180) / Math.PI);
}

/** Centroide (media) de un polígono geográfico. */
export function geoCentroid(polygon: readonly GeoPoint[]): GeoPoint {
  if (polygon.length === 0) return { longitude: 0, latitude: 0 };
  const sum = polygon.reduce(
    (acc, point) => ({
      longitude: acc.longitude + point.longitude / polygon.length,
      latitude: acc.latitude + point.latitude / polygon.length,
    }),
    { longitude: 0, latitude: 0 },
  );
  return sum;
}

/**
 * Dirección **hacia el exterior** del recinto desde un punto del perímetro.
 *
 * Proyecta el punto sobre el segmento más cercano y toma la normal de ese
 * segmento, orientada en sentido contrario al centroide: el vector resultante
 * siempre apunta hacia la calle.
 */
export function outwardGeoDirection(
  point: GeoPoint,
  polygon: readonly GeoPoint[],
): { east: number; north: number } {
  if (polygon.length < 3) return { east: 0, north: -1 };

  const centroid = geoCentroid(polygon);
  let best: { point: GeoPoint; distance: number } | null = null;

  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    if (!a || !b) continue;

    const scale = metersPerDegreeLongitude(a.latitude);
    const ax = a.longitude * scale;
    const ay = a.latitude * METERS_PER_DEGREE_LATITUDE;
    const bx = b.longitude * scale;
    const by = b.latitude * METERS_PER_DEGREE_LATITUDE;
    const px = point.longitude * scale;
    const py = point.latitude * METERS_PER_DEGREE_LATITUDE;

    const dx = bx - ax;
    const dy = by - ay;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) continue;

    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
    const projectedX = ax + dx * t;
    const projectedY = ay + dy * t;
    const distance = Math.hypot(px - projectedX, py - projectedY);

    if (!best || distance < best.distance) {
      best = {
        point: {
          longitude: projectedX / scale,
          latitude: projectedY / METERS_PER_DEGREE_LATITUDE,
        },
        distance,
      };
    }
  }

  if (!best) return { east: 0, north: -1 };

  const scale = metersPerDegreeLongitude(point.latitude);
  const toPoint = {
    east: (point.longitude - best.point.longitude) * scale,
    north: (point.latitude - best.point.latitude) * METERS_PER_DEGREE_LATITUDE,
  };
  const outward = {
    east: (best.point.longitude - centroid.longitude) * scale,
    north: (best.point.latitude - centroid.latitude) * METERS_PER_DEGREE_LATITUDE,
  };

  const dot = toPoint.east * outward.east + toPoint.north * outward.north;
  const vector = dot < 0 ? { east: -toPoint.east, north: -toPoint.north } : toPoint;
  const length = Math.hypot(vector.east, vector.north) || 1;
  return { east: vector.east / length, north: vector.north / length };
}

/**
 * Azimut de una cámara sobre el terreno real.
 *
 * `exterior` y `acceso` apuntan hacia el exterior del recinto; `interior`
 * apunta hacia el centro de la planta, igual que en el plano 2D.
 */
export function headingForCameraGeo(
  point: GeoPoint,
  polygon: readonly GeoPoint[],
  intent: CameraViewIntent,
): number {
  const outward = outwardGeoDirection(point, polygon);
  const azimuth = azimuthFromVector(outward);
  return intent === 'interior' ? normalizeDegrees(azimuth + 180) : azimuth;
}

/** Área en metros cuadrados de un polígono geográfico (shoelace planar). */
export function geoPolygonAreaSquareMeters(polygon: readonly GeoPoint[]): number {
  if (polygon.length < 3) return 0;
  const centerLatitude = polygon.reduce((sum, point) => sum + point.latitude, 0) / polygon.length;
  const longitudeScale = metersPerDegreeLongitude(centerLatitude);
  const origin = polygon[0];
  if (!origin) return 0;

  let twiceArea = 0;
  polygon.forEach((point, index) => {
    const next = polygon[(index + 1) % polygon.length];
    if (!next) return;
    const x = (point.longitude - origin.longitude) * longitudeScale;
    const y = (point.latitude - origin.latitude) * METERS_PER_DEGREE_LATITUDE;
    const nextX = (next.longitude - origin.longitude) * longitudeScale;
    const nextY = (next.latitude - origin.latitude) * METERS_PER_DEGREE_LATITUDE;
    twiceArea += x * nextY - nextX * y;
  });

  return Math.abs(twiceArea) / 2;
}
