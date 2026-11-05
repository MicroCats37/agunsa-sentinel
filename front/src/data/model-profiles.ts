import { horizontalFovDeg } from '@/domain/imaging';
import type { CameraFormFactor, CameraSpec } from '@/domain/types';

/**
 * Ficha técnica por modelo de equipo.
 *
 * El informe sólo declara el modelo del inventario y la resolución que cada
 * equipo entregó en la consulta. El resto de la ficha se deriva de la familia
 * del equipo y de la referencia técnica de 4 MP del proyecto
 * (`docs/references.md` §3), de modo que lo declarado y lo simulado no se
 * contradicen.
 *
 * Dos advertencias del informe se reflejan aquí:
 *  - la resolución recibida NO equivale al máximo del equipo;
 *  - `SNO-L6083R` figura como discontinuado por el fabricante y con
 *    1920 × 1080 como resolución de referencia.
 */

export interface ModelProfile {
  model: string;
  /** Factor de forma: cambia el soporte dibujado en la vista 3D. */
  formFactor: CameraFormFactor;
  /** Descripción comercial del formato de la serie. */
  seriesNote: string;
  sensor: string;
  sensorWidthMm: number;
  /** Resolución máxima declarada del equipo. */
  resolutionWidth: number;
  resolutionHeight: number;
  fps: number;
  subStream: string;
  codec: string;
  bitrateKbps: number;
  lensType: CameraSpec['lensType'];
  focalLengthMm: number;
  aperture: number;
  irDistanceM: number;
  irWavelengthNm: number;
  smartIr: boolean;
  wdrDb: number;
  dnr: boolean;
  poeClass: string;
  ipRating: string;
  ikRating: string | null;
  powerDrawW: number;
  powerDrawIrW: number;
  onvifProfiles: string[];
  /** Estado del modelo en catálogo: vigente o discontinuado. */
  lifecycle: 'vigente' | 'discontinuado' | 'por_verificar';
  /** Nota de ciclo de vida o de verificación heredada del informe. */
  lifecycleNote: string;
}

