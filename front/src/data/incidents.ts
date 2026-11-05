import { MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE, PLATFORM_NOW_MS } from '@/domain/clock';
import { createRng } from '@/domain/rng';
import type {
  CapabilityLevel,
  Incident,
  IncidentCategory,
  IncidentStatus,
  ObjectType,
  Severity,
} from '@/domain/types';
import { CAMERAS } from './cameras';
import { USERS } from './users';
import { zonesForCamera } from './zones';

/**
 * Histórico simulado de incidentes.
 *
 * Todo se genera con semilla fija a partir del instante de referencia de la
 * plataforma, de modo que el listado sea idéntico en cada carga y en cada
 * captura de pantalla.
 */

interface TypeTemplate {
  label: string;
  capability: CapabilityLevel;
}

const TYPE_TEMPLATES: Record<IncidentCategory, readonly TypeTemplate[]> = {
  persona: [
    { label: 'Persona en zona restringida', capability: 'operativo' },
    { label: 'Persona fuera de horario habitual', capability: 'operativo' },
    { label: 'Persona aproximándose al cerco', capability: 'operativo' },
    { label: 'Grupo de personas en el perímetro', capability: 'operativo' },
  ],
  vehiculo: [
    { label: 'Vehículo estacionado en zona no habitual', capability: 'operativo' },
    { label: 'Vehículo circulando en sentido contrario', capability: 'operativo' },
    { label: 'Vehículo en acceso no autorizado', capability: 'operativo' },
    { label: 'Vehículo aproximándose a instalación sensible', capability: 'operativo' },
    { label: 'Lectura de matrícula (módulo opcional)', capability: 'opcional' },
  ],
  permanencia: [
    { label: 'Permanencia prolongada de persona', capability: 'operativo' },
    { label: 'Vehículo permanece más de lo permitido', capability: 'operativo' },
    { label: 'Merodeo: pasadas repetidas por el sector', capability: 'operativo' },
  ],
  comportamiento: [
    { label: 'Trayectoria de desplazamiento irregular', capability: 'operativo' },
    { label: 'Corrida en zona sin tránsito', capability: 'operativo' },
    { label: 'Posible escalamiento de cerco', capability: 'avanzada' },
    { label: 'Posible manipulación de barrera o cerradura', capability: 'avanzada' },
    { label: 'Posible acción de vandalismo', capability: 'avanzada' },
  ],
  acceso: [
    { label: 'Cruce de línea virtual de ingreso', capability: 'operativo' },
    { label: 'Cruce de línea virtual de egreso', capability: 'operativo' },
    { label: 'Ingreso a área restringida', capability: 'operativo' },
  ],
  falla_camara: [
    { label: 'Pérdida de conexión con la cámara', capability: 'operativo' },
    { label: 'Obstrucción del lente', capability: 'operativo' },
    { label: 'Imagen congelada', capability: 'operativo' },
    { label: 'Cambio abrupto del encuadre', capability: 'operativo' },
    { label: 'Falla de transmisión de vídeo', capability: 'operativo' },
  ],
};

const CATEGORY_WEIGHTS: readonly [IncidentCategory, number][] = [
  ['persona', 0.24],
  ['vehiculo', 0.21],
  ['permanencia', 0.18],
  ['acceso', 0.16],
  ['comportamiento', 0.13],
  ['falla_camara', 0.08],
];

const SEVERITY_BY_CATEGORY: Record<IncidentCategory, readonly Severity[]> = {
  persona: ['alta', 'media', 'media', 'baja', 'critica'],
  vehiculo: ['media', 'media', 'baja', 'alta', 'critica'],
  permanencia: ['media', 'alta', 'baja', 'media'],
  comportamiento: ['alta', 'critica', 'media', 'alta'],
  acceso: ['alta', 'critica', 'media'],
  falla_camara: ['alta', 'media', 'critica', 'media'],
};

const NOTE_TEXTS: readonly string[] = [
  'Se contacta a la guardia del turno para verificación en campo.',
  'Revisión de evidencia visual: se confirma el objeto en el encuadre.',
  'El responsable del turno valida el acceso con el registro de entradas.',
  'Se solicita apoyo de la brigada y se abre seguimiento operativo.',
  'Registro tomado en horario de baja actividad, se mantiene en observación.',
  'Falso positivo: sombra de estructura, no se escala.',
];

const TOTAL_INCIDENTS = 58;

/** Cámaras que arrancan con alerta activa (coinciden con `data/cameras.ts`). */
const ALERT_CAMERA_IDS = ['CAM-03', 'CAM-09', 'CAM-17', 'CAM-25'] as const;

function pickCategory(r: number): IncidentCategory {
  let acc = 0;
  for (const [category, weight] of CATEGORY_WEIGHTS) {
    acc += weight;
    if (r <= acc) return category;
  }
  return 'persona';
}

function resolveStatus(ageHours: number, r: number): IncidentStatus {
  if (ageHours > 72) {
    if (r < 0.8) return 'resuelto';
    if (r < 0.92) return 'descartado';
    return 'confirmado';
  }
  if (ageHours > 24) {
    if (r < 0.5) return 'resuelto';
    if (r < 0.7) return 'descartado';
    if (r < 0.85) return 'confirmado';
    if (r < 0.93) return 'en_atencion';
    return 'en_revision';
  }
  if (r < 0.3) return 'resuelto';
  if (r < 0.45) return 'descartado';
  if (r < 0.7) return 'confirmado';
  if (r < 0.82) return 'en_atencion';
  if (r < 0.92) return 'en_revision';
  return 'nuevo';
}

