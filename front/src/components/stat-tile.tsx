import { AnimatedNumber } from '@/components/animated-number';
import { Sparkline, type SparkTone } from '@/components/sparkline';
import { Card } from '@/components/ui/card';
import { cn } from 'cn';
import type { ReactNode } from 'react';

/** Tiles de indicador del dashboard. Cifras tabulares para alinear columnas. */

export type StatTone = 'neutral' | 'critical' | 'warning' | 'normal' | 'info';

export interface StatTileProps {
  label: string;
  value: number | string;
  hint?: string;
  tone?: StatTone;
  icon?: ReactNode;
  onClick?: () => void;
  testId?: string;
  /** Serie de la última hora para la minigráfica de tendencia. */
  spark?: readonly number[];
  /** Tono de la minigráfica. */
  sparkTone?: SparkTone;
}

const toneClasses: Record<StatTone, { value: string; accent: string }> = {
  neutral: { value: 'text-foreground', accent: 'bg-muted' },
  critical: { value: 'text-critical', accent: 'bg-critical' },
  warning: { value: 'text-warning', accent: 'bg-warning' },
  normal: { value: 'text-normal', accent: 'bg-normal' },
  info: { value: 'text-info', accent: 'bg-info' },
};

export function StatTile({
  label,
  value,
  hint,
  tone = 'neutral',
  icon,
  onClick,
  testId,
  spark,
  sparkTone,
}: StatTileProps) {
  const classes = toneClasses[tone];
  const interactive = onClick !== undefined;

  return (
    <Card
      size="sm"
      interactive={interactive}
      className={cn(
        'relative gap-1 overflow-hidden',
        interactive &&
          'cursor-pointer transition-colors duration-(--duration-fast) ease-(--ease-out) hover:border-foreground/20',
      )}
      onClick={onClick}
      {...(testId ? { 'data-testid': testId } : {})}
    >
      <div className="flex items-start justify-between gap-2 px-(--card-spacing)">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {label}
          </p>
          <p
            data-slot="stat-value"
            className={cn(
              'mt-1 text-[28px] leading-none font-semibold tracking-tight tabular-nums',
              classes.value,
            )}
            {...(testId ? { 'data-testid': `${testId}-value` } : {})}
          >
            {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
          </p>
          {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      {spark && spark.length > 1 ? (
        <div className="mt-2 px-(--card-spacing) pb-(--card-spacing)">
          <Sparkline
            data={spark}
            tone={sparkTone ?? (tone === 'neutral' ? 'muted' : tone)}
            className="h-7 w-full"
            label={`Tendencia de ${label}`}
          />
        </div>
      ) : null}
      <span className={`absolute inset-y-0 left-0 w-0.5 ${classes.accent}`} aria-hidden="true" />
    </Card>
  );
}
