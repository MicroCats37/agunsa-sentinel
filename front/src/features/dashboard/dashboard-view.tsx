'use client';

import {
  CategoryDonutChart,
  DailyIncidentsChart,
  HourlyIncidentsChart,
  ZoneIncidentsChart,
} from '@/components/charts';
import { PageHeader } from '@/components/page-header';
import { SeverityBadge } from '@/components/status-badge';
import { StatTile } from '@/components/stat-tile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CAMERAS } from '@/data/cameras';
import { SECTORS } from '@/data/sectors';
import { PLATFORM_NOW_MS, MS_PER_DAY, formatDateTime } from '@/domain/clock';
import {
  hourlySeries,
  incidentsByCategory,
  incidentsByDay,
  incidentsByHour,
  incidentsByZone,
  inferenceLoadByCamera,
  resolutionSummary,
  severityBreakdown,
  streamingStatusBySector,
} from '@/domain/analytics';
import { isIncidentActive } from '@/domain/incident-status';
import type { Camera, Incident } from '@/domain/types';
import { SimulationControl } from '@/features/simulation/simulation-control';
import { SimulationCameraFeed } from '@/features/simulation/simulation-camera-feed';
import { useCamerasStore } from '@/store/cameras-store';
import { useIncidentsStore } from '@/store/incidents-store';
import { useRulesStore } from '@/store/rules-store';
import { useUiStore } from '@/store/ui-store';
import { useZonesStore } from '@/store/zones-store';
import {
  Activity,
  Car,
  CircleAlert,
  Cctv,
  Cpu,
  Database,
  Footprints,
  Radio,
  Radar,
  Siren,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

/**
 * Dashboard de seguridad (módulo 1 del pliego).
 *
 * Todos los indicadores derivan del store, por lo que un incidente simulado los
 * actualiza en el momento sin ningún estado duplicado.
 */
export function DashboardView() {
  const overrides = useCamerasStore((state) => state.overrides);
  const incidents = useIncidentsStore((state) => state.incidents);
  const rules = useRulesStore((state) => state.rules);
  const zones = useZonesStore((state) => state.zones);
  const illumination = useUiStore((state) => state.illumination);

  const cameras = useMemo<Camera[]>(
    () =>
      CAMERAS.map((camera) => {
        const override = overrides[camera.id];
        return override ? { ...camera, ...override } : camera;
      }),
    [overrides],
  );

  const metrics = useMemo(() => {
    const connected = cameras.filter((camera) => camera.status === 'activa').length;
    const withAlert = cameras.filter((camera) => camera.status === 'alerta').length;
    const offline = cameras.filter((camera) => camera.status === 'inactiva').length;
    const failed = cameras.filter((camera) => camera.status === 'fallando').length;

    const active = incidents.filter((incident) => isIncidentActive(incident.status));
    const critical = active.filter((incident) => incident.severity === 'critica');

    const cutoff = PLATFORM_NOW_MS - MS_PER_DAY;
    const last24h = incidents.filter((incident) => Date.parse(incident.occurredAt) >= cutoff);
    const persons = last24h.reduce(
      (sum, incident) => sum + (incident.objectType === 'persona' ? incident.objectCount : 0),
      0,
    );
    const vehicles = last24h.reduce(
      (sum, incident) => sum + (incident.objectType === 'vehiculo' ? incident.objectCount : 0),
      0,
    );

    const summary = resolutionSummary(incidents);
    const resolutionRate =
      summary.total === 0
        ? 0
        : Math.round(
            ((summary.confirmados + summary.resueltos + summary.descartados) / summary.total) * 100,
          );

    return {
      connected,
      withAlert,
      offline,
      failed,
      active: active.length,
      critical: critical.length,
      persons,
      vehicles,
      resolutionRate,
      summary,
    };
  }, [cameras, incidents]);

  const charts = useMemo(
    () => ({
      byHour: incidentsByHour(incidents),
      byDay: incidentsByDay(incidents, 14),
      byZone: incidentsByZone(incidents, zones).slice(0, 8),
      byCategory: incidentsByCategory(incidents),
      bySeverity: severityBreakdown(incidents),
    }),
    [incidents, zones],
  );

  const trends = useMemo(
    () => ({
      incidents: hourlySeries(incidents, 12),
      critical: hourlySeries(incidents, 12, (incident) => incident.severity === 'critica'),
      persons: hourlySeries(incidents, 12, (incident) => incident.objectType === 'persona'),
      vehicles: hourlySeries(incidents, 12, (incident) => incident.objectType === 'vehiculo'),
      alerts: hourlySeries(incidents, 12, (incident) => incident.severity === 'alta'),
    }),
    [incidents],
  );

  const streaming = useMemo(() => streamingStatusBySector(cameras, SECTORS), [cameras]);

  const inference = useMemo(
    () => inferenceLoadByCamera(cameras, incidents, 6),
    [cameras, incidents],
  );

  const recent = useMemo(
    () =>
      [...incidents]
        .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
        .slice(0, 7),
    [incidents],
  );

  const activeRules = rules.filter((rule) => rule.enabled).length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Módulo 1 · Resumen general"
        title="Estado de seguridad de la instalación"
        description="Cobertura perimetral, incidentes activos y carga operativa de las 36 cámaras. Los datos provienen del motor simulado del mockup."
        actions={
          <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
            <Radar className="size-3" />
            Simulación activa
          </Badge>
        }
      />

      <EventTicker incidents={recent} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Cámaras instaladas"
          value={cameras.length}
          hint={`${metrics.connected} conectadas`}
          icon={<Cctv className="size-4" />}
          testId="stat-camaras"
        />
        <StatTile
          label="Con alerta"
          value={metrics.withAlert}
          hint="Requieren atención del operador"
          tone="warning"
          icon={<CircleAlert className="size-4" />}
          testId="stat-camaras-alerta"
          spark={trends.alerts}
          sparkTone="warning"
        />
        <StatTile
          label="Fuera de servicio"
          value={metrics.offline + metrics.failed}
          hint={`${metrics.offline} desconectadas · ${metrics.failed} con falla`}
          tone="critical"
          icon={<Siren className="size-4" />}
          testId="stat-camaras-fuera"
        />
        <StatTile
          label="Incidentes activos"
          value={metrics.active}
          hint={`${metrics.summary.abiertos} sin cerrar`}
          tone="critical"
          icon={<Activity className="size-4" />}
          testId="stat-incidentes-activos"
          spark={trends.incidents}
          sparkTone="critical"
        />
        <StatTile
          label="Alertas críticas"
          value={metrics.critical}
          hint="Severidad crítica sin resolver"
          tone="critical"
          icon={<Siren className="size-4" />}
          testId="stat-alertas-criticas"
          spark={trends.critical}
          sparkTone="critical"
        />
        <StatTile
          label="Personas detectadas (24 h)"
          value={metrics.persons}
          hint="Eventos con confirmación por objeto"
          tone="info"
          icon={<Footprints className="size-4" />}
          testId="stat-personas"
          spark={trends.persons}
          sparkTone="info"
        />
        <StatTile
          label="Vehículos detectados (24 h)"
          value={metrics.vehicles}
          hint="Incluye detecciones en accesos"
          tone="info"
          icon={<Car className="size-4" />}
          testId="stat-vehiculos"
          spark={trends.vehicles}
          sparkTone="info"
        />
        <StatTile
          label="Tasa de resolución"
          value={`${metrics.resolutionRate}%`}
          hint={`${metrics.summary.confirmados} confirmados · ${metrics.summary.descartados} descartados`}
          tone="normal"
          icon={<Activity className="size-4" />}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Incidentes por hora</CardTitle>
            <CardDescription>
              Distribución horaria de las detecciones del histórico simulado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HourlyIncidentsChart data={charts.byHour} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado general del sistema</CardTitle>
            <CardDescription>Servicios del centro de control (simulados).</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              <ServiceRow label="Servicio de vídeo (MediaMTX)" status="Operativo" tone="normal" />
              <ServiceRow label="Motor de detección IA" status="Operativo" tone="normal" />
              <ServiceRow
                label="Motor de reglas"
                status={`${activeRules} reglas activas`}
                tone="normal"
              />
              <ServiceRow
                label="Zonas inteligentes"
                status={`${zones.length} configuradas`}
                tone="info"
              />
              <ServiceRow
                label="Inferencia GPU (L4)"
                status="No conectada en el mockup"
                tone="warning"
              />
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Incidentes por día</CardTitle>
            <CardDescription>Últimos 14 días de operación simulada.</CardDescription>
          </CardHeader>
          <CardContent>
            <DailyIncidentsChart data={charts.byDay} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución por zona</CardTitle>
            <CardDescription>Zonas con mayor concentración de incidentes.</CardDescription>
          </CardHeader>
          <CardContent>
            {charts.byZone.length > 0 ? (
              <ZoneIncidentsChart data={charts.byZone} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Todavía no hay incidentes registrados.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Estado de streaming por sector</CardTitle>
            <CardDescription>
              Reparto de las 36 cámaras por disponibilidad y caudal agregado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3" data-testid="panel-streaming">
              {streaming.map((sector) => (
                <li key={sector.sectorId}>
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="truncate font-medium text-foreground">{sector.name}</span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      {sector.total} cámaras · {sector.bitrateMbps.toFixed(1)} Mbps
                    </span>
                  </div>
                  <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-muted">
                    <span
                      className="h-full bg-normal"
                      style={{ width: `${percent(sector.activas, sector.total)}%` }}
                    />
                    <span
                      className="h-full bg-critical"
                      style={{ width: `${percent(sector.alerta, sector.total)}%` }}
                    />
                    <span
                      className="h-full bg-warning"
                      style={{ width: `${percent(sector.fallando, sector.total)}%` }}
                    />
                    <span
                      className="h-full bg-muted-foreground/60"
                      style={{ width: `${percent(sector.inactiva, sector.total)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {sector.activas} operativas · {sector.alerta} con alerta · {sector.fallando} con
                    falla · {sector.inactiva} inactivas
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Carga de la IA simulada</CardTitle>
            <CardDescription>
              Esfuerzo de inferencia por cámara: caudal de vídeo y densidad de detecciones.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2.5" data-testid="panel-inference">
              {inference.map((row) => (
                <li key={row.cameraId}>
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <Link
                      href={`/monitoreo/${row.cameraId}`}
                      className="truncate font-medium text-foreground hover:text-info"
                    >
                      {row.cameraId} · {row.name}
                    </Link>
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      {row.detections} det. · {row.streamMbps} Mbps
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-info"
                      style={{ width: `${Math.max(4, row.load * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Clasificación por categoría</CardTitle>
            <CardDescription>Familias de detección activadas.</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryDonutChart data={charts.byCategory} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Simulación de incidentes</CardTitle>
            <CardDescription>
              Genera una detección y recorre el flujo completo de atención.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SimulationControl variant="panel" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Eventos recientes</CardTitle>
            <CardDescription>Accede al incidente o a la cámara desde aquí.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {recent.map((incident) => (
                <li key={incident.id}>
                  <Link
                    href={`/incidentes/${incident.id}`}
                    className="flex items-start gap-3 rounded-lg border border-border px-3 py-2 transition-colors hover:border-info/50 hover:bg-info/5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {incident.cameraId}
                        </span>
                        <SeverityBadge severity={incident.severity} />
                      </span>
                      <span className="mt-1 block truncate text-sm text-foreground">
                        {incident.type}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {formatDateTime(incident.occurredAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Cámara con alerta activa</CardTitle>
          <CardDescription>
            Vista rápida del feed marcado. El conmutador de cuadrícula completa está en el centro de
            monitoreo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cameras
              .filter((camera) => camera.status === 'alerta')
              .slice(0, 4)
              .map((camera) => (
                <Link
                  key={camera.id}
                  href={`/monitoreo/${camera.id}`}
                  className="group relative block overflow-hidden rounded-lg border border-critical/50 ring-1 ring-critical/25"
                >
                  <div className="aspect-video w-full overflow-hidden bg-black">
                    <SimulationCameraFeed
                      camera={camera}
                      sectorName={camera.sectorId}
                      showDetections
                      illumination={illumination}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-border bg-card px-3 py-2">
                    <span className="truncate text-xs font-medium">{camera.name}</span>
                    <Button size="xs" variant="ghost" className="text-info">
                      Abrir
                    </Button>
                  </div>
                </Link>
              ))}
            {cameras.filter((camera) => camera.status === 'alerta').length === 0 ? (
              <p className="col-span-full py-6 text-center text-sm text-muted-foreground">
                No hay cámaras con alerta activa en este momento.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <footer className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Cpu className="size-3.5" />
          Detección e inferencia ejecutadas localmente en el mockup.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Database className="size-3.5" />
          Estado persistido en el almacenamiento local del navegador.
        </span>
      </footer>
    </div>
  );
}

function percent(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * Ticker de eventos en vivo.
 *
 * Banda horizontal con los últimos eventos del turno. Con movimiento reducido
 * se convierte en una lista estática legible.
 */
function EventTicker({ incidents }: { incidents: readonly Incident[] }) {
  if (incidents.length === 0) return null;

  const items = [...incidents, ...incidents];

  return (
    <div
      className="relative flex h-9 items-center overflow-hidden rounded-lg border border-border bg-card/60"
      data-testid="event-ticker"
    >
      <span className="z-10 flex h-full shrink-0 items-center gap-1.5 border-r border-border bg-card px-3 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        <Radio className="size-3.5 text-info" />
        En vivo
      </span>
      <div className="flex min-w-0 flex-1 items-center">
        <div className="flex shrink-0 items-center gap-6 px-4 motion-safe:animate-[agunsa-ticker_38s_linear_infinite]">
          {items.map((incident, index) => (
            <Link
              key={`${incident.id}-${index}`}
              href={`/incidentes/${incident.id}`}
              className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="font-mono text-[11px] text-info">{incident.cameraId}</span>
              <span className="max-w-[220px] truncate">{incident.type}</span>
              <span className="text-[11px] text-muted-foreground/70">
                {formatDateTime(incident.occurredAt)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function ServiceRow({
  label,
  status,
  tone,
}: {
  label: string;
  status: string;
  tone: 'normal' | 'info' | 'warning';
}) {
  const dotClass = tone === 'normal' ? 'bg-normal' : tone === 'info' ? 'bg-info' : 'bg-warning';
  return (
    <li className="flex items-center justify-between gap-3 border-b border-border/60 pb-2.5 last:border-0 last:pb-0">
      <span className="flex items-center gap-2 text-sm text-foreground">
        <span className={`size-1.5 rounded-full ${dotClass}`} aria-hidden="true" />
        {label}
      </span>
      <span className="text-xs text-muted-foreground">{status}</span>
    </li>
  );
}
