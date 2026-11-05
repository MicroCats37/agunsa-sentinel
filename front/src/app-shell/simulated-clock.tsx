'use client';

import { PLATFORM_NOW_MS } from '@/domain/clock';
import { useEffect, useState } from 'react';

/**
 * Reloj de la plataforma simulada.
 *
 * Arranca en el instante de referencia del mockup y avanza en tiempo real,
 * de modo que las marcas de tiempo de la interfaz nunca dependen de la hora
 * del servidor (y por tanto no hay desajustes de hidratación).
 */
export function SimulatedClock() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const start = Date.now();
    setNow(PLATFORM_NOW_MS);
    const timer = window.setInterval(() => {
      setNow(PLATFORM_NOW_MS + (Date.now() - start));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (now === null) {
    return <span className="text-muted-foreground tabular-nums">--:--:--</span>;
  }

  const date = new Date(now);
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');

  return (
    <span className="text-muted-foreground tabular-nums" suppressHydrationWarning>
      {hh}:{mm}:{ss}
    </span>
  );
}
