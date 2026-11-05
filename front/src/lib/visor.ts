/**
 * Cliente del visor de cámaras (NVR).
 *
 * El visor es el único que conoce las credenciales de los equipos: expone un
 * directorio de cámaras y una imagen instantánea por IP. El mockup consume esas
 * dos rutas **sin credenciales**, tal como hace el propio visor.
 *
 * - `GET /api/cameras` → directorio con IP, nombre y disponibilidad.
 * - `GET /api/cameras/{ip}/snapshot` → imagen JPEG capturada del equipo.
 *
 * La URL del visor es pública para el navegador (no lleva usuario ni clave),
 * por eso puede ir en una variable `NEXT_PUBLIC_`.
 */

/** URL base del visor. */
export const VISOR_URL = (
  process.env.NEXT_PUBLIC_AGUNSA_VISOR_URL ?? 'http://192.168.2.62:5180'
).replace(/\/$/, '');

/** Entrada del directorio de cámaras del visor. */
export interface VisorCamera {
  ip: string;
  name: string;
  online: boolean;
}

/**
 * URL de la imagen instantánea de una cámara.
 *
 * `token` fuerza la recarga: el visor cachea la captura si no se cambia la
 * consulta, y lo que interesa aquí es ver el equipo en ese momento.
 */
export function snapshotUrl(ip: string, token: number = Date.now()): string {
  return `${VISOR_URL}/api/cameras/${encodeURIComponent(ip)}/snapshot?t=${token}`;
}

/** URL del directorio de cámaras. */
export function directoryUrl(): string {
  return `${VISOR_URL}/api/cameras`;
}
