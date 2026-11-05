'use client';

import { CameraFeed } from '@/components/camera-feed';
import type { Camera } from '@/domain/types';
import { snapshotUrl } from '@/lib/visor';
import { useEffect, useState } from 'react';

/**
 * Imagen de una cámara con la cadena de respaldo del visor.
 *
 * 1. **En vivo**: imagen que el visor captura del equipo a través del NVR.
 * 2. **Informe**: la fotografía que el informe CCTV recogió en su sesión.
 * 3. **Simulado**: el feed sintético del motor de simulación.
 *
 * El refresco reproduce la cadencia del visor (cada 10 s). Si la imagen en vivo
 * falla —equipo sin respuesta o red no conectada— se cae a la evidencia del
 * informe sin dejar el hueco vacío.
 */
export interface LiveCameraFrameProps {
  camera: Camera;
  /** Cadencia de refresco de la captura en vivo, en milisegundos. */
  refreshMs?: number;
  /** Muestra los cuadros de detección del feed sintético. */
  showDetections?: boolean;
  /** Fuerza la captura nocturna del informe en lugar de la diurna. */
  night?: boolean;
  /** Muestra la línea de estado bajo la imagen. */
  showStatus?: boolean;
  className?: string;
}

export function LiveCameraFrame({
  camera,
  refreshMs = 10_000,
  showDetections = false,
  night = false,
  showStatus = false,
  className,
}: LiveCameraFrameProps) {
  const [token, setToken] = useState(() => Date.now());
  const [liveFailed, setLiveFailed] = useState(false);

  useEffect(() => {
    setLiveFailed(false);
    setToken(Date.now());
    const timer = window.setInterval(() => setToken(Date.now()), refreshMs);
    return () => window.clearInterval(timer);
  }, [camera.id, refreshMs]);

  const photo =
    (night ? camera.photos.night : camera.photos.day) ??
    (night ? camera.photos.day : camera.photos.night);

  if (liveFailed && photo === undefined) {
    return (
      <div className={className ?? 'block h-full w-full'}>
        <CameraFeed
          camera={camera}
          showDetections={showDetections}
          compact
          className="block h-full w-full"
        />
        {showStatus ? (
          <p className="px-2.5 py-1.5 text-[10px] text-[var(--glass-muted)]">
            Feed en vivo · sin captura en el informe
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={className ?? 'block h-full w-full'}>
      <img
        src={liveFailed ? photo : snapshotUrl(camera.ip, token)}
        alt={
          liveFailed
            ? `Captura del informe CCTV de la cámara ${camera.id}`
            : `Imagen en vivo de la cámara ${camera.id}`
        }
        className="block h-full w-full object-cover"
        onError={() => {
          if (!liveFailed) setLiveFailed(true);
        }}
      />
      {showStatus ? (
        <p className="px-2.5 py-1.5 text-[10px] text-[var(--glass-muted)]">
          {liveFailed
            ? `Captura del informe · ${night ? '02/11/2026 20:55' : '03/11/2026 14:47'}`
            : 'En vivo · captura reenviada por el visor NVR'}
        </p>
      ) : null}
    </div>
  );
}
