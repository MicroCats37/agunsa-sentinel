import { FACILITY_BLOCKOUT } from '@/data/geospatial/facility-blockout';
import { terrainHeightAt } from '@/data/geospatial/camera-geography';
import type { GeoPoint } from '@/domain/types';

/**
 * Utilidades geométricas de la escena geoespacial.
 *
 * Convierte entre el sistema local de la instalación (metros Este/Norte
 * respecto del centro de trabajo, la misma convención que el blockout 3A) y
 * coordenadas geodésicas WGS84.
 */

/** Origen local del blockout: coincide con el centro de la instantánea OSM. */
export const FACILITY_ORIGIN = FACILITY_BLOCKOUT.metadata.origin;

/** Altura del terreno bajo el centro de la instalación (metros). */
export const FACILITY_GROUND_HEIGHT = terrainHeightAt(
  FACILITY_ORIGIN.latitude,
  FACILITY_ORIGIN.longitude,
);

/** Convierte metros locales (Este/Norte) a coordenadas WGS84. */
export function localToGeographic(
  east: number,
  north: number,
  height = 0,
): GeoPoint & { height: number } {
  const latitude = FACILITY_ORIGIN.latitude + north / 111_320;
  const longitude =
    FACILITY_ORIGIN.longitude +
    east / (111_320 * Math.cos((FACILITY_ORIGIN.latitude * Math.PI) / 180));
  return { longitude, latitude, height };
}

/** Longitud de un segmento en metros sobre el terreno. */
export function segmentLengthMeters(a: GeoPoint, b: GeoPoint): number {
  const latitude = (a.latitude + b.latitude) / 2;
  const east = (b.longitude - a.longitude) * 111_320 * Math.cos((latitude * Math.PI) / 180);
  const north = (b.latitude - a.latitude) * 111_320;
  return Math.hypot(east, north);
}
