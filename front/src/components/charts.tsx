'use client';

import { useId, useMemo } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';
import type { LabelProps } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import type { NamedCount } from '@/domain/analytics';
import { INCIDENT_CATEGORY_LABEL } from '@/domain/labels';
import type { IncidentCategory } from '@/domain/types';

/**
 * Operational charts.
 *
 * Shared rules for every chart in the platform:
 * · the color of a series is bound to its business key, never to its position,
 *   so the same category always paints the same in the dashboard and in the
 *   analytics;
 * · the palette comes from the `--chart-*` theme tokens, so it follows the
 *   active theme (light / dark) without a second source of truth;
 * · data series (incidents per hour/day, zones, cameras, response time) paint
 *   in the neutral grey token; color is reserved for meaning (categories,
 *   severity, SLA);
 * · the legend and the tooltip speak the language of the domain
 *   (`INCIDENT_CATEGORY_LABEL`), never a raw key.
 */

/** Default height of a chart, in pixels. Cards may override it. */
const DEFAULT_HEIGHT = 240;

/** Height reserved for the donut legend, so the center total stays aligned. */
const DONUT_LEGEND_HEIGHT = 40;

/** Response time objective (SLA), in minutes. */
const SLA_RESPONSE_MINUTES = 15;

/** Fixed color per incident category. A category never changes its token. */
const CATEGORY_COLOR: Record<string, string> = {
  persona: 'var(--chart-1)',
  vehiculo: 'var(--chart-2)',
  falla_camara: 'var(--chart-4)',
  en_revision: 'var(--chart-5)',
};

/** Token for the categories without a reserved meaning (amber). */
const CATEGORY_COLOR_FALLBACK = 'var(--chart-3)';

/**
 * Neutral grey for data series: counts and measures are structure, not
 * meaning, so they stay out of the semantic palette.
 */
const NEUTRAL_SERIES = 'var(--chart-6)';

const HOURLY_CONFIG = {
  total: { label: 'Incidentes', color: NEUTRAL_SERIES },
} satisfies ChartConfig;

const DAILY_CONFIG = {
  total: { label: 'Incidentes', color: NEUTRAL_SERIES },
} satisfies ChartConfig;

const ZONE_CONFIG = {
  total: { label: 'Incidentes', color: NEUTRAL_SERIES },
} satisfies ChartConfig;

const CAMERA_CONFIG = {
  total: { label: 'Eventos', color: NEUTRAL_SERIES },
} satisfies ChartConfig;

const RESPONSE_CONFIG = {
  minutes: { label: 'Tiempo medio de atención', color: NEUTRAL_SERIES },
} satisfies ChartConfig;

const integerFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
const decimalFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });
const percentFormat = new Intl.NumberFormat('es-ES', {
  style: 'percent',
  maximumFractionDigits: 0,
});

export interface ChartProps {
  data: NamedCount[];
  /** Height in pixels. Cards may control it. */
  height?: number;
}

export interface ResponsePoint {
  label: string;
  /** Minutes to close the incidents of the day, or `null` when there is no data. */
  minutes: number | null;
}

/**
 * Incidents per hour, with the peak hour marked.
 */
