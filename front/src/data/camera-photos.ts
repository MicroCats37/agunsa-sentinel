/**
 * Capturas reales de las cámaras del inventario, extraídas del informe de
 * evaluación CCTV del 03/11/2026.
 *
 * Cada ficha recoge la fotografía nocturna (sesión del 02/11/2026 a las 20:55) y la
 * diurna (sesión del 03/11/2026 a las 14:47) que recibió el visor. Se conservan
 * tal cual: son la evidencia real del estado del parque, incluido el desfase del
 * reloj del equipo C02.
 */

import type { CameraPhotos } from '@/domain/types';

export const CAMERA_PHOTOS: Record<string, CameraPhotos> = {
  C02: { night: '/cameras/C02-night.jpg', day: '/cameras/C02-day.jpg' },
  C03: { night: '/cameras/C03-night.jpg', day: '/cameras/C03-day.jpg' },
  C04: { night: '/cameras/C04-night.jpg', day: '/cameras/C04-day.jpg' },
  C05: { night: '/cameras/C05-night.jpg', day: '/cameras/C05-day.jpg' },
  C06: { night: '/cameras/C06-night.jpg', day: '/cameras/C06-day.jpg' },
  C07: { night: '/cameras/C07-night.jpg', day: '/cameras/C07-day.jpg' },
  C08: { night: '/cameras/C08-night.jpg', day: '/cameras/C08-day.jpg' },
  C09: { night: '/cameras/C09-night.jpg', day: '/cameras/C09-day.jpg' },
  C10: { night: '/cameras/C10-night.jpg', day: '/cameras/C10-day.jpg' },
  C11: { night: '/cameras/C11-night.jpg', day: '/cameras/C11-day.jpg' },
  C12: { night: '/cameras/C12-night.jpg', day: '/cameras/C12-day.jpg' },
  C13: { night: '/cameras/C13-night.jpg', day: '/cameras/C13-day.jpg' },
  C14: { night: '/cameras/C14-night.jpg', day: '/cameras/C14-day.jpg' },
  C15: { night: '/cameras/C15-night.jpg', day: '/cameras/C15-day.jpg' },
  C16: { night: '/cameras/C16-night.jpg', day: '/cameras/C16-day.jpg' },
  C17: { night: '/cameras/C17-night.jpg', day: '/cameras/C17-day.jpg' },
  C18: { night: '/cameras/C18-night.jpg', day: '/cameras/C18-day.jpg' },
  C19: { night: '/cameras/C19-night.jpg', day: '/cameras/C19-day.jpg' },
  C20: { night: '/cameras/C20-night.jpg', day: '/cameras/C20-day.jpg' },
  C24: { day: '/cameras/C24-day.jpg' },
  C26: { day: '/cameras/C26-day.jpg' },
  C27: { day: '/cameras/C27-day.jpg' },
  C28: { night: '/cameras/C28-night.jpg', day: '/cameras/C28-day.jpg' },
  C29: { night: '/cameras/C29-night.jpg', day: '/cameras/C29-day.jpg' },
  C30: { night: '/cameras/C30-night.jpg', day: '/cameras/C30-day.jpg' },
  C31: { night: '/cameras/C31-night.jpg', day: '/cameras/C31-day.jpg' },
  C32: { night: '/cameras/C32-night.jpg', day: '/cameras/C32-day.jpg' },
  C33: { night: '/cameras/C33-night.jpg', day: '/cameras/C33-day.jpg' },
  C34: { night: '/cameras/C34-night.jpg', day: '/cameras/C34-day.jpg' },
  C35: { night: '/cameras/C35-night.jpg', day: '/cameras/C35-day.jpg' },
  C36: { night: '/cameras/C36-night.jpg', day: '/cameras/C36-day.jpg' },
};
