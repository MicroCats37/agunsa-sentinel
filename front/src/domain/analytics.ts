import { dayLabel, dayStartIso, minutesOfDay, MS_PER_DAY, PLATFORM_NOW_MS } from './clock';
import { isIncidentActive } from './incident-status';
import type { Camera, Incident, Severity, Zone } from './types';

/**
 * Agregaciones analíticas puras. Reciben incidentes ya filtrados y devuelven
 * series listas para graficar; no conocen estado de UI ni formato de color.
 */

export interface NamedCount {
  key: string;
  label: string;
  total: number;
}

export function incidentsByHour(incidents: readonly Incident[]): NamedCount[] {
  const buckets = new Array<number>(24).fill(0);
  for (const incident of incidents) {
    const hour = Math.floor(minutesOfDay(incident.occurredAt) / 60);
    buckets[hour] = (buckets[hour] ?? 0) + 1;
  }
  return buckets.map((total, hour) => ({
    key: String(hour).padStart(2, '0'),
    label: `${String(hour).padStart(2, '0')}:00`,
    total,
  }));
}

export function incidentsByDay(incidents: readonly Incident[], days: number): NamedCount[] {
  const today = dayStartIso(new Date(PLATFORM_NOW_MS).toISOString());
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const iso = new Date(Date.parse(today) - i * MS_PER_DAY).toISOString();
    buckets.set(iso, 0);
  }
  for (const incident of incidents) {
    const key = dayStartIso(incident.occurredAt);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()].map(([key, total]) => ({ key, label: dayLabel(key), total }));
}

export function incidentsByCategory(incidents: readonly Incident[]): NamedCount[] {
  const buckets = new Map<string, number>();
  for (const incident of incidents) {
    buckets.set(incident.category, (buckets.get(incident.category) ?? 0) + 1);
  }
  return [...buckets.entries()].map(([key, total]) => ({ key, label: key, total }));
}

