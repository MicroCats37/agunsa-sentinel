import type { Incident, IncidentCategory, IncidentStatus, Severity } from './types';

/** Filtros del listado de incidentes y del panel de analítica. */

export interface IncidentFilters {
  query: string;
  cameraId: string;
  zoneId: string;
  severity: Severity | 'todas';
  category: IncidentCategory | 'todas';
  status: IncidentStatus | 'todas';
  /** Límite inferior inclusivo (ISO). */
  from: string | null;
  /** Límite superior inclusivo (ISO). */
  to: string | null;
}

export const EMPTY_INCIDENT_FILTERS: IncidentFilters = {
  query: '',
  cameraId: 'todas',
  zoneId: 'todas',
  severity: 'todas',
  category: 'todas',
  status: 'todas',
  from: null,
  to: null,
};

export function countActiveFilters(filters: IncidentFilters): number {
  let count = 0;
  if (filters.query.trim().length > 0) count += 1;
  if (filters.cameraId !== 'todas') count += 1;
  if (filters.zoneId !== 'todas') count += 1;
  if (filters.severity !== 'todas') count += 1;
  if (filters.category !== 'todas') count += 1;
  if (filters.status !== 'todas') count += 1;
  if (filters.from !== null) count += 1;
  if (filters.to !== null) count += 1;
  return count;
}

export function filterIncidents(
  incidents: readonly Incident[],
  filters: IncidentFilters,
): Incident[] {
  const query = filters.query.trim().toLowerCase();
  const fromMs = filters.from ? Date.parse(filters.from) : null;
  const toMs = filters.to ? Date.parse(filters.to) : null;

  const result: Incident[] = [];
  for (const incident of incidents) {
    if (filters.cameraId !== 'todas' && incident.cameraId !== filters.cameraId) continue;
    if (filters.zoneId !== 'todas' && incident.zoneId !== filters.zoneId) continue;
    if (filters.severity !== 'todas' && incident.severity !== filters.severity) continue;
    if (filters.category !== 'todas' && incident.category !== filters.category) continue;
    if (filters.status !== 'todas' && incident.status !== filters.status) continue;

    const occurredMs = Date.parse(incident.occurredAt);
    if (fromMs !== null && occurredMs < fromMs) continue;
    if (toMs !== null && occurredMs > toMs) continue;

    if (query.length > 0) {
      const haystack =
        `${incident.id} ${incident.type} ${incident.cameraId} ${incident.zoneId}`.toLowerCase();
      if (!haystack.includes(query)) continue;
    }

    result.push(incident);
  }
  return result;
}

export type IncidentSort = 'reciente' | 'antiguo' | 'severidad' | 'confianza';

const SEVERITY_RANK: Record<Severity, number> = { critica: 0, alta: 1, media: 2, baja: 3 };

export function sortIncidents(incidents: readonly Incident[], sort: IncidentSort): Incident[] {
  const copy = [...incidents];
  switch (sort) {
    case 'reciente':
      copy.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
      break;
    case 'antiguo':
      copy.sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
      break;
    case 'severidad':
      copy.sort((a, b) => {
        const diff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
        return diff !== 0 ? diff : Date.parse(b.occurredAt) - Date.parse(a.occurredAt);
      });
      break;
    case 'confianza':
      copy.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
      break;
  }
  return copy;
}
