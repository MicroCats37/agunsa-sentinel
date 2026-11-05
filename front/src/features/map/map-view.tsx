'use client';

import { Callout } from '@/components/callout';
import { DetailList } from '@/components/detail-list';
import { PageHeader } from '@/components/page-header';
import { CameraStatusBadge, SeverityBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CAMERAS } from '@/data/cameras';
import { SECTORS } from '@/data/sectors';
import { formatDateTime } from '@/domain/clock';
import {
  CLASSIFICATION_HINT,
  CLASSIFICATION_LABEL,
  PRIORITY_LABEL,
  VIEW_INTENT_LABEL,
} from '@/domain/labels';
import type { Camera, GeospatialZone } from '@/domain/types';
import { GeospatialScene } from '@/features/scene';
import { useCamerasStore } from '@/store/cameras-store';
import { useIncidentsStore } from '@/store/incidents-store';
import { useSimulationStore } from '@/store/simulation-store';
import { useTheme } from 'next-themes';
import { useUiStore, type MapMode } from '@/store/ui-store';
import { useZonesStore } from '@/store/zones-store';
import {
  Box,
  Clock3,
  Crosshair,
  Globe2,
  Info,
  Layers,
  Map as MapIcon,
  PanelRight,
  RotateCcw,
  SquareStack,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { CLASSIFICATION_FILL, PerimeterMap2D } from './perimeter-map-2d';
import { PerimeterMap3D } from './perimeter-map-3d';
import type { CameraPreset } from './three-scene';

/**
 * Mapa de seguridad perimetral (módulo 3 del pliego).
 *
 * Tres representaciones del mismo recinto, con la misma fuente de datos:
 *  - **Plano 2D**: el plano SVG del proyecto (papel técnico).
 *  - **Isométrico**: la escena de Three.js.
 *  - **Geoespacial**: la vista de Cesium sobre el terreno real, con imagen
 *    satelital, relieve público y la geometría abierta de OpenStreetMap.
 *
 * Seleccionar una cámara en cualquiera de ellas abre **la misma ficha** en el
 * panel lateral y su cono de visión apunta al mismo sitio.
 */
export function MapView() {
  const overrides = useCamerasStore((state) => state.overrides);
  const highlightedCameraId = useCamerasStore((state) => state.highlightedCameraId);
  const incidents = useIncidentsStore((state) => state.incidents);
  const mapMode = useUiStore((state) => state.mapMode);
  const setMapMode = useUiStore((state) => state.setMapMode);
  const sceneHour = useUiStore((state) => state.sceneHour);
  const setSceneHour = useUiStore((state) => state.setSceneHour);
  const collapsedPanels = useUiStore((state) => state.collapsedPanels);
  const togglePanel = useUiStore((state) => state.togglePanel);
  const clockMs = useSimulationStore((state) => state.clockMs);
  const geospatialZones = useZonesStore((state) => state.geospatialZones);
  const addGeospatialZone = useZonesStore((state) => state.addGeospatialZone);
  const removeGeospatialZone = useZonesStore((state) => state.removeGeospatialZone);
  const updateGeospatialZone = useZonesStore((state) => state.updateGeospatialZone);
  const { resolvedTheme } = useTheme();

  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<{
    cameraId: string;
    preset: CameraPreset;
    token: number;
  } | null>(null);
  const [geoFocusRequest, setGeoFocusRequest] = useState<{
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
  const selected = cameras.find((camera) => camera.id === activeId);

  const cameraIncidents = useMemo(
    () =>
      incidents
        .filter((incident) => incident.cameraId === activeId)
        .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)),
    [activeId, incidents],
  );

  const zoneRanking = useMemo(() => {
    const counts = new Map<string, number>();
    for (const incident of incidents) {
      counts.set(incident.zoneId, (counts.get(incident.zoneId) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [incidents]);

  const sectorRanking = useMemo(() => {
    const counts = new Map<string, number>();
    for (const incident of incidents) {
      counts.set(incident.sectorId, (counts.get(incident.sectorId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([sectorId, total]) => ({
        sectorId,
        total,
        name: SECTORS.find((sector) => sector.id === sectorId)?.name ?? sectorId,
      }))
      .sort((a, b) => b.total - a.total);
  }, [incidents]);

  const panelCollapsed = collapsedPanels['mapa'] ?? false;
  const clockHour = new Date(clockMs).getUTCHours() + new Date(clockMs).getUTCMinutes() / 60;
  const hour = sceneHour ?? clockHour;

  function handleSelect(cameraId: string): void {
    setSelectedCameraId(cameraId);
    setFocusRequest({ cameraId, preset: 'camera', token: Date.now() });
    setGeoFocusRequest({ cameraId, token: Date.now() });
  }

  function requestPreset(preset: CameraPreset): void {
    if (!activeId) return;
    setFocusRequest({ cameraId: activeId, preset, token: Date.now() });
  }

  const handleZonesChange = useCallback(
    (zones: GeospatialZone[]) => {
      // La tienda es la fuente de verdad: se sincroniza por diferencia para no
      // perder el orden ni las zonas que no se han tocado.
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
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Módulo 3 · Mapa perimetral"
        title="Plano de seguridad perimetral"
        description="Las 36 cámaras del inventario evaluado, su cono de visión real y los sectores con mayor concentración de incidentes. Selecciona una cámara para abrir su ficha y encuadrarla en 3D."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => togglePanel('mapa')}
              data-testid="toggle-map-panel"
            >
              <PanelRight className={panelCollapsed ? '' : 'rotate-180'} />
              {panelCollapsed ? 'Mostrar panel' : 'Ocultar panel'}
            </Button>
            <Tabs
              value={mapMode}
              onValueChange={(value) => setMapMode(value as MapMode)}
              className="w-auto"
            >
              <TabsList>
                <TabsTrigger value="2d" data-testid="map-mode-2d">
                  <MapIcon className="size-3.5" />
                  Plano 2D
                </TabsTrigger>
                <TabsTrigger value="3d" data-testid="map-mode-3d">
                  <Box className="size-3.5" />
                  Isométrico
                </TabsTrigger>
                <TabsTrigger value="geo" data-testid="map-mode-geo">
                  <Globe2 className="size-3.5" />
                  Geoespacial
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <Card size="sm" className="overflow-hidden">
            <div
              className={`relative w-full overflow-hidden bg-[var(--map-bg)] ${
                mapMode === 'geo' ? 'h-[min(82vh,900px)]' : 'h-[min(66vh,680px)]'
              }`}
            >
              {mapMode === '2d' ? (
                <PerimeterMap2D
                  cameras={cameras}
                  incidents={incidents}
                  selectedCameraId={activeId}
                  onSelect={handleSelect}
                />
              ) : mapMode === '3d' ? (
                <PerimeterMap3D
                  cameras={cameras}
                  selectedCameraId={activeId}
                  onSelect={handleSelect}
                  focusRequest={focusRequest}
                />
              ) : (
                <GeospatialScene
                  cameras={cameras}
                  selectedCameraId={activeId}
                  onSelect={handleSelect}
                  zones={geospatialZones}
                  onZonesChange={handleZonesChange}
                  theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                  hour={hour}
                  focusRequest={geoFocusRequest}
                />
              )}

              {/* Control de hora: gobierna la iluminación de la escena y el ICR. */}
              <Card
                size="sm"
                className="absolute top-3 left-3 w-[268px] bg-background/90 backdrop-blur-sm"
                data-testid="map-hour-control"
              >
                <CardContent className="flex flex-col gap-2">
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
                    data-testid="map-hour-slider"
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
                      data-testid="map-hour-reset"
                    >
                      <RotateCcw className="size-3" />
                      Auto
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Encuadres de la vista 3D. */}
              {mapMode === '3d' ? (
                <Card
                  size="sm"
                  className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm"
                >
                  <CardContent className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => requestPreset('general')}
                      disabled={!activeId}
                      data-testid="preset-general"
                    >
                      <Layers className="size-3" />
                      General
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => requestPreset('sector')}
                      disabled={!activeId}
                      data-testid="preset-sector"
                    >
                      <Crosshair className="size-3" />
                      Sector
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => requestPreset('camera')}
                      disabled={!activeId}
                      data-testid="preset-camera"
                    >
                      <Video className="size-3" />
                      Cámara
                    </Button>
                  </CardContent>
                </Card>
              ) : null}

              <Card
                size="sm"
                className="absolute right-3 bottom-3 bg-background/90 backdrop-blur-sm"
              >
                <CardContent className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  <LegendDot color={CLASSIFICATION_FILL.buena_general} label="Buena general" />
                  <LegendDot color={CLASSIFICATION_FILL.limitada} label="Limitada" />
                  <LegendDot color={CLASSIFICATION_FILL.deficiente} label="Deficiente" />
                  <LegendDot color={CLASSIFICATION_FILL.sin_imagen} label="Sin imagen" />
                  <span className="text-muted-foreground/80">Cono = cobertura real</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="xs" className="h-6 px-1.5 text-[11px]">
                        <Info className="size-3" />
                        Detalles
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-[300px]">
                      <PopoverHeader>
                        <PopoverTitle>Leyenda de clasificación</PopoverTitle>
                        <PopoverDescription>
                          El color del cono y del marcador es el de la clasificación CCTV evaluada
                          en el informe, no el del estado operativo del equipo.
                        </PopoverDescription>
                      </PopoverHeader>
                      <ul className="flex flex-col gap-1.5">
                        <LegendRow
                          color={CLASSIFICATION_FILL.buena_general}
                          label="Buena general"
                          detail="Imagen limpia y estable en día y noche."
                        />
                        <LegendRow
                          color={CLASSIFICATION_FILL.limitada}
                          label="Limitada"
                          detail="Velo leve y contraste reducido."
                        />
                        <LegendRow
                          color={CLASSIFICATION_FILL.deficiente}
                          label="Deficiente"
                          detail="Velo denso, halos y bordes difusos."
                        />
                        <LegendRow
                          color={CLASSIFICATION_FILL.sin_imagen}
                          label="Sin imagen"
                          detail="El equipo no entregó fotograma en la inspección."
                        />
                      </ul>
                    </PopoverContent>
                  </Popover>
                </CardContent>
              </Card>
            </div>
          </Card>
        </div>

        {panelCollapsed ? null : (
          <div className="flex flex-col gap-4">
            <Card size="sm">
              <CardHeader>
                <CardTitle>{selected ? selected.name : 'Cámara seleccionada'}</CardTitle>
                <CardDescription>
                  {selected
                    ? `${selected.id} · ${SECTORS.find((s) => s.id === selected.sectorId)?.name ?? selected.sectorId}`
                    : 'Selecciona un marcador en el plano para ver el detalle.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selected ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-border bg-muted text-muted-foreground"
                      >
                        <span
                          className="size-2 rounded-full"
                          style={{
                            backgroundColor:
                              CLASSIFICATION_FILL[selected.assessment.classification],
                          }}
                          aria-hidden="true"
                        />
                        {CLASSIFICATION_LABEL[selected.assessment.classification]}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-border bg-muted text-muted-foreground"
                      >
                        {PRIORITY_LABEL[selected.assessment.priority]}
                      </Badge>
                      <CameraStatusBadge status={selected.status} />
                      {selected.alertSeverity ? (
                        <SeverityBadge severity={selected.alertSeverity} />
                      ) : null}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {CLASSIFICATION_HINT[selected.assessment.classification]}
                    </p>

                    <DetailList
                      columns={2}
                      items={[
                        { label: 'IP', value: selected.ip },
                        { label: 'Modelo', value: selected.spec.model },
                        { label: 'Resolución recibida', value: selected.resolution },
                        { label: 'Inspección diurna', value: selected.assessment.dayResult },
                        { label: 'Inspección nocturna', value: selected.assessment.nightResult },
                        {
                          label: 'Campo de visión',
                          value: `${selected.spec.horizontalFovDeg}°`,
                        },
                        {
                          label: 'Lente',
                          value: `${selected.spec.focalLengthMm.toFixed(1)} mm`,
                        },
                        { label: 'Alcance IR', value: `${selected.spec.irDistanceM} m` },
                      ]}
                    />

                    <Callout tone="info" title="Cobertura">
                      <p className="text-foreground">{VIEW_INTENT_LABEL[selected.viewIntent]}</p>
                      <p className="mt-1">
                        Rumbo {selected.heading}° · cono de {selected.spec.horizontalFovDeg}° sobre
                        el plano.
                      </p>
                    </Callout>

                    <div className="border-t border-border pt-3">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        Hallazgo diurno
                      </p>
                      <p className="text-xs text-foreground">{selected.assessment.dayFinding}</p>
                      <p className="mt-2 mb-1 text-xs font-medium text-muted-foreground">
                        Hallazgo nocturno
                      </p>
                      <p className="text-xs text-foreground">{selected.assessment.nightFinding}</p>
                      <p className="mt-2 mb-1 text-xs font-medium text-muted-foreground">
                        Acción recomendada
                      </p>
                      <p className="text-xs text-foreground">
                        {selected.assessment.recommendedAction}
                      </p>
                      {selected.assessment.obstructionId ? (
                        <Badge
                          variant="outline"
                          className="mt-2 border-warning/45 bg-warning/10 text-warning"
                        >
                          Obstrucción {selected.assessment.obstructionId} documentada
                        </Badge>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/monitoreo/${selected.id}`}>
                          <Video className="size-3.5" />
                          Abrir cámara
                        </Link>
                      </Button>
                      {cameraIncidents[0] ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/incidentes/${cameraIncidents[0].id}`}>
                            Ver último evento
                          </Link>
                        </Button>
                      ) : null}
                    </div>

                    <div className="border-t border-border pt-3">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Eventos de esta cámara
                      </p>
                      <ul className="flex flex-col gap-1.5">
                        {cameraIncidents.slice(0, 4).map((incident) => (
                          <li key={incident.id}>
                            <Link
                              href={`/incidentes/${incident.id}`}
                              className="flex items-center justify-between gap-2 rounded px-1.5 py-1 text-xs transition-colors hover:bg-muted"
                            >
                              <span className="truncate text-foreground">{incident.type}</span>
                              <span className="shrink-0 text-muted-foreground tabular-nums">
                                {formatDateTime(incident.occurredAt)}
                              </span>
                            </Link>
                          </li>
                        ))}
                        {cameraIncidents.length === 0 ? (
                          <li className="px-1.5 text-xs text-muted-foreground">
                            Sin eventos registrados.
                          </li>
                        ) : null}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <Empty className="border border-border/60">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <MapIcon />
                      </EmptyMedia>
                      <EmptyTitle>Ninguna cámara seleccionada</EmptyTitle>
                      <EmptyDescription>
                        Selecciona un marcador en el plano para ver su ficha y encuadrarla en 3D.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle>Sectores con más incidentes</CardTitle>
                <CardDescription>
                  Zonas del plano con mayor concentración de eventos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {sectorRanking.map((sector) => (
                    <li key={sector.sectorId}>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-foreground">{sector.name}</span>
                        <span className="text-muted-foreground tabular-nums">{sector.total}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-warning"
                          style={{
                            width: `${Math.max(4, (sector.total / (sectorRanking[0]?.total || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle>Zonas más activas</CardTitle>
                <CardDescription>Zonas inteligentes con más eventos acumulados.</CardDescription>
              </CardHeader>
              <CardContent>
                {zoneRanking.length === 0 ? (
                  <Empty className="border border-border/60">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <SquareStack />
                      </EmptyMedia>
                      <EmptyTitle>Sin zonas activas</EmptyTitle>
                      <EmptyDescription>
                        Todavía no hay incidentes asociados a zonas inteligentes.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <DetailList
                    items={zoneRanking.map(([zoneId, total]) => ({
                      label: zoneId,
                      value: (
                        <span className="font-medium text-foreground tabular-nums">{total}</span>
                      ),
                    }))}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {label}
    </span>
  );
}

/** Fila de la leyenda detallada: color, etiqueta y lectura operativa. */
function LegendRow({ color, label, detail }: { color: string; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-2 text-xs">
      <span
        className="mt-1 size-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="min-w-0">
        <span className="block font-medium text-foreground">{label}</span>
        <span className="block text-muted-foreground">{detail}</span>
      </span>
    </li>
  );
}
