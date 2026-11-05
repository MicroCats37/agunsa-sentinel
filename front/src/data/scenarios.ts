import type { CapabilityLevel, IncidentCategory, ObjectType, Severity } from '@/domain/types';

/**
 * Escenarios de la demostración "Simular incidente".
 *
 * Cada escenario es un instante del guion de la noche: al dispararlo, la
 * plataforma rebobina el reloj simulado hasta ese segundo y la silueta que
 * aparece en el feed es exactamente la que origina la alerta. La detección y
 * el incidente comparten la misma origen, no son dos relatos paralelos.
 */
export interface SimulationScenario {
  id: string;
  title: string;
  description: string;
  cameraId: string;
  zoneId: string;
  sectorId: string;
  category: IncidentCategory;
  type: string;
  severity: Severity;
  capability: CapabilityLevel;
  objectType: ObjectType;
  objectCount: number;
  confidence: number | null;
  clipDurationSec: number;
  ruleId: string | null;
  /** Estado al que pasa la cámara al dispararse el escenario. */
  cameraStatus: 'alerta' | 'fallando' | 'inactiva';
  /** Segundo de la línea de tiempo en el que ocurre el escenario. */
  timelineSec: number;
}

export const SCENARIOS: readonly SimulationScenario[] = [
  {
    id: 'scn-loitering',
    title: 'Persona merodeando frente al poste central',
    description:
      'Una persona se detiene junto al poste que ocupa el centro del encuadre de C03 y permanece más de 120 s en la franja de aproximación.',
    cameraId: 'C03',
    zoneId: 'zn-dwl-c03',
    sectorId: 'sec-gambetta',
    category: 'permanencia',
    type: 'Permanencia prolongada de persona frente al poste central',
    severity: 'alta',
    capability: 'operativo',
    objectType: 'persona',
    objectCount: 1,
    confidence: 0.88,
    clipDurationSec: 31,
    ruleId: 'reg-02',
    cameraStatus: 'alerta',
    timelineSec: 330,
  },
  {
    id: 'scn-parked-vehicle',
    title: 'Vehículo estacionado en la aproximación de Gambetta',
    description:
      'Una camioneta entra por la aproximación y se detiene más de 5 minutos en una zona de tráfico no habitual.',
    cameraId: 'C05',
    zoneId: 'zn-dwl-c05',
    sectorId: 'sec-gambetta',
    category: 'vehiculo',
    type: 'Vehículo estacionado en zona no habitual',
    severity: 'media',
    capability: 'operativo',
    objectType: 'vehiculo',
    objectCount: 1,
    confidence: 0.91,
    clipDurationSec: 22,
    ruleId: 'reg-03',
    cameraStatus: 'alerta',
    timelineSec: 430,
  },
  {
    id: 'scn-signal-loss',
    title: 'Pérdida de señal con la cámara C01 (HTTP 504)',
    description:
      'El visor responde HTTP 504 Gateway Timeout en los dos intentos. Es una respuesta del visor, no un código de avería del sensor.',
    cameraId: 'C01',
    zoneId: 'zn-c01',
    sectorId: 'sec-gambetta',
    category: 'falla_camara',
    type: 'Pérdida de señal con la cámara (HTTP 504)',
    severity: 'critica',
    capability: 'operativo',
    objectType: 'persona',
    objectCount: 0,
    confidence: null,
    clipDurationSec: 0,
    ruleId: null,
    cameraStatus: 'inactiva',
    timelineSec: 180,
  },
  {
    id: 'scn-service-vehicle',
    title: 'Vehículo detenido en Calle Siete',
    description:
      'Un vehículo se detiene en la franja de Calle Siete y permanece más de 5 minutos frente a la cámara C18.',
    cameraId: 'C18',
    zoneId: 'zn-dwl-c18',
    sectorId: 'sec-siete',
    category: 'vehiculo',
    type: 'Vehículo detenido en zona de tráfico habitual',
    severity: 'media',
    capability: 'operativo',
    objectType: 'vehiculo',
    objectCount: 1,
    confidence: 0.86,
    clipDurationSec: 19,
    ruleId: 'reg-12',
    cameraStatus: 'alerta',
    timelineSec: 745,
  },
  {
    id: 'scn-patio-presence',
    title: 'Presencia de persona en el patio interior',
    description:
      'C30 distingue patio y calle: una persona recorre el patio interior de la planta fuera del turno programado.',
    cameraId: 'C30',
    zoneId: 'zn-c30',
    sectorId: 'sec-arica',
    category: 'persona',
    type: 'Presencia humana fuera de horarios habituales',
    severity: 'media',
    capability: 'operativo',
    objectType: 'persona',
    objectCount: 1,
    confidence: 0.82,
    clipDurationSec: 24,
    ruleId: 'reg-09',
    cameraStatus: 'alerta',
    timelineSec: 690,
  },
  {
    id: 'scn-patrol-approach',
    title: 'Persona aproximándose al cerco (ronda nocturna)',
    description:
      'Una persona recorre la franja de aproximación al cerco de Gambetta y permanece más de 45 s en la zona perimetral.',
    cameraId: 'C15',
    zoneId: 'zn-c15',
    sectorId: 'sec-gambetta',
    category: 'persona',
    type: 'Persona aproximándose al cerco',
    severity: 'baja',
    capability: 'operativo',
    objectType: 'persona',
    objectCount: 1,
    confidence: 0.84,
    clipDurationSec: 26,
    ruleId: 'reg-05',
    cameraStatus: 'alerta',
    timelineSec: 90,
  },
];

export const SCENARIO_BY_ID = new Map(
  SCENARIOS.map((scenario) => [scenario.id, scenario] as const),
);
