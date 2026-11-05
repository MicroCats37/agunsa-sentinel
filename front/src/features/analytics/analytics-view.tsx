'use client';

import {
  CameraFrequencyChart,
  CategoryDonutChart,
  DailyIncidentsChart,
  HourlyIncidentsChart,
  ResponseTimeChart,
  ZoneIncidentsChart,
  type ResponsePoint,
} from '@/components/charts';
import { PageHeader } from '@/components/page-header';
import { StatTile } from '@/components/stat-tile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { CAMERAS } from '@/data/cameras';
import { ZONES } from '@/data/zones';
import {
  incidentsByCategory,
  incidentsByDay,
  incidentsByHour,
  incidentsByZone,
  meanResponseMinutes,
  resolutionSummary,
  topCamerasByIncidents,
} from '@/domain/analytics';
import { dayLabel, dayStartIso, MS_PER_DAY, PLATFORM_NOW_MS } from '@/domain/clock';
import { useIncidentsStore } from '@/store/incidents-store';
import {
  Activity,
  CheckCircle2,
  Clock,
  FileDown,
  FileSpreadsheet,
  LineChart,
  XCircle,
} from 'lucide-react';
import { useMemo } from 'react';

/**
 * Analítica y estadísticas (módulo 7 del pliego).
 *
 * Todas las series se derivan del mismo conjunto de incidentes que alimenta al
 * dashboard, de modo que la analítica refleja en todo momento el estado real
 * del mockup, incluidas las simulaciones.
 *
 * La composición sigue la del dashboard: una fila de indicadores, un gráfico
 * grande que manda y un rail lateral con la lectura complementaria. Antes eran
 * seis gráficos del mismo peso y ningún punto de entrada claro.
 */

const minuteFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });
const percentFormat = new Intl.NumberFormat('es-ES', {
  style: 'percent',
  maximumFractionDigits: 0,
});

export function AnalyticsView() {
  const incidents = useIncidentsStore((state) => state.incidents);

  const analytics = useMemo(() => {
    const cutoff = PLATFORM_NOW_MS - 14 * MS_PER_DAY;
    const window = incidents.filter((incident) => Date.parse(incident.occurredAt) >= cutoff);

    const summary = resolutionSummary(window);
    const byDay = incidentsByDay(window, 14);
    const byHour = incidentsByHour(window);
    const byCategory = incidentsByCategory(window);
    const byZone = incidentsByZone(window, ZONES).slice(0, 8);
    const byCamera = topCamerasByIncidents(window, CAMERAS, 10);

    const peakHour = byHour.reduce(
      (best, entry) => (entry.total > best.total ? entry : best),
      byHour[0] ?? { key: '00', label: '00:00', total: 0 },
    );

    // Tiempo medio de atención por día (sólo incidentes cerrados).
    // Un día sin incidentes cerrados es un hueco, no una respuesta instantánea.
    const responseByDay: ResponsePoint[] = [];
    for (const entry of byDay) {
      const dayIncidents = window.filter(
        (incident) =>
          dayStartIso(incident.occurredAt) === entry.key &&
          (incident.status === 'resuelto' || incident.status === 'confirmado'),
      );
      const minutes =
        dayIncidents.length === 0
          ? null
          : Math.round(
              dayIncidents.reduce((sum, incident) => {
                const last = incident.notes.at(-1);
                const closedAt = last ? Date.parse(last.at) : Date.parse(incident.occurredAt);
                return sum + Math.max(0, closedAt - Date.parse(incident.occurredAt)) / 60_000;
              }, 0) / dayIncidents.length,
            );
      responseByDay.push({ label: dayLabel(entry.key), minutes });
    }

    return {
      window,
      summary,
      byDay,
      byHour,
      byCategory,
      byZone,
      byCamera,
      peakHour,
      responseByDay,
      meanResponse: meanResponseMinutes(window),
      confirmedRate:
        summary.confirmados + summary.descartados === 0
          ? 0
          : Math.round((summary.confirmados / (summary.confirmados + summary.descartados)) * 100),
    };
  }, [incidents]);

  const dailySeries = analytics.byDay.map((entry) => entry.total);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Módulo 7 · Análisis estadístico"
        title="Analítica de operación perimetral"
        description="Indicadores calculados sobre el histórico de 14 días: volumen, clasificación, zonas más activas, horarios críticos y tiempos de atención."
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

      {analytics.window.length === 0 ? (
        <Empty className="border border-border/60">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LineChart />
            </EmptyMedia>
            <EmptyTitle>Sin datos en los últimos 14 días</EmptyTitle>
            <EmptyDescription>
              Todavía no hay incidentes registrados en la ventana analizada. En cuanto se
              registren nuevas detecciones, la analítica se llenará sola.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatTile
              label="Incidentes (14 días)"
              value={analytics.window.length}
              hint="Total de eventos registrados"
              icon={<Activity className="size-4" />}
              spark={dailySeries}
              sparkTone="info"
            />
            <StatTile
              label="Tiempo medio de atención"
              value={`${minuteFormat.format(analytics.meanResponse)} min`}
              hint="Desde la detección hasta el cierre"
              tone="info"
              icon={<Clock className="size-4" />}
            />
            <StatTile
              label="Confirmados"
              value={analytics.summary.confirmados}
              hint="Detecciones validadas por el operador"
              tone="normal"
              icon={<CheckCircle2 className="size-4" />}
            />
            <StatTile
              label="Descartados"
              value={analytics.summary.descartados}
              hint="Falsos positivos confirmados"
              tone="warning"
              icon={<XCircle className="size-4" />}
            />
            <StatTile
              label="Tasa de acierto"
              value={percentFormat.format(analytics.confirmedRate / 100)}
              hint="Confirmados sobre alertas evaluadas"
              tone="info"
              icon={<CheckCircle2 className="size-4" />}
            />
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Incidentes por día</CardTitle>
                <CardDescription>
                  Serie de 14 días: el volumen diario marca el ritmo de la operación.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DailyIncidentsChart data={analytics.byDay} height={300} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Clasificación por categoría</CardTitle>
                <CardDescription>Familias de detección activadas en el período.</CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryDonutChart data={analytics.byCategory} height={280} />
              </CardContent>
            </Card>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Horarios con más incidentes</CardTitle>
                <CardDescription>
                  Hora pico:{' '}
                  <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
                    {analytics.peakHour.label}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <HourlyIncidentsChart data={analytics.byHour} height={280} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tiempo medio de atención</CardTitle>
                <CardDescription>
                  Minutos desde la detección hasta el cierre. Los días sin incidentes cerrados
                  aparecen como un hueco, no como un cero.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponseTimeChart data={analytics.responseByDay} height={280} />
              </CardContent>
            </Card>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Zonas con mayor actividad</CardTitle>
                <CardDescription>Zonas inteligentes con más eventos acumulados.</CardDescription>
              </CardHeader>
              <CardContent>
                <ZoneIncidentsChart data={analytics.byZone} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Frecuencia de eventos por cámara</CardTitle>
                <CardDescription>Diez cámaras con más detecciones en el período.</CardDescription>
              </CardHeader>
              <CardContent>
                <CameraFrequencyChart data={analytics.byCamera} />
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
