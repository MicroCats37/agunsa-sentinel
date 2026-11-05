import { PLATFORM_NOW_MS } from '@/domain/clock';
import {
  contrastFactor,
  fovZoomFactor,
  icrState,
  irIlluminationAt,
  noiseLevel,
  resolveIllumination,
} from '@/domain/imaging';
import gsap from 'gsap';
import { hashSeed } from '@/domain/rng';
import { computeTrackedObjects, type TrackedObject } from '@/domain/track-motion';
import type { Camera, CameraTrackTarget, SceneHour, VirtualLine, Zone } from '@/domain/types';
import { renderBackground, type BackgroundMode } from './background';
import { getGrainTiles, getScanlinePattern } from './noise';
import { drawOsd } from './osd';
import { MotionTrails } from './trails';

/**
 * Renderizador del feed de cámara.
 *
 * Compone un fotograma completo simulando el comportamiento real del equipo:
 *
 *  - conmutación día/noche por ICR, con fundido visible al cambiar;
 *  - encuadre proporcional al campo de visión de la lente;
 *  - Smart IR: los objetos cercanos reciben menos luz y no se queman;
 *  - WDR ≥ 120 dB: las altas luces se comprimen y no saturan a blanco;
 *  - grano proporcional a la iluminancia, reducido por DNR;
 *  - detecciones con caja, clase, confianza y estela de movimiento;
 *  - estados de falla (congelación, negro, nieve) distinguibles de un
 *    incidente de seguridad.
 */

export interface FeedRendererOptions {
  camera: Camera;
  /** Nombre legible del sector; lo entrega la feature que compone el feed. */
  sectorName: string;
  targets: readonly CameraTrackTarget[];
  showDetections: boolean;
  showZones: readonly Zone[];
  showLines: readonly VirtualLine[];
  /** Fuerza el HUD (marca de tiempo, identificación) aunque el lienzo sea pequeño. */
  compact: boolean;
  /** Marca de tiempo fija (captura de evidencia). Si falta, se usa el reloj de la plataforma. */
  timestampMs?: number;
  /** Modo evidencia: resalta la detección y añade la banda de identificación. */
  evidence: boolean;
  /** Preferencia de iluminación forzada por el operador. */
  sceneHour: SceneHour;
  /**
   * Segundo actual de la línea de tiempo simulada.
   *
   * Lo consulta el renderizador en cada fotograma: así la silueta que se ve
   * es exactamente la que el motor de reglas está evaluando, sin depender de
   * cuántos renders_trigger se disparen.
   */
  getTimeSec?: () => number;
  /** Reloj de la plataforma para la marca de tiempo del OSD. */
  getClockMs?: () => number;
  /**
   * Aviso de salud del equipo (por ejemplo el desfase de reloj de C02).
   * Se muestra en el OSD como advertencia ámbar, no como incidente.
   */
  healthWarning?: string | null;
}

export interface FeedRenderer {
  render(elapsedMs: number): void;
  /** Devuelve un PNG del fotograma actual (data URL) o null si no hay lienzo. */
  snapshot(): string | null;
  destroy(): void;
}

const PERSON_COLOR = '#39d17a';
const VEHICLE_COLOR = '#4f9df0';
const EVIDENCE_COLOR = '#ef4444';
const FONT = '"IBM Plex Sans", system-ui, sans-serif';

type FaultKind = 'congelado' | 'negro' | 'nieve';

const FAULT_LABELS: Record<FaultKind, string> = {
  congelado: 'IMAGEN CONGELADA',
  negro: 'PÉRDIDA DE SEÑAL',
  nieve: 'TRANSMISIÓN DEGRADADA',
};

