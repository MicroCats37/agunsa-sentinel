import type { SimActor, SimBeat, Storyline } from './types';

/**
 * Guion de la noche simulada.
 *
 * Es la pieza que hace creíble la demostración: en lugar de que las alertas
 * aparezcan al azar, hay una noche contada con horas fijas. Todo lo que ocurre
 * está escrito aquí, con offsets constantes respecto del inicio de la línea de
 * tiempo, de modo que la secuencia es idéntica en cada ejecución.
 *
 * Los actores con guion son los únicos que pueden disparar una regla; los
 * actores ambientales (generados aparte) sólo dan vida al encuadre.
 *
 * La línea de tiempo arranca a las 22:00 y dura 20 minutos. El reloj de la
 * plataforma se sitúa en el minuto 14, de modo que el operador puede rebobinar
 * la noche y verla completa.
 */
export const STORYLINE_DURATION_SEC = 20 * 60;

/** Guion completo. */
export const STORYLINE: Storyline = {
  id: 'noche-gambetta',
  title: 'Ronda nocturna en el perímetro de Gambetta',
  description:
    'Una noche de turno: una ronda sube por la avenida, un vehículo se detiene en la aproximación, una persona merodea junto al poste central de C03, C01 cae y un segundo vehículo entra por el acceso de servicio.',
  durationSec: STORYLINE_DURATION_SEC,
  actors: [
    {
      id: 'patrol-01',
      cameraId: 'C15',
      objectType: 'persona',
      label: 'Ronda de seguridad',
      size: 0.07,
      confidence: 0.84,
      ambient: false,
      startSec: 40,
      endSec: 210,
      keyframes: [
        { t: 40, x: 0.14, y: 0.74 },
        { t: 80, x: 0.3, y: 0.73 },
        { t: 120, x: 0.47, y: 0.72 },
        { t: 160, x: 0.63, y: 0.73 },
        { t: 200, x: 0.79, y: 0.74 },
        { t: 210, x: 0.84, y: 0.74 },
      ],
    },
    {
      id: 'vehiculo-01',
      cameraId: 'C05',
      objectType: 'vehiculo',
      label: 'Camioneta en la aproximación',
      size: 0.2,
      confidence: 0.91,
      ambient: false,
      startSec: 120,
      endSec: 1060,
      keyframes: [
        { t: 120, x: 0.1, y: 0.79 },
        { t: 150, x: 0.28, y: 0.78 },
        { t: 185, x: 0.46, y: 0.77 },
        { t: 205, x: 0.6, y: 0.76 },
        { t: 240, x: 0.63, y: 0.76 },
        { t: 1060, x: 0.63, y: 0.76 },
      ],
    },
    {
      id: 'merodeador-01',
      cameraId: 'C03',
      objectType: 'persona',
      label: 'Persona junto al poste central',
      size: 0.075,
      confidence: 0.88,
      ambient: false,
      startSec: 210,
      endSec: 1120,
      keyframes: [
        { t: 210, x: 0.18, y: 0.76 },
        { t: 240, x: 0.33, y: 0.75 },
        { t: 262, x: 0.47, y: 0.74 },
        { t: 300, x: 0.49, y: 0.74 },
        { t: 1120, x: 0.49, y: 0.74 },
      ],
    },
    {
      id: 'vehiculo-02',
      cameraId: 'C18',
      objectType: 'vehiculo',
      label: 'Vehículo en Calle Siete',
      size: 0.19,
      confidence: 0.86,
      ambient: false,
      startSec: 430,
      endSec: 1160,
      keyframes: [
        { t: 430, x: 0.12, y: 0.78 },
        { t: 455, x: 0.3, y: 0.77 },
        { t: 480, x: 0.48, y: 0.76 },
        { t: 505, x: 0.57, y: 0.75 },
        { t: 530, x: 0.59, y: 0.75 },
        { t: 1160, x: 0.59, y: 0.75 },
      ],
    },
    {
      id: 'persona-patio',
      cameraId: 'C30',
      objectType: 'persona',
      label: 'Persona en el patio interior',
      size: 0.07,
      confidence: 0.82,
      ambient: false,
      startSec: 620,
      endSec: 860,
      keyframes: [
        { t: 620, x: 0.16, y: 0.71 },
        { t: 660, x: 0.34, y: 0.7 },
        { t: 700, x: 0.52, y: 0.69 },
        { t: 740, x: 0.7, y: 0.7 },
        { t: 780, x: 0.86, y: 0.71 },
        { t: 860, x: 0.9, y: 0.71 },
      ],
    },
    {
      id: 'persona-corola',
      cameraId: 'C32',
      objectType: 'persona',
      label: 'Persona sobre la franja de Corola',
      size: 0.065,
      confidence: 0.79,
      ambient: false,
      startSec: 880,
      endSec: 1060,
      keyframes: [
        { t: 880, x: 0.2, y: 0.72 },
        { t: 920, x: 0.42, y: 0.71 },
        { t: 960, x: 0.64, y: 0.72 },
        { t: 1000, x: 0.82, y: 0.73 },
        { t: 1060, x: 0.88, y: 0.73 },
      ],
    },
  ],
  beats: [
    {
      id: 'beat-patrol',
      atSec: 90,
      kind: 'incidente',
      cameraId: 'C15',
      ruleId: 'reg-05',
      actorId: 'patrol-01',
      title: 'Persona aproximándose al cerco (ronda nocturna)',
      detail:
        'Una persona recorre la franja de aproximación al cerco de Gambetta y permanece más de 45 s en la zona perimetral. La confianza del modelo es alta pero el patrón es compatible con una ronda programada.',
      severity: 'baja',
      category: 'persona',
      objectType: 'persona',
      objectCount: 1,
      confidence: 0.84,
      clipDurationSec: 26,
    },
    {
      id: 'beat-c01-offline',
      atSec: 180,
      kind: 'falla',
      cameraId: 'C01',
      ruleId: null,
      actorId: null,
      title: 'C01 pierde señal (HTTP 504)',
      detail:
        'El visor responde HTTP 504 Gateway Timeout en los dos intentos. Es una respuesta del visor, no un código de avería del sensor: hay que comprobar credenciales, ruta de captura, perfil y decodificación antes de reemplazar el equipo.',
      severity: 'critica',
      category: 'falla_camara',
      objectType: 'persona',
      objectCount: 0,
      confidence: null,
      clipDurationSec: 0,
    },
    {
      id: 'beat-merodeador',
      atSec: 330,
      kind: 'incidente',
      cameraId: 'C03',
      ruleId: 'reg-02',
      actorId: 'merodeador-01',
      title: 'Persona merodeando frente al poste central',
      detail:
        'Una persona se detiene junto al poste que ocupa el centro del encuadre de C03 (obstrucción OC03) y permanece más de 120 s en la zona de aproximación. La cámara que debería cubrir el tramo está partida en dos por el poste.',
      severity: 'alta',
      category: 'permanencia',
      objectType: 'persona',
      objectCount: 1,
      confidence: 0.88,
      clipDurationSec: 31,
    },
    {
      id: 'beat-vehiculo-gambetta',
      atSec: 430,
      kind: 'incidente',
      cameraId: 'C05',
      ruleId: 'reg-03',
      actorId: 'vehiculo-01',
      title: 'Vehículo estacionado en la aproximación de Gambetta',
      detail:
        'Una camioneta entra por la aproximación y se detiene más de 5 minutos en una zona de tráfico no habitual. C05 arrastra velo general y pérdida de contraste, por lo que la lectura de la escena depende del detalle noche/día.',
      severity: 'media',
      category: 'vehiculo',
      objectType: 'vehiculo',
      objectCount: 1,
      confidence: 0.91,
      clipDurationSec: 22,
    },
    {
      id: 'beat-vehiculo-siete',
      atSec: 745,
      kind: 'incidente',
      cameraId: 'C18',
      ruleId: 'reg-12',
      actorId: 'vehiculo-02',
      title: 'Vehículo detenido en Calle Siete',
      detail:
        'Un vehículo se detiene en la franja de Calle Siete y permanece más de 5 minutos. C18 tiene el poste central como obstrucción y un objeto cercano oscuro que reduce la imagen nocturna.',
      severity: 'media',
      category: 'vehiculo',
      objectType: 'vehiculo',
      objectCount: 1,
      confidence: 0.86,
      clipDurationSec: 19,
    },
    {
      id: 'beat-patio',
      atSec: 690,
      kind: 'incidente',
      cameraId: 'C30',
      ruleId: 'reg-09',
      actorId: 'persona-patio',
      title: 'Presencia de persona en el patio interior',
      detail:
        'C30 distingue patio y calle: una persona recorre el patio interior de la planta. La cámara es de buena calidad general, aunque la vegetación y los techos ocultan parte del área.',
      severity: 'media',
      category: 'persona',
      objectType: 'persona',
      objectCount: 1,
      confidence: 0.82,
      clipDurationSec: 24,
    },
    {
      id: 'beat-corola',
      atSec: 960,
      kind: 'incidente',
      cameraId: 'C32',
      ruleId: 'reg-13',
      actorId: 'persona-corola',
      title: 'Persona en la franja perimetral de Corola',
      detail:
        'C32 tiene buena nitidez general de la franja perimetral y la calle, pero los techos ocultan áreas interiores: una persona aparece sobre la franja y la cobertura complementaria sigue pendiente.',
      severity: 'baja',
      category: 'persona',
      objectType: 'persona',
      objectCount: 1,
      confidence: 0.79,
      clipDurationSec: 17,
    },
    {
      id: 'beat-patrol-resuelta',
      atSec: 1120,
      kind: 'accion',
      cameraId: 'C15',
      ruleId: 'reg-05',
      actorId: null,
      title: 'Ronda nocturna descartada por el operador',
      detail:
        'El operador contrasta la ronda con el libro de turno, confirma que es personal autorizado y descarta la detección. Queda registrado en el historial de acciones.',
      severity: 'baja',
      category: 'persona',
      objectType: 'persona',
      objectCount: 1,
      confidence: 0.84,
      clipDurationSec: 0,
      operatorAction: {
        incidentRef: 'beat-patrol',
        action: 'Descartar detección',
        result: 'Descartado',
      },
    },
  ],
};

/**
 * Actores con guion indexados por identificador.
 */
export const STORYLINE_ACTORS: ReadonlyMap<string, SimActor> = new Map(
  STORYLINE.actors.map((actor) => [actor.id, actor] as const),
);

/**
 * Incidentes del guion, indexados por la referencia que usan las acciones de
 * operador (un resultado puede cerrar un incidente abierto mucho antes).
 */
export const STORYLINE_BEATS: readonly SimBeat[] = STORYLINE.beats;