export function incidentsByZone(
  incidents: readonly Incident[],
  zones: readonly Zone[],
): NamedCount[] {
  const labelById = new Map(zones.map((zone) => [zone.id, zone.name] as const));
  const buckets = new Map<string, number>();
  for (const incident of incidents) {
    const key = incident.zoneId;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .map(([key, total]) => ({ key, label: labelById.get(key) ?? key, total }))
    .sort((a, b) => b.total - a.total);
}

export function incidentsBySector(
  incidents: readonly Incident[],
  sectors: readonly { id: string; name: string }[],
): NamedCount[] {
  const labelById = new Map(sectors.map((sector) => [sector.id, sector.name] as const));
  const buckets = new Map<string, number>();
  for (const incident of incidents) {
    buckets.set(incident.sectorId, (buckets.get(incident.sectorId) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .map(([key, total]) => ({ key, label: labelById.get(key) ?? key, total }))
    .sort((a, b) => b.total - a.total);
}

export function topCamerasByIncidents(
  incidents: readonly Incident[],
  cameras: readonly Camera[],
  limit: number,
): NamedCount[] {
  const labelById = new Map(cameras.map((camera) => [camera.id, camera.name] as const));
  const buckets = new Map<string, number>();
  for (const incident of incidents) {
    buckets.set(incident.cameraId, (buckets.get(incident.cameraId) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .map(([key, total]) => ({ key, label: `${key} · ${labelById.get(key) ?? ''}`, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export function severityBreakdown(incidents: readonly Incident[]): NamedCount[] {
  const order: Severity[] = ['critica', 'alta', 'media', 'baja'];
  const buckets = new Map<Severity, number>();
  for (const incident of incidents) {
    buckets.set(incident.severity, (buckets.get(incident.severity) ?? 0) + 1);
  }
  return order.map((key) => ({ key, label: key, total: buckets.get(key) ?? 0 }));
}

export interface ResolutionSummary {
  confirmados: number;
  descartados: number;
  abiertos: number;
  resueltos: number;
  total: number;
}

export function resolutionSummary(incidents: readonly Incident[]): ResolutionSummary {
  let confirmados = 0;
  let descartados = 0;
  let resueltos = 0;
  let abiertos = 0;
  for (const incident of incidents) {
    if (incident.status === 'confirmado') confirmados += 1;
    else if (incident.status === 'descartado') descartados += 1;
    else if (incident.status === 'resuelto') resueltos += 1;
    if (isIncidentActive(incident.status)) abiertos += 1;
  }
  return { confirmados, descartados, abiertos, resueltos, total: incidents.length };
}

/**
 * Tiempo medio de atención: desde la creación del incidente hasta su cierre
 * (confirmado + en atención + resuelto). Los incidentes aún abiertos se excluyen
 * del promedio para no sesgar la métrica.
 */
export function meanResponseMinutes(incidents: readonly Incident[]): number {
  const closed = incidents.filter(
    (incident) => incident.status === 'resuelto' || incident.status === 'confirmado',
  );
  if (closed.length === 0) return 0;
  const total = closed.reduce((sum, incident) => {
    const created = Date.parse(incident.occurredAt);
    const last = incident.notes.at(-1);
    const closedAt = last ? Date.parse(last.at) : created + 20 * 60_000;
    return sum + Math.max(0, closedAt - created);
  }, 0);
  return Math.round(total / closed.length / 60_000);
}

/** Zonas con mayor concentración de incidentes, normalizado 0..1 para el mapa. */
export function zoneDensity(
  incidents: readonly Incident[],
  zones: readonly Zone[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const incident of incidents) {
    counts.set(incident.zoneId, (counts.get(incident.zoneId) ?? 0) + 1);
  }
  const max = Math.max(1, ...counts.values());
  const density = new Map<string, number>();
  for (const zone of zones) {
    density.set(zone.id, (counts.get(zone.id) ?? 0) / max);
  }
  return density;
}

/**
 * Serie horaria para las minigráficas de los tiles.
 *
 * Devuelve el número de incidentes que cumplen el filtro en cada una de las
 * últimas `hours` horas, terminando en el instante de referencia de la
 * plataforma.
 */
export function hourlySeries(
  incidents: readonly Incident[],
  hours: number,
  filter?: (incident: Incident) => boolean,
): number[] {
  const buckets = new Array<number>(hours).fill(0);
  const end = PLATFORM_NOW_MS;
  const start = end - hours * 3_600_000;

  for (const incident of incidents) {
    if (filter && !filter(incident)) continue;
    const at = Date.parse(incident.occurredAt);
    if (at < start || at > end) continue;
    const index = Math.min(hours - 1, Math.floor((at - start) / 3_600_000));
    buckets[index] = (buckets[index] ?? 0) + 1;
  }

  return buckets;
}

/** Estado del streaming de vídeo agrupado por sector. */
export interface SectorStreamingStatus {
  sectorId: string;
  name: string;
  total: number;
  activas: number;
  alerta: number;
  fallando: number;
  inactiva: number;
  /** Flujo agregado estimado, en Mbps. */
  bitrateMbps: number;
}

export function streamingStatusBySector(
  cameras: readonly Camera[],
  sectors: readonly { id: string; name: string }[],
): SectorStreamingStatus[] {
  return sectors.map((sector) => {
    const own = cameras.filter((camera) => camera.sectorId === sector.id);
    const sum = (predicate: (camera: Camera) => boolean): number => own.filter(predicate).length;
    const bitrateMbps =
      own.reduce((total, camera) => total + camera.spec.bitrateKbps / 1000, 0) / 8;

    return {
      sectorId: sector.id,
      name: sector.name,
      total: own.length,
      activas: sum((camera) => camera.status === 'activa'),
      alerta: sum((camera) => camera.status === 'alerta'),
      fallando: sum((camera) => camera.status === 'fallando'),
      inactiva: sum((camera) => camera.status === 'inactiva'),
      bitrateMbps: Math.round(bitrateMbps * 10) / 10,
    };
  });
}

/** Carga de inferencia simulada por cámara. */
export interface InferenceLoad {
  cameraId: string;
  name: string;
  /** Carga relativa 0..1. */
  load: number;
  /** Detecciones registradas en las últimas 24 h. */
  detections: number;
  /** Flujo de vídeo que alimenta el modelo, en Mbps. */
  streamMbps: number;
}

export function inferenceLoadByCamera(
  cameras: readonly Camera[],
  incidents: readonly Incident[],
  limit: number,
): InferenceLoad[] {
  const cutoff = PLATFORM_NOW_MS - MS_PER_DAY;
  const detections = new Map<string, number>();
  for (const incident of incidents) {
    if (Date.parse(incident.occurredAt) < cutoff) continue;
    detections.set(
      incident.cameraId,
      (detections.get(incident.cameraId) ?? 0) + incident.objectCount,
    );
  }

  const rows = cameras.map((camera) => {
    const count = detections.get(camera.id) ?? 0;
    const streamMbps = Math.round((camera.spec.bitrateKbps / 1000 / 8) * 10) / 10;
    // La carga combina el caudal de vídeo y la densidad de detecciones.
    const raw = streamMbps * 4 + count * 12 + (camera.hasAlert ? 18 : 0);
    return { cameraId: camera.id, name: camera.name, raw, detections: count, streamMbps };
  });

  const max = Math.max(1, ...rows.map((row) => row.raw));

  return rows
    .sort((a, b) => b.raw - a.raw)
    .slice(0, limit)
    .map((row) => ({
      cameraId: row.cameraId,
      name: row.name,
      detections: row.detections,
      streamMbps: row.streamMbps,
      load: Math.round((row.raw / max) * 100) / 100,
    }));
}
