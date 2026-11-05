'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Contador animado.
 *
 * Cuando el valor cambia (por ejemplo al simular un incidente) la cifra
 * transita en lugar de saltar: el operador percibe el cambio sin leer un
 * delta. Con `prefers-reduced-motion` la transición se omite.
 */

export interface AnimatedNumberProps {
  value: number;
  /** Duración aproximada de la transición, en milisegundos. */
  durationMs?: number;
  format?: (value: number) => string;
  className?: string;
}

export function AnimatedNumber({
  value,
  durationMs = 700,
  format = (current) => String(Math.round(current)),
  className,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }

    const from = fromRef.current;
    if (from === value) return;

    const start = performance.now();
    const tick = (now: number): void => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);
      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
        frameRef.current = null;
      }
    };

    frameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      fromRef.current = value;
    };
  }, [value, durationMs]);

  return <span className={className}>{format(display)}</span>;
}
