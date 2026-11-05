import type { CameraClassification } from './types';

/**
 * Paleta canónica de la clasificación del assessment CCTV.
 *
 * Es el **único** juego de colores de cámara de la plataforma: lo usan el
 * plano 2D, la escena isométrica, la vista geoespacial, la cuadrícula de
 * monitoreo y el registro de cámaras. Tomado de los tokens AGUNSA:
 * verde = buena general, ámbar = limitada, rojo = deficiente, gris = sin
 * imagen.
 *
 * Estos colores describen la **calidad de la imagen evaluada en el informe**,
 * no el estado de transmisión: una cámara puede estar en línea y aun así
 * tener una imagen deficiente.
 */
export const CLASSIFICATION_COLOR: Readonly<Record<CameraClassification, string>> = {
  buena_general: '#2f8f5b',
  limitada: '#d59616',
  deficiente: '#c8202a',
  sin_imagen: '#6e7880',
};

/** Relleno translúcido equivalente, para conos y superficies. */
export const CLASSIFICATION_SOFT: Readonly<Record<CameraClassification, string>> = {
  buena_general: 'rgba(47, 143, 91, 0.15)',
  limitada: 'rgba(213, 150, 22, 0.16)',
  deficiente: 'rgba(200, 32, 42, 0.14)',
  sin_imagen: 'rgba(110, 120, 128, 0.16)',
};

/** Colores de estado operativo (independientes de la clasificación). */
export const OPERATIONAL_COLOR = {
  activa: '#2ba59e',
  alerta: '#c8202a',
  inactiva: '#8a939a',
  fallando: '#d98a10',
} as const;
