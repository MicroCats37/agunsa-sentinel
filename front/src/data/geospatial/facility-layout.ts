import type { GeospatialZone, GeospatialZoneKind, GeoPoint } from '@/domain/types';
import { OSM_FACILITY, OSM_ROADS } from './osm-context';
import baseline from './facility-layout.json';

/**
 * Taxonomía del editor de distribución del recinto.
 *
 * Proviene del proyecto heredado `agunsa-seguridad` y se conserva con los
 * mismos colores y alturas: son el vocabulario visual del producto para
 * distinguir volúmenes sobre el terreno.
 */
export interface DrawingType {
  id: GeospatialZoneKind;
  label: string;
  /** Altura de extrusión en metros. */
  height: number;
  color: string;
  outline: string;
}

export const DRAWING_TYPES: Readonly<Record<GeospatialZoneKind, DrawingType>> = {
  almacen: {
    id: 'almacen',
    label: 'Almacén',
    height: 9,
    color: '#c9cbc5',
    outline: '#707c7e',
  },
  oficina: {
    id: 'oficina',
    label: 'Oficina',
    height: 5.5,
    color: '#d7dde0',
    outline: '#65747b',
  },
  contenedor: {
    id: 'contenedor',
    label: 'Contenedor',
    height: 2.7,
    color: '#b54735',
    outline: '#253b43',
  },
  vehiculo: {
    id: 'vehiculo',
    label: 'Vehículo',
    height: 1.55,
    color: '#365d73',
    outline: '#f2f5f4',
  },
  verde: {
    id: 'verde',
    label: 'Área verde',
    height: 0.16,
    color: '#4d8b58',
    outline: '#d8ead9',
  },
  deteccion: {
    id: 'deteccion',
    label: 'Zona de detección',
    height: 0.4,
    color: '#2e8b83',
    outline: '#0f3f3a',
  },
};

/** Paleta de contenedores de carga. */
export const CONTAINER_COLORS: readonly string[] = [
  '#b54735',
  '#cf6b38',
  '#246b8f',
  '#2d7c69',
  '#d0a625',
  '#6d7d84',
];

/** Orden de presentación del editor de distribución. */
export const DRAWING_TYPE_ORDER: readonly GeospatialZoneKind[] = [
  'almacen',
  'oficina',
  'contenedor',
  'vehiculo',
  'verde',
  'deteccion',
];

/** Clave de almacenamiento local de la distribución editada. */
export const FACILITY_LAYOUT_STORAGE_KEY = 'agunsa-sentinel:facility-layout:v2';
/** Versión del distribución base, para detectar navegadores nuevos. */
export const FACILITY_LAYOUT_BASELINE_KEY = 'agunsa-sentinel:facility-layout:baseline';

interface BaselineArea {
  id: string;
  type: string;
  color: string;
  height: number;
  geometry: string;
  vertices: { longitude: number; latitude: number }[];
}

interface BaselineLayout {
  schema: string;
  phase: string;
  coordinateSystem: string;
  precision: string;
  exportedAt: string;
  areas: BaselineArea[];
}

const BASELINE = baseline as BaselineLayout;

/** Traduce el identificador heredado al vocabulario del dominio. */
function kindFromLegacyType(type: string): GeospatialZoneKind {
  switch (type) {
    case 'warehouse':
      return 'almacen';
    case 'office':
      return 'oficina';
    case 'container':
      return 'contenedor';
    case 'vehicle':
      return 'vehiculo';
    case 'green':
      return 'verde';
    default:
      return 'deteccion';
  }
}

/** Nombre legible de una figura del inventario de distribución. */
function nameFromKind(kind: GeospatialZoneKind, index: number): string {
  const label = DRAWING_TYPES[kind].label;
  return `${label} ${String(index + 1).padStart(2, '0')}`;
}

/**
 * Distribución base del recinto: 120 figuras de distribución más las franjas
 * de vigilancia derivadas de la geometría real.
 *
 * Es la lectura de la imagen satelital autorizada que hizo el proyecto
 * heredado: sirve de referencia inicial y **no** es apta para ingeniería.
 */
export function baselineGeospatialZones(): GeospatialZone[] {
  const counters = new Map<GeospatialZoneKind, number>();

  const distribution = BASELINE.areas
    .filter((area) => Array.isArray(area.vertices) && area.vertices.length >= 3)
    .map((area) => {
      const kind = kindFromLegacyType(area.type);
      const index = counters.get(kind) ?? 0;
      counters.set(kind, index + 1);

      const polygon: GeoPoint[] = area.vertices.map((vertex) => ({
        longitude: vertex.longitude,
        latitude: vertex.latitude,
      }));

      const type = DRAWING_TYPES[kind];
      return {
        id: area.id,
        name: nameFromKind(kind, index),
        kind,
        polygon,
        height: area.height || type.height,
        color: area.color || type.color,
        outline: type.outline,
        cameraId: null,
        enabled: true,
      } satisfies GeospatialZone;
    });

  return [...distribution, ...derivedDetectionZones()];
}