export function HourlyIncidentsChart({ data, height = DEFAULT_HEIGHT }: ChartProps) {
  const gradientId = useGradientId('grad-hourly');
  const peak = useMemo(() => findPeak(data), [data]);
  const max = useMemo(() => Math.max(0, ...data.map((entry) => entry.total)), [data]);

  if (data.length === 0) {
    return (
      <ChartEmpty
        title="Sin incidentes por hora"
        description="No hay detecciones registradas en el periodo."
      />
    );
  }

  return (
    <ChartContainer
      config={HOURLY_CONFIG}
      className="aspect-auto"
      style={{ height }}
      role="img"
      aria-label="Incidentes por hora en las últimas 24 horas"
    >
      <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-total)" stopOpacity={0.95} />
            <stop offset="100%" stopColor="var(--color-total)" stopOpacity={0.25} />
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
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickMargin={4} width={40} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => `Hora ${label}`}
              formatter={seriesFormatter(NEUTRAL_SERIES, 'Incidentes', 'incidentes')}
            />
          }
        />
        {peak ? (
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
        <Bar
          dataKey="total"
          name="Incidentes"
          fill={`url(#${gradientId})`}
          radius={[3, 3, 0, 0]}
          maxBarSize={26}
        >
          <LabelList dataKey="total" content={maxValueLabel(max)} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

/**
 * Incidents per day over the analyzed window.
 */
export function DailyIncidentsChart({ data, height = DEFAULT_HEIGHT }: ChartProps) {
  const gradientId = useGradientId('grad-daily');
  const max = useMemo(() => Math.max(0, ...data.map((entry) => entry.total)), [data]);

  if (data.length === 0) {
    return (
      <ChartEmpty
        title="Sin incidentes por día"
        description="No hay detecciones registradas en el periodo."
      />
    );
  }

  return (
    <ChartContainer
      config={DAILY_CONFIG}
      className="aspect-auto"
      style={{ height }}
      role="img"
      aria-label="Incidentes por día en las últimas dos semanas"
    >
      <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-total)" stopOpacity={0.95} />
            <stop offset="100%" stopColor="var(--color-total)" stopOpacity={0.25} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          interval={1}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={4}
        />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickMargin={4} width={40} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => `Día ${label}`}
              formatter={seriesFormatter(NEUTRAL_SERIES, 'Incidentes', 'incidentes')}
            />
          }
        />
        <Bar
          dataKey="total"
          name="Incidentes"
          fill={`url(#${gradientId})`}
          radius={[3, 3, 0, 0]}
          maxBarSize={34}
        >
          <LabelList dataKey="total" content={maxValueLabel(max)} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

/**
 * Zones with the most incidents. Long zone names are truncated on the axis.
 */
export function ZoneIncidentsChart({
  data,
  height = Math.max(DEFAULT_HEIGHT, data.length * 32),
}: ChartProps) {
  const gradientId = useGradientId('grad-zone');
  const total = useMemo(() => data.reduce((sum, entry) => sum + entry.total, 0), [data]);

  if (data.length === 0) {
    return (
      <ChartEmpty
        title="Sin zonas con actividad"
        description="Todavía no hay incidentes registrados en ninguna zona."
      />
    );
  }

  return (
    <ChartContainer
      config={ZONE_CONFIG}
      className="aspect-auto"
      style={{ height }}
      role="img"
      aria-label="Incidentes por zona inteligente"
    >
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-total)" stopOpacity={0.95} />
            <stop offset="100%" stopColor="var(--color-total)" stopOpacity={0.3} />
          </linearGradient>
        </defs>
        <CartesianGrid horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tickMargin={4}
        />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={160}
          tickFormatter={(value) => truncateLabel(String(value), 22)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={shareFormatter(NEUTRAL_SERIES, 'Incidentes', 'incidentes', total)}
            />
          }
        />
        <Bar
          dataKey="total"
          name="Incidentes"
          fill={`url(#${gradientId})`}
          radius={[0, 3, 3, 0]}
          maxBarSize={18}
        />
      </BarChart>
    </ChartContainer>
  );
}

/**
 * Cameras with the most events. Long camera names are truncated on the axis.
 */
export function CameraFrequencyChart({
  data,
  height = Math.max(DEFAULT_HEIGHT, data.length * 30),
}: ChartProps) {
  const gradientId = useGradientId('grad-camera');
  const total = useMemo(() => data.reduce((sum, entry) => sum + entry.total, 0), [data]);

  if (data.length === 0) {
    return (
      <ChartEmpty
        title="Sin eventos por cámara"
        description="No hay detecciones registradas en el periodo."
      />
    );
  }

  return (
    <ChartContainer
      config={CAMERA_CONFIG}
      className="aspect-auto"
      style={{ height }}
      role="img"
      aria-label="Frecuencia de eventos por cámara"
    >
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-total)" stopOpacity={0.95} />
            <stop offset="100%" stopColor="var(--color-total)" stopOpacity={0.3} />
          </linearGradient>
        </defs>
        <CartesianGrid horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tickMargin={4}
        />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={200}
          tickFormatter={(value) => truncateLabel(String(value), 28)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={shareFormatter(NEUTRAL_SERIES, 'Eventos', 'eventos', total)}
            />
          }
        />
        <Bar
          dataKey="total"
          name="Eventos"
          fill={`url(#${gradientId})`}
          radius={[0, 3, 3, 0]}
          maxBarSize={18}
        />
      </BarChart>
    </ChartContainer>
  );
}

