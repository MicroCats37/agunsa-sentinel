'use client';

import dynamic from 'next/dynamic';
import type { CesiumSceneProps } from './cesium-scene';

/**
 * Entrada pública de la vista geoespacial.
 *
 * El motor Cesium sólo puede existir en el navegador: se carga con
 * `next/dynamic` y `ssr: false` desde este componente de cliente, de modo que
 * nunca entra en el render del servidor ni en el bundle de las demás rutas.
 */

const CesiumScene = dynamic(() => import('./cesium-scene').then((module) => module.CesiumScene), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full w-full items-center justify-center bg-[var(--card)]"
      data-testid="geospatial-scene-loading"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-info/30 border-t-info" />
        <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
          Preparando el visor geoespacial
        </p>
      </div>
    </div>
  ),
});

export function GeospatialScene(props: CesiumSceneProps) {
  return <CesiumScene {...props} />;
}

export type { CesiumSceneProps };
export type { SceneExaggeration, SceneLayers, SceneProjection, SceneScope } from './cesium-scene';
