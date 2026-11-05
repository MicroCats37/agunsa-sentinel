import { CAMERAS } from '@/data/cameras';
import { zonesForCamera } from '@/data/zones';
import type { Camera, Incident, ObjectType, Severity } from '@/domain/types';
import { useActivityStore } from '@/store/activity-store';
import { useCamerasStore } from '@/store/cameras-store';
import { useIncidentsStore } from '@/store/incidents-store';

/**
 * Motor de detecciones de la operación en vivo.
 *
 * Aquí el azar es deliberado y es la única excepción del proyecto: el resto de
 * la plataforma usa `domain/rng.ts` con semillas fijas para que el histórico
 * sea reproducible, pero una sala de control real no repite la misma secuencia
 * de detecciones. El azar sólo afecta a las alertas **nuevas**: el histórico
 * cargado, los indicadores y las tablas no se tocan.
 */

/** Familias de detección que el motor de reglas emite en operación. */
type LiveCategory = 'persona' | 'vehiculo' | 'falla_camara';

/** Peso de cada familia: las detecciones de objeto domina, la falla es sporadica. */
const LIVE_CATEGORIES: readonly (readonly [LiveCategory, number])[] = [
  ['persona', 0.46],
  ['vehiculo', 0.39],
  ['falla_camara', 0.15],
];

/** Descripción del evento por familia: el mismo vocabulario que el histórico. */
const LIVE_TYPES: Record<LiveCategory, readonly string[]> = {
  persona: [
    'Persona en zona restringida',
    'Persona fuera de horario habitual',
    'Persona aproximándose al cerco',
    'Presencia de persona en el perímetro',
  ],
  vehiculo: [
    'Vehículo estacionado en zona no habitual',
    'Vehículo circulando en sentido contrario',
    'Vehículo en acceso no autorizado',
    'Vehículo aproximándose a instalación sensible',
  ],
  falla_camara: [
    'Pérdida de conexión con la cámara',
    'Imagen congelada',
    'Falla de transmisión de vídeo',
  ],
};

/** Severidad por familia: predominan baja y media; crítica es la excepción. */
const LIVE_SEVERITIES: Record<LiveCategory, readonly (readonly [Severity, number])[]> = {
  persona: [
    ['media', 0.38],
    ['baja', 0.3],
    ['alta', 0.24],
    ['critica', 0.08],
  ],
  vehiculo: [
    ['media', 0.4],
    ['baja', 0.34],
    ['alta', 0.2],
    ['critica', 0.06],
  ],
  falla_camara: [
    ['alta', 0.46],
    ['media', 0.34],
    ['critica', 0.2],
  ],
};

/** Etiqueta corta de la familia, para el anuncio de la alerta. */
const DETECTION_LABEL: Record<LiveCategory, string> = {
  persona: 'Persona detectada',
  vehiculo: 'Vehículo detectado',
  falla_camara: 'Fallo de cámara',
};

/** Rutas donde el operador está realmente mirando: sólo ahí llegan alertas. */
const OPERATIONAL_ROUTES: readonly string[] = ['/dashboard', '/monitoreo'];

/** Intervalo mínimo entre dos detecciones consecutivas, en milisegundos. */
export const MIN_ALERT_DELAY_MS = 4_000;
/** Intervalo máximo entre dos detecciones consecutivas, en milisegundos. */
export const MAX_ALERT_DELAY_MS = 18_000;

/** Una detección emitida por el motor en vivo. */
export interface LiveAlert {
  incident: Incident;
  camera: Camera;
  /** Etiqueta corta de la familia detectada: "Persona detectada". */
  detection: string;
}

/** Número aleatorio en [0, 1). */
function roll(): number {
  return Math.random();
}

/** Elige una opción según su peso acumulado. */
function pickWeighted<T>(entries: readonly (readonly [T, number])[], value: number): T {
  let accumulated = 0;
  for (const [item, weight] of entries) {
    accumulated += weight;
    if (value <= accumulated) return item;
  }
  const last = entries.at(-1);
  if (!last) throw new Error('pickWeighted necesita al menos una opción');
  return last[0];
}

/**
 * Intervalo hasta la siguiente detección.
 *
 * Nunca es fijo: la detección suele llegar en pocos segundos y de vez en
 * cuando hay una ventana más larga sin actividad, como en un turno real.
 */
export function nextAlertDelayMs(): number {
  const value = roll();
  if (value < 0.55) {
    return MIN_ALERT_DELAY_MS + Math.floor(roll() * 5_000);
  }
  if (value < 0.85) {
    return 7_000 + Math.floor(roll() * 6_000);
  }
  return 10_000 + Math.floor(roll() * (MAX_ALERT_DELAY_MS - 10_000));
}

