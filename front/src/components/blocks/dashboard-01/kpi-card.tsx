import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AnimatedNumber, parseFigure } from '@/components/animated-number';
import { Sparkline, type SparkTone } from '@/components/sparkline';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { DeltaBadge } from './delta-badge';

/**
 * Tarjeta de indicador del dashboard.
 *
 * Anatomía: etiqueta, cifra grande, variación contra la ventana anterior,
 * acceso directo circular arriba a la derecha y enlace "Ver informe" al pie.
 * La variación es opcional: si la métrica no tiene base de comparación, la
 * tarjeta se renderiza sin insignia en lugar de mostrar una cifra inventada.
 */
export interface KpiCardData {
  /** Identificador estable para pruebas y trazabilidad. */
  id: string;
  label: string;
  value: string;
  /** Texto de apoyo bajo la cifra. */
  hint?: string;
  /** Variación relativa contra la ventana anterior, en porcentaje. */
  change?: number;
  /** `true` cuando la variación mejora la métrica. */
  changeIsGood?: boolean;
  /** Explicación del origen de la comparación (texto emergente). */
  changeHint?: string;
  icon: LucideIcon;
  /** Destino del botón circular y del enlace "Ver informe". */
  href: string;
  /** Etiqueta del enlace de pie. */
  actionLabel?: string;
  /** Serie horaria de la tendencia del indicador. */
  spark?: readonly number[];
  /** Tono de la minigráfica de tendencia. */
  sparkTone?: SparkTone;
}

export function KpiCard({
  id,
  label,
  value,
  hint,
  change,
  changeIsGood = false,
  changeHint,
  icon: Icon,
  href,
  actionLabel = 'Ver informe',
  spark,
  sparkTone = 'muted',
}: KpiCardData) {
  const figure = parseFigure(value);

  return (
    <Card className="@container/card" data-testid={id}>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {figure ? (
            <>
              <AnimatedNumber value={figure.amount} animateOnMount />
              {figure.unit ? (
                <span className="ml-1 text-base font-medium text-muted-foreground @[250px]/card:text-lg">
                  {figure.unit}
                </span>
              ) : null}
            </>
          ) : (
            value
          )}
        </CardTitle>
        <CardAction>
          <Button variant="outline" size="icon" asChild className="rounded-full">
            <Link href={href} aria-label={`${label}: abrir informe`}>
              <Icon />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {change !== undefined ? (
            <DeltaBadge change={change} good={changeIsGood} hint={changeHint} />
          ) : null}
          {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
        </div>
        {spark && spark.length > 1 ? (
          <Sparkline
            data={spark}
            tone={sparkTone}
            className="h-7 w-full"
            label={`Tendencia de ${label}`}
          />
        ) : null}
      </CardContent>

      <CardFooter>
        <Button variant="ghost" size="sm" asChild className="px-0 hover:bg-transparent">
          <Link href={href}>
            {actionLabel}
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
