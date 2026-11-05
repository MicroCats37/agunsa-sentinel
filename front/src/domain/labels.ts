import type {
  CameraClassification,
  CameraPriority,
  CameraScene,
  CameraStatus,
  CameraViewIntent,
  CrossingDirection,
  IncidentCategory,
  IncidentStatus,
  NotificationChannel,
  ObjectType,
  RuleEvent,
  Severity,
  UserRole,
  ZoneKind,
} from './types';

/**
 * Textos de apoyo del dominio. Se mantienen aquí (y no en la capa de datos)
 * para que la lógica de dominio pueda referenciarlos sin depender de la UI.
 */

export const SEVERITY_LABEL: Record<Severity, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

export const SEVERITY_ORDER: readonly Severity[] = ['critica', 'alta', 'media', 'baja'];

export const CAMERA_STATUS_LABEL: Record<CameraStatus, string> = {
  activa: 'Activa',
  alerta: 'Con alerta',
  inactiva: 'Inactiva',
  fallando: 'Con falla',
};

export const CAMERA_SCENE_LABEL: Record<CameraScene, string> = {
  perimetro: 'Perímetro / cerco',
  acceso: 'Acceso vehicular',
  estacionamiento: 'Estacionamiento',
  almacen: 'Interior de almacén',
};

/** Clasificación conjunta del assessment CCTV (paleta del informe). */
export const CLASSIFICATION_LABEL: Record<CameraClassification, string> = {
  buena_general: 'Buena general',
  limitada: 'Limitada',
  deficiente: 'Deficiente',
  sin_imagen: 'Sin imagen',
};

/** Descripción operativa de cada categoría de clasificación. */
export const CLASSIFICATION_HINT: Record<CameraClassification, string> = {
  buena_general: 'Verde · conservar bajo pruebas de cobertura, movimiento y grabación',
  limitada: 'Ámbar · corregir encuadre y validar zonas ocultas',
  deficiente: 'Rojo · corregir óptica, exposición, perfil o cobertura y repetir pruebas',
  sin_imagen: 'Gris · diagnosticar el camino completo; daño físico no confirmado',
};

/** Prioridad de intervención asignada por el informe. */
export const PRIORITY_LABEL: Record<CameraPriority, string> = {
  P1: 'P1 · inmediata',
  P2: 'P2 · programada',
  P3: 'P3 · conservación',
};

/** Intención de cobertura de la cámara: define hacia dónde apunta el cono. */
export const VIEW_INTENT_LABEL: Record<CameraViewIntent, string> = {
  exterior: 'Exterior · vigila la calle y la aproximación',
  interior: 'Interior · cubre patio, techos o áreas internas',
  acceso: 'Acceso · cubre el portón o control de acceso',
};

export const INCIDENT_CATEGORY_LABEL: Record<IncidentCategory, string> = {
  persona: 'Persona',
  vehiculo: 'Vehículo',
  permanencia: 'Permanencia',
  comportamiento: 'Comportamiento',
  acceso: 'Acceso',
  falla_camara: 'Falla de cámara',
};

export const INCIDENT_CATEGORY_ORDER: readonly IncidentCategory[] = [
  'persona',
  'vehiculo',
  'permanencia',
  'comportamiento',
  'acceso',
  'falla_camara',
];

export const OBJECT_TYPE_LABEL: Record<ObjectType, string> = {
  persona: 'Persona',
  vehiculo: 'Vehículo',
};

export const ZONE_KIND_LABEL: Record<ZoneKind, string> = {
  perimetro: 'Aproximación perimetral',
  restringida: 'Zona restringida',
  permanencia: 'Zona de permanencia',
  vigilancia: 'Área de vigilancia',
};

export const DIRECTION_LABEL: Record<CrossingDirection, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  cualquiera: 'Cualquiera',
};

export const RULE_EVENT_LABEL: Record<RuleEvent, string> = {
  presencia: 'Presencia detectada',
  cruce_linea: 'Cruce de línea virtual',
  acceso_restringido: 'Ingreso a zona restringida',
  permanencia: 'Permanencia prolongada',
  estacionamiento: 'Vehículo estacionado',
  acercamiento_perimetro: 'Aproximación al cerco',
  agrupacion: 'Agrupación de personas',
  sentido_contrario: 'Circulación en sentido contrario',
};

export const NOTIFICATION_CHANNEL_LABEL: Record<NotificationChannel, string> = {
  app: 'Notificación en la plataforma',
  email: 'Correo electrónico',
  sms: 'Mensaje SMS',
  webhook: 'Webhook (API)',
};

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  administrador: 'Administrador',
  supervisor: 'Supervisor',
  operador: 'Operador',
  consulta: 'Consulta',
};

export const USER_ROLE_SUMMARY: Record<UserRole, string> = {
  administrador: 'Configuración completa del sistema, usuarios, reglas y zonas.',
  supervisor: 'Análisis estadístico, gestión y escalamiento de incidentes.',
  operador: 'Monitoreo en vivo, atención de alertas y registro de observaciones.',
  consulta: 'Acceso de solo lectura a cámaras, mapa e historial.',
};

export const INCIDENT_STATUS_LABEL: Record<IncidentStatus, string> = {
  nuevo: 'Nuevo',
  en_revision: 'En revisión',
  confirmado: 'Confirmado',
  descartado: 'Descartado',
  en_atencion: 'En atención',
  resuelto: 'Resuelto',
};
