/**
 * Sparkline de tendencia.
 *
 * Gráfico mínimo en SVG, sin dependencias: la tendencia de un indicador cabe
 * en 96×28 píxeles y no necesita ejes ni leyenda.
 */

export type SparkTone = 'info' | 'normal' | 'warning' | 'critical' | 'muted';

const TONE_COLOR: Record<SparkTone, string> = {
  info: '#4a8fd6',
  normal: '#3fb27f',
  warning: '#e8a33d',
  critical: '#e5484d',
  muted: '#78849a',
};

export interface SparklineProps {
  data: readonly number[];
  tone?: SparkTone;
  className?: string;
  /** Etiqueta accesible con la tendencia. */
  label?: string;
}

export function Sparkline({ data, tone = 'info', className, label }: SparklineProps) {
  if (data.length < 2) return null;

  const width = 96;
  const height = 28;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const step = width / (data.length - 1);

  const points = data.map((value, index) => {
    const x = index * step;
    const y = height - ((value - min) / span) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const color = TONE_COLOR[tone];
  const area = `0,${height} ${points.join(' ')} ${width},${height}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={label ?? 'Tendencia'}
      preserveAspectRatio="none"
    >
      <polygon points={area} fill={color} opacity="0.14" />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={width}
        cy={Number(points[points.length - 1]?.split(',')[1] ?? 0)}
        r="2"
        fill={color}
      />
    </svg>
  );
}
