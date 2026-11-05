'use client';

import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import type {
  Camera,
  CameraTrackTarget,
  IlluminationPreference,
  VirtualLine,
  Zone,
} from '@/domain/types';
import { createFeedRenderer, type FeedRendererOptions } from './lib/renderer';
import { subscribeToTicker } from './lib/ticker';

/**
 * Módulo profundo del feed de cámara.
 *
 * Toda la lógica de síntesis de vídeo (escenas, objetos, grano, HUD) queda
 * detrás de esta única interfaz pública: `CameraFeed` para el monitor en vivo y
 * `EvidenceFrame` para la captura de evidencia de un incidente.
 */

export interface CameraFeedProps {
  camera: Camera;
  /** Nombre legible del sector: lo resuelve la feature que compone el feed. */
  sectorName?: string;
  /** Objetos sintéticos que se mueven dentro del encuadre. */
  targets?: readonly CameraTrackTarget[];
  /** Dibuja los cuadros de detección de persona/vehículo. */
  showDetections?: boolean;
  /** Zonas inteligentes a superponer. */
  zones?: readonly Zone[];
  /** Líneas virtuales a superponer. */
  lines?: readonly VirtualLine[];
  /** Modo compacto: oculta las etiquetas de confianza para lienzos pequeños. */
  compact?: boolean;
  /** Preferencia de iluminación: Auto sigue el reloj de la plataforma. */
  illumination?: IlluminationPreference;
  /**
   * Segundo actual de la línea de tiempo simulada.
   *
   * Lo consulta el renderizador en cada fotograma, de modo que la silueta
   * dibujada es la misma que evalúa el motor de reglas.
   */
  getTimeSec?: () => number;
  /** Reloj de la plataforma para la marca de tiempo del OSD. */
  getClockMs?: () => number;
  /** Aviso de salud del equipo (por ejemplo el desfase de reloj de C02). */
  healthWarning?: string | null;
  className?: string;
}

/** Control imperativo del feed (captura de imagen). */
export interface CameraFeedHandle {
  /** Devuelve el fotograma actual como PNG en base64, o null si no es posible. */
  captureSnapshot: () => string | null;
}

export function CameraFeed({
  camera,
  sectorName,
  targets = [],
  showDetections = false,
  zones = [],
  lines = [],
  compact = false,
  illumination = 'auto',
  getTimeSec,
  getClockMs,
  healthWarning = null,
  className,
  ref,
}: CameraFeedProps & { ref?: Ref<CameraFeedHandle> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ReturnType<typeof createFeedRenderer> | null>(null);
  const optionsRef = useRef<FeedRendererOptions>({
    camera,
    sectorName: sectorName ?? camera.sectorId,
    targets,
    showDetections,
    showZones: zones,
    showLines: lines,
    compact,
    evidence: false,
    illumination,
    getTimeSec,
    getClockMs,
    healthWarning,
  });

  optionsRef.current = {
    camera,
    sectorName: sectorName ?? camera.sectorId,
    targets,
    showDetections,
    showZones: zones,
    showLines: lines,
    compact,
    evidence: false,
    illumination,
    getTimeSec,
    getClockMs,
    healthWarning,
  };

  useImperativeHandle(
    ref,
    () => ({
      captureSnapshot: () => rendererRef.current?.snapshot() ?? null,
    }),
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = createFeedRenderer(canvas, optionsRef);
    rendererRef.current = renderer;
    const unsubscribe = subscribeToTicker((elapsedMs) => {
      renderer.render(elapsedMs);
    });

    return () => {
      unsubscribe();
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [camera.id]);

  return <canvas ref={canvasRef} className={className ?? 'block h-full w-full'} />;
}

export interface EvidenceFrameProps {
  camera: Camera;
  sectorName?: string;
  targets?: readonly CameraTrackTarget[];
  /** Instante de la captura; fija la marca de tiempo del HUD. */
  occurredAt: string;
  /** Segundo de la línea de tiempo en el que se sitúa la evidencia. */
  timeSec?: number;
  illumination?: IlluminationPreference;
  className?: string;
}

/**
 * Fotograma congelado que representa la evidencia de un incidente.
 * Se renderiza una única vez, con el objeto detectado resaltado.
 */
export function EvidenceFrame({
  camera,
  sectorName,
  targets = [],
  occurredAt,
  timeSec,
  illumination = 'auto',
  className,
}: EvidenceFrameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const optionsRef = useRef<FeedRendererOptions>({
    camera,
    sectorName: sectorName ?? camera.sectorId,
    targets,
    showDetections: false,
    showZones: [],
    showLines: [],
    compact: false,
    timestampMs: Date.parse(occurredAt),
    evidence: true,
    illumination,
    getTimeSec: timeSec === undefined ? undefined : () => timeSec,
  });

  optionsRef.current = {
    camera,
    sectorName: sectorName ?? camera.sectorId,
    targets,
    showDetections: false,
    showZones: [],
    showLines: [],
    compact: false,
    timestampMs: Date.parse(occurredAt),
    evidence: true,
    illumination,
    getTimeSec: timeSec === undefined ? undefined : () => timeSec,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = createFeedRenderer(canvas, optionsRef);
    const draw = () => {
      renderer.render(0);
    };
    draw();

    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      renderer.destroy();
    };
  }, [camera.id, occurredAt]);

  return <canvas ref={canvasRef} className={className ?? 'block h-full w-full'} />;
}
