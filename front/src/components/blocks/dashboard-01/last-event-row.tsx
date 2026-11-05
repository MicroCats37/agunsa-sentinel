import { Radio } from 'lucide-react';
import Link from 'next/link';
import type { Incident } from '@/domain/types';

/**
 * Último evento del centro de control.
 *
 * Sustituye al marquee infinito: una sola línea con el evento más reciente,
 * su cámara y su hora. Sin desplazamiento, sin memoria y sin ocultar
 * información detrás de un bucle que el operador nunca puede pausar.
 */
export interface LastEventRowProps {
  incident: Incident | null;
}

export function LastEventRow({ incident }: LastEventRowProps) {
  if (!incident) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-card/60 px-3 py-2"
      data-testid="last-event"
    >
      <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        <Radio className="size-3.5 text-info" aria-hidden="true" />
        Último evento
      </span>
      <span className="hidden h-3 w-px bg-border sm:block" aria-hidden="true" />
      <Link
        href={`/incidentes/${incident.id}`}
        className="font-mono text-[11px] text-info hover:underline"
      >
        {incident.cameraId}
      </Link>
      <span className="text-xs text-muted-foreground tabular-nums">
        {shortStamp(incident.occurredAt)}
      </span>
      <span className="truncate text-xs text-muted-foreground">{incident.type}</span>
    </div>
  );
}

/** Marca de tiempo corta y estable (UTC): `dd/mm hh:mm`. */
function shortStamp(iso: string): string {
  const date = new Date(iso);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${day}/${month} ${hours}:${minutes}`;
}
