'use client';

import { SEVERITY_LABEL } from '@/domain/labels';
import { useLiveStore } from '@/store/live-store';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { createLiveAlert, isOperationalRoute, nextAlertDelayMs, type LiveAlert } from './live-alerts';
import type { AppRouter } from './force-scenario';

/**
 * Motor de la operación en vivo.
 *
 * Es el único proceso que mueve el centro de control cuando el transporte
 * está en marcha:
 *
 *  - el reloj avanza un segundo por segundo, con la hora real;
 *  - las detecciones llegan solas, con un intervalo irregular;
 *  - cada detección se anuncia con un aviso y queda registrada en el store de
 *    incidentes, de modo que el dashboard, la bandeja de alertas y el mapa se
 *    actualizan sin ningún cableado adicional.
 *
 * El componente no dibuja nada: sólo conduce el transporte.
 */

/**
 * `true` cuando la detección puede emitirse.
 *
 * Ni con la pestaña oculta ni fuera de las rutas de operación llega nada: un
 * centro de control no genera actividad que nadie está mirando.
 */
function canGenerate(pathname: string): boolean {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return false;
  return isOperationalRoute(pathname);
}

/** Anuncia la detección en la esquina de la pantalla. */
function announce(alert: LiveAlert, router: AppRouter): void {
  const title = `Nueva alerta · ${alert.camera.id}`;
  const description = `${alert.detection} · Severidad ${SEVERITY_LABEL[alert.incident.severity]} · ${alert.camera.name}`;
  const options = {
    description,
    duration: 9000,
    action: {
      label: 'Ver',
      onClick: () => router.push(`/incidentes/${alert.incident.id}`),
    },
  };

  if (alert.incident.severity === 'critica') toast.error(title, options);
  else if (alert.incident.severity === 'alta') toast.warning(title, options);
  else toast(title, options);
}

export function LiveEngine() {
  const router = useRouter();
  const pathname = usePathname();
  const running = useLiveStore((state) => state.running);

  /** Reloj de operación: un tic por segundo mientras el transporte está activo. */
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      useLiveStore.getState().tick();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  /**
   * Agenda de detecciones.
   *
   * Cada detección agenda la siguiente con un intervalo nuevo e irregular. Al
   * pausar, el cleanup cancela el temporizador pendiente: no llega ninguna
   * alerta más.
   */
  useEffect(() => {
    if (!running) return;

    let timer = 0;

    function schedule(): void {
      timer = window.setTimeout(() => {
        if (!canGenerate(pathname)) {
          // Fuera de las rutas de operación, o con la pestaña oculta: se
          // re-arma el temporizador y se vuelve a esperar.
          schedule();
          return;
        }
        const alert = createLiveAlert(useLiveStore.getState().clockMs);
        announce(alert, router);
        schedule();
      }, nextAlertDelayMs());
    }

    schedule();
    return () => window.clearTimeout(timer);
  }, [running, pathname, router]);

  return null;
}
