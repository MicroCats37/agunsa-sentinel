'use client';

import { useLiveStore } from '@/store/live-store';

/**
 * Reloj de operación del centro de control.
 *
 * Es la hora del turno: arranca en el instante de referencia de la plataforma
 * y avanza en tiempo real mientras la operación está en vivo. En pausa se
 * congela, de modo que el operador lee siempre la hora del último evento
 * recibido.
 */
export function OperationClock() {
  const clockMs = useLiveStore((state) => state.clockMs);

  const date = new Date(clockMs);
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');

  return (
    <time
      dateTime={date.toISOString()}
      aria-label="Hora del centro de control"
      className="text-muted-foreground tabular-nums"
      suppressHydrationWarning
    >
      {hh}:{mm}:{ss}
    </time>
  );
}
