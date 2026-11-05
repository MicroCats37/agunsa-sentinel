'use client';

import { DailyIncidentsChart, ZoneIncidentsChart } from '@/components/charts';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { CAMERAS } from '@/data/cameras';
import { SECTORS } from '@/data/sectors';
import { MS_PER_DAY, MS_PER_HOUR, PLATFORM_NOW_MS, dayLabel, dayStartIso } from '@/domain/clock';
import {
  hourlySeries,
  incidentsByCategory,
  incidentsByDay,
  incidentsByZone,
  inferenceLoadByCamera,
  meanResponseMinutes,
  resolutionSummary,
  streamingStatusBySector,
} from '@/domain/analytics';
import { isIncidentActive } from '@/domain/incident-status';
import type { Camera, Incident, IncidentStatus } from '@/domain/types';
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
  Cctv,
  CircleAlert,
  Cpu,
  Database,
  Footprints,
  Radar,
  Siren,
  Timer,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import {
  type ActivityRange,
  type ActivityWindow,
  ChartAreaInteractive,
} from '@/components/blocks/dashboard-01/chart-area-interactive';
import { DonutCard } from '@/components/blocks/dashboard-01/donut-card';
import { HeroPanel } from '@/components/blocks/dashboard-01/hero-panel';
import {
  type IncidentPoint,
  IncidentsChartCard,
} from '@/components/blocks/dashboard-01/incidents-chart-card';
import { LastEventRow } from '@/components/blocks/dashboard-01/last-event-row';
import { PerimeterSummary } from '@/components/blocks/dashboard-01/perimeter-summary';
import { RecentIncidentsCard } from '@/components/blocks/dashboard-01/recent-incidents-card';
import { SectionCards } from '@/components/blocks/dashboard-01/section-cards';
import { type KpiCardData } from '@/components/blocks/dashboard-01/kpi-card';
import { SystemStatusCard } from '@/components/blocks/dashboard-01/system-status-card';

/**
 * Dashboard de seguridad (módulo 1 del pliego).
 *
 * Todos los indicadores derivan del store, por lo que un incidente simulado los
 * actualiza en el momento sin ningún estado duplicado.
 *
 * Las variaciones que muestra la interfaz se calculan comparando la ventana
 * actual de 24 h simuladas con la ventana anterior de 24 h, a partir de las
 * marcas de tiempo de los incidentes. Cuando no hay base de comparación
 * (ventana anterior vacía) no se muestra ninguna insignia: nunca se inventa
 * una cifra.
 */

/** Estados en los que un incidente cuenta como cerrado. */
const CLOSED_STATUSES: ReadonlySet<IncidentStatus> = new Set<IncidentStatus>([
  'confirmado',
  'resuelto',
  'descartado',
]);

