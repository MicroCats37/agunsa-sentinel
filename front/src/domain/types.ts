/**
 * Entidades del dominio de seguridad perimetral.
 *
 * Capa pura: este archivo no conoce datos simulados, estado de UI ni librerías.
 * Las series, colores y textos de apoyo viven en `labels.ts`.
 */

export type Severity = 'critica' | 'alta' | 'media' | 'baja';

export type CameraStatus = 'activa' | 'alerta' | 'inactiva' | 'fallando';

export type CameraScene = 'perimetro' | 'acceso' | 'estacionamiento' | 'almacen';

/**
 * Clasificación conjunta del assessment CCTV (día + noche).
 *
 * Es la categoría que asigna el informe de evaluación: verde = buena general,
 * ámbar = limitada, rojo = deficiente, gris = sin imagen. Se toma la peor
 * limitación relevante observada entre día y noche.
 */
export type CameraClassification = 'buena_general' | 'limitada' | 'deficiente' | 'sin_imagen';

/** Prioridad de intervención asignada por el informe. */
export type CameraPriority = 'P1' | 'P2' | 'P3';

/** Resultado de la consulta de un fotograma: `OK` = JPEG recibido. */
export type TestResult = 'OK' | 'ERROR';

/**
 * Intención de cobertura de la cámara.
 *
 * - `exterior`: cámara perimetral que vigila el exterior (calle, aproximación).
 * - `interior`: cámara que cubre el interior de la planta (patio, techos).
 * - `acceso`: cámara que cubre un portón o control de acceso.
 *
 * La orientación se deriva de esta intención: por defecto el cono apunta
 * hacia el exterior del recinto; sólo las cámaras `interior` miran hacia
 * adentro.
 */
export type CameraViewIntent = 'exterior' | 'interior' | 'acceso';

export type IncidentStatus =
  | 'nuevo'
  | 'en_revision'
  | 'confirmado'
  | 'descartado'
  | 'en_atencion'
  | 'resuelto';

export type IncidentCategory =
  | 'persona'
  | 'vehiculo'
  | 'permanencia'
  | 'comportamiento'
  | 'acceso'
  | 'falla_camara';

export type ObjectType = 'persona' | 'vehiculo';

export type ZoneKind = 'perimetro' | 'restringida' | 'permanencia' | 'vigilancia';

export type CrossingDirection = 'entrada' | 'salida' | 'cualquiera';

export type UserRole = 'administrador' | 'supervisor' | 'operador' | 'consulta';

export type NotificationChannel = 'app' | 'email' | 'sms' | 'webhook';

export type RuleEvent =
  | 'presencia'
  | 'cruce_linea'
  | 'acceso_restringido'
  | 'permanencia'
  | 'estacionamiento'
  | 'acercamiento_perimetro'
  | 'agrupacion'
  | 'sentido_contrario';

/** Factor de forma del equipo: cambia el diseño del soporte en la vista 3D. */
export type CameraFormFactor = 'bullet' | 'dome';

/** Iluminación del entorno según el reloj de la plataforma. */
export type Illumination = 'dia' | 'crepusculo' | 'noche';

/**
 * Hora forzada de la escena, en horas (0–24).
 *
 * `null` significa «seguir el reloj de la plataforma»: es el valor por
 * defecto. Cuando el operador fija una hora, la iluminación del feed y de la
 * vista 3D deja de depender del reloj y responde a esa hora.
 */
export type SceneHour = number | null;

/**
 * Ficha técnica de la cámara.
 *
 * Modela el comportamiento real del equipo: lo que declara el datasheet es
 * lo que el feed simula (conmutación día/noche, alcance de IR, encuadre de la
 * lente, compresión de altas luces) y lo que muestra la pestaña de
 * especificaciones.
 */
export interface CameraSpec {
  model: string;
  formFactor: CameraFormFactor;
  sensor: string;
  /** Ancho activo del sensor en milímetros: determina el FOV de la lente. */
  sensorWidthMm: number;
  resolutionWidth: number;
  resolutionHeight: number;
  fps: number;
  subStream: string;
  codec: string;
  bitrateKbps: number;
  lensType: 'fija' | 'varifocal';
  focalLengthMm: number;
  /** Apertura máxima (f-number). */
  aperture: number;
  /** Campo de visión horizontal derivado de la lente, en grados. */
  horizontalFovDeg: number;
  irDistanceM: number;
  irWavelengthNm: number;
  /** Ajuste de intensidad del iluminador IR según la distancia del objeto. */
  smartIr: boolean;
  /** Rango dinámico real en dB. */
  wdrDb: number;
  dnr: boolean;
  poeClass: string;
  ipRating: string;
  ikRating: string | null;
  powerDrawW: number;
  powerDrawIrW: number;
  minTempC: number;
  maxTempC: number;
  onvifProfiles: string[];
  /** Horas de servicio ininterrumpido acumuladas. */
  uptimeHours: number;
  /** Latencia de decodificación y visualización en el cliente. */
  latencyMs: number;
  /** Nivel de señal de red en dBm. */
  signalDbm: number;
}

