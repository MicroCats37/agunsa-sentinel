import type { IncidentCategory, ObjectType, Severity } from '@/domain/types';

/**
 * Contratos del motor de simulación.
 *
 * El motor es puro: no conoce la UI, el store ni los datos reales. Recibe un
 * guion (`Storyline`) y devuelve el estado de la escena en un instante dado.
 * Como todo se deriva del reloj simulado, la misma secuencia se reproduce
 * exactamente igual en cada ejecución: no hay `Math.random()` ni `Date.now()`.
 */

/** Actor con guion: una persona o un vehículo que recorre el encuadre. */
export interface SimActor {
  id: string;
  cameraId: string;
  objectType: ObjectType;
  /** Etiqueta legible en la línea de tiempo. */
  label: string;
  /** Tamaño normalizado del objeto en el encuadre. */
  size: number;
  /** Confianza que entrega el detector para este actor. */
  confidence: number;
  /**
   * `true` si el actor es ambiental: da vida al encuadre pero **nunca**
   * dispara una regla.
   */
  ambient: boolean;
  /** Keyframes absolutos (segundos de línea de tiempo). */
  keyframes: readonly { t: number; x: number; y: number }[];
  /** Segundo en el que el actor aparece en el encuadre. */
  startSec: number;
  /** Segundo en el que el actor sale del encuadre (`null` = permanece). */
  endSec: number | null;
}

/** Estado de salud de una cámara durante la línea de tiempo. */
export type SimCameraHealth = 'ok' | 'sin_senal' | 'reloj_desfasado';

/** Tipos de evento que la línea de tiempo registra. */
export type SimEventKind =
  | 'deteccion'
  | 'regla'
  | 'incidente'
  | 'notificacion'
  | 'falla'
  | 'accion'
  | 'resolucion';

/** Evento registrado en la línea de tiempo. */
export interface SimEvent {
  id: string;
  /** Instante en segundos desde el inicio de la línea de tiempo. */
  atSec: number;
  kind: SimEventKind;
  cameraId: string | null;
  actorId: string | null;
  ruleId: string | null;
  incidentId: string | null;
  title: string;
  detail: string;
  severity: Severity | null;
}

/** Instante del guion con un guion de incidente asociado. */
export interface SimBeat {
  id: string;
  atSec: number;
  /** Naturaleza del instante: incidente, falla de equipo o acción de operador. */
  kind: 'incidente' | 'falla' | 'accion';
  /** Cámara donde ocurre. */
  cameraId: string;
  /** Regla que dispara el evento (`null` en fallas y acciones). */
  ruleId: string | null;
  /** Actor implicado (puede ser `null` en una falla de cámara). */
  actorId: string | null;
  title: string;
  detail: string;
  severity: Severity;
  category: IncidentCategory;
  objectType: ObjectType;
  objectCount: number;
  confidence: number | null;
  clipDurationSec: number;
  /** Acción del operador registrada en el mismo instante. */
  operatorAction?: {
    incidentRef: string;
    action: string;
    result: string;
  };
}

/** Guion completo de una noche simulada. */
export interface Storyline {
  id: string;
  title: string;
  description: string;
  /** Duración total de la línea de tiempo, en segundos. */
  durationSec: number;
  actors: readonly SimActor[];
  beats: readonly SimBeat[];
}

/** Actor en escena con su posición interpolada. */
export interface SimActorState {
  actor: SimActor;
  /** Posición normalizada dentro del encuadre. */
  x: number;
  y: number;
  /** Segundos que lleva visible el actor. */
  visibleForSec: number;
}

/** Detección emitida por el motor para un actor. */
export interface SimDetection {
  actorId: string;
  cameraId: string;
  objectType: ObjectType;
  confidence: number;
  /** Caja delimitadora normalizada dentro del encuadre. */
  box: { x: number; y: number; width: number; height: number };
}

/** Regla que dispara en el instante evaluado. */
export interface SimRuleFire {
  ruleId: string;
  ruleName: string;
  cameraId: string;
  reason: string;
  dwellSeconds: number;
  requiredSeconds: number;
  severity: Severity;
}

/** Incidente producido por el motor. */
export interface SimIncident {
  id: string;
  atSec: number;
  cameraId: string;
  ruleId: string | null;
  title: string;
  detail: string;
  severity: Severity;
  category: IncidentCategory;
  objectType: ObjectType;
  objectCount: number;
  confidence: number | null;
  clipDurationSec: number;
  /** Identificador del beat del guion que originó el incidente. */
  beatId: string | null;
}

/** Fotografía completa del motor en un instante. */
export interface SimulationSnapshot {
  /** Segundos desde el inicio de la línea de tiempo. */
  nowSec: number;
  /** Actores visibles, con su posición interpolada. */
  actors: readonly SimActorState[];
  /** Detecciones de los actores visibles. */
  detections: readonly SimDetection[];
  /** Reglas que están satisfaciéndose en este instante. */
  firedRules: readonly SimRuleFire[];
  /** Incidentes ya registrados hasta este instante. */
  incidents: readonly SimIncident[];
  /** Eventos acumulados hasta este instante. */
  events: readonly SimEvent[];
  /** Estado de salud por cámara. */
  cameraHealth: Readonly<Record<string, SimCameraHealth>>;
}
