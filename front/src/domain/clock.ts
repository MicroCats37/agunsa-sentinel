/**
 * Reloj de la plataforma simulada.
 *
 * El mockup nunca lee la hora real durante el render: todas las marcas de
 * tiempo derivan de este instante fijo, de modo que el servidor y el cliente
 * generan exactamente el mismo árbol y no hay desajustes de hidratación.
 */
export const PLATFORM_NOW_ISO = '2026-03-11T22:14:00.000Z';

export const PLATFORM_NOW_MS = Date.parse(PLATFORM_NOW_ISO);

export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;

/** Formatea una marca de tiempo con el formato largo en español (es-ES). */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/** Formatea una marca de tiempo con hora y segundos (feed de cámara). */
export function formatClock(iso: string): string {
  const date = new Date(iso);
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm2 = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm2}/${date.getUTCFullYear()} ${hh}:${mm}:${ss}`;
}

/** Etiqueta corta de día (L/M/X/J/V/S/D) para las series analíticas. */
export const WEEKDAY_SHORT: readonly string[] = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

export function weekdayShort(iso: string): string {
  return WEEKDAY_SHORT[new Date(iso).getUTCDay()] ?? '';
}

/** Etiqueta corta de fecha para ejes (dd/mm). */
export function dayLabel(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Minutos transcurridos desde medianoche (UTC). */
export function minutesOfDay(iso: string): number {
  const date = new Date(iso);
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

/** Devuelve el día (00:00 UTC) de una marca de tiempo. */
export function dayStartIso(iso: string): string {
  const date = new Date(iso);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  ).toISOString();
}
