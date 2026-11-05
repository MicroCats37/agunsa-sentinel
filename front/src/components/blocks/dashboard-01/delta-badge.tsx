import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp } from 'lucide-react';

/**
 * Insignia de variación.
 *
 * Muestra el cambio de una métrica entre la ventana actual y la ventana
 * anterior, y lo colorea según si ese cambio conviene o no:
 * verde cuando mejora, rojo cuando empeora.
 *
 * La insignia nunca inventa la comparación: recibe el cambio ya calculado y
 * el color ya resuelto por quien conoce la métrica. Si una métrica no tiene
 * base de comparación, no se renderiza ninguna insignia.
 */
export interface DeltaBadgeProps {
  /** Variación relativa con signo, en porcentaje (12.5, -3.4, ...). */
  change: number;
  /** `true` cuando la variación es una mejora para la métrica descrita. */
  good: boolean;
  /** Sufijo de la unidad: porcentaje relativo por defecto. */
  unit?: '%' | 'pp';
  /** Explicación del origen de la comparación (texto emergente). */
  hint?: string;
}

export function DeltaBadge({ change, good, unit = '%', hint }: DeltaBadgeProps) {
  const rounded = Math.round(change);
  const rising = rounded >= 0;
  const Icon = rising ? TrendingUp : TrendingDown;

  return (
    <Badge variant={good ? 'positive' : 'negative'} title={hint}>
      <Icon aria-hidden="true" />
      {rising ? '+' : '-'}
      {Math.abs(rounded)}
      {unit}
    </Badge>
  );
}
