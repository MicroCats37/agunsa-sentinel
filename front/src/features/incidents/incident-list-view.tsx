'use client';

import { DataTable, createDataTableColumns, type DataTableFilter } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { CapabilityBadge, IncidentStatusBadge, SeverityBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CAMERAS } from '@/data/cameras';
import { SECTORS } from '@/data/sectors';
import { USERS } from '@/data/users';
import { ZONES } from '@/data/zones';
import { formatDateTime } from '@/domain/clock';
import {
  INCIDENT_CATEGORY_LABEL,
  INCIDENT_CATEGORY_ORDER,
  INCIDENT_STATUS_LABEL,
  SEVERITY_LABEL,
  SEVERITY_ORDER,
} from '@/domain/labels';
import { INCIDENT_STATUSES } from '@/domain/incident-status';
import type { Incident, Severity } from '@/domain/types';
import { useCamerasStore } from '@/store/cameras-store';
import { useIncidentsStore } from '@/store/incidents-store';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

/**
 * Listado de incidentes (módulo 4 del pliego).
 *
 * La tabla es el data-table de TanStack: el orden lo decide cada columna
 * (no hay un selector de orden paralelo), la paginación es real y los filtros
 * por cámara, sector, categoría, severidad y estado son filtros de columna.
 */

/** Orden operativo de la severidad: crítica primero. */
const SEVERITY_RANK: Record<Severity, number> = { critica: 0, alta: 1, media: 2, baja: 3 };

