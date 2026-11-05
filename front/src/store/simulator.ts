import { SCENARIO_BY_ID } from '@/data/scenarios';
import { PLATFORM_NOW_ISO } from '@/domain/clock';
import type { Incident } from '@/domain/types';
import { CURRENT_USER_ID } from '@/data/users';
import { useActivityStore } from './activity-store';
import { useCamerasStore } from './cameras-store';
import { useIncidentsStore } from './incidents-store';
import { TIMELINE_START_MS, useSimulationStore } from './simulation-store';

/**
 * Orquestación de la demostración "Simular incidente".
 *
 * Una única función ejecuta el flujo completo del criterio de aceptación:
 * rebobina el reloj simulado hasta el instante del guion, crea el incidente,
 * actualiza la cámara afectada, la marca en el mapa y en el centro de
 * monitoreo, y deja constancia en el historial de acciones. Todos los
 * indicadores del dashboard se derivan del store, por lo que se actualizan
 * automáticamente sin ningún cableado adicional.
 */
export interface SimulationOutcome {
  incident: Incident;
  scenarioTitle: string;
  cameraId: string;
  /** Instante de la línea de tiempo en el que se reproduce el escenario. */
  timelineSec: number;
}

export function runSimulation(scenarioId: string): SimulationOutcome | null {
  const scenario = SCENARIO_BY_ID.get(scenarioId);
  if (!scenario) return null;

  const incidents = useIncidentsStore.getState();
  const sequence = incidents.simulatedCounter + 1;

  // El reloj simulado se sitúa en el instante del guion: el feed muestra al
  // actor que origina la alerta y la línea de tiempo queda alineada.
  const scenarioClockMs = TIMELINE_START_MS + scenario.timelineSec * 1000;
  useSimulationStore.getState().seek(scenarioClockMs);

  const incident: Incident = {
    id: `INC-SIM-${String(sequence).padStart(4, '0')}`,
    occurredAt: new Date(scenarioClockMs).toISOString(),
    cameraId: scenario.cameraId,
    zoneId: scenario.zoneId,
    sectorId: scenario.sectorId,
    category: scenario.category,
    type: scenario.type,
    severity: scenario.severity,
    capability: scenario.capability,
    objectType: scenario.objectType,
    objectCount: scenario.objectCount,
    confidence: scenario.confidence,
    status: 'nuevo',
    assigneeId: null,
    notes: [
      {
        at: new Date(scenarioClockMs).toISOString(),
        authorId: CURRENT_USER_ID,
        text: `Simulación reproducida desde la línea de tiempo (segundo ${scenario.timelineSec} de la noche simulada).`,
      },
    ],
    hasVideoClip: scenario.clipDurationSec > 0,
    clipDurationSec: scenario.clipDurationSec,
    simulated: true,
  };

  incidents.addIncident(incident);

  const cameras = useCamerasStore.getState();
  cameras.setOverride(scenario.cameraId, {
    status: scenario.cameraStatus,
    alertSeverity: scenario.severity,
    hasAlert: scenario.cameraStatus === 'alerta',
    lastSeen: new Date(scenarioClockMs).toISOString(),
  });
  cameras.setHighlight(scenario.cameraId);

  useActivityStore.getState().log({
    at: new Date(scenarioClockMs).toISOString(),
    actorId: CURRENT_USER_ID,
    action: 'Simulación de incidente',
    target: `${incident.id} · ${scenario.cameraId}`,
    detail: scenario.title,
    kind: 'sistema',
  });

  return {
    incident,
    scenarioTitle: scenario.title,
    cameraId: scenario.cameraId,
    timelineSec: scenario.timelineSec,
  };
}

/** Instante de referencia de la plataforma, útil para pruebas. */
export const SIMULATION_REFERENCE_ISO = PLATFORM_NOW_ISO;
