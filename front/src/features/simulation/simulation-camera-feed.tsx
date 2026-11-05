'use client';

import { CameraFeed, type CameraFeedHandle } from '@/components/camera-feed';
import type { Camera, SceneHour } from '@/domain/types';
import { useSimulationFeed } from '@/features/simulation/use-simulation-feed';
import type { Ref } from 'react';

/**
 * Feed de cámara conectado al motor de simulación.
 *
 * Envuelve `CameraFeed` y le inyecta los tracks, el reloj y el aviso de salud
 * que el motor de simulación publica. Así cualquier vista que muestre un feed
 * ve exactamente la misma escena que el motor de reglas está evaluando.
 */
export interface SimulationCameraFeedProps {
  camera: Camera;
  sectorName?: string;
  showDetections?: boolean;
  compact?: boolean;
  sceneHour?: SceneHour;
  className?: string;
  feedRef?: Ref<CameraFeedHandle>;
}

export function SimulationCameraFeed({
  camera,
  sectorName,
  showDetections = false,
  compact = false,
  sceneHour = null,
  className,
  feedRef,
}: SimulationCameraFeedProps) {
  const simulation = useSimulationFeed(camera.id);

  return (
    <CameraFeed
      ref={feedRef}
      camera={camera}
      sectorName={sectorName ?? camera.sectorId}
      targets={simulation.targets}
      showDetections={showDetections}
      compact={compact}
      sceneHour={sceneHour}
      getTimeSec={simulation.getTimeSec}
      getClockMs={simulation.getClockMs}
      healthWarning={simulation.healthWarning}
      className={className}
    />
  );
}
