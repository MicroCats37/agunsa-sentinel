'use client';

import { illuminationAtHour } from '@/domain/imaging';
import type { Camera } from '@/domain/types';
import { useEffect, useRef, useState } from 'react';
import { useUiStore } from '@/store/ui-store';
import { useSimulationStore } from '@/store/simulation-store';
import type { CameraPreset, PerimeterSceneHandle } from './three-scene';

/**
 * Envoltorio React de la escena 3D.
 *
 * La escena se crea en el navegador mediante importación dinámica: Three.js no
 * debe formar parte del bundle del servidor ni del primer render.
 *
 * La escena sigue la hora simulada: si el operador fija una hora en el mapa,
 * el sol, la niebla y el alumbrado perimetral se ajustan a esa hora.
 */
export interface PerimeterMap3DProps {
  cameras: readonly Camera[];
  selectedCameraId: string | null;
  onSelect: (cameraId: string) => void;
  /** Permite que el padre solicite un encuadre concreto. */
  focusRequest?: { cameraId: string; preset: CameraPreset; token: number } | null;
}

export function PerimeterMap3D({
  cameras,
  selectedCameraId,
  onSelect,
  focusRequest,
}: PerimeterMap3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<PerimeterSceneHandle | null>(null);
  const onSelectRef = useRef(onSelect);
  const focusRequestRef = useRef(focusRequest);
  const [ready, setReady] = useState(false);

  onSelectRef.current = onSelect;
  focusRequestRef.current = focusRequest;

  const sceneHour = useUiStore((state) => state.sceneHour);
  const clockMs = useSimulationStore((state) => state.clockMs);

  const hour =
    sceneHour ?? new Date(clockMs).getUTCHours() + new Date(clockMs).getUTCMinutes() / 60;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    void import('./three-scene').then(({ createPerimeterScene }) => {
      if (cancelled || !containerRef.current) return;
      const handle = createPerimeterScene(containerRef.current, {
        cameras,
        onSelect: (cameraId) => onSelectRef.current(cameraId),
        hour: illuminationAtHour(hour) === 'noche' ? 22 : hour,
      });
      handleRef.current = handle;
      setReady(true);
      // Si la cámara ya estaba seleccionada cuando la escena se montó, se
      // aplica el encuadre pendiente: la vista 3D abre directamente sobre la
      // cámara elegida.
      if (focusRequestRef.current) {
        handle.focusCamera(focusRequestRef.current.cameraId, focusRequestRef.current.preset);
      }
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

  useEffect(() => {
    handleRef.current?.setTimeOfDay(hour);
  }, [hour]);

  useEffect(() => {
    if (!focusRequest) return;
    handleRef.current?.focusCamera(focusRequest.cameraId, focusRequest.preset);
  }, [focusRequest]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden bg-[var(--card)]"
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
