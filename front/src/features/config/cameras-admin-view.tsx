'use client';

import { DataTable, createDataTableColumns } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { CameraStatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CLASSIFICATION_SUMMARY } from '@/data/camera-inventory';
import { CAMERAS } from '@/data/cameras';
import { SECTORS } from '@/data/sectors';
import { formatDateTime } from '@/domain/clock';
import { CLASSIFICATION_LABEL } from '@/domain/labels';
import type { Camera, CameraClassification, CameraStatus } from '@/domain/types';
import { useCamerasStore } from '@/store/cameras-store';
import { useIncidentsStore } from '@/store/incidents-store';
import { Cpu, HardDrive, Network, Server } from 'lucide-react';
import { useMemo, useState } from 'react';
import Link from 'next/link';

/**
 * Administración de cámaras (módulo 8 del pliego).
 *
 * El registro es el inventario real evaluado en el informe: 36 IP con su
 * modelo, su sector documental y —la columna que ordena la lectura— la
 * **clasificación conjunta** con la paleta del cliente (verde = buena
 * general, ámbar = limitada, rojo = deficiente, gris = sin imagen).
 *
 * La tabla es el data-table de TanStack: orden por columna, columnas
 * ocultables y paginación de 10 filas. Los dos select de filtro (sector y
 * clasificación) siguen en la vista y escriben en el estado de filtros de
 * columna de la tabla.
 */

/** Orden del informe: primero lo que peor está. */
const CLASSIFICATION_RANK: Record<CameraClassification, number> = {
  deficiente: 0,
  limitada: 1,
  sin_imagen: 2,
  buena_general: 3,
};

/** Orden operativo del estado de la cámara: primero las que avisan. */
const STATUS_RANK: Record<CameraStatus, number> = {
  alerta: 0,
  fallando: 1,
  activa: 2,
  inactiva: 3,
};

