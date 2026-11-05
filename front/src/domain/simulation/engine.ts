import { evaluateRule } from '@/domain/rule-eval';
import type { CameraTrackTarget, SecurityRule, VirtualLine, Zone } from '@/domain/types';
import type {
  SimActor,
  SimActorState,
  SimBeat,
  SimCameraHealth,
  SimDetection,
  SimEvent,
  SimIncident,
  SimRuleFire,
  SimulationSnapshot,
  Storyline,
} from './types';

/**
 * Motor de simulación determinista.
 *
 * Un único reloj gobierna toda la escena: los tracks de los actores, las
 * detecciones, la evaluación de reglas, los incidentes y las notificaciones.
 * Como el estado en un instante es una **función pura del instante**, la noche
 * se reproduce siempre igual: el mismo incidente aparece en el segundo 430 de
 * cada ejecución, con la misma confianza y la misma cámara.
 *
 * El motor no conoce el store ni la UI: recibe el guion, las reglas, las zonas
 * y las líneas, y devuelve la fotografía de la escena.
 */

/** Descripción mínima de una cámara que el motor necesita. */
export interface SimCameraDescriptor {
  id: string;
  zoneId: string;
  sectorId: string;
}

export interface SimulationEngineOptions {
  storyline: Storyline;
  /** Actores ambientales: nunca disparan reglas. */
  ambientActors?: readonly SimActor[];
  rules: readonly SecurityRule[];
  zones: readonly Zone[];
  lines: readonly VirtualLine[];
  cameras: readonly SimCameraDescriptor[];
}

/** Paso del escaneo de la línea de tiempo, en segundos. */
const SCAN_STEP_SEC = 2;

/** Identificador de incidente generado por el motor. */
function incidentId(index: number): string {
  return `INC-NGT-${String(index).padStart(4, '0')}`;
}

export class SimulationEngine {
  readonly storyline: Storyline;

  private readonly ambientActors: readonly SimActor[];
  private readonly rules: readonly SecurityRule[];
  private readonly zones: readonly Zone[];
  private readonly lines: readonly VirtualLine[];
  private readonly cameras: readonly SimCameraDescriptor[];

  /** Línea de tiempo completa, calculada una vez en el constructor. */
  private readonly incidents: SimIncident[] = [];
  private readonly events: SimEvent[] = [];
  /** Relación entre el identificador de un beat y el incidente que produjo. */
  private readonly incidentIdByBeat = new Map<string, string>();

  constructor(options: SimulationEngineOptions) {
    this.storyline = options.storyline;
    this.ambientActors = options.ambientActors ?? [];
    this.rules = options.rules;
    this.zones = options.zones;
    this.lines = options.lines;
    this.cameras = options.cameras;

    this.buildTimeline();
  }

  /* ------------------------------------------------------------------ */
  /* Construcción de la línea de tiempo                                   */
  /* ------------------------------------------------------------------ */

