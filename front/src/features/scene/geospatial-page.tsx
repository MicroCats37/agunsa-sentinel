'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { CAMERAS } from '@/data/cameras';
import type { Camera, GeospatialZone } from '@/domain/types';
import { useCamerasStore } from '@/store/cameras-store';
import { useSimulationStore } from '@/store/simulation-store';
import { useUiStore } from '@/store/ui-store';
import { useZonesStore } from '@/store/zones-store';
import { Clock3, MapPinned, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useCallback, useMemo, useState } from 'react';
import { GeospatialScene } from './geospatial-scene';

/**
 * Gemelo digital del perímetro.
 *
 * Ruta dedicada a la vista geoespacial: el motor Cesium sobre el terreno real
 * de AGUNSA Callao, con imagen satelital pública y la geometría abierta de
 * OpenStreetMap. Comparte con `/mapa` la misma fuente de datos de cámaras y
 * zonas, de modo que el operador pasa de una representación a otra sin perder
 * el contexto.
 *
 * Seleccionar una cámara en la escena —o en el panel de cristal— encuadra la
 * vista sobre ella y abre su ficha.
 */
export function GeospatialPage() {
  const overrides = useCamerasStore((state) => state.overrides);
  const highlightedCameraId = useCamerasStore((state) => state.highlightedCameraId);
  const clockMs = useSimulationStore((state) => state.clockMs);
  const sceneHour = useUiStore((state) => state.sceneHour);
  const setSceneHour = useUiStore((state) => state.setSceneHour);
  const geospatialZones = useZonesStore((state) => state.geospatialZones);
  const addGeospatialZone = useZonesStore((state) => state.addGeospatialZone);
  const removeGeospatialZone = useZonesStore((state) => state.removeGeospatialZone);
  const updateGeospatialZone = useZonesStore((state) => state.updateGeospatialZone);
  const { resolvedTheme } = useTheme();

  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<{
    cameraId: string;
    token: number;
  } | null>(null);

  const cameras = useMemo<Camera[]>(
    () =>
      CAMERAS.map((camera) => {
        const override = overrides[camera.id];
        return override ? { ...camera, ...override } : camera;
      }),
    [overrides],
  );

  const activeId = selectedCameraId ?? highlightedCameraId;
  const clockHour = new Date(clockMs).getUTCHours() + new Date(clockMs).getUTCMinutes() / 60;
  const hour = sceneHour ?? clockHour;

  function handleSelect(cameraId: string): void {
    setSelectedCameraId(cameraId);
    setFocusRequest({ cameraId, token: Date.now() });
  }

  const handleZonesChange = useCallback(
    (zones: GeospatialZone[]) => {
      const current = geospatialZones;
      zones.forEach((zone) => {
        const existing = current.find((item) => item.id === zone.id);
        if (!existing) addGeospatialZone(zone);
        else if (existing !== zone) updateGeospatialZone(zone);
      });
      current.forEach((zone) => {
        if (!zones.some((item) => item.id === zone.id)) removeGeospatialZone(zone.id);
      });
    },
    [addGeospatialZone, geospatialZones, removeGeospatialZone, updateGeospatialZone],
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Módulo 3 · Gemelo digital del perímetro"
        title="Vista geoespacial de AGUNSA Callao"
        description="El recinto sobre el terreno real: imagen satelital pública, perímetro de referencia de OpenStreetMap y las 36 cámaras del inventario evaluado. Selecciona una cámara para encuadrar la vista sobre ella."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/mapa">
              <MapPinned className="size-3.5" />
              Volver al mapa perimetral
            </Link>
          </Button>
        }
      />

      <div className="relative h-[calc(100vh-13rem)] min-h-[520px] w-full overflow-hidden rounded-xl border border-border bg-[#0d1d27]">
        <GeospatialScene
          cameras={cameras}
          selectedCameraId={activeId}
          onSelect={handleSelect}
          zones={geospatialZones}
          onZonesChange={handleZonesChange}
          theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
          hour={hour}
          focusRequest={focusRequest}
        />

        <div
          className="absolute top-3 left-3 flex w-[268px] flex-col gap-2 rounded-lg border border-border bg-background/90 px-3 py-2.5 backdrop-blur-sm"
          data-testid="geo-hour-control"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
              <Clock3 className="size-3.5" />
              Hora de la escena
            </span>
            <span className="text-xs font-semibold text-foreground tabular-nums">
              {String(Math.floor(hour)).padStart(2, '0')}:
              {String(Math.round((hour % 1) * 60)).padStart(2, '0')}
            </span>
          </div>
          <Slider
            value={[hour]}
            min={0}
            max={23}
            step={0.5}
            onValueChange={(value) => setSceneHour(value[0] ?? null)}
            aria-label="Hora de la escena"
            data-testid="geo-hour-slider"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">
              {sceneHour === null
                ? 'Sigue el reloj de la plataforma'
                : 'Hora forzada por el operador'}
            </span>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setSceneHour(null)}
              disabled={sceneHour === null}
              data-testid="geo-hour-reset"
            >
              <RotateCcw className="size-3" />
              Auto
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
