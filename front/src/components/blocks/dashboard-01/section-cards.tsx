import { KpiCard, type KpiCardData } from './kpi-card';

/**
 * Fila de tarjetas de indicador.
 *
 * Bloque del dashboard oficial adaptado al dominio: en lugar de las cuatro
 * tarjetas de muestra, recibe los indicadores reales del centro de control y
 * los compone con el mismo esqueleto (etiqueta, cifra, variación y acceso).
 */
export interface SectionCardsProps {
  cards: readonly KpiCardData[];
}

export function SectionCards({ cards }: SectionCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cards.map((card) => (
        <KpiCard key={card.id} {...card} />
      ))}
    </div>
  );
}