/** Versión del archivo base, para detectar la primera visita de un navegador. */
export const BASELINE_VERSION = BASELINE.exportedAt || 'agunsa-facility-layout/v2';

/**
 * Franjas de vigilancia derivadas de la geometría real.
 *
 * Cada tramo del perímetro OSM que linda con una calle real genera una zona
 * de detección: la franja exterior que la cámara perimetral debe cubrir. No
 * son zonas inventadas: salen de comparar el perímetro con la red de vías
 * abierta del entorno.
 */
export function derivedDetectionZones(): GeospatialZone[] {
  const perimeter = OSM_FACILITY.coordinates;
  if (perimeter.length < 3) return [];

  const roadMidpoints = OSM_ROADS.filter((road) => road.coordinates.length > 1).flatMap((road) => {
    const middle = road.coordinates[Math.floor(road.coordinates.length / 2)];
    if (!middle) return [];
    return [
      {
        name: road.name,
        point: { longitude: middle.longitude, latitude: middle.latitude },
      },
    ];
  });

  const zones: GeospatialZone[] = [];
  const taken: { longitude: number; latitude: number }[] = [];

  perimeter.forEach((start, index) => {
    const end = perimeter[(index + 1) % perimeter.length];
    if (!end) return;

    const midpoint = {
      longitude: (start.longitude + end.longitude) / 2,
      latitude: (start.latitude + end.latitude) / 2,
    };

    let nearest: { name: string; distance: number } | null = null;
    for (const road of roadMidpoints) {
      const latitude = (midpoint.latitude + road.point.latitude) / 2;
      const east =
        (road.point.longitude - midpoint.longitude) *
        111_320 *
        Math.cos((latitude * Math.PI) / 180);
      const north = (road.point.latitude - midpoint.latitude) * 111_320;
      const distance = Math.hypot(east, north);
      if (!nearest || distance < nearest.distance) {
        nearest = { name: road.name, distance };
      }
    }

    // Sólo los tramos que realmente lindan con una calle (menos de 90 m).
    if (!nearest || nearest.distance > 90) return;
    if (
      taken.some(
        (point) =>
          Math.hypot(point.longitude - midpoint.longitude, point.latitude - midpoint.latitude) <
          0.0004,
      )
    ) {
      return;
    }
    taken.push(midpoint);

    // Normal exterior del tramo, en metros.
    const latitude = (start.latitude + end.latitude) / 2;
    const scale = 111_320 * Math.cos((latitude * Math.PI) / 180);
    const dx = (end.longitude - start.longitude) * scale;
    const dy = (end.latitude - start.latitude) * 111_320;
    const length = Math.hypot(dx, dy) || 1;
    const normal = { east: -dy / length, north: dx / length };

    // La normal se orienta hacia fuera del centroide del perímetro.
    const center = perimeter.reduce(
      (acc, point) => ({
        longitude: acc.longitude + point.longitude / perimeter.length,
        latitude: acc.latitude + point.latitude / perimeter.length,
      }),
      { longitude: 0, latitude: 0 },
    );
    const toCenter = {
      east: (center.longitude - midpoint.longitude) * scale,
      north: (center.latitude - midpoint.latitude) * 111_320,
    };
    const outward =
      normal.east * toCenter.east + normal.north * toCenter.north < 0
        ? { east: -normal.east, north: -normal.north }
        : normal;

    const offset = (point: { longitude: number; latitude: number }, meters: number) => ({
      longitude:
        point.longitude +
        (outward.east * meters) / (111_320 * Math.cos((latitude * Math.PI) / 180)),
      latitude: point.latitude + (outward.north * meters) / 111_320,
    });

    const polygon: GeoPoint[] = [
      offset(start, 4),
      offset(end, 4),
      offset(end, 30),
      offset(start, 30),
    ];

    zones.push({
      id: `zone-vigilancia-${index + 1}`,
      name: `Zona de vigilancia · ${nearest.name}`,
      kind: 'deteccion',
      polygon,
      height: 0.4,
      color: '#2e8b83',
      outline: '#0f3f3a',
      cameraId: null,
      enabled: true,
    });
  });

  return zones;
}
