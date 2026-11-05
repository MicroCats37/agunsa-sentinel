import { cn } from 'cn';
import type { ReactNode } from 'react';

/**
 * Lista de detalle campo/valor para fichas y paneles de informacion.
 *
 * La etiqueta va en versalitas y el valor manda: la jerarquia se lee sin
 * necesidad de bordes ni separadores.
 */

export interface DetailListItem {
  label: string;
  value: ReactNode;
}

export interface DetailListProps {
  items: DetailListItem[];
  /** Numero de columnas en pantalla ancha. */
  columns?: 1 | 2;
  className?: string;
}

export function DetailList({ items, columns = 1, className }: DetailListProps) {
  return (
    <dl
      data-slot="detail-list"
      className={cn('grid gap-x-6 gap-y-2.5', columns === 2 && 'sm:grid-cols-2', className)}
    >
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
            {item.label}
          </dt>
          <dd className="mt-0.5 text-sm font-medium text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