function resolveObjectType(category: IncidentCategory, r: number): ObjectType {
  switch (category) {
    case 'persona':
    case 'comportamiento':
      return 'persona';
    case 'vehiculo':
      return 'vehiculo';
    case 'permanencia':
      return r < 0.55 ? 'persona' : 'vehiculo';
    case 'acceso':
      return r < 0.82 ? 'persona' : 'vehiculo';
    case 'falla_camara':
      return 'persona';
  }
}

function buildIncidents(): Incident[] {
  const rng = createRng(0x1c_9d_7e);
  const incidents: Incident[] = [];

  for (let i = 0; i < TOTAL_INCIDENTS; i++) {
    const id = `INC-${String(i + 1).padStart(4, '0')}`;
    const isAlertSeed = i < ALERT_CAMERA_IDS.length;
    const alertCameraId = ALERT_CAMERA_IDS[i];

    const camera = isAlertSeed
      ? CAMERAS.find((item) => item.id === alertCameraId)
      : rng.pick(CAMERAS);
    if (!camera) continue;

    const offsetMinutes = isAlertSeed
      ? 12 + i * 37 + rng.int(0, 25)
      : Math.floor(Math.pow(rng.next(), 2.15) * 14 * 24 * 60) + 2;
    const occurredAtMs = PLATFORM_NOW_MS - offsetMinutes * MS_PER_MINUTE;
    const ageHours = offsetMinutes / 60;

    const category = isAlertSeed
      ? i === 3
        ? 'falla_camara'
        : i === 1
          ? 'vehiculo'
          : 'persona'
      : pickCategory(rng.next());

    const templates = TYPE_TEMPLATES[category];
    const template = rng.pick(templates);

    const severity = isAlertSeed
      ? i === 1
        ? 'critica'
        : i === 3
          ? 'alta'
          : 'media'
      : rng.pick(SEVERITY_BY_CATEGORY[category]);

    const objectType = resolveObjectType(category, rng.next());
    const objectCount =
      category === 'falla_camara' ? 0 : objectType === 'vehiculo' ? rng.int(1, 2) : rng.int(1, 4);

    const confidence =
      category === 'falla_camara' ? null : Number(rng.float(0.58, 0.99).toFixed(3));

    const status = isAlertSeed
      ? i === 0
        ? 'nuevo'
        : i === 1
          ? 'en_revision'
          : i === 2
            ? 'confirmado'
            : 'en_atencion'
      : resolveStatus(ageHours, rng.next());

    const candidateZones = zonesForCamera(camera.id);
    const preferredZone =
      category === 'acceso' || category === 'permanencia'
        ? candidateZones.find((zone) => zone.kind === 'restringida' || zone.kind === 'permanencia')
        : candidateZones.find((zone) => zone.kind === 'perimetro');
    const zone = preferredZone ?? candidateZones[0];
    const zoneId = zone?.id ?? camera.zoneId;

    const hasAssignee = status !== 'nuevo' && !(status === 'en_revision' && rng.chance(0.4));
    const assigneeId = hasAssignee ? rng.pick(USERS).id : null;

    const noteCount =
      status === 'nuevo' ? 0 : status === 'en_revision' ? (rng.chance(0.5) ? 1 : 0) : rng.int(1, 3);

    const notes = Array.from({ length: noteCount }, (_, noteIndex) => {
      const at = new Date(
        occurredAtMs + (12 + noteIndex * rng.int(9, 40)) * MS_PER_MINUTE,
      ).toISOString();
      const author = assigneeId ?? rng.pick(USERS).id;
      return { at, authorId: author, text: rng.pick(NOTE_TEXTS) };
    });

    incidents.push({
      id,
      occurredAt: new Date(occurredAtMs).toISOString(),
      cameraId: camera.id,
      zoneId,
      sectorId: camera.sectorId,
      category,
      type: template.label,
      severity,
      capability: template.capability,
      objectType,
      objectCount,
      confidence,
      status,
      assigneeId,
      notes,
      hasVideoClip: category !== 'falla_camara' || rng.chance(0.4),
      clipDurationSec: rng.int(8, 45),
      simulated: false,
    });
  }

  incidents.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
  return incidents;
}

export const INCIDENTS: readonly Incident[] = buildIncidents();

/** Incidentes de las últimas 24 horas, base de los indicadores del dashboard. */
export function recentIncidents(hours = 24): Incident[] {
  const cutoff = PLATFORM_NOW_MS - hours * MS_PER_HOUR;
  return INCIDENTS.filter((incident) => Date.parse(incident.occurredAt) >= cutoff);
}

/** Ventana de 14 días usada por los gráficos de la analítica. */
export const ANALYTICS_WINDOW_DAYS = 14;

export function analyticsWindowIncidents(): Incident[] {
  const cutoff = PLATFORM_NOW_MS - ANALYTICS_WINDOW_DAYS * MS_PER_DAY;
  return INCIDENTS.filter((incident) => Date.parse(incident.occurredAt) >= cutoff);
}
