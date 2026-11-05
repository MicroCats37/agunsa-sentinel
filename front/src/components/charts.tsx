'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_AXIS, CHART_COLORS, CHART_GRID } from '@/components/chart-palette';
import type { NamedCount } from '@/domain/analytics';

/**
 * Gráficos del dashboard y de la analítica.
 *
 * Todos comparten la misma escala visual: rejilla tenue, ejes apagados y una
 * paleta semántica idéntica a la del resto de la plataforma.
 */

const tooltipStyle = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--popover-foreground)',
  fontSize: '12px',
} as const;

const axisProps = {
  stroke: CHART_AXIS,
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

export function HourlyIncidentsChart({ data }: { data: NamedCount[] }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -22 }}>
        <CartesianGrid stroke={CHART_GRID} vertical={false} />
        <XAxis dataKey="label" {...axisProps} interval={2} />
        <YAxis {...axisProps} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: 'rgba(148,163,184,0.08)' }}
          labelFormatter={(label) => `Hora ${label}`}
        />
        <Bar dataKey="total" name="Incidentes" fill={CHART_COLORS.info} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DailyIncidentsChart({ data }: { data: NamedCount[] }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -22 }}>
        <CartesianGrid stroke={CHART_GRID} vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: 'rgba(148,163,184,0.08)' }}
          labelFormatter={(label) => `Día ${label}`}
        />
        <Bar dataKey="total" name="Incidentes" fill={CHART_COLORS.normal} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ZoneIncidentsChart({ data }: { data: NamedCount[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid stroke={CHART_GRID} horizontal={false} />
        <XAxis type="number" {...axisProps} allowDecimals={false} />
        <YAxis type="category" dataKey="label" {...axisProps} width={150} />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: 'rgba(148,163,184,0.08)' }}
          labelFormatter={(label) => String(label)}
        />
        <Bar dataKey="total" name="Incidentes" fill={CHART_COLORS.warning} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CameraFrequencyChart({ data }: { data: NamedCount[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 30)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid stroke={CHART_GRID} horizontal={false} />
        <XAxis type="number" {...axisProps} allowDecimals={false} />
        <YAxis type="category" dataKey="label" {...axisProps} width={190} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
        <Bar dataKey="total" name="Eventos" fill={CHART_COLORS.accent} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryDonutChart({ data }: { data: NamedCount[] }) {
  const palette = [
    CHART_COLORS.info,
    CHART_COLORS.normal,
    CHART_COLORS.warning,
    CHART_COLORS.critical,
    CHART_COLORS.accent,
    CHART_COLORS.neutral,
  ];
  return (
    <ResponsiveContainer width="100%" height={230}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="label"
          innerRadius={54}
          outerRadius={86}
          paddingAngle={2}
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={entry.key} fill={palette[index % palette.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ color: CHART_AXIS, fontSize: 12 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export interface ResponsePoint {
  label: string;
  minutes: number;
}

export function ResponseTimeChart({ data }: { data: ResponsePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -22 }}>
        <CartesianGrid stroke={CHART_GRID} vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} unit=" min" />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(label) => `Turno ${label}`}
          formatter={(value) => [`${String(value)} min`, 'Tiempo medio']}
        />
        <Line
          type="monotone"
          dataKey="minutes"
          stroke={CHART_COLORS.info}
          strokeWidth={2}
          dot={{ r: 2.5, fill: CHART_COLORS.info, strokeWidth: 0 }}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
