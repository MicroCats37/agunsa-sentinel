import { PLAN_FENCE } from '@/data/plan';
import { CAMERA_INVENTORY, STANDARD_PENDING_ITEMS } from '@/data/camera-inventory';
import { MODEL_PROFILES } from '@/data/model-profiles';
import { SECTOR_SEGMENTS } from '@/data/sectors';
import { PLATFORM_NOW_MS } from '@/domain/clock';
import { headingForCamera } from '@/domain/facing';
import { hashSeed } from '@/domain/rng';
import type {
  Camera,
  CameraScene,
  CameraSpec,
  CameraStatus,
  Point,
} from '@/domain/types';

/**
 * Registro de las 36 cámaras evaluadas en el informe de IMUPESA.
 *
 * Cada equipo conserva su identidad real (C01…C36), su IP, su modelo de
 * inventario, el resultado de las dos pruebas, la clasificación conjunta y
 * los hallazgos originales.
 *
 * Sobre la ubicación en el plano: el informe es explícito — «No existe vínculo
 * confirmado entre los símbolos del plano y las 36 IP» — así que la posición
 * de cada cámara en el plano es **provisional**: se reparte cada sector sobre
 * un tramo del cerco y el rumbo se deriva de la normal exterior de ese tramo,
 * de modo que el cono de visión apunta hacia fuera del recinto. El
 * levantamiento de postes (fase 1 del plan) es lo que cerrará esta brecha.
 */

/** Cámaras con comportamiento intermitente documentado por el informe. */
const INTERMITTENT_CAMERAS = new Set(['C08']);

/**
 * Ubicaciones fijas para las cámaras que cubren un acceso: se separan del
 * portón principal del plano.
 */
const ACCESS_OVERRIDES: Record<string, Point> = {
  C02: { x: 545, y: 60 },
  C04: { x: 735, y: 60 },
};

export const TOTAL_CAMERAS = CAMERA_INVENTORY.length;

/** Escena del feed simulada según la intención de cobertura. */
function sceneFor(viewIntent: Camera['viewIntent']): CameraScene {
  if (viewIntent === 'acceso') return 'acceso';
  if (viewIntent === 'interior') return 'estacionamiento';
  return 'perimetro';
}

/** Estado operativo base, antes de la simulación. */
function baseStatus(cameraId: string, classification: Camera['assessment']['classification']) {
  if (classification === 'sin_imagen') return 'inactiva' as CameraStatus;
  if (INTERMITTENT_CAMERAS.has(cameraId)) return 'fallando' as CameraStatus;
  return 'activa' as CameraStatus;
}

/** Reparte las cámaras de un sector a lo largo de su tramo del cerco. */
function distribute(count: number, from: Point, to: Point): Point[] {
  if (count <= 1) return [{ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }];
  return Array.from({ length: count }, (_unused, index) => {
    const t = index / (count - 1);
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
  });
}

function buildPositions(): Map<string, Point> {
  const positions = new Map<string, Point>();

  const bySector = new Map<string, string[]>();
  for (const row of CAMERA_INVENTORY) {
    const list = bySector.get(row.sectorId) ?? [];
    list.push(row.id);
    bySector.set(row.sectorId, list);
  }

  for (const [sectorId, ids] of bySector) {
    const segment = SECTOR_SEGMENTS[sectorId] ?? SECTOR_SEGMENTS['sec-gambetta'];
    if (!segment) continue;
    const slots = distribute(ids.length, segment.from, segment.to);
    ids.forEach((id, index) => {
      const slot = slots[index];
      if (!slot) return;
      positions.set(id, ACCESS_OVERRIDES[id] ?? slot);
    });
  }

  return positions;
}

const POSITIONS = buildPositions();

