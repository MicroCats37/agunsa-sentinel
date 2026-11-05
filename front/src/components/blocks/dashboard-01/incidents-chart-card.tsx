'use client';

import * as React from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis } from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { GripVertical } from 'lucide-react';
import Link from 'next/link';

/**
 * Tarjeta principal de analítica: gráfico + columna de estadísticas.
 *
 * Bloque del dashboard oficial adaptado al dominio. El gráfico usa series
 * grises: el color se reserva para lo que significa algo (variaciones de
 * estado), no para la serie de datos. La columna lateral resume el mismo
 * periodo que el gráfico y termina en una llamada a la acción.
 */
export interface IncidentPoint {
  /** Etiqueta del eje X (hora de la plataforma). */
  label: string;
  /** Incidentes de la hora. */
  total: number;
  /** Incidentes de severidad crítica de la hora. */
  criticas: number;
}

export interface IncidentsChartCardProps {
  title: string;
  description: string;
  points: readonly IncidentPoint[];
  /** Viñetas de la columna de estadísticas. */
  stats: readonly { label: string; value: string }[];
  /** Llamada a la acción de la columna de estadísticas. */
  cta: { label: string; href: string };
}

const CHART_CONFIG = {
  total: { label: 'Incidentes', color: 'var(--chart-6)' },
  criticas: { label: 'Críticas', color: 'var(--chart-5)' },
} satisfies ChartConfig;

type Metric = 'total' | 'criticas';

const METRIC_LABEL: Record<Metric, string> = {
  total: 'Incidentes',
  criticas: 'Críticas',
};

export function IncidentsChartCard({
  title,
  description,
  points,
  stats,
  cta,
}: IncidentsChartCardProps) {
  const [metric, setMetric] = React.useState<Metric>('total');
  const gradientTotal = useGradientId('grad-incidents');
  const gradientCriticas = useGradientId('grad-criticas');

  const chartData = React.useMemo(() => points.map((point) => ({ ...point })), [points]);

  const totals = React.useMemo(() => {
    let total = 0;
    let criticas = 0;
    for (const point of points) {
      total += point.total;
      criticas += point.criticas;
    }
    return { total, criticas };
  }, [points]);

  const peak = React.useMemo(() => {
    let best: IncidentPoint | undefined;
    for (const point of points) {
      if (!best || point.total > best.total) best = point;
    }
    return best;
  }, [points]);

  const highlighted = metric === 'total' ? totals.total : totals.criticas;

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="min-w-0">
          {points.length === 0 || totals.total === 0 ? (
            <Empty className="min-h-56 border border-border/60">
              <EmptyHeader>
                <EmptyTitle>Sin incidentes en la ventana</EmptyTitle>
                <EmptyDescription>
                  No hay detecciones registradas en las últimas 24 h.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ChartContainer
              config={CHART_CONFIG}
              className="aspect-auto h-[260px] w-full"
              role="img"
              aria-label="Incidentes por hora en las últimas 24 horas"
            >
              <AreaChart data={chartData} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={gradientTotal} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-total)" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="var(--color-total)" stopOpacity={0.12} />
                  </linearGradient>
                  <linearGradient id={gradientCriticas} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-criticas)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="var(--color-criticas)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  interval={2}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={4}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label) => `Hora ${String(label)}`}
                      indicator="dot"
                    />
                  }
                />
                {peak && peak.total > 0 ? (
                  <ReferenceLine
                    x={peak.label}
                    stroke="var(--color-warning)"
                    strokeDasharray="4 4"
                    label={{
                      value: 'Hora pico',
                      position: 'insideTopRight',
                      fill: 'var(--color-warning)',
                      fontSize: 11,
                    }}
                  />
                ) : null}
                <Area
                  dataKey="total"
                  type="monotone"
                  fill={`url(#${gradientTotal})`}
                  stroke="var(--color-total)"
                  strokeWidth={metric === 'total' ? 2 : 1}
                  fillOpacity={metric === 'total' ? 1 : 0.45}
                  isAnimationActive={false}
                />
                <Area
                  dataKey="criticas"
                  type="monotone"
                  fill={`url(#${gradientCriticas})`}
                  stroke="var(--color-criticas)"
                  strokeWidth={metric === 'criticas' ? 2 : 1}
                  fillOpacity={metric === 'criticas' ? 1 : 0.45}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </div>

        <aside className="flex flex-col gap-4 border-t border-border/60 pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={() => setMetric((current) => (current === 'total' ? 'criticas' : 'total'))}
              aria-pressed={metric === 'criticas'}
              aria-label="Cambiar la serie del gráfico"
              title="Cambiar la serie del gráfico"
            >
              <GripVertical />
            </Button>
            <span className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              {METRIC_LABEL[metric]}
            </span>
          </div>

          <div>
            <p className="text-4xl leading-none font-semibold tracking-tight tabular-nums">
              {highlighted}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {metric === 'total'
                ? 'incidentes en las últimas 24 h'
                : 'incidentes críticos en 24 h'}
            </p>
          </div>

          <ul className="flex flex-col gap-2">
            {stats.map((stat) => (
              <li key={stat.label} className="flex items-start gap-2 text-xs">
                <span
                  className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground"
                  aria-hidden="true"
                />
                <span className="flex-1 text-muted-foreground">{stat.label}</span>
                <span className="font-medium text-foreground tabular-nums">{stat.value}</span>
              </li>
            ))}
          </ul>

          <Button asChild className="mt-auto w-full">
            <Link href={cta.href}>{cta.label}</Link>
          </Button>
        </aside>
      </CardContent>
    </Card>
  );
}

/** Identificador único por instancia para los degradados del gráfico. */
function useGradientId(prefix: string): string {
  const id = React.useId();
  return `${prefix}-${id.replace(/:/g, '')}`;
}
