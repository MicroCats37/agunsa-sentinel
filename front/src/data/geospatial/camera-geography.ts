import { geoDistanceMeters, headingForCameraGeo, offsetMeters } from '@/domain/geography';
import type { CameraGeoPosition, CameraViewIntent, GeoPoint } from '@/domain/types';
import { COPERNICUS_TERRAIN, OSM_FACILITY } from './osm-context';

/**
 * Anclaje geográfico de las 36 cámaras del inventario.
 *
 * El informe CCTV **no** vincula ninguna IP con un poste verificado: la
 * coordenada de un equipo es una estimación cartográfica. El reparto sigue la
 * misma regla del proyecto heredado `agunsa-seguridad`: los 36 marcadores se
 * distribuyen por longitud de arco sobre el perímetro OSM real, con separación
 * uniforme y evitando amontonamientos en las esquinas agudas.
 *
 * El rumbo se deriva de la geometría: apunta al **exterior** del recinto
 * (la calle) para las cámaras de cobertura exterior y de acceso, y al centro
 * de la planta para las de cobertura interior. Es la misma regla del cono del
 * plano 2D, expresada en azimut geodésico.
 */

/** Altura sobre el nivel del mar del poste (metros). */
export const CAMERA_POST_HEIGHT_M = 7.2;

/** Identificador del polígono OSM que sirve de referencia perimetral. */
export const FACILITY_PERIMETER_ID = OSM_FACILITY.id;

/** Perímetro OSM de referencia, en WGS84. */
export const FACILITY_PERIMETER: readonly GeoPoint[] = OSM_FACILITY.coordinates.map((point) => ({
  longitude: point.longitude,
  latitude: point.latitude,
}));

/**
 * Interpola bilinealmente la malla de elevaciones de Copernicus.
 *
 * La malla es una instantánea local de 17×17 muestras sobre el barrio; sirve
 * para asentar el terreno y las instalaciones a una altura coherente.
 */
export function terrainHeightAt(latitude: number, longitude: number): number {
  const { bounds, rows, columns, heights } = COPERNICUS_TERRAIN;
  const rowPosition = ((bounds.north - latitude) / (bounds.north - bounds.south)) * (rows - 1);
  const columnPosition = ((longitude - bounds.west) / (bounds.east - bounds.west)) * (columns - 1);
  const row0 = Math.max(0, Math.min(rows - 1, Math.floor(rowPosition)));
  const column0 = Math.max(0, Math.min(columns - 1, Math.floor(columnPosition)));
  const row1 = Math.min(rows - 1, row0 + 1);
  const column1 = Math.min(columns - 1, column0 + 1);
  const rowMix = Math.max(0, Math.min(1, rowPosition - row0));
  const columnMix = Math.max(0, Math.min(1, columnPosition - column0));

  const topRow = heights[row0] ?? [];
  const bottomRow = heights[row1] ?? [];
  const top = (topRow[column0] ?? 0) * (1 - columnMix) + (topRow[column1] ?? 0) * columnMix;
  const bottom =
    (bottomRow[column0] ?? 0) * (1 - columnMix) + (bottomRow[column1] ?? 0) * columnMix;
  return top * (1 - rowMix) + bottom * rowMix;
}

interface PerimeterSegment {
  start: GeoPoint;
  end: GeoPoint;
  length: number;
}

function perimeterSegments(): PerimeterSegment[] {
  return FACILITY_PERIMETER.map((start, index) => {
    const end = FACILITY_PERIMETER[(index + 1) % FACILITY_PERIMETER.length];
    if (!end) return { start, end: start, length: 0 };
    return { start, end, length: geoDistanceMeters(start, end) };
  });
}

function pointAtPerimeterFraction(
  segments: readonly PerimeterSegment[],
  totalLength: number,
  fraction: number,
): GeoPoint {
  let targetDistance = fraction * totalLength;
  for (const segment of segments) {
    if (targetDistance <= segment.length) {
      const ratio = segment.length ? targetDistance / segment.length : 0;
      return {
        longitude:
          segment.start.longitude + (segment.end.longitude - segment.start.longitude) * ratio,
        latitude: segment.start.latitude + (segment.end.latitude - segment.start.latitude) * ratio,
      };
    }
    targetDistance -= segment.length;
  }
  return segments[0]?.start ?? { longitude: 0, latitude: 0 };
}

/**
 * Reparte los marcadores por longitud acumulada y prueba varios desfases.
 *
 * Se conserva el reparto que maximiza la distancia recta mínima entre
 * vecinos: evita amontonamientos en las esquinas agudas del polígono OSM.
 */
function provisionalPositionsOnPerimeter(count: number): GeoPoint[] {
  const segments = perimeterSegments();
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
  let bestPositions: GeoPoint[] = [];
  let bestMinimumGap = -1;

  for (let phaseIndex = 0; phaseIndex < 72; phaseIndex += 1) {
    const phase = (phaseIndex + 0.5) / 72;
    const positions = Array.from({ length: count }, (_unused, index) =>
      pointAtPerimeterFraction(segments, totalLength, (index + phase) / count),
    );
    const gaps = positions.map((position, index) =>
      geoDistanceMeters(position, positions[(index + 1) % positions.length] ?? position),
    );
    const minimumGap = gaps.length ? Math.min(...gaps) : 0;
    if (minimumGap > bestMinimumGap) {
      bestMinimumGap = minimumGap;
      bestPositions = positions;
    }
  }

  return bestPositions;
}

/** Posiciones provisionales, en el mismo orden que el inventario C01…C36. */
const PROVISIONAL_POSITIONS = provisionalPositionsOnPerimeter(36);

/**
 * Datos geográficos de una cámara del inventario.
 *
 * @param index posición en el inventario (0 para C01).
 * @param intent intención de cobertura, que decide el sentido del cono.
 */
export function geoPositionForCamera(index: number, intent: CameraViewIntent): CameraGeoPosition {
  const position = PROVISIONAL_POSITIONS[index] ?? PROVISIONAL_POSITIONS[0];
  if (!position) {
    return {
      longitude: 0,
      latitude: 0,
      height: 0,
      heading: 0,
      source: 'sin posición provisional',
    };
  }

  const ground = terrainHeightAt(position.latitude, position.longitude);

  return {
    longitude: position.longitude,
    latitude: position.latitude,
    height: ground + CAMERA_POST_HEIGHT_M,
    heading: headingForCameraGeo(position, FACILITY_PERIMETER, intent),
    source: `${FACILITY_PERIMETER_ID} · distribución uniforme provisional`,
  };
}

/**
 * Desplaza un punto geográfico en metros, respetando la escala local.
 * Lo usa la escena para derivar puntos de apoyo (muros, rótulos, cones).
 */
export function shiftMeters(origin: GeoPoint, eastMeters: number, northMeters: number): GeoPoint {
  return offsetMeters(origin, eastMeters, northMeters);
}