/** `true` cuando la ruta es de operación: el dashboard y el centro de monitoreo. */
export function isOperationalRoute(pathname: string): boolean {
  return OPERATIONAL_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/**
 * Cámara donde se produce la detección.
 *
 * Se descartan las que no tienen imagen: un equipo sin señal no puede
 * detectar nada. El resto del inventario entra en el sorteo.
 */
function pickCamera(): Camera {
  const operational = CAMERAS.filter((camera) => camera.status !== 'inactiva');
  const pool = operational.length > 0 ? operational : CAMERAS;
  const camera = pool[Math.floor(roll() * pool.length)];
  if (!camera) throw new Error('El inventario de cámaras está vacío');
  return camera;
}

/** Familia de detección de la alerta. */
function pickCategory(): LiveCategory {
  return pickWeighted(LIVE_CATEGORIES, roll());
}

/** Severidad de la alerta, con el peso propio de su familia. */
function pickSeverity(category: LiveCategory): Severity {
  return pickWeighted(LIVE_SEVERITIES[category], roll());
}

/** Descripción del evento. */
function pickType(category: LiveCategory): string {
  const templates = LIVE_TYPES[category];
  const type = templates[Math.floor(roll() * templates.length)];
  if (!type) throw new Error('La familia de detección no tiene plantillas');
  return type;
}

/** Zona donde se registra la detección, según el encuadre de la cámara. */
function pickZoneId(camera: Camera, category: LiveCategory): string {
  const candidates = zonesForCamera(camera.id);
  const preferred =
    category === 'falla_camara'
      ? candidates.find((zone) => zone.kind === 'perimetro')
      : (candidates.find((zone) => zone.kind === 'restringida') ??
        candidates.find((zone) => zone.kind === 'perimetro'));
  return (preferred ?? candidates[0])?.id ?? camera.zoneId;
}

/**
 * Emite una detección y la registra en la plataforma.
 *
 * El incidente se crea con la misma forma que el resto del histórico y entra
 * en el store de incidentes: el dashboard, la bandeja de alertas, el listado
 * y el mapa se actualizan solos, sin ningún cableado adicional. La cámara
 * afectada pasa a estado de alerta y la detección queda en la auditoría.
 */
export function createLiveAlert(occurredAtMs: number): LiveAlert {
  const incidents = useIncidentsStore.getState();
  const sequence = incidents.simulatedCounter + 1;

  const camera = pickCamera();
  const category = pickCategory();
  const severity = pickSeverity(category);
  const type = pickType(category);
  const objectType: ObjectType = category === 'vehiculo' ? 'vehiculo' : 'persona';
  const objectCount =
    category === 'falla_camara'
      ? 0
      : objectType === 'vehiculo'
        ? 1 + Math.floor(roll() * 2)
        : 1 + Math.floor(roll() * 3);
  const confidence =
    category === 'falla_camara' ? null : Number((0.62 + roll() * 0.36).toFixed(3));
  const occurredAt = new Date(occurredAtMs).toISOString();

  const incident: Incident = {
    id: `INC-OP-${String(sequence).padStart(4, '0')}`,
    occurredAt,
    cameraId: camera.id,
    zoneId: pickZoneId(camera, category),
    sectorId: camera.sectorId,
    category,
    type,
    severity,
    capability: 'operativo',
    objectType,
    objectCount,
    confidence,
    status: 'nuevo',
    assigneeId: null,
    notes: [],
    hasVideoClip: category !== 'falla_camara',
    clipDurationSec: category === 'falla_camara' ? 0 : 18 + Math.floor(roll() * 22),
    simulated: true,
  };

  incidents.addIncident(incident);

  // La cámara afectada queda marcada: el centro de monitoreo la muestra en
  // alerta y el mapa la resalta, igual que con una detección forzada.
  const cameras = useCamerasStore.getState();
  cameras.setOverride(camera.id, {
    status: category === 'falla_camara' ? 'fallando' : 'alerta',
    alertSeverity: severity,
    hasAlert: category !== 'falla_camara',
    lastSeen: occurredAt,
  });
  cameras.setHighlight(camera.id);

  useActivityStore.getState().log({
    at: occurredAt,
    actorId: 'usr-004',
    action: 'Detección automática',
    target: `${incident.id} · ${camera.id}`,
    detail: type,
    kind: 'sistema',
  });

  return { incident, camera, detection: DETECTION_LABEL[category] };
}
