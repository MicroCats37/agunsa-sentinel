import type { Camera, SecurityRule, Zone } from './types';

/**
 * Validación de reglas de seguridad. Devuelve problemas por campo para que el
 * formulario de reglas pueda mostrarlos en vivo mientras el operador edita.
 */

export interface RuleIssue {
  field: keyof SecurityRule | 'scope';
  level: 'error' | 'warning';
  message: string;
}

export interface RuleValidationContext {
  cameras: readonly Camera[];
  zones: readonly Zone[];
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

export function validateRule(rule: SecurityRule, context: RuleValidationContext): RuleIssue[] {
  const issues: RuleIssue[] = [];

  if (rule.name.trim().length < 4) {
    issues.push({
      field: 'name',
      level: 'error',
      message: 'El nombre debe tener al menos 4 caracteres.',
    });
  }

  if (rule.scopeKind === 'camara') {
    const exists = context.cameras.some((camera) => camera.id === rule.scopeId);
    if (!exists) {
      issues.push({
        field: 'scope',
        level: 'error',
        message: 'La cámara seleccionada no existe en el registro.',
      });
    }
  } else {
    const exists = context.zones.some((zone) => zone.id === rule.scopeId);
    if (!exists) {
      issues.push({
        field: 'scope',
        level: 'error',
        message: 'La zona seleccionada no existe en la configuración.',
      });
    }
  }

  if (!isValidTime(rule.schedule.start) || !isValidTime(rule.schedule.end)) {
    issues.push({
      field: 'schedule',
      level: 'error',
      message: 'El horario debe usar el formato HH:MM.',
    });
  }

  if (rule.schedule.days.length === 0) {
    issues.push({
      field: 'schedule',
      level: 'error',
      message: 'Selecciona al menos un día de aplicación.',
    });
  }

  const dwellApplies = rule.event === 'permanencia' || rule.event === 'estacionamiento';
  if (dwellApplies && rule.minDwellSeconds <= 0) {
    issues.push({
      field: 'minDwellSeconds',
      level: 'error',
      message: 'Define un tiempo mínimo de permanencia mayor que cero.',
    });
  }

  if (dwellApplies && rule.minDwellSeconds > 900) {
    issues.push({
      field: 'minDwellSeconds',
      level: 'warning',
      message: 'Permanencias superiores a 15 minutos generan demasiadas alertas operativas.',
    });
  }

  if (rule.event === 'cruce_linea' && rule.direction === 'cualquiera') {
    issues.push({
      field: 'direction',
      level: 'warning',
      message: 'Sin dirección definida la regla dispara en ambos sentidos.',
    });
  }

  if (rule.cooldownSeconds < 30) {
    issues.push({
      field: 'cooldownSeconds',
      level: 'warning',
      message: 'Un tiempo de espera menor a 30 s provoca alertas repetidas del mismo objeto.',
    });
  }

  if (rule.scopeKind === 'zona' && rule.event === 'cruce_linea') {
    issues.push({
      field: 'scope',
      level: 'warning',
      message: 'El cruce de línea virtual se define sobre líneas, no sobre polígonos de zona.',
    });
  }

  return issues;
}

export function hasBlockingIssue(issues: readonly RuleIssue[]): boolean {
  return issues.some((issue) => issue.level === 'error');
}

/** Descripción del ámbito de aplicación, para tablas resumidas. */
export function describeRuleScope(rule: SecurityRule, context: RuleValidationContext): string {
  if (rule.scopeKind === 'camara') {
    const camera = context.cameras.find((item) => item.id === rule.scopeId);
    return camera ? `${camera.id} · ${camera.name}` : 'Cámara desconocida';
  }
  const zone = context.zones.find((item) => item.id === rule.scopeId);
  return zone ? zone.name : 'Zona desconocida';
}