export function IncidentListView() {
  const incidents = useIncidentsStore((state) => state.incidents);
  const overrides = useCamerasStore((state) => state.overrides);

  const cameras = useMemo(
    () =>
      CAMERAS.map((camera) => {
        const override = overrides[camera.id];
        return override ? { ...camera, ...override } : camera;
      }),
    [overrides],
  );

  const cameraNameById = useMemo(
    () => new Map(cameras.map((camera) => [camera.id, camera.name] as const)),
    [cameras],
  );
  const zoneNameById = useMemo(
    () => new Map(ZONES.map((zone) => [zone.id, zone.name] as const)),
    [],
  );
  const userNameById = useMemo(
    () => new Map(USERS.map((user) => [user.id, user.name] as const)),
    [],
  );
  const sectorNameById = useMemo(
    () => new Map(SECTORS.map((sector) => [sector.id, sector.name] as const)),
    [],
  );

  const columns = useMemo(() => {
    const helper = createDataTableColumns<Incident>();

    return helper.columns([
      helper.accessor((incident) => incident.id, {
        id: 'id',
        header: 'Incidente',
        cell: ({ row }) => (
          <>
            <Link
              href={`/incidentes/${row.original.id}`}
              className="font-medium text-info hover:underline"
              data-testid={`incident-link-${row.original.id}`}
            >
              {row.original.id}
            </Link>
            {row.original.simulated ? (
              <span className="mt-1 block text-[11px] text-warning">Origen: consola</span>
            ) : null}
          </>
        ),
      }),
      helper.accessor((incident) => Date.parse(incident.occurredAt), {
        id: 'occurredAt',
        header: 'Fecha y hora',
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {formatDateTime(row.original.occurredAt)}
          </span>
        ),
      }),
      helper.accessor((incident) => incident.cameraId, {
        id: 'camera',
        header: 'Cámara',
        filterFn: 'arrHas',
        cell: ({ row }) => (
          <>
            <span className="font-medium">{row.original.cameraId}</span>
            <span className="block max-w-[170px] truncate text-xs text-muted-foreground">
              {cameraNameById.get(row.original.cameraId) ?? '—'}
            </span>
          </>
        ),
      }),
      helper.accessor((incident) => incident.sectorId, {
        id: 'sector',
        header: 'Sector',
        filterFn: 'arrHas',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {sectorNameById.get(row.original.sectorId) ?? row.original.sectorId}
          </span>
        ),
      }),
      helper.accessor((incident) => incident.zoneId, {
        id: 'zone',
        header: 'Zona / tipo',
        cell: ({ row }) => (
          <>
            <span className="block max-w-[260px] truncate">{row.original.type}</span>
            <span className="block max-w-[260px] truncate text-xs text-muted-foreground">
              {zoneNameById.get(row.original.zoneId) ?? row.original.zoneId}
            </span>
            <CapabilityBadge capability={row.original.capability} />
          </>
        ),
      }),
      helper.accessor((incident) => incident.category, {
        id: 'category',
        header: 'Categoría',
        filterFn: 'arrHas',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {INCIDENT_CATEGORY_LABEL[row.original.category]}
          </span>
        ),
      }),
      helper.accessor((incident) => incident.severity, {
        id: 'severity',
        header: 'Severidad',
        filterFn: 'arrHas',
        sortFn: (rowA, rowB, columnId) => {
          const a = SEVERITY_RANK[rowA.getValue<Severity>(columnId)] ?? 0;
          const b = SEVERITY_RANK[rowB.getValue<Severity>(columnId)] ?? 0;
          return a - b;
        },
        cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
      }),
      helper.accessor((incident) => incident.status, {
        id: 'status',
        header: 'Estado',
        filterFn: 'arrHas',
        cell: ({ row }) => <IncidentStatusBadge status={row.original.status} />,
      }),
      helper.accessor((incident) => incident.assigneeId ?? '', {
        id: 'assignee',
        header: 'Responsable',
        cell: ({ row }) =>
          row.original.assigneeId ? (
            <span className="text-muted-foreground">
              {userNameById.get(row.original.assigneeId) ?? row.original.assigneeId}
            </span>
          ) : (
            <span className="text-muted-foreground/70">Sin asignar</span>
          ),
      }),
      helper.accessor((incident) => incident.confidence ?? -1, {
        id: 'confidence',
        header: 'Confianza',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.confidence === null
              ? '—'
              : `${Math.round(row.original.confidence * 100)}%`}
          </span>
        ),
      }),
    ]);
  }, [cameraNameById, sectorNameById, userNameById, zoneNameById]);

  const filters = useMemo<DataTableFilter[]>(
    () => [
      {
        columnId: 'camera',
        label: 'Cámara',
        options: cameras.map((camera) => ({
          value: camera.id,
          label: `${camera.id} · ${camera.name}`,
        })),
      },
      {
        columnId: 'sector',
        label: 'Sector',
        options: SECTORS.map((sector) => ({ value: sector.id, label: sector.name })),
      },
      {
        columnId: 'category',
        label: 'Categoría',
        options: INCIDENT_CATEGORY_ORDER.map((category) => ({
          value: category,
          label: INCIDENT_CATEGORY_LABEL[category],
        })),
      },
      {
        columnId: 'severity',
        label: 'Severidad',
        options: SEVERITY_ORDER.map((severity) => ({
          value: severity,
          label: SEVERITY_LABEL[severity],
        })),
      },
      {
        columnId: 'status',
        label: 'Estado',
        options: INCIDENT_STATUSES.map((status) => ({
          value: status,
          label: INCIDENT_STATUS_LABEL[status],
        })),
      },
    ],
    [cameras],
  );

  const searchText = useMemo(
    () => (incident: Incident) =>
      [
        incident.id,
        incident.type,
        incident.cameraId,
        cameraNameById.get(incident.cameraId) ?? '',
        incident.zoneId,
        zoneNameById.get(incident.zoneId) ?? '',
        incident.severity,
        incident.status,
      ].join(' '),
    [cameraNameById, zoneNameById],
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Módulo 4 · Gestión de incidentes"
        title="Incidentes y alertas"
        description="Centraliza todas las detecciones del perímetro con su evidencia, severidad, estado y responsable. Confirma, descarta, asigna y cierra cada evento."
        actions={
          <>
            <Button variant="outline" disabled title="Exportación no habilitada en esta instalación">
              <FileDown className="size-4" />
              Exportar PDF
            </Button>
            <Button variant="outline" disabled title="Exportación no habilitada en esta instalación">
              <FileSpreadsheet className="size-4" />
              Exportar Excel
            </Button>
          </>
        }
      />

      <Card size="sm" className="overflow-hidden">
        <CardContent>
          <DataTable
            data={incidents}
            columns={columns}
            getRowId={(incident) => incident.id}
            searchText={searchText}
            searchPlaceholder="Buscar por ID, cámara o tipo…"
            filters={filters}
            initialSorting={[{ id: 'occurredAt', desc: true }]}
            pageSize={10}
            noun="incidentes"
            emptyMessage="No hay incidentes que coincidan con los filtros aplicados."
          />
        </CardContent>
      </Card>
    </div>
  );
}