export function createFeedRenderer(
  canvas: HTMLCanvasElement,
  options: { current: FeedRendererOptions },
): FeedRenderer {
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) {
    return { render: () => undefined, snapshot: () => null, destroy: () => undefined };
  }
  const ctx: CanvasRenderingContext2D = context;

  const backgrounds = new Map<BackgroundMode, HTMLCanvasElement>();
  const backgroundKeys = new Map<BackgroundMode, string>();
  const trails = new MotionTrails();
  const grainTiles = getGrainTiles();
  let grainIndex = 0;
  let lastMode: BackgroundMode = 'noche';
  let frozenFrame: HTMLCanvasElement | null = null;
  let frozenKey = '';
  let lastElapsedMs = 0;

  /*
   * Conmutación ICR: GSAP conduce el fundido del filtro IR-cut. El valor vive
   * en un objeto plano y el renderizador lo lee en cada fotograma, así que la
   * transición es suave sin bloquear el lienzo.
   */
  const irState = { value: 0 };
  let irTween: gsap.core.Tween | null = null;
  let irInitialized = false;

  /*
   * Movimiento reducido: el lienzo no depende de CSS, así que la preferencia
   * del sistema se consulta aquí. Sin pulso y sin fundido de ICR: el estado
   * final se aplica de inmediato y el trazo de las detecciones queda fijo.
   */
  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Pulso de las cajas de detección: un tween en bucle modula el trazo. */
  const pulseState = { value: 0 };
  const pulseTween = reducedMotion
    ? null
    : gsap.to(pulseState, {
        value: 1,
        duration: 1.3,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });

  function ensureBackground(
    mode: BackgroundMode,
    width: number,
    height: number,
  ): HTMLCanvasElement {
    const key = `${options.current.camera.id}|${mode}|${width}x${height}`;
    const existing = backgrounds.get(mode);
    if (existing && backgroundKeys.get(mode) === key) return existing;

    const target = existing ?? document.createElement('canvas');
    target.width = width;
    target.height = height;
    const targetCtx = target.getContext('2d');
    if (targetCtx) {
      renderBackground(targetCtx, width, height, options.current.camera, mode);
    }
    backgrounds.set(mode, target);
    backgroundKeys.set(mode, key);
    return target;
  }

  function render(elapsedMs: number): void {
    const current = options.current;
    lastElapsedMs = elapsedMs;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    if (cssWidth === 0 || cssHeight === 0) return;

    const width = Math.round(cssWidth * ratio);
    const height = Math.round(cssHeight * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const timestamp =
      current.timestampMs ??
      (current.getClockMs ? current.getClockMs() : PLATFORM_NOW_MS + elapsedMs);
    const illumination = resolveIllumination(current.sceneHour, timestamp);
    const icr = icrState(illumination);
    const mode: BackgroundMode = illumination === 'dia' ? 'dia' : 'noche';

    if (mode !== lastMode) {
      lastMode = mode;
      frozenFrame = null;
    }

    /*
     * Fundido de conmutación ICR: el primer fotograma arranca en el estado
     * contrario para que el cambio sea visible, como en un equipo real. A
     * partir de ahí GSAP lleva la mezcla de forma continua.
     */
    const targetBlend = icr.monochromeBlend;
    if (!irInitialized) {
      irInitialized = true;
      irState.value = targetBlend > 0.5 ? 0 : 1;
    }
    if (Math.abs(irState.value - targetBlend) > 0.002) {
      irTween?.kill();
      irTween = null;
      if (reducedMotion) {
        irState.value = targetBlend;
      } else {
        irTween = gsap.to(irState, {
          value: targetBlend,
          duration: 1.1,
          ease: 'power2.inOut',
          overwrite: true,
        });
      }
    }
    const irBlend = irState.value;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, width, height);

    if (current.camera.status === 'inactiva') {
      drawSignalLoss(ctx, width, height);
      drawOsd(ctx, width, height, buildOsd(current, timestamp, 'COLOR', null, null));
      ctx.restore();
      return;
    }

    const fault = current.camera.status === 'fallando' ? faultKindOf(current.camera) : null;

    if (fault === 'congelado') {
      paintFrozen(ctx, width, height, current, timestamp, irBlend, elapsedMs);
    } else {
      paintScene(ctx, width, height, current, timestamp, irBlend, elapsedMs);
      if (fault === 'nieve') drawSnow(ctx, width, height, elapsedMs);
      if (fault === 'negro') drawBlackFrame(ctx, width, height);
    }

    drawVideoTexture(
      ctx,
      width,
      height,
      grainTiles,
      grainIndex,
      noiseLevel(illumination, current.camera.spec),
    );
    grainIndex = (grainIndex + 1) % grainTiles.length;

    drawOsd(
      ctx,
      width,
      height,
      buildOsd(
        current,
        timestamp,
        icr.badge,
        fault ? FAULT_LABELS[fault] : null,
        current.healthWarning ?? null,
      ),
    );
    ctx.restore();
  }

  /** Escena viva: fondo, objetos, superposiciones y detecciones. */
  function paintScene(
    target: CanvasRenderingContext2D,
    width: number,
    height: number,
    current: FeedRendererOptions,
    timestamp: number,
    blend: number,
    elapsedMs: number,
  ): void {
    const camera = current.camera;
    const zoom = fovZoomFactor(camera.fov);
    const drawW = width * zoom;
    const drawH = height * zoom;
    const dx = (width - drawW) / 2;
    const dy = (height - drawH) / 2;

    const mode: BackgroundMode =
      resolveIllumination(current.sceneHour, timestamp) === 'dia' ? 'dia' : 'noche';
    const background = ensureBackground(mode, width, height);

    // El filtro ICR actúa sobre la respuesta espectral: la escena no cambia,
    // se satura la imagen hasta convertirla en monocromo.
    const saturation = Math.max(0, 1 - blend);
    const contrast = contrastFactor(mode === 'dia' ? 'dia' : 'noche');

    target.save();
    if (typeof target.filter === 'string') {
      target.filter = `saturate(${saturation.toFixed(3)}) contrast(${contrast.toFixed(2)})`;
    }
    target.drawImage(background, dx, dy, drawW, drawH);
    target.restore();

    /*
     * Calidad óptica evaluada: el informe describe de forma repetida "velo
     * general", halos y pérdida de contraste. El feed reproduce ese defecto en
     * lugar de mostrar una imagen perfecta que el informe no respalda.
     */
    drawOpticalVeil(target, width, height, camera.assessment.classification, blend);

    // Halos del iluminador infrarrojo.
    if (blend > 0.02) {
      drawIrIlluminator(target, width, height, blend, camera.spec.irDistanceM);
    }

    const timeSec = current.getTimeSec ? current.getTimeSec() : elapsedMs / 1000;
    const objects = computeTrackedObjects(current.targets, timeSec);
    trails.retain(objects.map((object) => object.id));

    drawZoneOverlays(target, width, height, current.showZones);
    drawVirtualLines(target, width, height, current.showLines);

    for (const object of objects) {
      trails.push(object.id, object.x, object.y);
      drawSilhouette(target, width, height, object, blend, camera.spec.irDistanceM);
    }

    for (const object of objects) {
      drawTrail(target, width, height, object, trails.get(object.id));
    }

    if (current.evidence) {
      const highlight = objects[0];
      if (highlight) drawEvidenceBox(target, width, height, highlight);
    } else if (current.showDetections) {
      for (const object of objects) {
        drawDetectionBox(target, width, height, object, current.compact, pulseState.value);
      }
    }
  }

  /** Fotograma congelado: la última imagen válida se reutiliza tal cual. */
  function paintFrozen(
    target: CanvasRenderingContext2D,
    width: number,
    height: number,
    current: FeedRendererOptions,
    timestamp: number,
    blend: number,
    elapsedMs: number,
  ): void {
    const key = `${current.camera.id}|${width}x${height}`;
    if (!frozenFrame || frozenKey !== key) {
      frozenFrame = document.createElement('canvas');
      frozenFrame.width = width;
      frozenFrame.height = height;
      const frozenCtx = frozenFrame.getContext('2d');
      if (frozenCtx) {
        paintScene(frozenCtx, width, height, current, timestamp, blend, elapsedMs);
      }
      frozenKey = key;
    }
    target.drawImage(frozenFrame, 0, 0);
    drawFreezeArtifact(target, width, height, elapsedMs);
  }

  return {
    render,
    snapshot: () => {
      try {
        // Se repinta el fotograma justo antes de leerlo: sin
        // `preserveDrawingBuffer` el búfer se limpia tras cada composición.
        render(lastElapsedMs);
        return canvas.toDataURL('image/png');
      } catch {
        return null;
      }
    },
    destroy: () => {
      irTween?.kill();
      pulseTween?.kill();
      backgrounds.forEach((background) => {
        background.width = 0;
        background.height = 0;
      });
      backgrounds.clear();
      backgroundKeys.clear();
      trails.clear();
      if (frozenFrame) {
        frozenFrame.width = 0;
        frozenFrame.height = 0;
        frozenFrame = null;
      }
    },
  };
}

