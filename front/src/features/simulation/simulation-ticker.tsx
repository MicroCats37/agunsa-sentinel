'use client';

import { useSimulationStore } from '@/store/simulation-store';
import { useEffect } from 'react';

/**
 * Motor de reproducción de la línea de tiempo.
 *
 * Un único `requestAnimationFrame` mueve el reloj de la noche. Cuando la
 * reproducción está en pausa el bucle no hace trabajo: la escena queda
 * congelada y reproducible.
 */
export function SimulationTicker() {
  const tick = useSimulationStore((state) => state.tick);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();

    const loop = (now: number): void => {
      const delta = Math.min(now - last, 120);
      last = now;
      tick(delta);
      frame = window.requestAnimationFrame(loop);
    };

    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [tick]);

  return null;
}