function buildSpec(cameraId: string, model: string): CameraSpec {
  const profile = MODEL_PROFILES[model];
  const seed = hashSeed(cameraId);

  if (!profile) {
    return {
      model,
      formFactor: 'bullet',
      sensor: 'CMOS 1/2.7" progressive scan',
      sensorWidthMm: 5,
      resolutionWidth: 2560,
      resolutionHeight: 1440,
      fps: 25,
      subStream: '640×360',
      codec: 'H.265',
      bitrateKbps: 3072,
      lensType: 'fija',
      focalLengthMm: 3.6,
      aperture: 1.8,
      horizontalFovDeg: 69.4,
      irDistanceM: 50,
      irWavelengthNm: 850,
      smartIr: true,
      wdrDb: 120,
      dnr: true,
      poeClass: 'IEEE 802.3af Clase 3',
      ipRating: 'IP67',
      ikRating: null,
      powerDrawW: 6.5,
      powerDrawIrW: 10,
      minTempC: -30,
      maxTempC: 60,
      onvifProfiles: ['S', 'G', 'T'],
      uptimeHours: 2400 + (seed % 14_000),
      latencyMs: 160 + (seed % 260),
      signalDbm: -38 - (seed % 24),
    };
  }

  return {
    model: profile.model,
    formFactor: profile.formFactor,
    sensor: profile.sensor,
    sensorWidthMm: profile.sensorWidthMm,
    resolutionWidth: profile.resolutionWidth,
    resolutionHeight: profile.resolutionHeight,
    fps: profile.fps,
    subStream: profile.subStream,
    codec: profile.codec,
    bitrateKbps: profile.bitrateKbps,
    lensType: profile.lensType,
    focalLengthMm: profile.focalLengthMm,
    aperture: profile.aperture,
    horizontalFovDeg:
      Math.round(
        (2 * Math.atan(profile.sensorWidthMm / (2 * profile.focalLengthMm)) * 180) / Math.PI * 10,
      ) / 10,
    irDistanceM: profile.irDistanceM,
    irWavelengthNm: profile.irWavelengthNm,
    smartIr: profile.smartIr,
    wdrDb: profile.wdrDb,
    dnr: profile.dnr,
    poeClass: profile.poeClass,
    ipRating: profile.ipRating,
    ikRating: profile.ikRating,
    powerDrawW: profile.powerDrawW,
    powerDrawIrW: profile.powerDrawIrW,
    minTempC: -30,
    maxTempC: 60,
    onvifProfiles: profile.onvifProfiles,
    uptimeHours: 2400 + (seed % 14_000),
    latencyMs: 160 + (seed % 260),
    signalDbm: -38 - (seed % 24),
  };
}

function buildCameras(): Camera[] {
  return CAMERA_INVENTORY.map((row, index) => {
    const position = POSITIONS.get(row.id) ?? { x: 600, y: 60 };
    const spec = buildSpec(row.id, row.model);
    const status = baseStatus(row.id, row.classification);
    const resolution = row.receivedResolution
      ? `${row.receivedResolution.width}×${row.receivedResolution.height}`
      : 'sin imagen';

    return {
      id: row.id,
      name: row.label,
      sectorId: row.sectorId,
      zoneId: `zn-${row.id.toLowerCase()}`,
      status,
      scene: sceneFor(row.viewIntent),
      viewIntent: row.viewIntent,
      position,
      heading: headingForCamera(position, PLAN_FENCE, row.viewIntent),
      fov: spec.horizontalFovDeg,
      resolution,
      ip: row.ip,
      hasAlert: false,
      alertSeverity: null,
      lastSeen: new Date(
        PLATFORM_NOW_MS - (index % 5) * 37_000 - (row.nightResult === 'OK' ? 0 : 18 * 60_000),
      ).toISOString(),
      spec,
      assessment: {
        classification: row.classification,
        priority: row.priority,
        dayResult: row.dayResult,
        nightResult: row.nightResult,
        receivedResolution: row.receivedResolution,
        dayFinding: row.dayFinding,
        nightFinding: row.nightFinding,
        recommendedAction: row.recommendedAction,
        pendingItems: [...STANDARD_PENDING_ITEMS],
        httpError: row.httpError,
        sectorNote: row.sectorNote,
        obstructionId: row.obstructionId,
      },
      positionProvisional: true,
      simulated: false,
    };
  });
}

export const CAMERAS: readonly Camera[] = buildCameras();

export const CAMERA_BY_ID = new Map(CAMERAS.map((camera) => [camera.id, camera] as const));

export function getCamera(cameraId: string): Camera | undefined {
  return CAMERA_BY_ID.get(cameraId);
}

export function camerasBySector(sectorId: string): Camera[] {
  return CAMERAS.filter((camera) => camera.sectorId === sectorId);
}

/** Cámaras cuya ficha tiene una obstrucción documentada. */
export function camerasWithObstruction(): Camera[] {
  return CAMERAS.filter((camera) => camera.assessment.obstructionId !== null);
}