/* ------------------------------------------------------------------ */
/* OSD                                                                 */
/* ------------------------------------------------------------------ */

function buildOsd(
  options: FeedRendererOptions,
  timestamp: number,
  irBadge: 'IR' | 'COLOR' | 'ICR',
  faultLabel: string | null,
  healthWarning: string | null,
) {
  return {
    camera: options.camera,
    sectorName: options.sectorName,
    timestampMs: timestamp,
    fixedTimestamp: options.timestampMs !== undefined,
    irEnabled: irBadge !== 'COLOR',
    irBadge,
    recording: options.camera.status !== 'inactiva',
    compact: options.compact,
    faultLabel,
    healthWarning,
  };
}

/* ------------------------------------------------------------------ */
/* Objetos                                                              */
/* ------------------------------------------------------------------ */

function drawSilhouette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  object: TrackedObject,
  irBlend: number,
  irDistanceM: number,
): void {
  const x = object.x * width;
  const y = object.y * height + object.bob * height;
  const w = object.width * width;
  const h = object.height * height;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h, w * 0.55, h * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();

  // Smart IR: la irradiancia útil cae con la cercanía del objeto.
  const apparent = Math.max(0.02, object.height);
  const proximity = Math.min(1, Math.max(0, (0.3 - apparent) / 0.28));
  const distanceM = irDistanceM * (1 - proximity * 0.82) + 0.8;
  const illumination = irIlluminationAt(distanceM, irDistanceM);

  if (object.objectType === 'vehiculo') {
    drawVehicle(ctx, x, y, w, h, illumination, irBlend);
    return;
  }
  drawPerson(ctx, x, y, w, h, illumination, irBlend);
}

