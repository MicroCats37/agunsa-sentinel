import type { Incident, IncidentStatus } from './types';

/**
 * Máquina de estados del ciclo de gestión de un incidente.
 *
 * Flujo nominal definido por el cliente:
 *   Nuevo → En revisión → Confirmado / Descartado → En atención → Resuelto
 *
 * Dos atajos deliberados, ambos documentados en GLOSSARY.md:
 *  - `nuevo → confirmado`: un operador con criterio puede confirmar una detección
 *    sin pasar por revisión cuando la evidencia es inequívoca.
 *  - `confirmado → en_atencion`: se puede saltar la asignación si el incidente
 *    ya fue atendido y sólo queda cerrar la atención.
 */

export const INCIDENT_STATUSES: readonly IncidentStatus[] = [
  'nuevo',
  'en_revision',
  'confirmado',
  'descartado',
  'en_atencion',
  'resuelto',
];

export const INCIDENT_TRANSITIONS: Record<IncidentStatus, readonly IncidentStatus[]> = {
  nuevo: ['en_revision', 'confirmado', 'descartado'],
  en_revision: ['confirmado', 'descartado', 'nuevo'],
  confirmado: ['en_atencion', 'resuelto', 'descartado'],
  descartado: ['en_revision'],
  en_atencion: ['resuelto', 'confirmado'],
  resuelto: [],
};

/** Estados en los que el incidente sigue abierto y cuenta como activo. */
export const ACTIVE_INCIDENT_STATUSES: readonly IncidentStatus[] = [
  'nuevo',
  'en_revision',
  'confirmado',
  'en_atencion',
];

export function canTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  return INCIDENT_TRANSITIONS[from].includes(to);
}

/** Devuelve el nuevo estado o `null` si la transición no está permitida. */
export function transitionStatus(from: IncidentStatus, to: IncidentStatus): IncidentStatus | null {
  return canTransition(from, to) ? to : null;
}

export function isIncidentActive(status: IncidentStatus): boolean {
  return ACTIVE_INCIDENT_STATUSES.includes(status);
}

/** Un incidente no puede cerrarse sin responsable ni sin observación registrada. */
export function canCloseIncident(incident: Incident): boolean {
  return incident.assigneeId !== null && incident.notes.length > 0;
}

export interface StatusAction {
  target: IncidentStatus;
  label: string;
  intent: 'confirm' | 'discard' | 'advance' | 'review' | 'resolve';
}

/**
 * Acciones disponibles para un operador dado el estado actual del incidente.
 * Se deriva de la máquina de estados para que UI y dominio no diverjan.
 */
export function availableStatusActions(incident: Incident): StatusAction[] {
  const actions: StatusAction[] = [];
  const push = (target: IncidentStatus, label: string, intent: StatusAction['intent']) => {
    if (canTransition(incident.status, target)) actions.push({ target, label, intent });
  };

  switch (incident.status) {
    case 'nuevo':
      push('en_revision', 'Marcar en revisión', 'review');
      push('confirmado', 'Confirmar detección', 'confirm');
      push('descartado', 'Descartar detección', 'discard');
      break;
    case 'en_revision':
      push('confirmado', 'Confirmar detección', 'confirm');
      push('descartado', 'Descartar detección', 'discard');
      push('nuevo', 'Devolver a nuevo', 'review');
      break;
    case 'confirmado':
      push('en_atencion', 'Tomar en atención', 'advance');
      push('resuelto', 'Marcar resuelto', 'resolve');
      push('descartado', 'Descartar detección', 'discard');
      break;
    case 'en_atencion':
      push('resuelto', 'Marcar resuelto', 'resolve');
      push('confirmado', 'Reabrir confirmación', 'confirm');
      break;
    case 'descartado':
      push('en_revision', 'Reabrir revisión', 'review');
      break;
    case 'resuelto':
      break;
  }

  return actions;
}