/**
 * Nivel de madurez de la capacidad de IA que originó el evento, según la tabla
 * de prioridades del pliego: `operativo` está disponible en el mockup,
 * `avanzada` y `opcional` son demostraciones etiquetadas como simuladas.
 */
export type CapabilityLevel = 'operativo' | 'avanzada' | 'opcional';

/** Punto normalizado 0..1 dentro del encuadre de una cámara o del plano de la instalación. */
export interface Point {
  x: number;
  y: number;
}

/**
 * Vértice georreferenciado en WGS84 (grados decimales).
 *
 * Se usa en la vista geoespacial (Cesium) para describir polígonos dibujados
 * sobre el terreno real y para anclar la posición de las cámaras.
 */
export interface GeoPoint {
  longitude: number;
  latitude: number;
}

/**
 * Encuadre geográfico de una cámara.
 *
 * - `longitude` / `latitude`: posición WGS84 sobre el perímetro real.
 * - `height`: altura sobre el nivel del mar en metros (poste a 7,2 m).
 * - `heading`: azimut en grados, 0 = norte, sentido horario.
 *
 * La posición es **provisional**: el informe CCTV no vincula cada IP con un
 * poste verificado en campo.
 */
export interface CameraGeoPosition {
  longitude: number;
  latitude: number;
  height: number;
  heading: number;
  /** Fuente del dato: deja constancia de que es una estimación cartográfica. */
  source: string;
}

/**
 * Categoría de una zona dibujada sobre la vista geoespacial.
 *
 * Reutiliza la taxonomía del editor de distribución del proyecto heredado
 * (almacén, oficina, contenedor, vehículo, área verde) y añade la categoría
 * propia del producto: zona de detección.
 */
export type GeospatialZoneKind =
  | 'almacen'
  | 'oficina'
  | 'contenedor'
  | 'vehiculo'
  | 'verde'
  | 'deteccion';

/**
 * Zona georreferenciada del recinto.
 *
 * A diferencia de `Zone` (polígonos normalizados dentro del encuadre de una
 * cámara), esta zona tiene coordenadas WGS84 y se dibuja sobre el terreno.
 */
export interface GeospatialZone {
  id: string;
  name: string;
  kind: GeospatialZoneKind;
  /** Polígono en WGS84, con al menos tres vértices. */
  polygon: GeoPoint[];
  /** Altura de extrusión en metros. */
  height: number;
  /** Color de relleno. */
  color: string;
  /** Color del contorno. */
  outline: string;
  /** Cámara del inventario a la que se asocia, si la zona cubre su encuadre. */
  cameraId: string | null;
  enabled: boolean;
}

/** Ventana horaria en formato HH:MM con días de la semana (0 = domingo). */
export interface Schedule {
  start: string;
  end: string;
  days: number[];
}

/**
 * Ficha de evaluación de una cámara del inventario real.
 *
 * Consolida el resultado de las pruebas diurna y nocturna, los hallazgos
 * observados, la acción recomendada y los puntos que quedan abiertos. Es el
 * contenido que el informe entrega por cada una de las 36 IP.
 */
export interface CameraAssessment {
  /** Categoría conjunta (la peor de las dos pruebas). */
  classification: CameraClassification;
  /** Prioridad de intervención. */
  priority: CameraPriority;
  /** Resultado de la consulta diurna. */
  dayResult: TestResult;
  /** Resultado de la consulta nocturna. */
  nightResult: TestResult;
  /**
   * Resolución realmente recibida en la consulta.
   * No equivale al máximo del equipo: es el dato del informe.
   */
  receivedResolution: { width: number; height: number } | null;
  /** Hallazgo de la prueba diurna. */
  dayFinding: string;
  /** Hallazgo de la prueba nocturna. */
  nightFinding: string;
  /** Acción recomendada por el informe. */
  recommendedAction: string;
  /** Puntos que quedan pendientes de verificar en campo. */
  pendingItems: string[];
  /** Error HTTP del visor cuando la cámara no entregó fotograma. */
  httpError: string | null;
  /** Nota de sector heredada del informe (confirmación o duplicidad). */
  sectorNote: string;
  /** Obstrucción documentada (OCxx) asociada a esta cámara, si existe. */
  obstructionId: string | null;
}

/** Capturas documentales de una cámara, tomadas en las dos sesiones de prueba. */
export interface CameraPhotos {
  /** Captura nocturna (02/11/2026 · 20:55). */
  night?: string;
  /** Captura diurna (03/11/2026 · 14:47). */
  day?: string;
}

