'use client';

import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

import { useIsMobile } from '@/hooks/use-mobile';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export const description = 'Personas y vehículos detectados por hora';

/**
 * Actividad detectada en el perímetro.
 *
 * Bloque del dashboard oficial adaptado al dominio: conserva el selector de
 * ventana y el degradado del área, pero las series son las detecciones
 * reales del histórico simulado (personas y vehículos) y el color se mantiene
 * en la escala de grises.
 */
export type ActivityRange = '24h' | '7d' | '14d';

export interface ActivityPoint {
  /** Etiqueta del eje X (hora o día). */
  label: string;
  personas: number;
  vehiculos: number;
}

export interface ActivityWindow {
  points: ActivityPoint[];
  personas: number;
  vehiculos: number;
}

export interface ChartAreaInteractiveProps {
  title: string;
  description: string;
  /** Serie de cada ventana disponible. */
  windows: Record<ActivityRange, ActivityWindow>;
}

const RANGE_OPTIONS: { value: ActivityRange; label: string }[] = [
  { value: '24h', label: '24 h' },
  { value: '7d', label: '7 días' },
  { value: '14d', label: '14 días' },
];

const ACTIVITY_CONFIG = {
  personas: { label: 'Personas', color: 'var(--chart-6)' },
  vehiculos: { label: 'Vehículos', color: 'var(--chart-5)' },
} satisfies ChartConfig;

export function ChartAreaInteractive({ title, description, windows }: ChartAreaInteractiveProps) {
  const isMobile = useIsMobile();
  const [range, setRange] = React.useState<ActivityRange>('24h');
  const fillPersonas = useGradientId('fill-personas');
  const fillVehiculos = useGradientId('fill-vehiculos');

  React.useEffect(() => {
    if (isMobile) {
      setRange('24h');
    }
  }, [isMobile]);

  const active = windows[range];
  const chartData = React.useMemo(
    () => active.points.map((point) => ({ ...point })),
    [active.points],
  );

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(value) => {
              if (value) setRange(value as ActivityRange);
            }}
            variant="outline"
            size="sm"
            className="hidden *:data-[slot=toggle-group-item]:px-3! @[540px]/card:flex"
          >
            {RANGE_OPTIONS.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value}>
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Select value={range} onValueChange={(value) => setRange(value as ActivityRange)}>
            <SelectTrigger
              className="flex w-32 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[540px]/card:hidden"
              size="sm"
              aria-label="Ventana temporal"
            >
              <SelectValue placeholder="24 h" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="rounded-lg">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>

      <CardContent>
        {active.personas === 0 && active.vehiculos === 0 ? (
          <Empty className="min-h-48 border border-border/60">
            <EmptyHeader>
              <EmptyTitle>Sin actividad detectada</EmptyTitle>
              <EmptyDescription>
                No hay personas ni vehículos registrados en la ventana seleccionada.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ChartContainer
            config={ACTIVITY_CONFIG}
            className="aspect-auto h-[200px] w-full"
            role="img"
            aria-label="Personas y vehículos detectados por periodo"
          >
            <AreaChart data={chartData} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={fillVehiculos} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-vehiculos)" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="var(--color-vehiculos)" stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id={fillPersonas} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-personas)" stopOpacity={0.95} />
                  <stop offset="95%" stopColor="var(--color-personas)" stopOpacity={0.15} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={16}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
              <Area
                dataKey="vehiculos"
                type="natural"
                fill={`url(#${fillVehiculos})`}
                stroke="var(--color-vehiculos)"
                strokeWidth={1.5}
                stackId="a"
                isAnimationActive={false}
              />
              <Area
                dataKey="personas"
                type="natural"
                fill={`url(#${fillPersonas})`}
                stroke="var(--color-personas)"
                strokeWidth={1.5}
                stackId="a"
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
          <div>
            <dt className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
              Personas
            </dt>
            <dd className="mt-0.5 text-xl font-semibold tabular-nums">{active.personas}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
              Vehículos
            </dt>
            <dd className="mt-0.5 text-xl font-semibold tabular-nums">{active.vehiculos}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

/** Identificador único por instancia para los degradados del gráfico. */
function useGradientId(prefix: string): string {
  const id = React.useId();
  return `${prefix}-${id.replace(/:/g, '')}`;
}
