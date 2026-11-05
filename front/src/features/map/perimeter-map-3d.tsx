'use client';

import type { Camera } from '@/domain/types';
import { useEffect, useRef, useState } from 'react';
import type { PerimeterSceneHandle } from './three-scene';

/**
 * Envoltorio React de la escena 3D.
 *
 * La escena se crea en el navegador mediante importación dinámica: Three.js no
 * debe formar parte del bundle del servidor ni del primer render.
 */
export interface PerimeterMap3DProps {
  cameras: readonly Camera[];
  selectedCameraId: string | null;
  onSelect: (cameraId: string) => void;
}

export function PerimeterMap3D({ cameras, selectedCameraId, onSelect }: PerimeterMap3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<PerimeterSceneHandle | null>(null);
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);

  onSelectRef.current = onSelect;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    void import('./three-scene').then(({ createPerimeterScene }) => {
      if (cancelled || !containerRef.current) return;
      const handle = createPerimeterScene(containerRef.current, {
        cameras,
        onSelect: (cameraId) => onSelectRef.current(cameraId),
      });
      handleRef.current = handle;
      setReady(true);
    });

    return () => {
      cancelled = true;
      handleRef.current?.dispose();
      handleRef.current = null;
    };
    // La escena se crea una vez; los cambios de estado se aplican con
    // `setSelected` y `updateCameras` para no reconstruir el motor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    handleRef.current?.setSelected(selectedCameraId);
  }, [selectedCameraId]);

  useEffect(() => {
    handleRef.current?.updateCameras(cameras);
  }, [cameras]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden bg-[#101821]"
      data-slot="scene-stage"
      data-testid="perimeter-map-3d"
    >
      {ready ? null : (
        <div
          className="flex h-full w-full items-center justify-center"
          data-testid="perimeter-map-3d-loading"
          aria-hidden="true"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-full border-2 border-info/30 border-t-info" />
            <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
              Construyendo la planta
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