  /**
   * Recorre la noche completa y calcula, segundo a segundo, qué reglas se
   * satisfacen. El primer instante en que una regla se cumple es el que abre
   * el incidente: a partir de ahí queda bloqueada por su tiempo de espera.
   */
  private buildTimeline(): void {
    const scripted = this.storyline.actors;
    const lastFiredAt = new Map<string, number>();
    let incidentIndex = 0;

    for (let t = 0; t <= this.storyline.durationSec; t += SCAN_STEP_SEC) {
      const active = scripted.filter((actor) => isActorActive(actor, t));
      if (active.length === 0) continue;

      const tracks = buildTrackMap(active);
      const activeCameraIds = new Set(active.map((actor) => actor.cameraId));

      for (const rule of this.rules) {
        if (!rule.enabled) continue;
        if (!ruleTouchesCamera(rule, activeCameraIds, this.zones)) continue;

        const evaluations = evaluateRule(rule, {
          cameras: this.cameras as never,
          zones: this.zones,
          lines: this.lines,
          tracks,
          nowSec: t,
        });

        for (const evaluation of evaluations) {
          if (!evaluation.fired) continue;
          const key = `${rule.id}:${evaluation.cameraId}`;
          const previous = lastFiredAt.get(key);
          if (previous !== undefined && t - previous < rule.cooldownSeconds) continue;
          lastFiredAt.set(key, t);

          const beat = this.findBeat(rule.id, evaluation.cameraId);
          const id = incidentId(++incidentIndex);
          const incident: SimIncident = {
            id,
            atSec: t,
            cameraId: evaluation.cameraId,
            ruleId: rule.id,
            title: beat?.title ?? rule.name,
            detail: beat?.detail ?? evaluation.reason,
            severity: beat?.severity ?? rule.severity,
            category: beat?.category ?? 'persona',
            objectType: rule.objectType,
            objectCount: beat?.objectCount ?? evaluation.matchedObjects,
            confidence: beat?.confidence ?? null,
            clipDurationSec: beat?.clipDurationSec ?? 20,
            beatId: beat?.id ?? null,
          };
          this.incidents.push(incident);
          if (beat) this.incidentIdByBeat.set(beat.id, id);

          this.events.push({
            id: `evt-${id}-regla`,
            atSec: t,
            kind: 'regla',
            cameraId: evaluation.cameraId,
            actorId: beat?.actorId ?? null,
            ruleId: rule.id,
            incidentId: id,
            title: `Regla disparada · ${rule.name}`,
            detail: evaluation.reason,
            severity: incident.severity,
          });
          this.events.push({
            id: `evt-${id}`,
            atSec: t,
            kind: 'incidente',
            cameraId: evaluation.cameraId,
            actorId: beat?.actorId ?? null,
            ruleId: rule.id,
            incidentId: id,
            title: incident.title,
            detail: incident.detail,
            severity: incident.severity,
          });
          this.events.push({
            id: `evt-${id}-notif`,
            atSec: t + 1,
            kind: 'notificacion',
            cameraId: evaluation.cameraId,
            actorId: beat?.actorId ?? null,
            ruleId: rule.id,
            incidentId: id,
            title: 'Notificación enviada al centro de control',
            detail: `Notificación en la plataforma y en el correo del turno de noche.`,
            severity: incident.severity,
          });
        }
      }
    }

    // Incidentes que el guion declara de forma explícita (fallas de equipo).
    for (const beat of this.storyline.beats) {
      if (beat.kind !== 'falla') continue;
      const id = incidentId(++incidentIndex);
      this.incidents.push({
        id,
        atSec: beat.atSec,
        cameraId: beat.cameraId,
        ruleId: null,
        title: beat.title,
        detail: beat.detail,
        severity: beat.severity,
        category: beat.category,
        objectType: beat.objectType,
        objectCount: beat.objectCount,
        confidence: beat.confidence,
        clipDurationSec: beat.clipDurationSec,
        beatId: beat.id,
      });
      this.incidentIdByBeat.set(beat.id, id);
      this.events.push({
        id: `evt-${id}`,
        atSec: beat.atSec,
        kind: 'falla',
        cameraId: beat.cameraId,
        actorId: null,
        ruleId: null,
        incidentId: id,
        title: beat.title,
        detail: beat.detail,
        severity: beat.severity,
      });
    }

    // Acciones de operador escritas en el guion.
    for (const beat of this.storyline.beats) {
      if (beat.kind !== 'accion' || !beat.operatorAction) continue;
      const referenced = this.incidentIdByBeat.get(beat.operatorAction.incidentRef) ?? null;
      this.events.push({
        id: `evt-accion-${beat.id}`,
        atSec: beat.atSec,
        kind: 'resolucion',
        cameraId: beat.cameraId,
        actorId: null,
        ruleId: beat.ruleId,
        incidentId: referenced,
        title: `${beat.operatorAction.action} · ${beat.title}`,
        detail: beat.detail,
        severity: beat.severity,
      });
    }

    this.incidents.sort((a, b) => a.atSec - b.atSec);
    this.events.sort((a, b) => a.atSec - b.atSec);
  }

  /** Busca el beat del guion que corresponde a una regla y una cámara. */
  private findBeat(ruleId: string, cameraId: string): SimBeat | undefined {
    return this.storyline.beats.find(
      (beat) => beat.kind === 'incidente' && beat.ruleId === ruleId && beat.cameraId === cameraId,
    );
  }

  /* ------------------------------------------------------------------ */
  /* Fotografía de la escena                                              */
  /* ------------------------------------------------------------------ */

  /** Estado completo de la simulación en un instante dado. */
  snapshotAt(nowSec: number): SimulationSnapshot {
    const clamped = Math.max(0, Math.min(this.storyline.durationSec, nowSec));

    const actors = [...this.storyline.actors, ...this.ambientActors]
      .filter((actor) => isActorActive(actor, clamped))
      .map((actor) => toActorState(actor, clamped));

    const detections = actors.map<SimDetection>((state) => ({
      actorId: state.actor.id,
      cameraId: state.actor.cameraId,
      objectType: state.actor.objectType,
      confidence: state.actor.confidence,
      box: {
        x: state.x,
        y: state.y,
        width: state.actor.objectType === 'vehiculo' ? state.actor.size : state.actor.size * 0.55,
        height:
          state.actor.objectType === 'vehiculo' ? state.actor.size * 0.72 : state.actor.size * 2.2,
      },
    }));

    const firedRules = this.evaluateFiredRules(clamped);

    return {
      nowSec: clamped,
      actors,
      detections,
      firedRules,
      incidents: this.incidents.filter((incident) => incident.atSec <= clamped),
      events: this.events.filter((event) => event.atSec <= clamped),
      cameraHealth: this.healthAt(clamped),
    };
  }