export const MODEL_PROFILES: Record<string, ModelProfile> = {
  'QNO-8080R': {
    model: 'QNO-8080R',
    formFactor: 'bullet',
    seriesNote: 'Bala IP fija · resolución 2592 × 1944 · lente fija gran angular',
    sensor: 'CMOS 1/2.8" progressive scan',
    sensorWidthMm: 5.6,
    resolutionWidth: 2592,
    resolutionHeight: 1944,
    fps: 25,
    subStream: '640×360',
    codec: 'H.265+',
    bitrateKbps: 4096,
    lensType: 'fija',
    focalLengthMm: 2.8,
    aperture: 1.6,
    irDistanceM: 50,
    irWavelengthNm: 850,
    smartIr: true,
    wdrDb: 120,
    dnr: true,
    poeClass: 'IEEE 802.3af Clase 3',
    ipRating: 'IP67',
    ikRating: null,
    powerDrawW: 6.5,
    powerDrawIrW: 10,
    onvifProfiles: ['S', 'G', 'T'],
    lifecycle: 'vigente',
    lifecycleNote: 'Modelo mayoritario del inventario (18 de 36 equipos).',
  },
  'QNO-7080R': {
    model: 'QNO-7080R',
    formFactor: 'bullet',
    seriesNote: 'Bala IP fija 2592 × 1520 · lente más cerrada',
    sensor: 'CMOS 1/2.7" progressive scan',
    sensorWidthMm: 5,
    resolutionWidth: 2592,
    resolutionHeight: 1520,
    fps: 25,
    subStream: '640×360',
    codec: 'H.265',
    bitrateKbps: 3072,
    lensType: 'fija',
    focalLengthMm: 3.6,
    aperture: 1.8,
    irDistanceM: 50,
    irWavelengthNm: 850,
    smartIr: true,
    wdrDb: 120,
    dnr: true,
    poeClass: 'IEEE 802.3af Clase 3',
    ipRating: 'IP67',
    ikRating: null,
    powerDrawW: 6,
    powerDrawIrW: 9.5,
    onvifProfiles: ['S', 'G', 'T'],
    lifecycle: 'vigente',
    lifecycleNote:
      'C27 entregó 2592 × 1944 con este modelo declarado: la resolución y el modelo físico están por conciliar.',
  },
  'QNO-6080R': {
    model: 'QNO-6080R',
    formFactor: 'bullet',
    seriesNote: 'Bala IP fija 1920 × 1080 · lente teleobjetivo',
    sensor: 'CMOS 1/2.7" progressive scan',
    sensorWidthMm: 5,
    resolutionWidth: 1920,
    resolutionHeight: 1080,
    fps: 25,
    subStream: '640×360',
    codec: 'H.264+',
    bitrateKbps: 2048,
    lensType: 'fija',
    focalLengthMm: 4,
    aperture: 2,
    irDistanceM: 40,
    irWavelengthNm: 850,
    smartIr: true,
    wdrDb: 120,
    dnr: true,
    poeClass: 'IEEE 802.3af Clase 3',
    ipRating: 'IP67',
    ikRating: null,
    powerDrawW: 5.5,
    powerDrawIrW: 8.5,
    onvifProfiles: ['S', 'G', 'T'],
    lifecycle: 'vigente',
    lifecycleNote: 'Un único equipo en el inventario (C14).',
  },
  'QNO-6070R': {
    model: 'QNO-6070R',
    formFactor: 'bullet',
    seriesNote: 'Bala IP fija 1920 × 1080 · lente gran angular',
    sensor: 'CMOS 1/2.8" progressive scan',
    sensorWidthMm: 5.6,
    resolutionWidth: 1920,
    resolutionHeight: 1080,
    fps: 25,
    subStream: '640×360',
    codec: 'H.265',
    bitrateKbps: 2560,
    lensType: 'fija',
    focalLengthMm: 2.8,
    aperture: 1.6,
    irDistanceM: 30,
    irWavelengthNm: 850,
    smartIr: true,
    wdrDb: 120,
    dnr: true,
    poeClass: 'IEEE 802.3af Clase 3',
    ipRating: 'IP67',
    ikRating: null,
    powerDrawW: 5.2,
    powerDrawIrW: 8,
    onvifProfiles: ['S', 'G', 'T'],
    lifecycle: 'vigente',
    lifecycleNote: 'Tres equipos en el inventario (C19, C28, C29).',
  },
  'QNO-6010R': {
    model: 'QNO-6010R',
    formFactor: 'bullet',
    seriesNote: 'Bala IP de bajo perfil 800 × 600',
    sensor: 'CMOS 1/4" progressive scan',
    sensorWidthMm: 3.2,
    resolutionWidth: 800,
    resolutionHeight: 600,
    fps: 20,
    subStream: '320×240',
    codec: 'H.264',
    bitrateKbps: 1024,
    lensType: 'fija',
    focalLengthMm: 4,
    aperture: 2,
    irDistanceM: 20,
    irWavelengthNm: 850,
    smartIr: false,
    wdrDb: 100,
    dnr: true,
    poeClass: 'IEEE 802.3af Clase 2',
    ipRating: 'IP66',
    ikRating: null,
    powerDrawW: 3.8,
    powerDrawIrW: 5.5,
    onvifProfiles: ['S', 'T'],
    lifecycle: 'vigente',
    lifecycleNote:
      'C31 entregó 800 × 600: el informe pide solicitar el perfil principal antes de aceptar la cobertura.',
  },
  'QNP-6230H': {
    model: 'QNP-6230H',
    formFactor: 'bullet',
    seriesNote: 'Bala IP varifocal motorizada 1920 × 1080',
    sensor: 'CMOS 1/2.7" progressive scan',
    sensorWidthMm: 5,
    resolutionWidth: 1920,
    resolutionHeight: 1080,
    fps: 25,
    subStream: '640×360',
    codec: 'H.265+',
    bitrateKbps: 3072,
    lensType: 'varifocal',
    focalLengthMm: 2.8,
    aperture: 1.6,
    irDistanceM: 50,
    irWavelengthNm: 850,
    smartIr: true,
    wdrDb: 130,
    dnr: true,
    poeClass: 'IEEE 802.3af Clase 3',
    ipRating: 'IP67',
    ikRating: null,
    powerDrawW: 7.5,
    powerDrawIrW: 12,
    onvifProfiles: ['S', 'G', 'T'],
    lifecycle: 'vigente',
    lifecycleNote:
      'Único equipo de la serie QNP (C06); el informe señala saturaciones por faros y luminarias.',
  },
  'SND-L5013': {
    model: 'SND-L5013',
    formFactor: 'dome',
    seriesNote: 'Domo IP de red 1920 × 1080',
    sensor: 'CMOS 1/2.7" progressive scan',
    sensorWidthMm: 5,
    resolutionWidth: 1920,
    resolutionHeight: 1080,
    fps: 25,
    subStream: '640×360',
    codec: 'H.265',
    bitrateKbps: 2048,
    lensType: 'fija',
    focalLengthMm: 2.8,
    aperture: 1.6,
    irDistanceM: 30,
    irWavelengthNm: 850,
    smartIr: true,
    wdrDb: 120,
    dnr: true,
    poeClass: 'IEEE 802.3af Clase 3',
    ipRating: 'IP66',
    ikRating: 'IK10',
    powerDrawW: 5.8,
    powerDrawIrW: 9,
    onvifProfiles: ['S', 'G', 'T'],
    lifecycle: 'por_verificar',
    lifecycleNote:
      'No entregó imagen en ninguna de las dos pruebas: ni siquiera la verificación física del modelo pudo completarse.',
  },
  'SNO-L6083R': {
    model: 'SNO-L6083R',
    formFactor: 'bullet',
    seriesNote: 'Bala IP 1920 × 1080 · modelo discontinuado',
    sensor: 'CMOS 1/2.7" progressive scan',
    sensorWidthMm: 5,
    resolutionWidth: 1920,
    resolutionHeight: 1080,
    fps: 25,
    subStream: '640×360',
    codec: 'H.264+',
    bitrateKbps: 2048,
    lensType: 'fija',
    focalLengthMm: 2.8,
    aperture: 1.6,
    irDistanceM: 50,
    irWavelengthNm: 850,
    smartIr: true,
    wdrDb: 120,
    dnr: true,
    poeClass: 'IEEE 802.3af Clase 3',
    ipRating: 'IP66',
    ikRating: null,
    powerDrawW: 6.2,
    powerDrawIrW: 9.5,
    onvifProfiles: ['S', 'G'],
    lifecycle: 'discontinuado',
    lifecycleNote:
      'El fabricante lo lista como discontinuado y con 1920 × 1080. C33 entregó 640 × 480: verificar perfil y modelo antes de comprar.',
  },
};

/** Campo de visión horizontal derivado de la lente y del sensor del modelo. */
export function modelFovDeg(model: string): number {
  const profile = MODEL_PROFILES[model];
  if (!profile) return 70;
  return Math.round(horizontalFovDeg(profile.focalLengthMm, profile.sensorWidthMm) * 10) / 10;
}

/** Resolución máxima declarada de un modelo. */
export function modelResolution(model: string): { width: number; height: number } {
  const profile = MODEL_PROFILES[model];
  if (!profile) return { width: 2560, height: 1440 };
  return { width: profile.resolutionWidth, height: profile.resolutionHeight };
}

/** Distancia IR declarada de un modelo. */
export function modelIrDistance(model: string): number {
  return MODEL_PROFILES[model]?.irDistanceM ?? 40;
}
