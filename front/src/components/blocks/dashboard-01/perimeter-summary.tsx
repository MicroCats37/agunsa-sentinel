import { DetailList } from '@/components/detail-list';
import { cn } from 'cn';

/**
 * Resumen real del perímetro.
 *
 * Bloque de la cabecera del dashboard: no es una ilustración, es el estado
 * agregado de las cámaras y del trabajo abierto del centro de control.
 */
export interface PerimeterSummaryProps {
  /** Cámaras operativas. */
  online: number;
  /** Cámaras instaladas en el inventario. */
  total: number;
  /** Cámaras con alerta activa. */
  withAlert: number;
  /** Cámaras desconectadas. */
  offline: number;
  /** Cámaras con falla de equipo. */
  failed: number;
  /** Sectores con al menos una cámara en servicio. */
  sectorsCovered: number;
  /** Sectores definidos en el inventario. */
  sectorsTotal: number;
  /** Zonas inteligentes configuradas. */
  zones: number;
  /** Incidentes que siguen abiertos. */
  activeIncidents: number;
  /** Porcentaje de incidentes cerrados sobre el histórico del store. */
  resolutionRate: number;
  className?: string;
}

export function PerimeterSummary({
  online,
  total,
  withAlert,
  offline,
  failed,
  sectorsCovered,
  sectorsTotal,
  zones,
  activeIncidents,
  resolutionRate,
  className,
}: PerimeterSummaryProps) {
  const outOfService = offline + failed;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div>
        <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          Perímetro
        </p>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="text-3xl leading-none font-semibold tracking-tight tabular-nums">
            {online}
          </span>
          <span className="text-sm text-muted-foreground tabular-nums">/ {total} en línea</span>
        </p>
      </div>

      <div
        className="flex h-1.5 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${online} cámaras en línea, ${withAlert} con alerta y ${outOfService} fuera de servicio`}
      >
        <span className="h-full bg-normal" style={{ width: `${percent(online, total)}%` }} />
        <span className="h-full bg-critical" style={{ width: `${percent(withAlert, total)}%` }} />
        <span className="h-full bg-warning" style={{ width: `${percent(failed, total)}%` }} />
        <span
          className="h-full bg-muted-foreground/50"
          style={{ width: `${percent(offline, total)}%` }}
        />
      </div>

      <DetailList
        columns={2}
        items={[
          { label: 'Con alerta', value: <span className="tabular-nums">{withAlert}</span> },
          {
            label: 'Fuera de servicio',
            value: <span className="tabular-nums">{outOfService}</span>,
          },
          {
            label: 'Sectores',
            value: (
              <span className="tabular-nums">
                {sectorsCovered}/{sectorsTotal}
              </span>
            ),
          },
          { label: 'Zonas', value: <span className="tabular-nums">{zones}</span> },
          {
            label: 'Abiertos',
            value: (
              <span className="tabular-nums" data-testid="stat-incidentes-activos-value">
                {activeIncidents}
              </span>
            ),
          },
          {
            label: 'Resolución',
            value: <span className="tabular-nums">{resolutionRate} %</span>,
          },
        ]}
      />
    </div>
  );
}

function percent(value: number, total: number): number {
  if (total <= 0) return 0;
  return (value / total) * 100;
}
