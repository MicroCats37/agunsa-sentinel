import { runSimulation } from '@/store/simulator';
import { toast } from 'sonner';
import type { useRouter } from 'next/navigation';

/** Tipo del enrutador de la aplicación. */
export type AppRouter = ReturnType<typeof useRouter>;

/**
 * Abre un incidente concreto bajo demanda.
 *
 * Es la acción manual del centro de control: el operador fuerza un escenario
 * cuando necesita ver el flujo de atención completo con un caso conocido. El
 * incidente se crea con el motor de reglas —igual que cualquier otra
 * detección— y la sala salta a su ficha.
 */
export function forceScenario(scenarioId: string, router: AppRouter): boolean {
  const outcome = runSimulation(scenarioId);
  if (!outcome) {
    toast.error('No se pudo generar el incidente solicitado.');
    return false;
  }

  toast.warning(`${outcome.incident.id} · ${outcome.scenarioTitle}`, {
    description: `Cámara ${outcome.cameraId} afectada. El incidente está pendiente de revisión.`,
    duration: 8000,
    action: {
      label: 'Ver incidente',
      onClick: () => router.push(`/incidentes/${outcome.incident.id}`),
    },
  });
  router.push(`/incidentes/${outcome.incident.id}`);
  return true;
}
