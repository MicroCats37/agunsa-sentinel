import { cn } from 'cn';
import type { ComponentType, ReactNode } from 'react';

/**
 * Aviso contextual dentro de un panel.
 *
 * El tono se resuelve con el color semantico de operacion (informacion,
 * advertencia, critico) y nunca con un borde lateral grueso: la profundidad
 * la aporta el fondo tenue y el filete de 1px.
 */

export type CalloutTone = 'info' | 'warning' | 'critical' | 'neutral';

export interface CalloutProps {
  /** Tono operativo del aviso. */
  tone?: CalloutTone;
  /** Titulo en mayusculas; opcional. */
  title?: string;
  /** Icono del tono, como componente (`CircleAlert`, `Info`, ...). */
  icon?: ComponentType<{ className?: string }>;
  children: ReactNode;
  className?: string;
}

const toneClasses: Record<CalloutTone, { surface: string; accent: string }> = {
  info: { surface: 'bg-info/8 border-info/25', accent: 'text-info' },
  warning: { surface: 'bg-warning/8 border-warning/25', accent: 'text-warning' },
  critical: { surface: 'bg-critical/8 border-critical/25', accent: 'text-critical' },
  neutral: { surface: 'bg-muted/40 border-border', accent: 'text-muted-foreground' },
};

export function Callout({
  tone = 'neutral',
  title,
  icon: Icon,
  children,
  className,
}: CalloutProps) {
  const classes = toneClasses[tone];

  return (
    <div
      data-slot="callout"
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-xs text-muted-foreground',
        classes.surface,
        className,
      )}
    >
      {Icon ? <Icon className={cn('mt-0.5 size-4 shrink-0', classes.accent)} /> : null}
      <div className="min-w-0 flex-1">
        {title ? (
          <p className={cn('text-[11px] font-semibold tracking-[0.1em] uppercase', classes.accent)}>
            {title}
          </p>
        ) : null}
        <div className={cn(title && 'mt-1')}>{children}</div>
      </div>
    </div>
  );
}
