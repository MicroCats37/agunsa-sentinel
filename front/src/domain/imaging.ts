import { PLATFORM_NOW_MS } from './clock';
import type { CameraSpec, Illumination, SceneHour } from './types';

/**
 * Modelo de imagen de una cámara IP industrial.
 *
 * Este módulo es la fuente de verdad de la física del feed simulado. Todo es
 * puro y determinista: la misma hora simulada y la misma ficha técnica
 * producen siempre la misma imagen, en el servidor y en el navegador.
 *
 * Reglas implementadas (ficha técnica de referencia):
 *  - conmutación día/noche por filtro IR-cut (ICR) con transición visible;
 *  - encuadre proporcional al campo de visión real de la lente;
 *  - Smart IR: la intensidad del iluminador cae con la cercanía del objeto;
 *  - WDR real ≥ 120 dB: las altas luces se comprimen y no saturan a blanco;
 *  - el grano crece al bajar la iluminancia y baja con DNR activo.
 */

/** Factor de referencia para el encuadre del lienzo (lente de 3.6 mm). */
export const REFERENCE_FOV_DEG = 70;

/** Umbral horario del crepúsculo civil (fim de la luz diurna). */
const DUSK_START_HOUR = 18.5;
const DUSK_END_HOUR = 20;
/** Umbral horario del alba (inicio de la luz diurna). */
const DAWN_START_HOUR = 5.5;
const DAWN_END_HOUR = 7;

/* ------------------------------------------------------------------ */
/* Óptica                                                              */
/* ------------------------------------------------------------------ */

/**
 * Campo de visión horizontal de una lente sobre un sensor de ancho `sensorWidthMm`.
 * `fov = 2 · atan(ancho / (2 · focal))`, en grados.
 */
export function horizontalFovDeg(focalLengthMm: number, sensorWidthMm: number): number {
  if (focalLengthMm <= 0 || sensorWidthMm <= 0) return 0;
  const half = Math.atan(sensorWidthMm / (2 * focalLengthMm));
  return (half * 2 * 180) / Math.PI;
}

/**
 * Factor de zoom del encuadre respecto de la lente de referencia.
 *
 * Una lente más corta (FOV mayor) ve más escena: el fondo se dibuja más
 * pequeño. Una lente más larga comprime el encuadre y el fondo se amplía.
 */
export function fovZoomFactor(fovDeg: number, referenceFovDeg = REFERENCE_FOV_DEG): number {
  if (fovDeg <= 0) return 1;
  const zoom = Math.tan((referenceFovDeg * Math.PI) / 360) / Math.tan((fovDeg * Math.PI) / 360);
  return Math.min(2.2, Math.max(0.42, zoom));
}

/* ------------------------------------------------------------------ */
/* Iluminación                                                         */
/* ------------------------------------------------------------------ */

/** Iluminación del entorno en el instante dado (horas UTC). */
export function illuminationAt(timestampMs: number): Illumination {
  const hour = (timestampMs % 86_400_000) / 3_600_000;
  return illuminationAtHour(hour);
}

/** Iluminación del entorno a una hora concreta del día (0–24). */
export function illuminationAtHour(hour: number): Illumination {
  const normalized = ((hour % 24) + 24) % 24;
  if (normalized >= DUSK_START_HOUR && normalized < DUSK_END_HOUR) return 'crepusculo';
  if (normalized >= DAWN_START_HOUR && normalized < DAWN_END_HOUR) return 'crepusculo';
  if (normalized >= DUSK_END_HOUR || normalized < DAWN_START_HOUR) return 'noche';
  return 'dia';
}

/**
 * Resuelve la hora de la escena.
 *
 * `null` = seguir el reloj de la plataforma. Un número la fuerza.
 */
export function resolveSceneHour(sceneHour: SceneHour, timestampMs: number): number {
  if (sceneHour === null) return (timestampMs % 86_400_000) / 3_600_000;
  return ((sceneHour % 24) + 24) % 24;
}

/** Resuelve la iluminación a partir de la hora de la escena. */
export function resolveIllumination(sceneHour: SceneHour, timestampMs: number): Illumination {
  return illuminationAtHour(resolveSceneHour(sceneHour, timestampMs));
}