function drawPerson(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  illumination: number,
  irBlend: number,
): void {
  ctx.fillStyle = '#0a0d11';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.13, w * 0.42, h * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x + w * 0.16, y + h * 0.24, w * 0.68, h * 0.74, w * 0.2);
  ctx.fill();

  if (irBlend > 0.02) {
    // Retorno del iluminador: sólo los objetos que reciben luz se reveal.
    ctx.save();
    ctx.globalAlpha = irBlend * illumination * 0.55;
    ctx.fillStyle = '#dfe6ea';
    ctx.beginPath();
    ctx.roundRect(x + w * 0.2, y + h * 0.27, w * 0.6, h * 0.68, w * 0.18);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.13, w * 0.36, h * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(190, 205, 220, 0.14)';
    ctx.fillRect(x + w * 0.3, y + h * 0.3, w * 0.4, h * 0.34);
  }
}

function drawVehicle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  illumination: number,
  irBlend: number,
): void {
  ctx.fillStyle = '#0b0e12';
  ctx.beginPath();
  ctx.roundRect(x, y + h * 0.32, w, h * 0.58, 3);
  ctx.fill();
  ctx.fillStyle = '#151a20';
  ctx.beginPath();
  ctx.roundRect(x + w * 0.2, y, w * 0.55, h * 0.4, 3);
  ctx.fill();
  ctx.fillStyle = 'rgba(190, 210, 230, 0.22)';
  ctx.fillRect(x + w * 0.26, y + h * 0.06, w * 0.42, h * 0.18);
  ctx.fillStyle = 'rgba(230, 90, 70, 0.85)';
  ctx.fillRect(x + w * 0.02, y + h * 0.5, 3, h * 0.12);
  ctx.fillRect(x + w * 0.95, y + h * 0.5, 3, h * 0.12);

  if (irBlend > 0.02) {
    ctx.save();
    ctx.globalAlpha = irBlend * illumination * 0.42;
    ctx.fillStyle = '#e4eaee';
    ctx.beginPath();
    ctx.roundRect(x + w * 0.04, y + h * 0.34, w * 0.92, h * 0.54, 3);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(x + w * 0.24, y + h * 0.02, w * 0.48, h * 0.38, 3);
    ctx.fill();
    ctx.restore();
  }
}

