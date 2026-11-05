import type {
  CameraClassification,
  CameraPriority,
  CameraViewIntent,
  TestResult,
} from '@/domain/types';

/**
 * Inventario real evaluado en el informe de Lizardo Rudi Reguera Izquierdo
 * (IMUPESA, 03/11/2026).
 *
 * Estas 36 filas no son un catálogo inventado: son el resultado de la
 * evaluación de las 36 IP únicas del inventario `RELACION DE CAMARAS -
 * IMUPESA.xlsx`, con las dos pruebas de captura (nocturna 02/11/2026 20:55 y
 * diurna 03/11/2026 14:47) hechas a través del visor 192.168.2.62:5180.
 *
 * Lo que el informe NO dice y por eso aquí no aparece:
 *  - no existe vínculo confirmado entre cada IP y un poste del plano;
 *  - la resolución recibida no equivale al máximo del equipo;
 *  - una fotografía no certifica calidad, estabilidad ni grabación.
 *
 * La ubicación en el plano que usa el mockup es, por tanto, **provisional**:
 * se distribuye cada sector sobre un tramo del cerco y se deja constancia de
 * que el levantamiento de postes es el primer entregable de la fase 1.
 */

/** Ventanas horarias de las dos consultas de captura. */
export const CAPTURE_SESSIONS = {
  nocturna: { date: '02/11/2026', window: '20:55 – 20:56' },
  diurna: { date: '03/11/2026', window: '14:47 – 14:48' },
} as const;

/**
 * Pendientes que el informe repite de forma literal en las 36 fichas.
 * Se conservan como texto único para no perder la redacción original.
 */
export const STANDARD_PENDING_ITEMS: readonly string[] = [
  'prueba de grabación',
  'distancia al objetivo',
  'cobertura vecina',
  'ubicación del poste',
  'switch y puerto',
  'medición del recorrido de cable',
];

/** Nota de sector de los equipos confirmados por el usuario el 03/11/2026. */
const GAMBETTA_CONFIRMED =
  'AV. NESTOR GAMBETTA (AUXILIAR). Gambetta confirmado por el usuario 03/11/2026. Poste pendiente de levantamiento.';
/** Nota de sector heredada del inventario, sin confirmación física. */
const GAMBETTA_INVENTORY =
  'AV. NESTOR GAMBETTA (AUXILIAR). Sector según inventario; pendiente de confirmación física. Poste pendiente de levantamiento.';
const SIETE_INVENTORY =
  'CALLE SIETE. Sector según inventario; pendiente de confirmación física. Poste pendiente de levantamiento.';
const ARICA_INVENTORY =
  'CALLE ARICA. Sector según inventario; pendiente de confirmación física. Poste pendiente de levantamiento.';
const ARICA_COROLA_INVENTORY =
  'CALLE ARICA/CALLE COROLA. Sector según inventario; pendiente de confirmación física. Poste pendiente de levantamiento.';
const COROLA_INVENTORY =
  'CALLE COROLA. Sector según inventario; pendiente de confirmación física. Poste pendiente de levantamiento.';

/** Hallazgo nocturno de los equipos que no entregaron fotograma. */
const NO_FRAME_RTSP =
  'Sin fotograma después de dos intentos. No es posible evaluar calidad óptica. El visor reportó RTSP disponible: comprobar credenciales, ruta de captura, perfil y decodificación.';
const NO_FRAME_NO_RTSP =
  'Sin fotograma después de dos intentos. No es posible evaluar calidad óptica. El visor no reportó disponibilidad RTSP: comprobar alimentación/PoE, enlace, VLAN, ruta y equipo en sitio.';
/** Hallazgo diurno de los equipos que no entregaron fotograma. */
const NO_FRAME_DAY = 'Sin fotografía tras dos intentos; calidad óptica no evaluable.';

/** Acción recomendada para los equipos sin imagen. */
const ACTION_DIAGNOSE =
  'Diagnosticar red/PoE, credenciales, ruta y decodificación; probar con enlace conocido antes de reemplazar.';