/**
 * Estado del filtro IR-cut (ICR).
 *
 * El sensor conmuta a monocromo cuando el iluminador IR toma el relevo:
 * de día el filtro IR-cut bloquea la banda infrarroja y la imagen es en color.
 */
export interface IcrState {
  /** El iluminador infrarrojo está encendido. */
  irEnabled: boolean;
  /** Mezcla de imagen monocroma: 0 = color, 1 = IR puro. */
  monochromeBlend: number;
  /** Veredicto visible en el OSD. */
  badge: 'IR' | 'COLOR' | 'ICR';
}

export function icrState(illumination: Illumination): IcrState {
  switch (illumination) {
    case 'dia':
      return { irEnabled: false, monochromeBlend: 0, badge: 'COLOR' };
    case 'crepusculo':
      return { irEnabled: true, monochromeBlend: 0.5, badge: 'ICR' };
    case 'noche':
      return { irEnabled: true, monochromeBlend: 1, badge: 'IR' };
  }
}

/* ------------------------------------------------------------------ */
/* Exposición, IR inteligente y WDR                                    */
/* ------------------------------------------------------------------ */

/**
 * Smart IR: la intensidad del iluminador se reduce para los objetos cercanos.
 *
 * Devuelve el factor de iluminación (0..1) que recibe un objeto a la distancia
 * indicada. Un objeto a menos del 15 % del alcance IR apenas recibe luz y no
 * se quema; a media distancia la luz es parcial; al final del alcance es total.
 */
export function irIlluminationAt(distanceM: number, irDistanceM: number): number {
  if (irDistanceM <= 0) return 1;
  const ratio = Math.min(1, Math.max(0, distanceM / irDistanceM));
  return Math.pow(ratio, 0.55);
}

/**
 * Techo de las altas luces según el rango dinámico real.
 *
 * Con WDR ≥ 120 dB el sensor comprime las altas luces y el cielo, las luminarias
 * y los reflejos no saturan a blanco puro: conservan detalle.
 */
export function highlightCeiling(wdrDb: number): number {
  if (wdrDb >= 120) return 0.86;
  if (wdrDb >= 100) return 0.94;
  return 1;
}

/** Compresión real de altas luces (curva suave de hombro). */
export function compressHighlights(value: number, wdrDb: number): number {
  const ceiling = highlightCeiling(wdrDb);
  if (value <= ceiling) return value;
  const over = (value - ceiling) / (1 - ceiling);
  return ceiling + (1 - ceiling) * Math.pow(over, 2.2);
}

/**
 * Nivel de grano del sensor (0..1).
 *
 * El ruido crece al bajar la iluminancia y baja cuando DNR está activo.
 */
export function noiseLevel(illumination: Illumination, spec: CameraSpec): number {
  const base = illumination === 'dia' ? 0.06 : illumination === 'crepusculo' ? 0.24 : 0.42;
  const wdrRelief = spec.wdrDb >= 120 ? 0.18 : spec.wdrDb >= 100 ? 0.1 : 0;
  const dnrRelief = spec.dnr ? 0.22 : 0;
  return Math.min(0.75, Math.max(0.02, base - wdrRelief - dnrRelief));
}

/** Contraste de la imagen: el IR reduce el contraste local (imagen lavada). */
export function contrastFactor(illumination: Illumination): number {
  switch (illumination) {
    case 'dia':
      return 1.12;
    case 'crepusculo':
      return 0.92;
    case 'noche':
      return 0.78;
  }
}

/* ------------------------------------------------------------------ */
/* Conmutación ICR visible                                             */
/* ------------------------------------------------------------------ */

/** Duración del fundido de conmutación ICR, en milisegundos. */
export const ICR_CROSSFADE_MS = 1100;

/**
 * Avanza la mezcla ICR hacia el objetivo con una constante de tiempo.
 * Devuelve la nueva mezcla, entre 0 (color) y 1 (monocromo IR).
 */
export function stepIcrBlend(current: number, target: number, deltaMs: number): number {
  const rate = 1 / (ICR_CROSSFADE_MS * 0.35);
  const step = Math.min(1, Math.max(0, deltaMs / 1000) * rate * 6);
  if (current < target) return Math.min(target, current + step);
  if (current > target) return Math.max(target, current - step);
  return target;
}

/** Instante de referencia de la plataforma por defecto. */
export const DEFAULT_NOW_MS = PLATFORM_NOW_MS;
