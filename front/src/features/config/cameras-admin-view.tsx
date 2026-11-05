'use client';

import { PageHeader } from '@/components/page-header';
import { CameraStatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CAMERAS } from '@/data/cameras';
import { SECTORS } from '@/data/sectors';
import { formatDateTime } from '@/domain/clock';
import type { Camera } from '@/domain/types';
import { useCamerasStore } from '@/store/cameras-store';
import { useIncidentsStore } from '@/store/incidents-store';
import { Cpu, HardDrive, Network, Server } from 'lucide-react';
import { useMemo, useState } from 'react';

/**
 * Administración de cámaras (módulo 8 del pliego).
 *
 * Registro de las 36 cámaras, organización por sectores y estado de los
 * servicios de vídeo e IA.
 */
export function CamerasAdminView() {
  const overrides = useCamerasStore((state) => state.overrides);
  const incidents = useIncidentsStore((state) => state.incidents);
  const [query, setQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState('todos');

  const cameras = useMemo<Camera[]>(
    () =>
      CAMERAS.map((camera) => {
        const override = overrides[camera.id];
        return override ? { ...camera, ...override } : camera;
      }),
    [overrides],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return cameras.filter((camera) => {
      if (sectorFilter !== 'todos' && camera.sectorId !== sectorFilter) return false;
      if (normalized.length === 0) return true;
      return `${camera.id} ${camera.name} ${camera.ip}`.toLowerCase().includes(normalized);
    });
  }, [cameras, query, sectorFilter]);

  const incidentCountByCamera = useMemo(() => {
    const counts = new Map<string, number>();
    for (const incident of incidents) {
      counts.set(incident.cameraId, (counts.get(incident.cameraId) ?? 0) + 1);
    }
    return counts;
  }, [incidents]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Módulo 8 · Administración"
        title="Registro de cámaras"
        description="Inventario de las 36 cámaras de la instalación, su sector, estado de conexión, resolución y actividad reciente."
      />

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Estado de servicios</CardTitle>
            <CardDescription>Componentes simulados de la plataforma.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2.5">
              <ServiceStatus
                icon={<Server className="size-4" />}
                label="MediaMTX (streaming)"
                detail="36 flujos RTSP simulados"
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
                detail="No disponible en el mockup"
                tone="warning"
              />
            </ul>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Organización por sectores</CardTitle>
            <CardDescription>Cobertura cameras por sector perimetral.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {SECTORS.map((sector) => {
                const sectorCameras = cameras.filter((camera) => camera.sectorId === sector.id);
                const alerts = sectorCameras.filter((camera) => camera.status === 'alerta').length;
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
                    <div className="flex shrink-0 items-center gap-1.5">
                      {alerts > 0 ? (
                        <Badge
                          variant="outline"
                          className="border-critical/40 bg-critical/10 text-critical"
                        >
                          {alerts} alerta
                        </Badge>
                      ) : null}
                      <Badge
                        variant="outline"
                        className="border-border bg-muted text-muted-foreground"
                      >
                        {sectorCameras.length}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Resumen de cobertura</CardTitle>
            <CardDescription>Estado agregado de las 36 cámaras.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2.5 text-sm">
              <SummaryRow
                label="Activas"
                value={cameras.filter((camera) => camera.status === 'activa').length}
                dotClass="bg-normal"
              />
              <SummaryRow
                label="Con alerta"
                value={cameras.filter((camera) => camera.status === 'alerta').length}
                dotClass="bg-critical"
              />
              <SummaryRow
                label="Con falla"
                value={cameras.filter((camera) => camera.status === 'fallando').length}
                dotClass="bg-warning"
              />
              <SummaryRow
                label="Inactivas"
                value={cameras.filter((camera) => camera.status === 'inactiva').length}
                dotClass="bg-muted-foreground"
              />
              <SummaryRow
                label="Resolución 4K"
                value={cameras.filter((camera) => camera.resolution === '3840×2160').length}
                dotClass="bg-info"
              />
              <SummaryRow
                label="Con línea virtual"
                value={cameras.filter((camera) => camera.scene !== 'perimetro').length}
                dotClass="bg-accent"
              />
            </ul>
          </CardContent>
        </Card>
      </section>

      <Card size="sm" className="overflow-hidden">
        <CardHeader>
          <CardTitle>Inventario</CardTitle>
          <CardDescription>
            {filtered.length} de {cameras.length} cámaras mostradas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por ID, nombre o IP…"
              className="w-[260px]"
              aria-label="Buscar cámara"
            />
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
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[110px]">ID</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="w-[170px]">Sector</TableHead>
                <TableHead className="w-[130px]">Estado</TableHead>
                <TableHead className="w-[120px]">Resolución</TableHead>
                <TableHead className="w-[140px]">IP</TableHead>
                <TableHead className="w-[150px]">Última señal</TableHead>
                <TableHead className="w-[100px] text-right">Incidentes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((camera) => (
                <TableRow key={camera.id}>
                  <TableCell className="font-mono text-xs">{camera.id}</TableCell>
                  <TableCell>{camera.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {SECTORS.find((sector) => sector.id === camera.sectorId)?.name ??
                      camera.sectorId}
                  </TableCell>
                  <TableCell>
                    <CameraStatusBadge status={camera.status} />
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">{camera.resolution}</TableCell>
                  <TableCell className="font-mono text-xs">{camera.ip}</TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {formatDateTime(camera.lastSeen)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {incidentCountByCamera.get(camera.id) ?? 0}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
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

function SummaryRow({
  label,
  value,
  dotClass,
}: {
  label: string;
  value: number;
  dotClass: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="flex items-center gap-2">
        <span className={`size-1.5 rounded-full ${dotClass}`} aria-hidden="true" />
        {label}
      </span>
      <span className="font-medium tabular-nums">{value}</span>
    </li>
  );
}