/**
 * Incidents per category. Each category keeps its own token, and the total
 * sits in the middle of the ring.
 */
export function CategoryDonutChart({ data, height = DEFAULT_HEIGHT }: ChartProps) {
  const config = useMemo<ChartConfig>(() => {
    const entries: ChartConfig = {};
    for (const entry of data) {
      entries[entry.key] = {
        label: categoryLabel(entry.key),
        color: categoryColor(entry.key),
      };
    }
    return entries;
  }, [data]);
  const total = useMemo(() => data.reduce((sum, entry) => sum + entry.total, 0), [data]);

  if (data.length === 0) {
    return (
      <ChartEmpty
        title="Sin categorías activas"
        description="No hay detecciones clasificadas en el periodo."
      />
    );
  }

  return (
    <div className="relative">
      <ChartContainer
        config={config}
        className="aspect-auto"
        style={{ height }}
        role="img"
        aria-label="Distribución de incidentes por categoría"
      >
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Pie
            data={data}
            dataKey="total"
            nameKey="label"
            innerRadius={54}
            outerRadius={86}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.key} fill={`var(--color-${entry.key})`} />
            ))}
          </Pie>
          <ChartTooltip content={<ChartTooltipContent formatter={categoryFormatter} />} />
          {/*
            The legend resolves every slice against the config by category key,
            so it reads `INCIDENT_CATEGORY_LABEL` and never the raw key.
          */}
          <ChartLegend
            height={DONUT_LEGEND_HEIGHT}
            content={<ChartLegendContent nameKey="key" className="flex-wrap gap-x-3 gap-y-1" />}
          />
        </PieChart>
      </ChartContainer>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center justify-center"
        style={{ height: `calc(100% - ${DONUT_LEGEND_HEIGHT}px)` }}
        aria-hidden="true"
      >
        <span className="text-3xl leading-none font-semibold text-foreground tabular-nums">
          {integerFormat.format(total)}
        </span>
        <span className="mt-1 text-[11px] text-muted-foreground">incidentes</span>
      </div>
    </div>
  );
}

/**
 * Mean time to attention per day. Days without closed incidents are a gap,
 * not a zero: the line breaks instead of pretending an instant response.
 */
export function ResponseTimeChart({
  data,
  height = DEFAULT_HEIGHT,
}: {
  data: ResponsePoint[];
  height?: number;
}) {
  const gradientId = useGradientId('grad-response');

  if (data.length === 0) {
    return (
      <ChartEmpty
        title="Sin tiempos de atención"
        description="No hay incidentes cerrados en el periodo."
      />
    );
  }

  return (
    <ChartContainer
      config={RESPONSE_CONFIG}
      className="aspect-auto"
      style={{ height }}
      role="img"
      aria-label="Tiempo medio de atención por día"
    >
      <ComposedChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-minutes)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-minutes)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={8} />
        <YAxis
          allowDecimals={false}
          domain={[0, 'auto']}
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          width={56}
          tickFormatter={(value) => `${value} min`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => `Día ${label}`}
              formatter={responseFormatter}
            />
          }
        />
        <ReferenceLine
          y={SLA_RESPONSE_MINUTES}
          stroke="var(--color-critical)"
          strokeDasharray="4 4"
          label={{
            value: `SLA ${SLA_RESPONSE_MINUTES} min`,
            position: 'insideTopRight',
            fill: 'var(--color-critical)',
            fontSize: 11,
          }}
        />
        <Area
          type="monotone"
          dataKey="minutes"
          stroke="none"
          fill={`url(#${gradientId})`}
          connectNulls={false}
          isAnimationActive={false}
          tooltipType="none"
        />
        <Line
          type="monotone"
          dataKey="minutes"
          name="Tiempo medio"
          stroke="var(--color-minutes)"
          strokeWidth={2}
          dot={{ r: 2.5, fill: 'var(--color-minutes)', strokeWidth: 0 }}
          activeDot={{ r: 4 }}
          connectNulls={false}
        />
      </ComposedChart>
    </ChartContainer>
  );
}