export interface Camera {
  id: string;
  name: string;
  sectorId: string;
  zoneId: string;
  status: CameraStatus;
  scene: CameraScene;
  /** Intención de cobertura: define hacia dónde apunta el cono de visión. */
  viewIntent: CameraViewIntent;
  /** Posición en el plano de la instalación (unidades de plano, no normalizadas). */
  position: Point;
  /** Orientación de la cámara en grados sobre el plano (0 = este, antihorario). */
  heading: number;
  /** Campo de visión horizontal efectivo, derivado de la lente. */
  fov: number;
  resolution: string;
  ip: string;
  hasAlert: boolean;
  alertSeverity: Severity | null;
  lastSeen: string;
  /** Ficha técnica del equipo: alimenta el feed simulado y la ficha de especificaciones. */
  spec: CameraSpec;
  /** Evaluación del informe CCTV: clasificación, hallazgos y acciones. */
  assessment: CameraAssessment;
  /**
   * La ubicación en el plano es provisional: el informe no vincula cada IP
   * con un poste ni con una distancia medida.
   */
  positionProvisional: boolean;
  /**
   * Encuadre geográfico equivalente: la misma cámara sobre el perímetro real
   * de la instalación (OpenStreetMap), con su rumbo expresado en azimut.
   */
  geo: CameraGeoPosition;
  /**
   * Capturas reales de la cámara, extraídas del informe de evaluación.
   *
   * Son fotografías fijas de las sesiones nocturna (02/11/2026) y diurna
   * (03/11/2026): la evidencia documental del estado del equipo. No son
   * vídeo en vivo; para eso hace falta el pipeline RTSP/WebRTC.
   */
  photos: CameraPhotos;
  /**
   * URL de transmisión en vivo del equipo, si existe.
   *
   * El navegador no puede consumir RTSP: hace falta un relé (MediaMTX o
   * similar) que exponga WebRTC o HLS. Cuando se registre esa URL, el visor la
   * usa en lugar de la captura fotográfica; mientras no exista, se muestra la
   * evidencia del informe o el feed simulado.
   */
  liveUrl?: string;
  /** Marca el simulador: no forma parte del inventario real. */
  simulated: boolean;
}

export interface Sector {
  id: string;
  code: string;
  name: string;
  description: string;
  polygon: Point[];
  /** Densidad de incidentes 0..1, usada para resalte en el mapa 2D. */
  incidentDensity: number;
}

export interface Zone {
  id: string;
  name: string;
  kind: ZoneKind;
  cameraId: string;
  sectorId: string;
  polygon: Point[];
  maxDwellSeconds: number | null;
  direction: CrossingDirection | null;
  schedule: Schedule;
  severity: Severity;
  enabled: boolean;
}

export interface VirtualLine {
  id: string;
  name: string;
  cameraId: string;
  from: Point;
  to: Point;
  direction: CrossingDirection;
  enabled: boolean;
}

export interface SecurityRule {
  id: string;
  name: string;
  objectType: ObjectType;
  scopeKind: 'camara' | 'zona';
  scopeId: string;
  event: RuleEvent;
  schedule: Schedule;
  minDwellSeconds: number;
  direction: CrossingDirection;
  severity: Severity;
  cooldownSeconds: number;
  notificationChannel: NotificationChannel;
  enabled: boolean;
  /** Marca el simulador: no forma parte de la configuración real. */
  simulated: boolean;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  shift: string;
  active: boolean;
  lastActivity: string;
}

export interface IncidentNote {
  at: string;
  authorId: string;
  text: string;
}

export interface Incident {
  id: string;
  occurredAt: string;
  cameraId: string;
  zoneId: string;
  sectorId: string;
  category: IncidentCategory;
  type: string;
  severity: Severity;
  /** Nivel de madurez de la capacidad de IA que originó el evento. */
  capability: CapabilityLevel;
  /** Tipo de objeto que originó la detección. */
  objectType: ObjectType;
  /** Cantidad de objetos detectados en el evento. */
  objectCount: number;
  /** Confianza del modelo 0..1; null cuando el evento no proviene de detección por IA. */
  confidence: number | null;
  status: IncidentStatus;
  assigneeId: string | null;
  notes: IncidentNote[];
  hasVideoClip: boolean;
  clipDurationSec: number;
  /** Marca el simulador: el incidente fue generado por el botón de demostración. */
  simulated: boolean;
}

/** Objeto en movimiento sintético asociado a una cámara (alimenta el feed en canvas). */
export interface CameraTrackTarget {
  id: string;
  objectType: ObjectType;
  pattern:
    | 'caminata-horizontal'
    | 'caminata-vertical'
    | 'acercamiento'
    | 'estacionado'
    | 'circulacion';
  /** Posición inicial normalizada dentro del encuadre. */
  origin: Point;
  /** Amplitud del recorrido normalizada. */
  amplitude: number;
  speed: number;
  /** Segundos de permanencia sobre la zona antes de disparar la regla de dwell. */
  dwellSeconds: number;
  size: number;
  /**
   * Keyframes en segundos absolutos de la línea de tiempo.
   *
   * Cuando existen, sustituyen al patrón paramétrico: el objeto recorre un
   * guion fijo y su posición es la misma en el feed, en el motor de reglas y
   * en la reproducción de la línea de tiempo.
   */
  keyframes?: readonly { t: number; x: number; y: number }[];
  /** Confianza fija del detector. Si falta, se deriva del identificador. */
  confidence?: number;
  /** Un actor ambiental no dispara reglas: sólo da vida al encuadre. */
  ambient?: boolean;
}
