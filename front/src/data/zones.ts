import { createRng, hashSeed } from '@/domain/rng';
import type { Point, Schedule, VirtualLine, Zone } from '@/domain/types';
import { CAMERAS } from './cameras';

/**
 * Zonas inteligentes y líneas virtuales.
 *
 * Los polígonos se expresan en coordenadas normalizadas (0..1) del encuadre de
 * la cámara, de modo que la misma definición sirve para el editor de zonas, el
 * feed en canvas y la superposición de líneas virtuales.
 *
 * La franja `perimetro` cubre el plano medio del encuadre — donde se mueven
 * las personas y los vehículos que circulan junto al cerco — y es la zona que
 * usa la regla de aproximación perimetral.
 */

const ALWAYS: Schedule = { start: '00:00', end: '23:59', days: [0, 1, 2, 3, 4, 5, 6] };
const NOCTURNO: Schedule = { start: '22:00', end: '06:00', days: [0, 1, 2, 3, 4, 5, 6] };

/** Cámaras con zona restringida adicional (accesos, tanques, patio). */
const RESTRICTED_CAMERAS = new Set([
  'C03',
  'C05',
  'C07',
  'C12',
  'C16',
  'C18',
  'C24',
  'C28',
  'C31',
  'C35',
]);
/** Cámaras con zona de permanencia (dwell) configurada. */
const DWELL_CAMERAS = new Set([
  'C03',
  'C05',
  'C12',
  'C15',
  'C18',
  'C20',
  'C26',
  'C30',
  'C32',
  'C35',
]);
/** Cámaras con área de vigilancia ampliada. */
const WATCH_CAMERAS = new Set(['C02', 'C04', 'C10', 'C14', 'C22', 'C27', 'C33', 'C36']);

const RESTRICTED_NAMES: Record<string, string> = {
  C03: 'Zona restringida · poste central',
  C05: 'Zona restringida · acceso a la avenida',
  C07: 'Zona restringida · tramo con postes',
  C12: 'Zona restringida · franja junto al muro',
  C16: 'Zona restringida · playón de contenedores',
  C18: 'Zona restringida · calle sin iluminar',
  C24: 'Zona restringida · paso a servicios',
  C28: 'Zona restringida · cerramiento con velo',
  C31: 'Zona restringida · área por conciliar',
  C35: 'Zona restringida · reja cercana',
};

function quad(
  left: number,
  right: number,
  top: number,
  bottom: number,
  jitter: (_edge: number) => number,
): Point[] {
  return [
    { x: left + jitter(0), y: top + jitter(1) },
    { x: right + jitter(0), y: top + jitter(1) },
    { x: right + jitter(0), y: bottom + jitter(1) },
    { x: left + jitter(0), y: bottom + jitter(1) },
  ];
}

function buildZones(): Zone[] {
  const zones: Zone[] = [];

  for (const camera of CAMERAS) {
    const rng = createRng(hashSeed(camera.id) ^ 0x9e37);
    const jitter = (_edge: number) => rng.float(-0.02, 0.02);
    const id = camera.id.toLowerCase();

    zones.push({
      id: camera.zoneId,
      name: `${camera.name} · aproximación perimetral`,
      kind: 'perimetro',
      cameraId: camera.id,
      sectorId: camera.sectorId,
      polygon: quad(0.04, 0.96, 0.58, 0.96, jitter),
      maxDwellSeconds: camera.viewIntent === 'exterior' ? 120 : 240,
      direction: null,
      schedule: ALWAYS,
      severity: 'media',
      enabled: true,
    });

    if (RESTRICTED_CAMERAS.has(camera.id)) {
      zones.push({
        id: `zn-res-${id}`,
        name: RESTRICTED_NAMES[camera.id] ?? `${camera.name} · zona restringida`,
        kind: 'restringida',
        cameraId: camera.id,
        sectorId: camera.sectorId,
        polygon: quad(0.28, 0.72, 0.18, 0.52, jitter),
        maxDwellSeconds: null,
        direction: 'entrada',
        schedule: NOCTURNO,
        severity: 'alta',
        enabled: true,
      });
    }

    if (DWELL_CAMERAS.has(camera.id)) {
      zones.push({
        id: `zn-dwl-${id}`,
        name: `${camera.name} · permanencia máxima`,
        kind: 'permanencia',
        cameraId: camera.id,
        sectorId: camera.sectorId,
        polygon: quad(0.12, 0.88, 0.3, 0.9, jitter),
        maxDwellSeconds: 120 + (camera.id.charCodeAt(2) % 3) * 90,
        direction: null,
        schedule: ALWAYS,
        severity: camera.id.charCodeAt(2) % 2 === 0 ? 'alta' : 'media',
        enabled: true,
      });
    }

    if (WATCH_CAMERAS.has(camera.id)) {
      zones.push({
        id: `zn-wat-${id}`,
        name: `${camera.name} · vigilancia ampliada`,
        kind: 'vigilancia',
        cameraId: camera.id,
        sectorId: camera.sectorId,
        polygon: quad(0.02, 0.98, 0.02, 0.98, jitter),
        maxDwellSeconds: null,
        direction: null,
        schedule: ALWAYS,
        severity: 'baja',
        enabled: camera.id.charCodeAt(2) % 4 !== 0,
      });
    }
  }

  return zones;
}

function buildVirtualLines(): VirtualLine[] {
  const lines: VirtualLine[] = [];

  for (const camera of CAMERAS) {
    const id = camera.id.toLowerCase();

    if (camera.viewIntent === 'acceso') {
      lines.push({
        id: `vl-${id}-in`,
        name: `${camera.name} · línea de ingreso`,
        cameraId: camera.id,
        from: { x: 0.12, y: 0.46 },
        to: { x: 0.88, y: 0.46 },
        direction: 'entrada',
        enabled: true,
      });
      lines.push({
        id: `vl-${id}-out`,
        name: `${camera.name} · línea de egreso`,
        cameraId: camera.id,
        from: { x: 0.12, y: 0.72 },
        to: { x: 0.88, y: 0.72 },
        direction: 'salida',
        enabled: true,
      });
      continue;
    }

    const code = camera.id.charCodeAt(2);
    if (code % 5 === 0) {
      lines.push({
        id: `vl-${id}-per`,
        name: `${camera.name} · paso perimetral`,
        cameraId: camera.id,
        from: { x: 0.08, y: 0.68 },
        to: { x: 0.92, y: 0.62 },
        direction: 'entrada',
        enabled: code % 10 !== 0,
      });
    }
  }

  return lines;
}

export const ZONES: readonly Zone[] = buildZones();
export const VIRTUAL_LINES: readonly VirtualLine[] = buildVirtualLines();

export const ZONE_BY_ID = new Map(ZONES.map((zone) => [zone.id, zone] as const));

export function getZone(zoneId: string): Zone | undefined {
  return ZONE_BY_ID.get(zoneId);
}

export function zonesForCamera(cameraId: string): Zone[] {
  return ZONES.filter((zone) => zone.cameraId === cameraId);
}

export function linesForCamera(cameraId: string): VirtualLine[] {
  return VIRTUAL_LINES.filter((line) => line.cameraId === cameraId);
}