/** Acción recomendada para los equipos con velo, halo o foco deficiente. */
const ACTION_CLEAN =
  'Limpiar cubierta, revisar humedad/enfoque y exposición; repetir prueba día/noche.';

export interface CameraInventoryRow {
  /** Identificador del inventario (C01 … C36). */
  id: string;
  /** Dirección IP de gestión del equipo. */
  ip: string;
  /** Modelo declarado en el inventario (pendiente de verificación física). */
  model: string;
  /** Resultado de la captura diurna. */
  dayResult: TestResult;
  /** Resultado de la captura nocturna. */
  nightResult: TestResult;
  /** Clasificación conjunta (la peor limitación relevante). */
  classification: CameraClassification;
  /** Prioridad de intervención. */
  priority: CameraPriority;
  /** Clave del sector documental al que pertenece el equipo. */
  sectorId: string;
  /** Resolución recibida en la consulta; `null` si no hubo fotograma. */
  receivedResolution: { width: number; height: number } | null;
  /** Hallazgo de la prueba diurna. */
  dayFinding: string;
  /** Hallazgo de la prueba nocturna. */
  nightFinding: string;
  /** Acción recomendada. */
  recommendedAction: string;
  /** Error HTTP del visor, si lo hubo. */
  httpError: string | null;
  /** Nota de sector heredada del informe. */
  sectorNote: string;
  /** Obstrucción documentada (OCxx) asociada al equipo. */
  obstructionId: string | null;
  /** Intención de cobertura deducida del texto de los hallazgos. */
  viewIntent: CameraViewIntent;
  /** Nombre operativo de la cámara en el centro de control. */
  label: string;
}

