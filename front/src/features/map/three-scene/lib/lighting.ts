/**
 * Iluminación de la escena 3D según la hora simulada.
 *
 * La escena no tiene un único aspecto: la instalacion se ve de dia con sol
 * alto y sombras cortas, al atardecer con un sol rasante y color calido, y de
 * noche con ambiente frio, luminarias encendidas y marcadores de camara
 * emisivos.
 *
 * Las claves horarias se interpolan: mover el control de "hora" produce un
 * cambio continuo del sol, no un salto entre tres presets.
 */

export type TimeOfDayKey = 'dia' | 'crepusculo' | 'noche';

export interface TimeOfDay {
  key: TimeOfDayKey;
  /** Color del fondo (cielo). */
  sky: number;
  /** Color de la niebla. */
  fog: number;
  fogNear: number;
  fogFar: number;
  /** Sol direccional. */
  sunColor: number;
  sunIntensity: number;
  /** Elevacion del sol sobre el horizonte, en grados. */
  sunElevation: number;
  /** Azimut del sol, en grados. */
  sunAzimuth: number;
  /** Relleno hemisferico. */
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  /** Ambiente. */
  ambientColor: number;
  ambientIntensity: number;
  /** Luz de relleno opuesta. */
  fillColor: number;
  fillIntensity: number;
  /** Exposicion del tone mapping. */
  exposure: number;
  /** Intensidad emisiva de las luminarias perimetrales (0 = apagadas). */
  lampIntensity: number;
  /** Emisivo de los marcadores de camara. */
  markerEmissive: number;
  /** Intensidad del bloom. */
  bloom: number;
}

const DAY: TimeOfDay = {
  key: 'dia',
  sky: 0x86aed8,
  fog: 0xa4bcd2,
  fogNear: 170,
  fogFar: 540,
  sunColor: 0xfff4e2,
  sunIntensity: 2.7,
  sunElevation: 58,
  sunAzimuth: 128,
  hemiSky: 0xa6c9e8,
  hemiGround: 0x3b434c,
  hemiIntensity: 1.05,
  ambientColor: 0x64768d,
  ambientIntensity: 0.42,
  fillColor: 0x9fc0e0,
  fillIntensity: 0.55,
  exposure: 1,
  lampIntensity: 0,
  markerEmissive: 0.18,
  bloom: 0.22,
};

const DUSK: TimeOfDay = {
  key: 'crepusculo',
  sky: 0x27304a,
  fog: 0x36405c,
  fogNear: 120,
  fogFar: 430,
  sunColor: 0xffb069,
  sunIntensity: 1.75,
  sunElevation: 9,
  sunAzimuth: 252,
  hemiSky: 0x7185ad,
  hemiGround: 0x241f24,
  hemiIntensity: 0.72,
  ambientColor: 0x4a4a63,
  ambientIntensity: 0.46,
  fillColor: 0x5f7fb0,
  fillIntensity: 0.42,
  exposure: 1.06,
  lampIntensity: 1.1,
  markerEmissive: 0.55,
  bloom: 0.46,
};

const NIGHT: TimeOfDay = {
  key: 'noche',
  sky: 0x070b12,
  fog: 0x0a1119,
  fogNear: 90,
  fogFar: 370,
  sunColor: 0xa8bcd8,
  sunIntensity: 0.34,
  sunElevation: 42,
  sunAzimuth: 305,
  hemiSky: 0x26384f,
  hemiGround: 0x0b1017,
  hemiIntensity: 0.46,
  ambientColor: 0x1d2a42,
  ambientIntensity: 0.52,
  fillColor: 0x2f4a72,
  fillIntensity: 0.3,
  exposure: 1.16,
  lampIntensity: 2.4,
  markerEmissive: 1,
  bloom: 0.6,
};

interface TimeKey {
  hour: number;
  preset: TimeOfDay;
}

const KEYS: readonly TimeKey[] = [
  { hour: 0, preset: NIGHT },
  { hour: 5.4, preset: NIGHT },
  { hour: 7, preset: DAY },
  { hour: 12, preset: DAY },
  { hour: 17.4, preset: DAY },
  { hour: 19.2, preset: DUSK },
  { hour: 20.8, preset: DUSK },
  { hour: 22, preset: NIGHT },
  { hour: 24, preset: NIGHT },
];

/** Interpola dos colores hexadecimales. */
function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Preset de iluminación interpolado para la hora dada. */
export function timeOfDayAt(hour: number): TimeOfDay {
  const normalized = ((hour % 24) + 24) % 24;
  const extended = normalized < KEYS[0]!.hour ? normalized + 24 : normalized;

  let lower = KEYS[0]!;
  let upper = KEYS[KEYS.length - 1]!;
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i]!;
    const b = KEYS[i + 1]!;
    if (extended >= a.hour && extended <= b.hour) {
      lower = a;
      upper = b;
      break;
    }
  }

  const span = upper.hour - lower.hour;
  const t = span === 0 ? 0 : (extended - lower.hour) / span;
  const a = lower.preset;
  const b = upper.preset;

  return {
    key: t < 0.5 ? a.key : b.key,
    sky: lerpColor(a.sky, b.sky, t),
    fog: lerpColor(a.fog, b.fog, t),
    fogNear: lerp(a.fogNear, b.fogNear, t),
    fogFar: lerp(a.fogFar, b.fogFar, t),
    sunColor: lerpColor(a.sunColor, b.sunColor, t),
    sunIntensity: lerp(a.sunIntensity, b.sunIntensity, t),
    sunElevation: lerp(a.sunElevation, b.sunElevation, t),
    sunAzimuth: lerp(a.sunAzimuth, b.sunAzimuth, t),
    hemiSky: lerpColor(a.hemiSky, b.hemiSky, t),
    hemiGround: lerpColor(a.hemiGround, b.hemiGround, t),
    hemiIntensity: lerp(a.hemiIntensity, b.hemiIntensity, t),
    ambientColor: lerpColor(a.ambientColor, b.ambientColor, t),
    ambientIntensity: lerp(a.ambientIntensity, b.ambientIntensity, t),
    fillColor: lerpColor(a.fillColor, b.fillColor, t),
    fillIntensity: lerp(a.fillIntensity, b.fillIntensity, t),
    exposure: lerp(a.exposure, b.exposure, t),
    lampIntensity: lerp(a.lampIntensity, b.lampIntensity, t),
    markerEmissive: lerp(a.markerEmissive, b.markerEmissive, t),
    bloom: lerp(a.bloom, b.bloom, t),
  };
}
