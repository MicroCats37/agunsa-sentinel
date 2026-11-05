import { Badge } from '@/components/ui/badge';
import {
  CAMERA_STATUS_LABEL,
  INCIDENT_CATEGORY_LABEL,
  INCIDENT_STATUS_LABEL,
  SEVERITY_LABEL,
} from '@/domain/labels';
import type {
  CameraStatus,
  CapabilityLevel,
  IncidentCategory,
  IncidentStatus,
  Severity,
} from '@/domain/types';

/**
 * Insignias de estado con significado operativo:
 * rojo = crítico, ámbar = advertencia, verde = normal, azul = información.
 */

const severityTone: Record<Severity, string> = {
  critica: 'bg-critical/15 text-critical ring-1 ring-inset ring-critical/40',
  alta: 'bg-warning/15 text-warning ring-1 ring-inset ring-warning/40',
  media: 'bg-info/15 text-info ring-1 ring-inset ring-info/40',
  baja: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border',
};

const cameraStatusTone: Record<CameraStatus, string> = {
  activa: 'bg-normal/15 text-normal ring-1 ring-inset ring-normal/40',
  alerta: 'bg-critical/15 text-critical ring-1 ring-inset ring-critical/40',
  inactiva: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border',
  fallando: 'bg-warning/15 text-warning ring-1 ring-inset ring-warning/40',
};

const incidentStatusTone: Record<IncidentStatus, string> = {
  nuevo: 'bg-critical/15 text-critical ring-1 ring-inset ring-critical/40',
  en_revision: 'bg-warning/15 text-warning ring-1 ring-inset ring-warning/40',
  confirmado: 'bg-info/15 text-info ring-1 ring-inset ring-info/40',
  descartado: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border',
  en_atencion: 'bg-warning/15 text-warning ring-1 ring-inset ring-warning/40',
  resuelto: 'bg-normal/15 text-normal ring-1 ring-inset ring-normal/40',
};

const capabilityTone: Record<CapabilityLevel, string> = {
  operativo: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border',
  avanzada: 'bg-capability/15 text-capability ring-1 ring-inset ring-capability/40',
  opcional: 'bg-muted text-muted-foreground ring-1 ring-inset ring-dashed ring-border',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <Badge variant="outline" className={severityTone[severity]}>
      {SEVERITY_LABEL[severity]}
    </Badge>
  );
}

export function CameraStatusBadge({ status }: { status: CameraStatus }) {
  return (
    <Badge variant="outline" className={cameraStatusTone[status]}>
      {CAMERA_STATUS_LABEL[status]}
    </Badge>
  );
}

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <Badge variant="outline" className={incidentStatusTone[status]}>
      {INCIDENT_STATUS_LABEL[status]}
    </Badge>
  );
}

export function CategoryBadge({ category }: { category: IncidentCategory }) {
  return (
    <Badge variant="outline" className="bg-secondary text-secondary-foreground">
      {INCIDENT_CATEGORY_LABEL[category]}
    </Badge>
  );
}

/** Marca las capacidades de IA que en el pliego son "avanzadas" u "opcionales". */
export function CapabilityBadge({ capability }: { capability: CapabilityLevel }) {
  if (capability === 'operativo') return null;
  return (
    <Badge variant="outline" className={capabilityTone[capability]}>
      {capability === 'avanzada' ? 'Capacidad avanzada' : 'Capacidad opcional'}
    </Badge>
  );
}