export function DashboardView() {
  const overrides = useCamerasStore((state) => state.overrides);
  const incidents = useIncidentsStore((state) => state.incidents);
  const rules = useRulesStore((state) => state.rules);
  const zones = useZonesStore((state) => state.zones);
  const sceneHour = useUiStore((state) => state.sceneHour);

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

  /**
   * Ventanas de comparación: las últimas 24 h simuladas frente a las 24 h
   * anteriores. Todo delta del dashboard sale de aquí.
   */
  const windows = useMemo(() => {
    const currentStart = PLATFORM_NOW_MS - MS_PER_DAY;
    const previousStart = PLATFORM_NOW_MS - 2 * MS_PER_DAY;

    const current: Incident[] = [];
    const previous: Incident[] = [];
    for (const incident of incidents) {
      const at = Date.parse(incident.occurredAt);
      if (at >= currentStart) {
        current.push(incident);
      } else if (at >= previousStart) {
        previous.push(incident);
      }
    }

    const closuresCurrent = closuresInWindow(incidents, currentStart, PLATFORM_NOW_MS);
    const closuresPrevious = closuresInWindow(incidents, previousStart, currentStart);

    const criticalCurrent = current.filter((incident) => incident.severity === 'critica').length;
    const criticalPrevious = previous.filter((incident) => incident.severity === 'critica').length;

    const responseCurrent = meanResponseMinutes(current);
    const responsePrevious = meanResponseMinutes(previous);

    return {
      current,
      previous,
      closuresCurrent,
      closuresPrevious,
      criticalCurrent,
      criticalPrevious,
      responseCurrent,
      responsePrevious,
      incidentsChange: relativeChange(current.length, previous.length),
      closuresChange: relativeChange(closuresCurrent, closuresPrevious),
      criticalChange: relativeChange(criticalCurrent, criticalPrevious),
      responseChange: relativeChange(responseCurrent, responsePrevious),
    };
  }, [incidents]);

  /** Puntos por hora de la ventana actual: base del gráfico principal. */
  const hourlyPoints = useMemo<IncidentPoint[]>(() => {
    const start = PLATFORM_NOW_MS - 24 * MS_PER_HOUR;
    const buckets: IncidentPoint[] = Array.from({ length: 24 }, (_, index) => ({
      label: `${String(new Date(start + index * MS_PER_HOUR).getUTCHours()).padStart(2, '0')}:00`,
      total: 0,
      criticas: 0,
    }));

    for (const incident of windows.current) {
      const index = Math.floor((Date.parse(incident.occurredAt) - start) / MS_PER_HOUR);
      const bucket = buckets[index];
      if (!bucket) continue;
      bucket.total += 1;
      if (incident.severity === 'critica') bucket.criticas += 1;
    }

    return buckets;
  }, [windows]);

  /** Viñetas de la columna de estadísticas del gráfico principal. */
  const chartStats = useMemo(() => {
    const peak = hourlyPoints.reduce<IncidentPoint | null>(
      (best, point) => (!best || point.total > best.total ? point : best),
      null,
    );
    const camerasInvolved = new Set(windows.current.map((incident) => incident.cameraId)).size;
    const open = windows.current.filter((incident) => isIncidentActive(incident.status)).length;
    const closed = windows.current.filter((incident) =>
      CLOSED_STATUSES.has(incident.status),
    ).length;

    return [
      { label: 'Hora pico', value: peak ? `${peak.label} · ${peak.total}` : '—' },
      { label: 'Cámaras implicadas', value: String(camerasInvolved) },
      { label: 'Severidad crítica', value: String(windows.criticalCurrent) },
      { label: 'Sin cerrar', value: String(open) },
      { label: 'Cerrados', value: String(closed) },
    ];
  }, [hourlyPoints, windows]);

  /** Actividad por hora y por día para el gráfico de área. */
  const activity = useMemo(() => buildActivityWindows(incidents), [incidents]);

  const charts = useMemo(
    () => ({
      byDay: incidentsByDay(incidents, 14),
      byZone: incidentsByZone(incidents, zones).slice(0, 8),
      byCategory: incidentsByCategory(windows.current),
    }),
    [incidents, zones, windows],
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
        .slice(0, 8),
    [incidents],
  );

  const lastEvent = recent[0] ?? null;

  const activeRules = rules.filter((rule) => rule.enabled).length;

  /** Tendencia de las últimas 12 h: base de la minigráfica del indicador. */
  const criticalTrend = useMemo(
    () => hourlySeries(incidents, 12, (incident) => incident.severity === 'critica'),
    [incidents],
  );

  const sectorsCovered = SECTORS.filter((sector) =>
    cameras.some((camera) => camera.sectorId === sector.id && camera.status !== 'inactiva'),
  ).length;

  const alertCameras = cameras.filter((camera) => camera.status === 'alerta');

  const heroMetrics = [
    {
      id: 'hero-incidentes',
      label: 'Incidentes · 24 h',
      value: String(windows.current.length),
      change: windows.incidentsChange ?? undefined,
      changeIsGood: false,
      changeHint: 'Frente a las 24 h anteriores',
      hint: 'Detectados en la ventana actual',
    },
    {
      id: 'hero-cierres',
      label: 'Cierres · 24 h',
      value: String(windows.closuresCurrent),
      change: windows.closuresChange ?? undefined,
      changeIsGood: true,
      changeHint: 'Frente a las 24 h anteriores',
      hint: 'Incidentes cerrados por el operador',
    },
  ];

  const kpiCards: KpiCardData[] = [
    {
      id: 'kpi-criticas',
      label: 'Alertas críticas · 24 h',
      value: String(windows.criticalCurrent),
      hint: `Severidad crítica sin resolver: ${metrics.critical}`,
      change: windows.criticalChange ?? undefined,
      changeIsGood: false,
      changeHint: 'Frente a las 24 h anteriores',
      icon: Siren,
      href: '/incidentes',
      actionLabel: 'Ver informe',
      spark: criticalTrend,
      sparkTone: 'critical',
    },
    {
      id: 'kpi-atencion',
      label: 'Tiempo medio de atención',
      value: `${windows.responseCurrent} min`,
      hint: 'Desde la detección hasta el cierre',
      change: windows.responseChange ?? undefined,
      changeIsGood: true,
      changeHint: 'Frente a las 24 h anteriores',
      icon: Timer,
      href: '/analitica',
      actionLabel: 'Ver informe',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Módulo 1 · Resumen general"
        title="Centro de control"
        description="Cobertura perimetral, incidentes activos y carga operativa de las 36 cámaras. Los datos provienen del motor de detección de la plataforma."
        actions={
          <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
            <Radar className="size-3" />
            Operación en vivo
          </Badge>
        }
      />

      <LastEventRow incident={lastEvent} />

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <HeroPanel
            title="Estado de seguridad de la instalación"
            description="Lo que ocurre en el perímetro ahora mismo: carga de las últimas 24 h y disponibilidad real de las cámaras."
            metrics={heroMetrics}
            aside={
              <PerimeterSummary
                online={metrics.connected}
                total={cameras.length}
                withAlert={metrics.withAlert}
                offline={metrics.offline}
                failed={metrics.failed}
                sectorsCovered={sectorsCovered}
                sectorsTotal={SECTORS.length}
                zones={zones.length}
                activeIncidents={metrics.active}
                resolutionRate={metrics.resolutionRate}
              />
            }
          />
        </div>
        <div className="lg:col-span-2">
          <SectionCards cards={kpiCards} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-12">
        <div className="lg:col-span-2 xl:col-span-6">
          <IncidentsChartCard
            title="Incidentes por hora"
            description="Distribución horaria de las detecciones de las últimas 24 h."
            points={hourlyPoints}
            stats={chartStats}
            cta={{ label: 'Ver informe de incidentes', href: '/incidentes' }}
          />
        </div>
        <div className="xl:col-span-3">
          <ChartAreaInteractive
            title="Actividad en el perímetro"
            description="Personas y vehículos detectados por periodo."
            windows={activity}
          />
        </div>
        <div className="xl:col-span-3">
          <DonutCard
            title="Reparto por categoría"
            description="Familias de detección activadas en las últimas 24 h."
            data={charts.byCategory}
            height={200}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentIncidentsCard
            title="Últimos incidentes"
            description="Los ocho eventos más recientes del histórico."
            incidents={recent}
            action={{ label: 'Ver todos', href: '/incidentes' }}
          />
        </div>
        <SystemStatusCard
          title="Estado general del sistema"
          description="Servicios del centro de control."
          services={[
            {
              id: 'video',
              label: 'Servicio de vídeo (MediaMTX)',
              status: 'Operativo',
              tone: 'normal',
            },
            {
              id: 'deteccion',
              label: 'Motor de detección IA',
              status: 'Operativo',
              tone: 'normal',
            },
            {
              id: 'reglas',
              label: 'Motor de reglas',
              status: `${activeRules} reglas activas`,
              tone: 'normal',
            },
            {
              id: 'zonas',
              label: 'Zonas inteligentes',
              status: `${zones.length} configuradas`,
              tone: 'info',
            },
            {
              id: 'gpu',
              label: 'Inferencia GPU (L4)',
              status: 'Standby',
              tone: 'warning',
            },
          ]}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Incidentes por día</CardTitle>
            <CardDescription>Últimos 14 días de operación.</CardDescription>
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
              <Empty className="min-h-40 border border-border/60">
                <EmptyHeader>
                  <EmptyTitle>Sin zonas con actividad</EmptyTitle>
                  <EmptyDescription>
                    Todavía no hay incidentes registrados en ninguna zona.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Estado de streaming por sector</CardTitle>
            <CardDescription>
              Reparto de las {cameras.length} cámaras por disponibilidad y caudal agregado.
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
            <CardTitle>Carga de la IA</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle>Alta manual de incidentes</CardTitle>
            <CardDescription>
              Genera una detección y recorre el flujo completo de atención.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SimulationControl variant="panel" />
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Personas y vehículos detectados · 24 h</CardTitle>
            <CardDescription>
              Objetos confirmados por los eventos de detección de la ventana actual.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border/60 p-4">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  <Footprints className="size-3" />
                  Personas
                </p>
                <p className="mt-1.5 text-3xl font-semibold tracking-tight tabular-nums">
                  {metrics.persons}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 p-4">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  <Car className="size-3" />
                  Vehículos
                </p>
                <p className="mt-1.5 text-3xl font-semibold tracking-tight tabular-nums">
                  {metrics.vehicles}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cobertura del inventario</CardTitle>
            <CardDescription>Reparto de las cámaras por estado operativo.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              <CoverageRow
                label="Cámaras instaladas"
                value={cameras.length}
                hint="Cámaras del inventario documentado"
              />
              <CoverageRow
                label="En línea"
                value={metrics.connected}
                hint="Transmitiendo en el momento"
                tone="normal"
              />
              <CoverageRow
                label="Con alerta"
                value={metrics.withAlert}
                hint="Requieren atención del operador"
                tone="critical"
              />
              <CoverageRow
                label="Fuera de servicio"
                value={metrics.offline + metrics.failed}
                hint={`${metrics.offline} desconectadas · ${metrics.failed} con falla`}
                tone="warning"
              />
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
          <CardAction>
            <Button variant="ghost" size="sm" asChild className="px-0 hover:bg-transparent">
              <Link href="/monitoreo">
                Ver monitoreo
                <Cctv data-icon="inline-end" />
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {alertCameras.length === 0 ? (
            <Empty className="min-h-40 border border-border/60">
              <EmptyHeader>
                <EmptyTitle>Sin cámaras con alerta activa</EmptyTitle>
                <EmptyDescription>
                  No hay cámaras marcadas en este momento. Genera un incidente desde la barra
                  superior para ver el flujo completo.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {alertCameras.slice(0, 4).map((camera) => (
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
                      sceneHour={sceneHour}
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
            </div>
          )}
        </CardContent>
      </Card>

      <footer className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Cpu className="size-3.5" />
          Detección e inferencia ejecutadas localmente en la plataforma.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Database className="size-3.5" />
          Estado persistido en el almacenamiento local del navegador.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Activity className="size-3.5" />
          {metrics.summary.total} incidentes en el histórico · {metrics.active} abiertos.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CircleAlert className="size-3.5" />
          Tasa de resolución {metrics.resolutionRate} %.
        </span>
      </footer>
    </div>
  );
}

/** Fila del inventario con su valor en cifras tabulares. */
function CoverageRow({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  hint: string;
  tone?: 'neutral' | 'normal' | 'warning' | 'critical';
}) {
  const accent =
    tone === 'normal'
      ? 'text-normal'
      : tone === 'warning'
        ? 'text-warning'
        : tone === 'critical'
          ? 'text-critical'
          : 'text-foreground';

  return (
    <li className="flex items-center justify-between gap-3 border-b border-border/60 pb-2.5 last:border-0 last:pb-0">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block text-[11px] text-muted-foreground">{hint}</span>
      </span>
      <span className={`text-xl font-semibold tabular-nums ${accent}`}>{value}</span>
    </li>
  );
}

function percent(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * Variación relativa entre la ventana actual y la anterior.
 *
 * Devuelve `null` cuando la ventana anterior no ofrece base de comparación
 * (valor cero): en ese caso el indicador se muestra sin insignia.
 */
function relativeChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * Incidentes cerrados dentro de una ventana temporal.
 *
 * El cierre se toma de la última observación del incidente: es el momento en
 * que el operador dejó constancia de la resolución.
 */
function closuresInWindow(incidents: readonly Incident[], from: number, to: number): number {
  return incidents.filter((incident) => {
    if (!CLOSED_STATUSES.has(incident.status)) return false;
    const last = incident.notes.at(-1);
    if (!last) return false;
    const at = Date.parse(last.at);
    return at >= from && at < to;
  }).length;
}

/** Cubo temporal de la serie de actividad. */
interface ActivityBucket {
  start: number;
  end: number;
  label: string;
  personas: number;
  vehiculos: number;
}

/**
 * Series de actividad por hora y por día.
 *
 * Cada ventana comparte los mismos cubos con granularidad propia: 24 cubos
 * de una hora, 7 y 14 cubos de un día. Los{detections} se cuentan por tipo de
 * objeto confirmado en el evento.
 */
function buildActivityWindows(
  incidents: readonly Incident[],
): Record<ActivityRange, ActivityWindow> {
  const now = PLATFORM_NOW_MS;
  const hoursStart = now - 24 * MS_PER_HOUR;

  const hours: ActivityBucket[] = Array.from({ length: 24 }, (_, index) => {
    const start = hoursStart + index * MS_PER_HOUR;
    return {
      start,
      end: start + MS_PER_HOUR,
      label: `${String(new Date(start).getUTCHours()).padStart(2, '0')}:00`,
      personas: 0,
      vehiculos: 0,
    };
  });

  const today = Date.parse(dayStartIso(new Date(now).toISOString()));
  const days = (count: number): ActivityBucket[] =>
    Array.from({ length: count }, (_, index) => {
      const start = today - (count - 1 - index) * MS_PER_DAY;
      return {
        start,
        end: start + MS_PER_DAY,
        label: dayLabel(new Date(start).toISOString()),
        personas: 0,
        vehiculos: 0,
      };
    });

  const seven = days(7);
  const fourteen = days(14);

  const buckets = [...hours, ...seven, ...fourteen];

  for (const incident of incidents) {
    const at = Date.parse(incident.occurredAt);
    const count = incident.objectCount;
    for (const bucket of buckets) {
      if (at < bucket.start || at >= bucket.end) continue;
      if (incident.objectType === 'persona') bucket.personas += count;
      else bucket.vehiculos += count;
    }
  }

  const toWindow = (buckets: ActivityBucket[]): ActivityWindow => {
    let personas = 0;
    let vehiculos = 0;
    for (const bucket of buckets) {
      personas += bucket.personas;
      vehiculos += bucket.vehiculos;
    }
    return {
      points: buckets.map((bucket) => ({
        label: bucket.label,
        personas: bucket.personas,
        vehiculos: bucket.vehiculos,
      })),
      personas,
      vehiculos,
    };
  };

  return {
    '24h': toWindow(hours),
    '7d': toWindow(seven),
    '14d': toWindow(fourteen),
  };
}
