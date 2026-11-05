'use client';

import { IncidentTable } from '@/components/incident-table';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CAMERAS } from '@/data/cameras';
import { USERS } from '@/data/users';
import { ZONES } from '@/data/zones';
import {
  EMPTY_INCIDENT_FILTERS,
  countActiveFilters,
  filterIncidents,
  sortIncidents,
  type IncidentFilters,
  type IncidentSort,
} from '@/domain/filters';
import {
  INCIDENT_CATEGORY_LABEL,
  INCIDENT_CATEGORY_ORDER,
  INCIDENT_STATUS_LABEL,
  SEVERITY_LABEL,
  SEVERITY_ORDER,
} from '@/domain/labels';
import { INCIDENT_STATUSES } from '@/domain/incident-status';
import { useCamerasStore } from '@/store/cameras-store';
import { useIncidentsStore } from '@/store/incidents-store';
import { FileDown, FileSpreadsheet, Filter, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';

/**
 * Listado de incidentes (módulo 4 del pliego).
 *
 * Filtros por cámara, fecha, severidad, categoría y estado, con búsqueda libre
 * y ordenación. La exportación a PDF/Excel queda señalada como no disponible.
 */
export function IncidentListView() {
  const incidents = useIncidentsStore((state) => state.incidents);
  const overrides = useCamerasStore((state) => state.overrides);

  const [filters, setFilters] = useState<IncidentFilters>(EMPTY_INCIDENT_FILTERS);
  const [sort, setSort] = useState<IncidentSort>('reciente');

  const cameras = useMemo(
    () =>
      CAMERAS.map((camera) => {
        const override = overrides[camera.id];
        return override ? { ...camera, ...override } : camera;
      }),
    [overrides],
  );

  const filtered = useMemo(
    () => sortIncidents(filterIncidents(incidents, filters), sort),
    [filters, incidents, sort],
  );

  const activeFilters = countActiveFilters(filters);

  function update<K extends keyof IncidentFilters>(key: K, value: IncidentFilters[K]): void {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Módulo 4 · Gestión de incidentes"
        title="Incidentes y alertas"
        description="Centraliza todas las detecciones del perímetro con su evidencia, severidad, estado y responsable. Confirma, descarta, asigna y cierra cada evento."
        actions={
          <>
            <Button variant="outline" disabled title="No disponible en el mockup">
              <FileDown className="size-4" />
              Exportar PDF
            </Button>
            <Button variant="outline" disabled title="No disponible en el mockup">
              <FileSpreadsheet className="size-4" />
              Exportar Excel
            </Button>
          </>
        }
      />

      <Card size="sm">
        <div className="flex flex-wrap items-center gap-3 px-(--card-spacing) py-(--card-spacing)">
          <Input
            value={filters.query}
            onChange={(event) => update('query', event.target.value)}
            placeholder="Buscar por ID, cámara o tipo…"
            className="w-[240px]"
            aria-label="Buscar incidentes"
          />

          <Select value={filters.cameraId} onValueChange={(value) => update('cameraId', value)}>
            <SelectTrigger className="w-[180px]" aria-label="Filtrar por cámara">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las cámaras</SelectItem>
              {cameras.map((camera) => (
                <SelectItem key={camera.id} value={camera.id}>
                  {camera.id} · {camera.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.severity}
            onValueChange={(value) => update('severity', value as IncidentFilters['severity'])}
          >
            <SelectTrigger className="w-[150px]" aria-label="Filtrar por severidad">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Toda severidad</SelectItem>
              {SEVERITY_ORDER.map((severity) => (
                <SelectItem key={severity} value={severity}>
                  {SEVERITY_LABEL[severity]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.category}
            onValueChange={(value) => update('category', value as IncidentFilters['category'])}
          >
            <SelectTrigger className="w-[170px]" aria-label="Filtrar por categoría">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Toda categoría</SelectItem>
              {INCIDENT_CATEGORY_ORDER.map((category) => (
                <SelectItem key={category} value={category}>
                  {INCIDENT_CATEGORY_LABEL[category]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.status}
            onValueChange={(value) => update('status', value as IncidentFilters['status'])}
          >
            <SelectTrigger className="w-[160px]" aria-label="Filtrar por estado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todo estado</SelectItem>
              {INCIDENT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {INCIDENT_STATUS_LABEL[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(value) => setSort(value as IncidentSort)}>
            <SelectTrigger className="w-[160px]" aria-label="Ordenar incidentes">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="reciente">Más recientes</SelectItem>
              <SelectItem value="antiguo">Más antiguos</SelectItem>
              <SelectItem value="severidad">Severidad</SelectItem>
              <SelectItem value="confianza">Confianza del modelo</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters(EMPTY_INCIDENT_FILTERS)}
            disabled={activeFilters === 0}
          >
            <RotateCcw />
            Limpiar
          </Button>
        </div>
      </Card>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
          <Filter className="size-3" />
          {filtered.length} de {incidents.length} incidentes
        </Badge>
        {activeFilters > 0 ? (
          <Badge variant="outline" className="border-info/40 bg-info/10 text-info">
            {activeFilters} filtro{activeFilters > 1 ? 's' : ''} activo
            {activeFilters > 1 ? 's' : ''}
          </Badge>
        ) : null}
      </div>

      <Card size="sm" className="overflow-hidden">
        <IncidentTable incidents={filtered} cameras={cameras} zones={ZONES} users={USERS} />
      </Card>
    </div>
  );
}
