/**
 * Dimensionamiento de capacidad del sistema de grabación.
 *
 * Es el ejemplo de dimensionamiento del informe: NO es una medición de la
 * instalación actual. La retención de 30 días y la reserva del 25 % son
 * hipótesis a aprobar, no obligaciones legales.
 */

export const CAMERA_COUNT = 36;
export const RETENTION_DAYS = 30;
export const RESERVE_FACTOR = 0.25;

/** Fórmula del informe: cámaras × Mb/s × 1 000 000 × 86 400 × días / 8 / 10^12. */
export const CAPACITY_FORMULA =
  'cámaras × Mb/s × 1 000 000 × 86 400 × días / 8 / 10^12';

export interface CapacityRow {
  /** Bitrate medio por cámara (Mb/s). */
  bitrateMbps: number;
  /** Tráfico de grabación agregado (Mb/s). */
  trafficMbps: number;
  /** Almacenamiento de video para 30 días (TB decimales). */
  videoTb: number;
  /** Almacenamiento útil con la reserva del 25 % (TB decimales). */
  usableTb: number;
}

export const CAPACITY_ROWS: readonly CapacityRow[] = [
  { bitrateMbps: 2, trafficMbps: 72, videoTb: 23.33, usableTb: 29.16 },
  { bitrateMbps: 4, trafficMbps: 144, videoTb: 46.66, usableTb: 58.32 },
  { bitrateMbps: 8, trafficMbps: 288, videoTb: 93.31, usableTb: 116.64 },
];

/**
 * Recalcula una fila con la fórmula del informe.
 * Existe para que la tabla no sea una constante copiada: si cambia un supuesto,
 * el número se recalcula.
 */
export function computeCapacity(
  bitrateMbps: number,
  cameras = CAMERA_COUNT,
  days = RETENTION_DAYS,
  reserve = RESERVE_FACTOR,
): CapacityRow {
  const trafficMbps = cameras * bitrateMbps;
  const bytes = (cameras * bitrateMbps * 1_000_000 * 86_400 * days) / 8;
  const videoTb = bytes / 1e12;
  return {
    bitrateMbps,
    trafficMbps,
    videoTb: Math.round(videoTb * 100) / 100,
    usableTb: Math.round(videoTb * (1 + reserve) * 100) / 100,
  };
}

/** Advertencia que acompaña a la tabla de capacidad. */
export const CAPACITY_CAVEAT =
  'Retención de 30 días y reserva de 25 % son hipótesis a aprobar, no obligaciones legales. Medir bitrate real, movimiento nocturno, picos y concurrencia; sumar visualización, reproducción y exportación. RAID no sustituye copia protegida de evidencia.';

/** Escenario de referencia del informe. */
export const CAPACITY_REFERENCE =
  'Para 36 cámaras a 4 Mb/s promedio y grabación continua de 30 días: tráfico de grabación = 144 Mb/s; almacenamiento de video = 46,66 TB decimales. Con 25 % de reserva propuesta: 58,32 TB útiles. La capacidad bruta de discos debe ser mayor según RAID, repuestos y formato.';