/**
 * Empty state shared by every chart: a titled placeholder instead of a bare
 * paragraph or an empty plot.
 */
function ChartEmpty({ title, description }: { title: string; description: string }) {
  return (
    <Empty className="min-h-40 border border-border/60">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/**
 * Row of the tooltip: swatch, series label, value and its unit.
 */
function TooltipRow({
  color,
  label,
  value,
  hint,
}: {
  color: string;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <span
          className="size-2.5 shrink-0 rounded-[2px]"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        {label}
      </span>
      <span className="flex items-baseline gap-2">
        {hint ? (
          <span className="text-[10px] text-muted-foreground tabular-nums">{hint}</span>
        ) : null}
        <span className="font-mono font-medium text-foreground tabular-nums">{value}</span>
      </span>
    </div>
  );
}

/** Tooltip of a single-series chart: the count with its unit. */
function seriesFormatter(color: string, label: string, unit: string) {
  return (value: unknown) => (
    <TooltipRow
      color={color}
      label={label}
      value={`${integerFormat.format(toNumber(value))} ${unit}`}
    />
  );
}

/** Tooltip of a ranked chart: the count with its unit and its share. */
function shareFormatter(color: string, label: string, unit: string, total: number) {
  return (value: unknown) => {
    const count = toNumber(value);
    const share = total > 0 ? percentFormat.format(count / total) : '—';
    return (
      <TooltipRow
        color={color}
        label={label}
        value={`${integerFormat.format(count)} ${unit}`}
        hint={share}
      />
    );
  };
}

/** Tooltip of the donut: the label comes from the category, not from the key. */
function categoryFormatter(value: unknown, name?: unknown) {
  const key = String(name ?? '');
  return (
    <TooltipRow
      color={categoryColor(key)}
      label={categoryLabel(key)}
      value={`${integerFormat.format(toNumber(value))} incidentes`}
    />
  );
}

/** Tooltip of the response time: minutes with one decimal. */
function responseFormatter(value: unknown) {
  return (
    <TooltipRow
      color={NEUTRAL_SERIES}
      label="Tiempo medio"
      value={`${decimalFormat.format(toNumber(value))} min`}
    />
  );
}

/**
 * Label of the highest bar only: a value on every bar is noise.
 */
function maxValueLabel(max: number) {
  if (max <= 0) return () => null;
  return function MaxValueLabel({ x, y, width, value }: LabelProps) {
    if (value !== max) return null;
    return (
      <text
        x={Number(x ?? 0) + Number(width ?? 0) / 2}
        y={Number(y ?? 0) - 6}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill="var(--foreground)"
      >
        {integerFormat.format(max)}
      </text>
    );
  };
}

/** Human label of an incident category. */
function categoryLabel(key: string): string {
  return INCIDENT_CATEGORY_LABEL[key as IncidentCategory] ?? key;
}

/** Token of an incident category: fixed per category, never per position. */
function categoryColor(key: string): string {
  return CATEGORY_COLOR[key] ?? CATEGORY_COLOR_FALLBACK;
}

/** Entry with the highest count. Ties keep the first one. */
function findPeak(data: readonly NamedCount[]): NamedCount | undefined {
  let peak: NamedCount | undefined;
  for (const entry of data) {
    if (!peak || entry.total > peak.total) peak = entry;
  }
  return peak;
}

/** Unique id per instance for the gradient definitions. */
function useGradientId(prefix: string): string {
  const id = useId();
  return `${prefix}-${id.replace(/:/g, '')}`;
}

/** Shortens long axis labels without hiding them entirely. */
function truncateLabel(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** Coerces a tooltip value into a number. */
function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (Array.isArray(value)) return toNumber(value[value.length - 1]);
  return 0;
}
