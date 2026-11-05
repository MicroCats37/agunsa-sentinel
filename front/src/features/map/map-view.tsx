'use client';

import { PageHeader } from '@/components/page-header';
import { CameraStatusBadge, SeverityBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CAMERAS } from '@/data/cameras';
import { SECTORS } from '@/data/sectors';
import { formatDateTime } from '@/domain/clock';
import type { Camera } from '@/domain/types';
import { useCamerasStore } from '@/store/cameras-store';
import { useIncidentsStore } from '@/store/incidents-store';
import { useUiStore, type MapMode } from '@/store/ui-store';
import { Box, Map as MapIcon, PanelRight, SquareStack, Video } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PerimeterMap2D } from './perimeter-map-2d';
import { PerimeterMap3D } from './perimeter-map-3d';

/**
 * Mapa de seguridad perimetral (módulo 3 del pliego).
 *
 * Vista 2D (plano SVG) por defecto y vista 3D isométrica (Three.js) como
 * alternativa. Ambas comparten las coordenadas del plano, de modo que una
 * cámara ocupa la misma posición en las dos representaciones.
 */
export function MapView() {
  const overrides = useCamerasStore((state) => state.overrides);
  const highlightedCameraId = useCamerasStore((state) => state.highlightedCameraId);
  const incidents = useIncidentsStore((state) => state.incidents);
  const mapMode = useUiStore((state) => state.mapMode);
  const setMapMode = useUiStore((state) => state.setMapMode);
  const collapsedPanels = useUiStore((state) => state.collapsedPanels);
  const togglePanel = useUiStore((state) => state.togglePanel);

  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Módulo 3 · Mapa perimetral"
        title="Plano de seguridad perimetral"
        description="Distribución de las 36 cámaras, sectores con mayor concentración de incidentes y portones de acceso. Selecciona una cámara en el plano para abrir su ficha."
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
                  Vista 3D
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card size="sm" className="overflow-hidden">
          <div className="relative h-[min(70vh,720px)] w-full overflow-hidden bg-[#0a0e13]">
            {mapMode === '2d' ? (
              <PerimeterMap2D
                cameras={cameras}
                incidents={incidents}
                selectedCameraId={activeId}
                onSelect={setSelectedCameraId}
              />
            ) : (
              <PerimeterMap3D
                cameras={cameras}
                selectedCameraId={activeId}
                onSelect={setSelectedCameraId}
              />
            )}
            <div className="pointer-events-none absolute right-3 bottom-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background/85 px-3 py-2 text-[11px] text-muted-foreground backdrop-blur-sm">
              <LegendDot color="#3fb27f" label="Activa" />
              <LegendDot color="#e5484d" label="Con alerta" />
              <LegendDot color="#e8a33d" label="Con falla" />
              <LegendDot color="#5c6b80" label="Inactiva" />
              {mapMode === '3d' ? (
                <span className="text-muted-foreground/80">Cono = cobertura real</span>
              ) : null}
            </div>
          </div>
        </Card>

        {panelCollapsed ? null : (
          <div className="flex flex-col gap-4">
            <Card size="sm">
              <CardHeader>
                <CardTitle>{selected ? selected.name : 'Cámara seleccionada'}</CardTitle>
                <CardDescription>
                  {selected
                    ? `${selected.id} · sector ${selected.sectorId}`
                    : 'Selecciona un marcador en el plano para ver el detalle.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selected ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <CameraStatusBadge status={selected.status} />
                      {selected.alertSeverity ? (
                        <SeverityBadge severity={selected.alertSeverity} />
                      ) : null}
                      <Badge
                        variant="outline"
                        className="border-border bg-muted text-muted-foreground"
                      >
                        {selected.resolution}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <MapSpec label="Sector" value={selected.sectorId} />
                      <MapSpec
                        label="Campo de visión"
                        value={`${selected.spec.horizontalFovDeg}°`}
                      />
                      <MapSpec
                        label="Lente"
                        value={`${selected.spec.focalLengthMm.toFixed(1)} mm`}
                      />
                      <MapSpec label="IP" value={selected.ip} />
                      <MapSpec label="Alcance IR" value={`${selected.spec.irDistanceM} m`} />
                      <MapSpec label="Zona" value={selected.zoneId} />
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
                              <span className="shrink-0 text-muted-foreground">
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
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Ninguna cámara seleccionada.
                  </p>
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
                <ul className="flex flex-col gap-1.5">
                  {zoneRanking.map(([zoneId, total]) => (
                    <li
                      key={zoneId}
                      className="flex items-center justify-between gap-2 rounded border border-border px-2.5 py-1.5 text-xs"
                    >
                      <span className="flex items-center gap-1.5 truncate text-muted-foreground">
                        <SquareStack className="size-3 shrink-0" />
                        {zoneId}
                      </span>
                      <span className="font-medium text-foreground tabular-nums">{total}</span>
                    </li>
                  ))}
                </ul>
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

function MapSpec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate font-medium text-foreground">{value}</dd>
    </div>
  );
}
