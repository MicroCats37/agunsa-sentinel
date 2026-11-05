import { AnimatedNumber, parseFigure } from '@/components/animated-number';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReactNode } from 'react';
import { DeltaBadge } from './delta-badge';

/**
 * Cabecera del dashboard: el estado global de la instalación en una sola
 * lectura, con las dos métricas que resumen la carga de las últimas 24 h y
 * un bloque real a la derecha (resumen del perímetro).
 */
export interface HeroMetric {
  id: string;
  label: string;
  value: string;
  /** Variación relativa contra la ventana anterior, en porcentaje. */
  change?: number;
  /** `true` cuando la variación mejora la métrica. */
  changeIsGood: boolean;
  /** Explicación del origen de la comparación (texto emergente). */
  changeHint?: string;
  /** Texto de apoyo bajo la cifra. */
  hint?: string;
}

export interface HeroPanelProps {
  title: string;
  description: string;
  metrics: readonly HeroMetric[];
  /** Bloque real de la derecha. */
  aside: ReactNode;
}

export function HeroPanel({ title, description, metrics, aside }: HeroPanelProps) {
  return (
    <Card className="@container/hero">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="grid content-start gap-5 sm:grid-cols-2">
          {metrics.map((metric) => {
            const figure = parseFigure(metric.value);

            return (
              <div key={metric.id} className="flex flex-col gap-1.5">
                <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  {metric.label}
                </p>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-3xl leading-none font-semibold tracking-tight tabular-nums">
                    {figure ? (
                      <>
                        <AnimatedNumber value={figure.amount} animateOnMount />
                        {figure.unit ? (
                          <span className="ml-1 text-lg font-medium text-muted-foreground">
                            {figure.unit}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      metric.value
                    )}
                  </span>
                  {metric.change !== undefined ? (
                    <DeltaBadge
                      change={metric.change}
                      good={metric.changeIsGood}
                      hint={metric.changeHint}
                    />
                  ) : null}
                </div>
                {metric.hint ? (
                  <p className="text-xs text-muted-foreground">{metric.hint}</p>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/30 p-4">{aside}</div>
      </CardContent>
    </Card>
  );
}