export function CamerasAdminView() {
  const overrides = useCamerasStore((state) => state.overrides);
  const incidents = useIncidentsStore((state) => state.incidents);
  const [sectorFilter, setSectorFilter] = useState('todos');
  const [classificationFilter, setClassificationFilter] = useState('todas');

  const cameras = useMemo<Camera[]>(
    () =>
      CAMERAS.map((camera) => {
        const override = overrides[camera.id];
        return override ? { ...camera, ...override } : camera;
      }),
    [overrides],
  );

  const incidentCountByCamera = useMemo(() => {
    const counts = new Map<string, number>();
    for (const incident of incidents) {
      counts.set(incident.cameraId, (counts.get(incident.cameraId) ?? 0) + 1);
    }
    return counts;
  }, [incidents]);

  const classificationCounts = useMemo(() => {
    const counts = new Map<CameraClassification, number>();
    for (const camera of cameras) {
      const key = camera.assessment.classification;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [cameras]);

  const sectorNameById = useMemo(
    () => new Map(SECTORS.map((sector) => [sector.id, sector.name] as const)),
    [],
  );

  const sectorCodeById = useMemo(
    () => new Map(SECTORS.map((sector) => [sector.id, sector.code] as const)),
    [],
  );

  const columns = useMemo(() => {
    const helper = createDataTableColumns<Camera>();

    return helper.columns([
      helper.accessor((camera) => camera.id, {
        id: 'id',
        header: 'ID',
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            <Link
              href={`/monitoreo/${row.original.id}`}
              className="hover:text-info hover:underline"
            >
              {row.original.id}
            </Link>
          </span>
        ),
      }),
      helper.accessor((camera) => camera.name, {
        id: 'name',
        header: 'Nombre',
      }),
      helper.accessor((camera) => camera.sectorId, {
        id: 'sector',
        header: 'Sector',
        filterFn: 'arrHas',
        sortFn: (rowA, rowB, columnId) => {
          const a = sectorCodeById.get(rowA.getValue<string>(columnId)) ?? '';
          const b = sectorCodeById.get(rowB.getValue<string>(columnId)) ?? '';
          return a.localeCompare(b);
        },
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {sectorNameById.get(row.original.sectorId) ?? row.original.sectorId}
          </span>
        ),
      }),
      helper.accessor((camera) => camera.assessment.classification, {
        id: 'classification',
        header: 'Clasificación',
        filterFn: 'arrHas',
        sortFn: (rowA, rowB, columnId) => {
          const a = CLASSIFICATION_RANK[rowA.getValue<CameraClassification>(columnId)] ?? 0;
          const b = CLASSIFICATION_RANK[rowB.getValue<CameraClassification>(columnId)] ?? 0;
          return a - b;
        },
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5 text-xs">
            <ClassificationDot classification={row.original.assessment.classification} />
            {CLASSIFICATION_LABEL[row.original.assessment.classification]}
          </span>
        ),
      }),
      helper.accessor((camera) => camera.assessment.priority, {
        id: 'priority',
        header: 'Prioridad',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{row.original.assessment.priority}</span>
        ),
      }),
      helper.accessor((camera) => camera.resolution, {
        id: 'resolution',
        header: 'Resolución',
        cell: ({ row }) => <span className="text-xs tabular-nums">{row.original.resolution}</span>,
      }),
      helper.accessor((camera) => camera.ip, {
        id: 'ip',
        header: 'IP',
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.ip}</span>,
      }),
      helper.accessor((camera) => camera.spec.model, {
        id: 'model',
        header: 'Modelo',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{row.original.spec.model}</span>
        ),
      }),
      helper.accessor((camera) => camera.status, {
        id: 'status',
        header: 'Estado',
        sortFn: (rowA, rowB, columnId) => {
          const a = STATUS_RANK[rowA.getValue<CameraStatus>(columnId)] ?? 0;
          const b = STATUS_RANK[rowB.getValue<CameraStatus>(columnId)] ?? 0;
          return a - b;
        },
        cell: ({ row }) => <CameraStatusBadge status={row.original.status} />,
      }),
      helper.accessor((camera) => Date.parse(camera.lastSeen), {
        id: 'lastSeen',
        header: 'Última señal',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatDateTime(row.original.lastSeen)}
          </span>
        ),
      }),
      helper.accessor((camera) => incidentCountByCamera.get(camera.id) ?? 0, {
        id: 'incidents',
        header: 'Incidentes',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <span className="tabular-nums">{incidentCountByCamera.get(row.original.id) ?? 0}</span>
        ),
      }),
    ]);
  }, [incidentCountByCamera, sectorCodeById, sectorNameById]);

  const filterValues = useMemo(
    () => ({
      sector: sectorFilter === 'todos' ? [] : [sectorFilter],
      classification: classificationFilter === 'todas' ? [] : [classificationFilter],
    }),
    [classificationFilter, sectorFilter],
  );

  const searchText = useMemo(
    () => (camera: Camera) =>
      [
        camera.id,
        camera.name,
        camera.ip,
        camera.spec.model,
        sectorNameById.get(camera.sectorId) ?? '',
        CLASSIFICATION_LABEL[camera.assessment.classification],
      ].join(' '),
    [sectorNameById],
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Módulo 8 · Administración"
        title="Registro de cámaras"
        description="Las 36 IP evaluadas en el informe de IMUPESA del 03/11/2026: modelo, sector documental, resultado de las inspecciones diurna y nocturna y clasificación conjunta."
        actions={
          <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
            {cameras.length} IP · {classificationCounts.get('sin_imagen') ?? 0} sin imagen
          </Badge>
        }
      />

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Clasificación del informe</CardTitle>
            <CardDescription>
              Categoría conjunta: se toma la peor limitación relevante entre día y noche.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2.5">
              {(Object.keys(CLASSIFICATION_SUMMARY) as CameraClassification[]).map((key) => (
                <li
                  key={key}
                  className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm">
                      <ClassificationDot classification={key} />
                      {CLASSIFICATION_LABEL[key]}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {CLASSIFICATION_SUMMARY[key].treatment}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {classificationCounts.get(key) ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Organización por sectores</CardTitle>
            <CardDescription>
              Sectores documentales del informe. X no es un sector físico: es la lista de equipos
              por conciliar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {SECTORS.map((sector) => {
                const sectorCameras = cameras.filter((camera) => camera.sectorId === sector.id);
                return (
                  <li
                    key={sector.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{sector.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {sector.description}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="shrink-0 border-border bg-muted text-muted-foreground"
                    >
                      {sectorCameras.length}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Estado de servicios</CardTitle>
            <CardDescription>Componentes de la plataforma.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2.5">
              <ServiceStatus
                icon={<Server className="size-4" />}
                label="MediaMTX (streaming)"
                detail="36 flujos RTSP en vivo"
                tone="normal"
              />
              <ServiceStatus
                icon={<Cpu className="size-4" />}
                label="Motor de detección IA"
                detail="Detección de personas y vehículos"
                tone="normal"
              />
              <ServiceStatus
                icon={<Network className="size-4" />}
                label="Reglas y notificaciones"
                detail="Procesamiento local en el navegador"
                tone="info"
              />
              <ServiceStatus
                icon={<HardDrive className="size-4" />}
                label="Inferencia en GPU (NVIDIA L4)"
                detail="Procesamiento por lotes"
                tone="warning"
              />
            </ul>
          </CardContent>
        </Card>
      </section>

      <Card size="sm" className="overflow-hidden">
        <CardHeader>
          <CardTitle>Inventario evaluado</CardTitle>
          <CardDescription>
            La resolución es la <strong>recibida</strong> en la consulta, no la máxima del equipo.
            Ordena por cualquier columna y oculta las que no necesites.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="w-[200px]" aria-label="Filtrar por sector">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los sectores</SelectItem>
                {SECTORS.map((sector) => (
                  <SelectItem key={sector.id} value={sector.id}>
                    {sector.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={classificationFilter} onValueChange={setClassificationFilter}>
              <SelectTrigger className="w-[190px]" aria-label="Filtrar por clasificación">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las clasificaciones</SelectItem>
                {(Object.keys(CLASSIFICATION_SUMMARY) as CameraClassification[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {CLASSIFICATION_LABEL[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DataTable
            data={cameras}
            columns={columns}
            getRowId={(camera) => camera.id}
            searchText={searchText}
            searchPlaceholder="Buscar por ID, nombre, IP o modelo…"
            filterValues={filterValues}
            onFilterValuesChange={(values) => {
              setSectorFilter(values.sector?.[0] ?? 'todos');
              setClassificationFilter(values.classification?.[0] ?? 'todas');
            }}
            initialSorting={[{ id: 'id', desc: false }]}
            pageSize={10}
            noun="cámaras"
            totalCount={cameras.length}
            emptyMessage="No hay cámaras que coincidan con los filtros aplicados."
          />
        </CardContent>
      </Card>
    </div>
  );
}

/** Punto de color con la semántica del informe. */
function ClassificationDot({ classification }: { classification: CameraClassification }) {
  const color =
    classification === 'buena_general'
      ? 'bg-normal'
      : classification === 'limitada'
        ? 'bg-warning'
        : classification === 'deficiente'
          ? 'bg-critical'
          : 'bg-muted-foreground/70';
  return <span className={`size-2 shrink-0 rounded-full ${color}`} aria-hidden="true" />;
}

function ServiceStatus({
  icon,
  label,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  tone: 'normal' | 'info' | 'warning';
}) {
  const dotClass = tone === 'normal' ? 'bg-normal' : tone === 'info' ? 'bg-info' : 'bg-warning';
  return (
    <li className="flex items-start gap-2.5 rounded-lg border border-border px-3 py-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm">
          <span className={`size-1.5 rounded-full ${dotClass}`} aria-hidden="true" />
          {label}
        </span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">{detail}</span>
      </span>
    </li>
  );
}