function drawTrail(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  object: TrackedObject,
  points: readonly { x: number; y: number }[],
): void {
  if (points.length < 3) return;
  const color = object.objectType === 'vehiculo' ? VEHICLE_COLOR : PERSON_COLOR;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.2;
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    if (!from || !to) continue;
    ctx.strokeStyle = color;
    ctx.globalAlpha = (i / points.length) * 0.35;
    ctx.beginPath();
    ctx.moveTo(from.x * width, from.y * height);
    ctx.lineTo(to.x * width, to.y * height);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDetectionBox(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  object: TrackedObject,
  compact: boolean,
  pulse: number,
): void {
  const x = object.x * width;
  const y = object.y * height + object.bob * height;
  const w = object.width * width;
  const h = object.height * height;
  const color = object.objectType === 'vehiculo' ? VEHICLE_COLOR : PERSON_COLOR;
  const label = `${object.objectType === 'vehiculo' ? 'VEHÍCULO' : 'PERSONA'} ${Math.round(
    object.confidence * 100,
  )}%`;

  ctx.save();
  // El pulso modula la opacidad del trazo: la caja "respira" sin parpadear.
  ctx.globalAlpha = 0.72 + pulse * 0.28;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4 + pulse * 0.6;
  ctx.strokeRect(x, y, w, h);
  drawCornerBrackets(ctx, x, y, w, h, color, 2.4 + pulse * 1.2);
  ctx.restore();

  if (compact) return;

  ctx.font = `600 10px ${FONT}`;
  const textWidth = ctx.measureText(label).width;
  ctx.fillStyle = color;
  ctx.fillRect(x, y - 13, textWidth + 8, 13);
  ctx.fillStyle = '#06121f';
  ctx.fillText(label, x + 4, y - 3);
}

function drawEvidenceBox(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  object: TrackedObject,
): void {
  const x = object.x * width;
  const y = object.y * height + object.bob * height;
  const w = object.width * width;
  const h = object.height * height;

  ctx.strokeStyle = EVIDENCE_COLOR;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
  drawCornerBrackets(ctx, x - 3, y - 3, w + 6, h + 6, EVIDENCE_COLOR, 3);

  ctx.font = `700 10px ${FONT}`;
  const label = `EVIDENCIA · ${object.objectType === 'vehiculo' ? 'VEHÍCULO' : 'PERSONA'} ${Math.round(
    object.confidence * 100,
  )}%`;
  const textWidth = ctx.measureText(label).width;
  ctx.fillStyle = EVIDENCE_COLOR;
  ctx.fillRect(x - 3, y - 16, textWidth + 10, 15);
  ctx.fillStyle = '#fff5f5';
  ctx.fillText(label, x + 2, y - 5);
}

function drawCornerBrackets(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  lineWidth: number,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  const c = Math.min(w, h) * 0.28;
  const corners: [number, number, number, number][] = [
    [x, y, 1, 1],
    [x + w, y, -1, 1],
    [x, y + h, 1, -1],
    [x + w, y + h, -1, -1],
  ];
  for (const [cx, cy, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx + dx * c, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + dy * c);
    ctx.stroke();
  }
}

/* ------------------------------------------------------------------ */
/* Defecto óptico evaluado                                             */
/* ------------------------------------------------------------------ */

/**
 * Velo, halo y pérdida de contraste según la clasificación del informe.
 *
 * - `deficiente` (19 equipos): velo denso, halos y bordes difusos.
 * - `limitada` (6 equipos): velo leve y contraste reducido.
 * - `buena_general` (6 equipos): imagen limpia.
 */
function drawOpticalVeil(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  classification: Camera['assessment']['classification'],
  irBlend: number,
): void {
  if (classification === 'buena_general') return;

  const dense = classification === 'deficiente';
  const alpha = (dense ? 0.3 : 0.13) * (irBlend > 0.5 ? 1.15 : 1);
  if (alpha <= 0.01) return;

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, `rgba(226, 232, 238, ${alpha * 0.55})`);
  gradient.addColorStop(0.45, `rgba(214, 222, 230, ${alpha})`);
  gradient.addColorStop(1, `rgba(198, 208, 218, ${alpha * 0.7})`);

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  if (!dense) return;

  // Halos de las luminarias: manchas luminosas difusas.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 3; i++) {
    const cx = width * (0.18 + i * 0.32);
    const cy = height * (0.22 + (i % 2) * 0.14);
    const radius = Math.min(width, height) * (0.16 + i * 0.03);
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    halo.addColorStop(0, 'rgba(236, 240, 244, 0.24)');
    halo.addColorStop(0.5, 'rgba(214, 222, 230, 0.08)');
    halo.addColorStop(1, 'rgba(198, 208, 218, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Superposiciones                                                      */
/* ------------------------------------------------------------------ */

function drawZoneOverlays(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  zones: readonly Zone[],
): void {
  for (const zone of zones) {
    if (!zone.enabled) continue;
    ctx.beginPath();
    zone.polygon.forEach((point, index) => {
      const px = point.x * width;
      const py = point.y * height;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(64, 158, 255, 0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(96, 178, 255, 0.85)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawVirtualLines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  lines: readonly VirtualLine[],
): void {
  for (const line of lines) {
    if (!line.enabled) continue;
    const from = line.from;
    const to = line.to;
    ctx.strokeStyle = 'rgba(255, 196, 74, 0.95)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(from.x * width, from.y * height);
    ctx.lineTo(to.x * width, to.y * height);
    ctx.stroke();

    const mx = ((from.x + to.x) / 2) * width;
    const my = ((from.y + to.y) / 2) * height;
    const angle = Math.atan2((to.y - from.y) * height, (to.x - from.x) * width);
    ctx.fillStyle = 'rgba(255, 196, 74, 0.95)';
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(mx - Math.cos(angle - 0.5) * 9, my - Math.sin(angle - 0.5) * 9);
    ctx.lineTo(mx - Math.cos(angle + 0.5) * 9, my - Math.sin(angle + 0.5) * 9);
    ctx.closePath();
    ctx.fill();
  }
}

/* ------------------------------------------------------------------ */
/* Iluminación infrarroja y textura de vídeo                           */
/* ------------------------------------------------------------------ */

/** Charco de luz del iluminador IR sobre el primer plano. */
function drawIrIlluminator(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  blend: number,
  irDistanceM: number,
): void {
  const reach = Math.min(width, height) * (0.45 + (irDistanceM / 50) * 0.25);
  const gradient = ctx.createRadialGradient(
    width / 2,
    height * 0.92,
    reach * 0.12,
    width / 2,
    height * 0.92,
    reach,
  );
  gradient.addColorStop(0, `rgba(226, 238, 245, ${0.16 * blend})`);
  gradient.addColorStop(0.55, `rgba(198, 216, 228, ${0.07 * blend})`);
  gradient.addColorStop(1, 'rgba(180, 200, 214, 0)');
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawVideoTexture(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  grainTiles: HTMLCanvasElement[],
  grainIndex: number,
  noise: number,
): void {
  const tile = grainTiles[grainIndex];
  if (tile && noise > 0.01) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.5, noise * 0.75);
    ctx.globalCompositeOperation = 'overlay';
    const pattern = ctx.createPattern(tile, 'repeat');
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
  }

  const scanlines = getScanlinePattern(ctx);
  if (scanlines) {
    ctx.save();
    ctx.fillStyle = scanlines;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ */
/* Estados de falla                                                     */
/* ------------------------------------------------------------------ */

function faultKindOf(camera: Camera): FaultKind {
  const bucket = hashSeed(camera.id) % 3;
  if (bucket === 0) return 'congelado';
  if (bucket === 1) return 'negro';
  return 'nieve';
}

function drawSignalLoss(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = '#080b10';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(120, 140, 160, 0.08)';
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 2);
  }
  ctx.fillStyle = 'rgba(226, 232, 240, 0.75)';
  ctx.font = `600 13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SIN SEÑAL', width / 2, height / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawSnow(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsedMs: number,
): void {
  const seed = Math.floor(elapsedMs / 120);
  ctx.save();
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 90; i++) {
    const x = ((seed * 9301 + i * 49297) % 233280) / 233280;
    const y = ((seed * 4523 + i * 12345) % 233280) / 233280;
    const w = 2 + (i % 5);
    ctx.fillStyle = i % 3 === 0 ? 'rgba(226, 232, 240, 0.55)' : 'rgba(120, 134, 150, 0.35)';
    ctx.fillRect(x * width, y * height, w, 2 + (i % 3));
  }
  ctx.restore();
}

function drawBlackFrame(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.save();
  ctx.globalAlpha = 0.88;
  ctx.fillStyle = '#04060a';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawFreezeArtifact(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsedMs: number,
): void {
  const band = ((elapsedMs / 900) % 1) * height;
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#dbe6ef';
  ctx.fillRect(0, band, width, 2);
  ctx.restore();
}