  /** Reglas que se están satisfaciendo en este instante. */
  private evaluateFiredRules(nowSec: number): SimRuleFire[] {
    const scripted = this.storyline.actors.filter((actor) => isActorActive(actor, nowSec));
    if (scripted.length === 0) return [];

    const tracks = buildTrackMap(scripted);
    const activeCameraIds = new Set(scripted.map((actor) => actor.cameraId));
    const fired: SimRuleFire[] = [];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      if (!ruleTouchesCamera(rule, activeCameraIds, this.zones)) continue;

      const evaluations = evaluateRule(rule, {
        cameras: this.cameras as never,
        zones: this.zones,
        lines: this.lines,
        tracks,
        nowSec,
      });

      for (const evaluation of evaluations) {
        if (!evaluation.fired) continue;
        fired.push({
          ruleId: rule.id,
          ruleName: rule.name,
          cameraId: evaluation.cameraId,
          reason: evaluation.reason,
          dwellSeconds: evaluation.dwellSeconds,
          requiredSeconds: evaluation.requiredSeconds,
          severity: rule.severity,
        });
      }
    }

    return fired;
  }

  /**
   * Estado de salud de una cámara en un instante concreto.
   * Consulta ligera: no recalcula la línea de tiempo completa.
   */
  cameraHealthAt(cameraId: string, nowSec: number): SimCameraHealth {
    if (cameraId === 'C02') return 'reloj_desfasado';
    for (const beat of this.storyline.beats) {
      if (beat.kind !== 'falla') continue;
      if (beat.cameraId !== cameraId) continue;
      if (nowSec >= beat.atSec) return 'sin_senal';
    }
    return 'ok';
  }

  /** Estado de salud de las cámaras: fallas del guion y desfase del reloj. */
  private healthAt(nowSec: number): Record<string, SimCameraHealth> {
    const health: Record<string, SimCameraHealth> = {};
    for (const beat of this.storyline.beats) {
      if (beat.kind !== 'falla') continue;
      if (nowSec < beat.atSec) continue;
      health[beat.cameraId] = 'sin_senal';
    }
    // C02 arrastra el desfase de reloj documentado en el informe: su OSD
    // muestra la hora del equipo, no la hora de la plataforma.
    health['C02'] = 'reloj_desfasado';
    return health;
  }

  /** Incidentes del guion (línea de tiempo completa). */
  allIncidents(): readonly SimIncident[] {
    return this.incidents;
  }

  /** Eventos del guion (línea de tiempo completa). */
  allEvents(): readonly SimEvent[] {
    return this.events;
  }
}

/* ------------------------------------------------------------------ */
/* Utilidades puras                                                     */
/* ------------------------------------------------------------------ */

/** Un actor está visible entre `startSec` y `endSec`. */
export function isActorActive(actor: SimActor, nowSec: number): boolean {
  if (nowSec < actor.startSec) return false;
  if (actor.endSec !== null && nowSec > actor.endSec) return false;
  return true;
}

/**
 * Interpola la posición del actor en el instante dado.
 * Fuera del rango de keyframes se mantiene el extremo más cercano.
 */
export function actorPositionAt(actor: SimActor, nowSec: number): { x: number; y: number } {
  const frames = actor.keyframes;
  if (frames.length === 0) return { x: 0.5, y: 0.7 };
  const first = frames[0];
  const last = frames[frames.length - 1];
  if (!first || !last) return { x: 0.5, y: 0.7 };
  if (nowSec <= first.t) return { x: first.x, y: first.y };
  if (nowSec >= last.t) return { x: last.x, y: last.y };

  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1];
    const b = frames[i];
    if (!a || !b) continue;
    if (nowSec <= b.t) {
      const span = b.t - a.t;
      const ratio = span === 0 ? 0 : (nowSec - a.t) / span;
      return { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio };
    }
  }

  return { x: last.x, y: last.y };
}

function toActorState(actor: SimActor, nowSec: number): SimActorState {
  const position = actorPositionAt(actor, nowSec);
  return {
    actor,
    x: position.x,
    y: position.y,
    visibleForSec: nowSec - actor.startSec,
  };
}

/** Convierte actores con guion en los tracks que consumen feed y motor. */
export function buildTrackMap(actors: readonly SimActor[]): Map<string, CameraTrackTarget[]> {
  const map = new Map<string, CameraTrackTarget[]>();
  for (const actor of actors) {
    const list = map.get(actor.cameraId) ?? [];
    list.push({
      id: actor.id,
      objectType: actor.objectType,
      pattern: 'caminata-horizontal',
      origin: { x: actor.keyframes[0]?.x ?? 0.5, y: actor.keyframes[0]?.y ?? 0.7 },
      amplitude: 0,
      speed: 0,
      dwellSeconds: 120,
      size: actor.size,
      keyframes: actor.keyframes,
      confidence: actor.confidence,
      ambient: actor.ambient,
    });
    map.set(actor.cameraId, list);
  }
  return map;
}

/** Una regla sólo se evalúa si su alcance toca una cámara con actor activo. */
function ruleTouchesCamera(
  rule: SecurityRule,
  activeCameraIds: ReadonlySet<string>,
  zones: readonly Zone[],
): boolean {
  if (rule.scopeKind === 'camara') return activeCameraIds.has(rule.scopeId);
  const zone = zones.find((item) => item.id === rule.scopeId);
  return zone ? activeCameraIds.has(zone.cameraId) : false;
}
