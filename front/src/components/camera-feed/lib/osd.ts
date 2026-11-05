import type { Camera } from '@/domain/types';

/**
 * Sobreimpresión de información (OSD) del feed, al estilo de un NVR real.
 *
 * Distribución de la información:
 *  - superior izquierda: nombre del canal y sector;
 *  - inferior derecha: marca de tiempo simulada, resolución, fps, REC, IR y
 *    nivel de señal.
 *
 * La esquina inferior izquierda queda deliberadamente libre: en la cuadrícula
 * de monitoreo la celda dibuja allí el nombre de la cámara y se solapaba con
 * la marca de tiempo del feed.
 */

export interface OsdOptions {
  camera: Camera;
  /** Nombre legible del sector (lo entrega la feature, no el componente). */
  sectorName: string;
  timestampMs: number;
  /** Marca de tiempo fija (captura de evidencia). */
  fixedTimestamp: boolean;
  irEnabled: boolean;
  irBadge: 'IR' | 'COLOR' | 'ICR';
  recording: boolean;
  /** Modo compacto: sólo el bloque inferior derecho. */
  compact: boolean;
  /** Etiqueta de falla de cámara (se dibuja como aviso ámbar, no rojo). */
  faultLabel: string | null;
  /**
   * Aviso de salud del equipo (por ejemplo el desfase de reloj de C02).
   * No es un incidente de seguridad: se dibuja como aviso ámbar.
   */
  healthWarning?: string | null;
}

const FONT = '"IBM Plex Sans", system-ui, sans-serif';

export function drawOsd(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: OsdOptions,
): void {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 4;

  if (!options.compact) {
    drawChannelBlock(ctx, width, height, options);
  }
  drawStatusBlock(ctx, width, height, options);

  if (options.healthWarning) {
    drawHealthWarning(ctx, width, options.healthWarning);
  }

  if (options.faultLabel) {
    drawFaultBanner(ctx, width, height, options.faultLabel);
  }

  ctx.restore();
}

function drawChannelBlock(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: OsdOptions,
): void {
  const { camera, sectorName } = options;
  const x = 10;
  let y = 18;

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  // Identificador de canal, en caja para separarlo del fondo.
  ctx.font = `600 10px ${FONT}`;
  const idWidth = ctx.measureText(camera.id).width;
  ctx.fillStyle = 'rgba(8, 12, 18, 0.62)';
  ctx.fillRect(x - 3, y - 10, idWidth + 8, 14);
  ctx.fillStyle = 'rgba(232, 238, 244, 0.95)';
  ctx.fillText(camera.id, x, y);
  y += 15;

  ctx.font = `600 11px ${FONT}`;
  ctx.fillStyle = 'rgba(226, 232, 240, 0.9)';
  ctx.fillText(camera.name, x, y);
  y += 13;

  ctx.font = `500 10px ${FONT}`;
  ctx.fillStyle = 'rgba(178, 190, 204, 0.8)';
  ctx.fillText(sectorName, x, y);

  void width;
  void height;
}

function drawStatusBlock(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: OsdOptions,
): void {
  const { camera } = options;
  const right = width - 10;
  let y = height - 10;

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'right';

  // Marca de tiempo simulada.
  ctx.font = `500 11px ${FONT}`;
  ctx.fillStyle = 'rgba(232, 238, 244, 0.94)';
  ctx.fillText(formatStamp(options.timestampMs), right, y);
  y -= 14;

  // Resolución · fps.
  ctx.font = `500 10px ${FONT}`;
  ctx.fillStyle = 'rgba(206, 216, 226, 0.78)';
  ctx.fillText(`${camera.resolution} · ${camera.spec.fps}fps`, right, y);
  y -= 13;

  // Barra de señal + estado de grabación.
  const signalBars = signalStrength(camera.spec.signalDbm);
  const barWidth = 4;
  const barGap = 2;
  const barsWidth = signalBars * (barWidth + barGap);
  const x = right - barsWidth;

  for (let i = 0; i < signalBars; i++) {
    const barHeight = 4 + i * 2.4;
    ctx.fillStyle =
      i >= signalBars - 1 && signalBars <= 2 ? '#e8a33d' : 'rgba(180, 196, 212, 0.85)';
    ctx.fillRect(x + i * (barWidth + barGap), y + 8 - barHeight, barWidth, barHeight);
  }

  ctx.textAlign = 'left';
  if (options.recording) {
    const blink = Math.floor(options.timestampMs / 600) % 2 === 0;
    ctx.fillStyle = blink ? '#ef4444' : 'rgba(239, 68, 68, 0.35)';
    ctx.beginPath();
    ctx.arc(x - 22, y + 4, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `600 10px ${FONT}`;
    ctx.fillStyle = 'rgba(232, 238, 244, 0.88)';
    ctx.fillText('REC', x - 14, y + 8);
  }

  // Distintivo IR / COLOR.
  if (options.irEnabled) {
    ctx.font = `700 9px ${FONT}`;
    const label = options.irBadge === 'ICR' ? 'ICR' : 'IR';
    const labelWidth = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(232, 163, 61, 0.9)';
    ctx.fillRect(x - 46 - labelWidth, y - 1, labelWidth + 8, 12);
    ctx.fillStyle = '#12161c';
    ctx.fillText(label, x - 42, y + 8);
  }
}

/**
 * Aviso de falla de cámara.
 *
 * Se differentiate del incidente de seguridad por el color (ámbar, no rojo) y
 * por el texto explícito: una falla de equipo no es una intrusión.
 */
function drawFaultBanner(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  label: string,
): void {
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = `700 11px ${FONT}`;
  const textWidth = ctx.measureText(label).width;
  const boxWidth = textWidth + 22;
  const x = (width - boxWidth) / 2;
  const y = height / 2 - 34;

  ctx.fillStyle = 'rgba(12, 16, 22, 0.82)';
  ctx.fillRect(x, y, boxWidth, 22);
  ctx.strokeStyle = 'rgba(232, 163, 61, 0.85)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, boxWidth - 1, 21);
  ctx.fillStyle = '#e8a33d';
  ctx.fillText(label, width / 2, y + 11);
}

/**
 * Aviso de salud del equipo.
 *
 * Se apoya en la esquina superior derecha, libre del bloque de estado, y usa
 * ámbar: un desfase de reloj es un problema de servicio, no una intrusión.
 */
function drawHealthWarning(
  ctx: CanvasRenderingContext2D,
  width: number,
  label: string,
): void {
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  ctx.font = `700 9px ${FONT}`;
  const textWidth = ctx.measureText(label).width;
  const boxWidth = textWidth + 12;
  const x = width - 10 - boxWidth;
  const y = 12;

  ctx.fillStyle = 'rgba(12, 16, 22, 0.82)';
  ctx.fillRect(x, y, boxWidth, 15);
  ctx.strokeStyle = 'rgba(232, 163, 61, 0.85)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, boxWidth - 1, 14);
  ctx.fillStyle = '#e8a33d';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + boxWidth / 2, y + 8);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function formatStamp(timestampMs: number): string {
  const date = new Date(timestampMs);
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mo = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mo}/${date.getUTCFullYear()} ${hh}:${mm}:${ss}`;
}

/** Número de barras de señal (0..5) a partir del nivel en dBm. */
export function signalStrength(dbm: number): number {
  if (dbm >= -45) return 5;
  if (dbm >= -52) return 4;
  if (dbm >= -58) return 3;
  if (dbm >= -64) return 2;
  return 1;
}