export const CAMERA_INVENTORY: readonly CameraInventoryRow[] = [
  {
    id: 'C01',
    ip: '100.168.80.49',
    model: 'QNO-8080R',
    dayResult: 'ERROR',
    nightResult: 'ERROR',
    classification: 'sin_imagen',
    priority: 'P1',
    sectorId: 'sec-gambetta',
    receivedResolution: null,
    dayFinding: NO_FRAME_DAY,
    nightFinding: NO_FRAME_RTSP,
    recommendedAction: ACTION_DIAGNOSE,
    httpError: 'HTTP 504: Gateway Timeout',
    sectorNote: GAMBETTA_CONFIRMED,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Gambetta · poste 01',
  },
  {
    id: 'C02',
    ip: '100.168.80.50',
    model: 'QNO-8080R',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'buena_general',
    priority: 'P3',
    sectorId: 'sec-gambetta',
    receivedResolution: { width: 2592, height: 1944 },
    dayFinding:
      'Acceso distinguible; el reloj superpuesto no coincide con la hora de consulta.',
    nightFinding:
      'Acceso y calzada distinguibles, buena visión general. Foco luminoso lateral saturado. El reloj visible marca 07:08:55 frente a la consulta nocturna: validar NTP y actualidad del fotograma.',
    recommendedAction: 'Mantener y verificar reconocimiento y grabación.',
    httpError: null,
    sectorNote: GAMBETTA_CONFIRMED,
    obstructionId: null,
    viewIntent: 'acceso',
    label: 'Gambetta · acceso',
  },
  {
    id: 'C03',
    ip: '100.168.80.51',
    model: 'QNO-8080R',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'deficiente',
    priority: 'P1',
    sectorId: 'sec-gambetta',
    receivedResolution: { width: 2560, height: 1440 },
    dayFinding: 'Poste central y borrosidad; se mantiene la pérdida de cobertura.',
    nightFinding:
      'Poste blanco ocupa el centro y divide la escena; velo y reflejos reducen detalle. Reubicar el encuadre y revisar óptica.',
    recommendedAction: 'Reorientar fuera del poste; limpiar y enfocar.',
    httpError: null,
    sectorNote: GAMBETTA_CONFIRMED,
    obstructionId: 'OC03',
    viewIntent: 'exterior',
    label: 'Gambetta · poste 03',
  },
  {
    id: 'C04',
    ip: '100.168.80.52',
    model: 'QNO-8080R',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'buena_general',
    priority: 'P3',
    sectorId: 'sec-gambetta',
    receivedResolution: { width: 2592, height: 1944 },
    dayFinding: 'Acceso distinguible con luz natural.',
    nightFinding:
      'Acceso y entorno distinguibles con detalle general útil. Conservar; verificar movimiento y rostros con prueba controlada.',
    recommendedAction: 'Mantener y verificar reconocimiento y grabación.',
    httpError: null,
    sectorNote: GAMBETTA_CONFIRMED,
    obstructionId: null,
    viewIntent: 'acceso',
    label: 'Gambetta · acceso secundario',
  },
  {
    id: 'C05',
    ip: '100.168.60.43',
    model: 'QNO-8080R',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'deficiente',
    priority: 'P1',
    sectorId: 'sec-gambetta',
    receivedResolution: { width: 2592, height: 1944 },
    dayFinding: 'Velo general y pérdida de contraste aunque hay luz natural.',
    nightFinding:
      'Halos extensos en luminarias y contraste reducido. Revisar limpieza, cubierta, enfoque y exposición nocturna.',
    recommendedAction: ACTION_CLEAN,
    httpError: null,
    sectorNote: GAMBETTA_CONFIRMED,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Gambetta · poste 05',
  },
  {
    id: 'C06',
    ip: '100.168.160.1',
    model: 'QNP-6230H',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'deficiente',
    priority: 'P1',
    sectorId: 'sec-gambetta',
    receivedResolution: { width: 1920, height: 1080 },
    dayFinding: 'Mejora la escena sin faros nocturnos; persiste detalle limitado.',
    nightFinding:
      'Fuertes saturaciones por faros y luminarias; poco detalle en sombras. Revisar exposición, enfoque e iluminación.',
    recommendedAction: ACTION_CLEAN,
    httpError: null,
    sectorNote: GAMBETTA_CONFIRMED,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Gambetta · poste 06',
  },
  {
    id: 'C07',
    ip: '100.168.80.56',
    model: 'QNO-8080R',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'limitada',
    priority: 'P2',
    sectorId: 'sec-gambetta',
    receivedResolution: { width: 2592, height: 1944 },
    dayFinding: 'Postes y vehículos ocultan tramos; contraste reducido.',
    nightFinding:
      'Escena general visible; postes centrales y reflejos restringen cobertura. Mejorar orientación y comprobar solape con cámara vecina.',
    recommendedAction: 'Modificar encuadre y comprobar cobertura cruzada.',
    httpError: null,
    sectorNote: GAMBETTA_CONFIRMED,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Gambetta · poste 07',
  },
  {
    id: 'C08',
    ip: '100.168.160.28',
    model: 'QNO-8080R',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'deficiente',
    priority: 'P1',
    sectorId: 'sec-gambetta',
    receivedResolution: { width: 2592, height: 1944 },
    dayFinding: 'Velo general y bordes difusos; recuperó imagen en el segundo intento.',
    nightFinding:
      'Velo intenso, saturación lateral y zona oscura central. Requirió segundo intento. Revisar óptica, iluminación y estabilidad del servicio.',
    recommendedAction: ACTION_CLEAN,
    httpError: null,
    sectorNote: GAMBETTA_CONFIRMED,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Gambetta · poste 08',
  },
  {
    id: 'C09',
    ip: '100.168.160.29',
    model: 'QNO-8080R',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'deficiente',
    priority: 'P1',
    sectorId: 'sec-gambetta',
    receivedResolution: { width: 2592, height: 1944 },
    dayFinding: 'Borrusidad general y manchas/velos; no depende solo de luces nocturnas.',
    nightFinding:
      'Borrosidad general y halos; vista muy amplia para distinguir detalles lejanos. Revisar enfoque, cubierta y distancia al objetivo.',
    recommendedAction: ACTION_CLEAN,
    httpError: null,
    sectorNote: GAMBETTA_CONFIRMED,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Gambetta · poste 09',
  },
  {
    id: 'C10',
    ip: '100.168.160.21',
    model: 'QNO-8080R',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'deficiente',
    priority: 'P1',
    sectorId: 'sec-gambetta',
    receivedResolution: { width: 2592, height: 1944 },
    dayFinding: 'Velo persistente; contenedores tapan parte de la escena.',
    nightFinding:
      'Contraste muy bajo y velo general; contenedores ocupan gran parte del encuadre. Limpiar/verificar cubierta y orientar al área requerida.',
    recommendedAction: ACTION_CLEAN,
    httpError: null,
    sectorNote: GAMBETTA_CONFIRMED,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Gambetta · poste 10',
  },
  {
    id: 'C11',
    ip: '100.168.80.30',
    model: 'QNO-8080R',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'deficiente',
    priority: 'P1',
    sectorId: 'sec-gambetta',
    receivedResolution: { width: 2592, height: 1944 },
    dayFinding: 'Bajo contraste persistente y aspecto velado.',
    nightFinding:
      'Velo general que reduce seriamente el contraste. Inspeccionar cubierta, humedad y limpieza antes de atribuir daño al sensor.',
    recommendedAction: ACTION_CLEAN,
    httpError: null,
    sectorNote: GAMBETTA_CONFIRMED,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Gambetta · poste 11',
  },
  {
    id: 'C12',
    ip: '100.168.80.31',
    model: 'QNO-8080R',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'limitada',
    priority: 'P2',
    sectorId: 'sec-gambetta',
    receivedResolution: { width: 2592, height: 1944 },
    dayFinding: 'Buena visibilidad general, con postes interpuestos.',
    nightFinding:
      'Escena útil para observación; postes centrales y mancha oscura inferior generan obstrucciones. Limpiar y ajustar encuadre.',
    recommendedAction: 'Eliminar obstrucción óptica y ajustar posición frente a postes.',
    httpError: null,
    sectorNote: GAMBETTA_CONFIRMED,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Gambetta · poste 12',
  },
  {
    id: 'C13',
    ip: '100.168.80.29',
    model: 'QNO-7080R',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'deficiente',
    priority: 'P1',
    sectorId: 'sec-gambetta',
    receivedResolution: { width: 2592, height: 1520 },
    dayFinding: 'Desenfoque persistente; poste en primer plano.',
    nightFinding:
      'Desenfoque marcado y luminarias saturadas; postes interpuestos. Revisar enfoque/óptica y orientación.',
    recommendedAction: ACTION_CLEAN,
    httpError: null,
    sectorNote: GAMBETTA_CONFIRMED,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Gambetta · poste 13',
  },
  {
    id: 'C14',
    ip: '100.168.80.28',
    model: 'QNO-6080R',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'deficiente',
    priority: 'P1',
    sectorId: 'sec-gambetta',
    receivedResolution: { width: 1920, height: 1080 },
    dayFinding: 'Escena más visible de día, todavía blanda y con bajo contraste.',
    nightFinding:
      'Velo, bajo contraste y pared próxima sobreexpuesta. Requirió segundo intento. Revisar óptica y estabilidad; separar el foco de luz de la escena.',
    recommendedAction: ACTION_CLEAN,
    httpError: null,
    sectorNote: GAMBETTA_CONFIRMED,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Gambetta · poste 14',
  },
  {
    id: 'C15',
    ip: '100.168.160.16',
    model: 'QNO-8080R',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'buena_general',
    priority: 'P3',
    sectorId: 'sec-gambetta',
    receivedResolution: { width: 2592, height: 1944 },
    dayFinding: 'Escena amplia distinguible; comprobar detalle a distancia requerida.',
    nightFinding:
      'Calzada y vehículos distinguibles; buena visión general. Conservar y validar capacidad de reconocimiento a distancia.',
    recommendedAction: 'Mantener y verificar reconocimiento y grabación.',
    httpError: null,
    sectorNote: GAMBETTA_CONFIRMED,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Gambetta · poste 15',
  },
  {
    id: 'C16',
    ip: '100.168.160.17',
    model: 'QNO-8080R',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'deficiente',
    priority: 'P1',
    sectorId: 'sec-gambetta',
    receivedResolution: { width: 2592, height: 1944 },
    dayFinding: 'Contenedores bloquean la vista al fondo; detalle próximo mejor de día.',
    nightFinding:
      'Contenedores apilados ocultan el área posterior y hay velo. Ajustar ubicación/cobertura y coordinar restricciones de apilamiento.',
    recommendedAction: 'Reubicar o restringir apilamiento; añadir cobertura sólo tras prueba.',
    httpError: null,
    sectorNote: GAMBETTA_INVENTORY,
    obstructionId: 'OC16',
    viewIntent: 'exterior',
    label: 'Gambetta · poste 16',
  },
  {
    id: 'C17',
    ip: '100.168.160.20',
    model: 'QNO-8080R',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'limitada',
    priority: 'P2',
    sectorId: 'sec-gambetta',
    receivedResolution: { width: 2592, height: 1944 },
    dayFinding: 'Escena general visible, puente y postes ocultan partes.',
    nightFinding:
      'Área general visible; puente, postes y luces producen ocultamientos parciales. Validar cobertura complementaria y ajustar exposición.',
    recommendedAction: 'Comprobar zona detrás del puente y postes con recorrido.',
    httpError: null,
    sectorNote: GAMBETTA_INVENTORY,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Gambetta · poste 17',
  },
  {
    id: 'C18',
    ip: '100.168.80.48',
    model: 'QNO-8080R',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'limitada',
    priority: 'P2',
    sectorId: 'sec-siete',
    receivedResolution: { width: 2592, height: 1944 },
    dayFinding: 'Calle distinguible; poste central mantiene obstrucción.',
    nightFinding:
      'Calle visible, pero poste y objeto cercano oscuro obstruyen la imagen. Retirar obstrucción autorizada y reajustar; ahora sí entregó imagen.',
    recommendedAction: 'Reencuadrar respecto al poste y retirar objeto próximo autorizado.',
    httpError: null,
    sectorNote: SIETE_INVENTORY,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Siete · poste 18',
  },
  {
    id: 'C19',
    ip: '100.168.80.10',
    model: 'QNO-6070R',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'deficiente',
    priority: 'P1',
    sectorId: 'sec-siete',
    receivedResolution: { width: 1920, height: 1080 },
    dayFinding: 'Escena visible, con nitidez limitada en el fondo.',
    nightFinding:
      'Imagen blosa con halos; detalle lejano limitado. Revisar enfoque, cubierta e iluminación.',
    recommendedAction: ACTION_CLEAN,
    httpError: null,
    sectorNote: SIETE_INVENTORY,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Siete · poste 19',
  },
  {
    id: 'C20',
    ip: '100.168.80.36',
    model: 'QNO-8080R',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'buena_general',
    priority: 'P3',
    sectorId: 'sec-siete',
    receivedResolution: { width: 2592, height: 1944 },
    dayFinding: 'Detalle útil de calle y obras junto al muro.',
    nightFinding:
      'Detalle general claro de calle, muro y obras. Mantener; evaluar cómo las obras modifican el perímetro y sus accesos.',
    recommendedAction: 'Mantener y verificar reconocimiento y grabación.',
    httpError: null,
    sectorNote: SIETE_INVENTORY,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Siete · poste 20',
  },
  {
    id: 'C21',
    ip: '100.168.70.29',
    model: 'QNO-8080R',
    dayResult: 'ERROR',
    nightResult: 'ERROR',
    classification: 'sin_imagen',
    priority: 'P1',
    sectorId: 'sec-siete',
    receivedResolution: null,
    dayFinding: NO_FRAME_DAY,
    nightFinding: NO_FRAME_RTSP,
    recommendedAction: ACTION_DIAGNOSE,
    httpError: 'HTTP 502: Bad Gateway',
    sectorNote: SIETE_INVENTORY,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Siete · poste 21',
  },
  {
    id: 'C22',
    ip: '100.168.70.19',
    model: 'SND-L5013',
    dayResult: 'ERROR',
    nightResult: 'ERROR',
    classification: 'sin_imagen',
    priority: 'P1',
    sectorId: 'sec-siete',
    receivedResolution: null,
    dayFinding: NO_FRAME_DAY,
    nightFinding: NO_FRAME_RTSP,
    recommendedAction: ACTION_DIAGNOSE,
    httpError: 'HTTP 502: Bad Gateway',
    sectorNote: SIETE_INVENTORY,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Siete · poste 22',
  },
  {
    id: 'C23',
    ip: '100.168.70.6',
    model: 'QNO-8080R',
    dayResult: 'ERROR',
    nightResult: 'ERROR',
    classification: 'sin_imagen',
    priority: 'P1',
    sectorId: 'sec-arica',
    receivedResolution: null,
    dayFinding: NO_FRAME_DAY,
    nightFinding: NO_FRAME_RTSP,
    recommendedAction: ACTION_DIAGNOSE,
    httpError: 'HTTP 502: Bad Gateway',
    sectorNote: ARICA_INVENTORY,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Arica · poste 23',
  },
  {
    id: 'C24',
    ip: '100.168.80.5',
    model: 'SNO-L6083R',
    dayResult: 'OK',
    nightResult: 'ERROR',
    classification: 'deficiente',
    priority: 'P1',
    sectorId: 'sec-arica',
    receivedResolution: { width: 1920, height: 1080 },
    dayFinding:
      'Volvió a entregar imagen; escena blanda y obstáculos próximos. Desempeño nocturno pendiente.',
    nightFinding: NO_FRAME_NO_RTSP,
    recommendedAction:
      'Verificar modelo/serie; probar de noche y planificar renovación por ciclo de vida.',
    httpError: 'HTTP 502: Bad Gateway',
    sectorNote: ARICA_INVENTORY,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Arica · poste 24',
  },
  {
    id: 'C25',
    ip: '100.168.70.9',
    model: 'QNO-8080R',
    dayResult: 'ERROR',
    nightResult: 'ERROR',
    classification: 'sin_imagen',
    priority: 'P1',
    sectorId: 'sec-arica',
    receivedResolution: null,
    dayFinding: NO_FRAME_DAY,
    nightFinding: NO_FRAME_NO_RTSP,
    recommendedAction: ACTION_DIAGNOSE,
    httpError: 'HTTP 502: Bad Gateway',
    sectorNote: ARICA_INVENTORY,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Arica · poste 25',
  },
  {
    id: 'C26',
    ip: '100.168.80.46',
    model: 'QNO-7080R',
    dayResult: 'OK',
    nightResult: 'ERROR',
    classification: 'limitada',
    priority: 'P2',
    sectorId: 'sec-arica',
    receivedResolution: { width: 2592, height: 1520 },
    dayFinding:
      'Volvió a entregar imagen; calle visible con detalle limitado. Noche pendiente.',
    nightFinding: NO_FRAME_NO_RTSP,
    recommendedAction: 'Verificar estabilidad y nitidez nocturna antes de aceptar.',
    httpError: 'HTTP 502: Bad Gateway',
    sectorNote: ARICA_INVENTORY,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Arica · poste 26',
  },
  {
    id: 'C27',
    ip: '100.168.80.43',
    model: 'QNO-7080R',
    dayResult: 'OK',
    nightResult: 'ERROR',
    classification: 'limitada',
    priority: 'P2',
    sectorId: 'sec-arica',
    receivedResolution: { width: 2592, height: 1944 },
    dayFinding:
      'Volvió a entregar imagen; vista de calle útil. Noche pendiente y modelo físico por verificar.',
    nightFinding: NO_FRAME_NO_RTSP,
    recommendedAction: 'Conciliar modelo, resolución y etiqueta física; repetir noche.',
    httpError: 'HTTP 502: Bad Gateway',
    sectorNote: ARICA_INVENTORY,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Arica · poste 27',
  },
  {
    id: 'C28',
    ip: '100.168.80.44',
    model: 'QNO-6070R',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'deficiente',
    priority: 'P1',
    sectorId: 'sec-arica',
    receivedResolution: { width: 1920, height: 1080 },
    dayFinding: 'Velo intenso incluso de día: prioridad de inspección óptica.',
    nightFinding:
      'Deficiencia crítica: imagen casi totalmente velada, sólo se distinguen luces. Inspección física prioritaria de cubierta, humedad, enfoque y sensor.',
    recommendedAction:
      'Inspección óptica urgente; reemplazar sólo si falla después de limpieza/enfoque y prueba técnica.',
    httpError: null,
    sectorNote: ARICA_INVENTORY,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Arica · poste 28',
  },
  {
    id: 'C29',
    ip: '100.168.80.45',
    model: 'QNO-6070R',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'deficiente',
    priority: 'P1',
    sectorId: 'sec-arica',
    receivedResolution: { width: 1920, height: 1080 },
    dayFinding: 'Desenfoque marcado incluso de día; árboles y sombras limitan detalle.',
    nightFinding:
      'Desenfoque y destellos intensos; vegetación y sombras limitan observación. Limpiar, enfocar y corregir iluminación/vegetación.',
    recommendedAction: ACTION_CLEAN,
    httpError: null,
    sectorNote: ARICA_INVENTORY,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Arica · poste 29',
  },
  {
    id: 'C30',
    ip: '100.168.1.141',
    model: 'QNO-8080R',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'buena_general',
    priority: 'P3',
    sectorId: 'sec-arica',
    receivedResolution: { width: 2592, height: 1944 },
    dayFinding: 'Patio y calle distinguibles; vegetación y techos ocultan áreas.',
    nightFinding:
      'Patio y calle distinguibles con buen detalle general. Vegetación y techos ocultan partes; ahora sí entregó imagen.',
    recommendedAction: 'Mantener y verificar reconocimiento y grabación.',
    httpError: null,
    sectorNote: ARICA_INVENTORY,
    obstructionId: null,
    viewIntent: 'interior',
    label: 'Arica · patio',
  },
  {
    id: 'C31',
    ip: '100.168.100.8',
    model: 'QNO-6010R',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'deficiente',
    priority: 'P1',
    sectorId: 'sec-por-conciliar',
    receivedResolution: { width: 800, height: 600 },
    dayFinding: '800 x 600; vegetación y techos restringen cobertura.',
    nightFinding:
      'Sólo 800 x 600 recibidos; vegetación ocupa gran parte izquierda y luces con halos. Revisar perfil de captura y cobertura; resolver duplicidad del inventario.',
    recommendedAction: 'Solicitar perfil principal y conciliar calle/poste; corregir vegetación.',
    httpError: null,
    sectorNote: ARICA_COROLA_INVENTORY,
    obstructionId: 'OC31',
    viewIntent: 'interior',
    label: 'Por conciliar · 100.168.100.8',
  },
  {
    id: 'C32',
    ip: '100.168.100.9',
    model: 'QNO-8080R',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'buena_general',
    priority: 'P3',
    sectorId: 'sec-corola',
    receivedResolution: { width: 2592, height: 1944 },
    dayFinding: 'Franja junto al muro visible; techos ocultan áreas interiores.',
    nightFinding:
      'Buena nitidez general de franja perimetral y calle. Techos ocultan áreas interiores; conservar con cobertura complementaria.',
    recommendedAction: 'Mantener y verificar reconocimiento y grabación.',
    httpError: null,
    sectorNote: COROLA_INVENTORY,
    obstructionId: null,
    viewIntent: 'interior',
    label: 'Corola · poste 32',
  },
  {
    id: 'C33',
    ip: '100.168.100.11',
    model: 'SNO-L6083R',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'deficiente',
    priority: 'P1',
    sectorId: 'sec-corola',
    receivedResolution: { width: 640, height: 480 },
    dayFinding: '640 x 480; escena blosa y pérdida de detalle.',
    nightFinding:
      'Sólo 640 x 480 recibidos, imagen blanda y halos. Confirmar modelo físico y perfil principal antes de decidir reemplazo.',
    recommendedAction:
      'Verificar perfil principal y modelo; evaluar renovación por ciclo de vida.',
    httpError: null,
    sectorNote: COROLA_INVENTORY,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Corola · poste 33',
  },
  {
    id: 'C34',
    ip: '100.168.1.139',
    model: 'QNO-8080R',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'deficiente',
    priority: 'P1',
    sectorId: 'sec-corola',
    receivedResolution: { width: 2592, height: 1944 },
    dayFinding: 'Más visible que de noche; persiste velo y saturación en zona iluminada.',
    nightFinding:
      'Fuerte deslumbramiento izquierdo y zonas oscuras; techos/contenedores limitan cobertura. Reorientar iluminación y revisar óptica.',
    recommendedAction: ACTION_CLEAN,
    httpError: null,
    sectorNote: COROLA_INVENTORY,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Corola · poste 34',
  },
  {
    id: 'C35',
    ip: '100.168.100.14',
    model: 'QNO-7080R',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'deficiente',
    priority: 'P1',
    sectorId: 'sec-corola',
    receivedResolution: { width: 640, height: 480 },
    dayFinding:
      '640 x 480; contenedores cercanos dominan el encuadre. Escena distinta a la nocturna: verificar orientación/obstáculos.',
    nightFinding:
      'Sólo 640 x 480; reja cercana domina el encuadre y el fondo está saturado. Requirió segundo intento. Reubicar, revisar perfil y estabilidad.',
    recommendedAction: 'Reubicar objetivo de cobertura y revisar perfil de 640 x 480.',
    httpError: null,
    sectorNote: COROLA_INVENTORY,
    obstructionId: 'OC35',
    viewIntent: 'exterior',
    label: 'Corola · poste 35',
  },
  {
    id: 'C36',
    ip: '100.168.80.1',
    model: 'QNO-8080R',
    dayResult: 'OK',
    nightResult: 'OK',
    classification: 'deficiente',
    priority: 'P1',
    sectorId: 'sec-corola',
    receivedResolution: { width: 2592, height: 1520 },
    dayFinding: 'Desenfoque persistente aun con luz natural.',
    nightFinding:
      'Borrosidad marcada y luminarias muy saturadas. Revisar enfoque, cubierta y exposición; confirmar modelo/perfil por resolución recibida.',
    recommendedAction: ACTION_CLEAN,
    httpError: null,
    sectorNote: COROLA_INVENTORY,
    obstructionId: null,
    viewIntent: 'exterior',
    label: 'Corola · poste 36',
  },
];

export const INVENTORY_BY_ID = new Map(
  CAMERA_INVENTORY.map((row) => [row.id, row] as const),
);

/**
 * Resumen de la clasificación conjunta.
 * Las cifras deben coincidir con las del informe: 6 / 6 / 19 / 5.
 */
export const CLASSIFICATION_SUMMARY: Readonly<
  Record<CameraClassification, { count: number; treatment: string }>
> = {
  buena_general: {
    count: 6,
    treatment: 'Conservar bajo pruebas de cobertura, movimiento y grabación',
  },
  limitada: {
    count: 6,
    treatment: 'Corregir encuadre y validar zonas ocultas; C26 y C27 aún sin noche',
  },
  deficiente: {
    count: 19,
    treatment: 'Corregir óptica, exposición, perfil o cobertura y repetir pruebas',
  },
  sin_imagen: {
    count: 5,
    treatment: 'Diagnóstico del camino completo; daño físico no confirmado',
  },
};

/** Etiquetas legibles de la clasificación (paleta del informe). */
