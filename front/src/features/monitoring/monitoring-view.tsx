'use client';

import { CameraFeed, type CameraFeedHandle } from '@/components/camera-feed';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CAMERAS } from '@/data/cameras';
import { SECTORS } from '@/data/sectors';
import type { Camera, IlluminationPreference } from '@/domain/types';
import { useSimulationFeed } from '@/features/simulation/use-simulation-feed';
import { useCamerasStore } from '@/store/cameras-store';
import { useUiStore, type GridLayout } from '@/store/ui-store';
import {
  Camera as CameraIcon,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Grid2x2,
  Grid3x3,
  LayoutGrid,
  Maximize,
  Move,
  RotateCcw,
  Square,
  Volume2,
  ZoomIn,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

/**
 * Centro de videovigilancia (módulo 2 del pliego).
 *
 * Prioridad de lectura: qué cámara requiere atención. El orden es
 * deliberado — primero las cámaras con alerta, luego el resto del sector.
 *
 * Cada celda replica el comportamiento de un NVR real: al pasar el cursor
 * aparece una barra de acciones (instantánea, captura, zoom, PTZ, audio y
 * pantalla completa) sobre el vídeo.
 */
const LAYOUTS: readonly { value: GridLayout; label: string; icon: typeof Square }[] = [
  { value: 1, label: '1 cámara', icon: Square },
  { value: 4, label: '4 cámaras', icon: Grid2x2 },
  { value: 9, label: '9 cámaras', icon: Grid3x3 },
  { value: 16, label: '16 cámaras', icon: LayoutGrid },
];

type StatusFilter = 'todas' | 'alerta' | 'fallando' | 'activa';

export function MonitoringView() {
  const overrides = useCamerasStore((state) => state.overrides);
  const highlightedCameraId = useCamerasStore((state) => state.highlightedCameraId);
  const gridLayout = useUiStore((state) => state.gridLayout);
  const setGridLayout = useUiStore((state) => state.setGridLayout);
  const monitoringPage = useUiStore((state) => state.monitoringPage);
  const setMonitoringPage = useUiStore((state) => state.setMonitoringPage);
  const sectorFilter = useUiStore((state) => state.sectorFilter);
  const setSectorFilter = useUiStore((state) => state.setSectorFilter);
  const illumination = useUiStore((state) => state.illumination);
  const setIllumination = useUiStore((state) => state.setIllumination);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todas');

  const sectorNameById = useMemo(
    () => new Map(SECTORS.map((sector) => [sector.id, sector.name] as const)),
    [],
  );

  const cameras = useMemo<Camera[]>(
    () =>
      CAMERAS.map((camera) => {
        const override = overrides[camera.id];
        return override ? { ...camera, ...override } : camera;
      }),
    [overrides],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matches = cameras.filter((camera) => {
      if (sectorFilter !== 'todos' && camera.sectorId !== sectorFilter) return false;
      if (statusFilter === 'alerta' && camera.status !== 'alerta') return false;
      if (statusFilter === 'fallando' && camera.status !== 'fallando') return false;
      if (statusFilter === 'activa' && camera.status !== 'activa') return false;
      if (normalized.length > 0) {
        const haystack = `${camera.id} ${camera.name}`.toLowerCase();
        if (!haystack.includes(normalized)) return false;
      }
      return true;
    });

    const weight = (camera: Camera): number => {
      if (camera.id === highlightedCameraId) return 0;
      if (camera.status === 'alerta') return 1;
      if (camera.status === 'fallando') return 2;
      if (camera.status === 'inactiva') return 3;
      return 4;
    };

    return [...matches].sort((a, b) => weight(a) - weight(b));
  }, [cameras, highlightedCameraId, query, sectorFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / gridLayout));
  const safePage = Math.min(monitoringPage, pageCount - 1);
  const pageCameras = filtered.slice(safePage * gridLayout, safePage * gridLayout + gridLayout);

  const alertCount = cameras.filter((camera) => camera.status === 'alerta').length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Módulo 2 · Centro de videovigilancia"
        title="Monitor de cámaras"
        description="Las cámaras con alerta se listan primero y se marcan con borde, distintivo y pulso. Pasa el cursor sobre una celda para desplegar sus acciones rápidas."
      />

      <Card size="sm">
        <div className="flex flex-wrap items-center gap-3 px-(--card-spacing) py-(--card-spacing)">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Sector</span>
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="w-[200px]" aria-label="Filtrar por sector">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los sectores</SelectItem>
                {SECTORS.map((sector) => (
                  <SelectItem key={sector.id} value={sector.id}>
                    {sector.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Estado</span>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger className="w-[160px]" aria-label="Filtrar por estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos</SelectItem>
                <SelectItem value="alerta">Con alerta</SelectItem>
                <SelectItem value="fallando">Con falla</SelectItem>
                <SelectItem value="activa">Activas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Iluminación</span>
            <Select
              value={illumination}
              onValueChange={(value) => setIllumination(value as IlluminationPreference)}
            >
              <SelectTrigger className="w-[150px]" aria-label="Preferencia de iluminación">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automática (reloj)</SelectItem>
                <SelectItem value="dia">Vista diurna</SelectItem>
                <SelectItem value="noche">Vista nocturna (IR)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por ID o nombre…"
            className="w-[220px]"
            aria-label="Buscar cámara"
          />

          <div className="ml-auto flex items-center gap-1 rounded-lg bg-muted p-0.5">
            {LAYOUTS.map((layout) => {
              const Icon = layout.icon;
              const active = gridLayout === layout.value;
              return (
                <button
                  key={layout.value}
                  type="button"
                  data-testid={`layout-${layout.value}`}
                  onClick={() => setGridLayout(layout.value)}
                  aria-pressed={active}
                  title={layout.label}
                  className={`flex size-7 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="size-3.5" />
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setMonitoringPage(Math.max(0, safePage - 1))}
              disabled={safePage === 0}
              aria-label="Página anterior"
            >
              <ChevronLeft />
            </Button>
            <span className="min-w-[86px] text-center text-xs text-muted-foreground tabular-nums">
              Página {safePage + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setMonitoringPage(Math.min(pageCount - 1, safePage + 1))}
              disabled={safePage >= pageCount - 1}
              aria-label="Página siguiente"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
          {filtered.length} cámaras en el filtro
        </Badge>
        {alertCount > 0 ? (
          <Badge
            variant="outline"
            className="border-critical/45 bg-critical/10 text-critical"
            data-testid="monitor-alert-count"
          >
            <CircleAlert className="size-3" />
            {alertCount} con alerta
          </Badge>
        ) : null}
        <span className="text-[11px] text-muted-foreground">
          {illumination === 'auto'
            ? 'Modo día/noche automático según el reloj de la plataforma.'
            : illumination === 'dia'
              ? 'Vista diurna forzada: el filtro IR-cut permanece abierto.'
              : 'Vista nocturna forzada: filtro IR-cut cerrado e iluminación infrarroja.'}
        </span>
      </div>

      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${gridColumns(gridLayout)}, minmax(0, 1fr))`,
        }}
        data-testid="monitoring-grid"
      >
        {pageCameras.map((camera) => (
          <CameraTile
            key={camera.id}
            camera={camera}
            highlighted={camera.id === highlightedCameraId}
            sectorName={sectorNameById.get(camera.sectorId) ?? camera.sectorId}
            illumination={illumination}
          />
        ))}
      </div>
    </div>
  );
}

function gridColumns(layout: GridLayout): number {
  switch (layout) {
    case 1:
      return 1;
    case 4:
      return 2;
    case 9:
      return 3;
    case 16:
      return 4;
  }
}

function CameraTile({
  camera,
  highlighted,
  sectorName,
  illumination,
}: {
  camera: Camera;
  highlighted: boolean;
  sectorName: string;
  illumination: IlluminationPreference;
}) {
  const hasAlert = camera.status === 'alerta';
  const feedRef = useRef<CameraFeedHandle>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const simulation = useSimulationFeed(camera.id);

  function handleSnapshot(): void {
    const dataUrl = feedRef.current?.captureSnapshot();
    if (!dataUrl) {
      toast.error('No se pudo capturar la imagen de la cámara.');
      return;
    }
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${camera.id}-captura.png`;
    link.click();
    toast.success(`Captura de ${camera.id} descargada.`);
  }

  function handleFullscreen(): void {
    const stage = stageRef.current;
    if (!stage) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void stage.requestFullscreen?.();
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-lg border bg-card transition-colors ${
        hasAlert
          ? 'border-critical/70 ring-1 ring-critical/40'
          : highlighted
            ? 'border-warning/70 ring-1 ring-warning/40'
            : 'border-border hover:border-info/50'
      }`}
      data-testid={`camera-tile-${camera.id}`}
    >
      <div ref={stageRef} className="relative aspect-video w-full overflow-hidden bg-black">
        <Link href={`/monitoreo/${camera.id}`} className="block h-full w-full">
          <div
            className="h-full w-full transition-transform duration-200"
            style={{ transform: zoom > 1 ? `scale(${zoom})` : undefined }}
          >
            <CameraFeed
              ref={feedRef}
              camera={camera}
              sectorName={sectorName}
              targets={simulation.targets}
              showDetections
              compact
              illumination={illumination}
              getTimeSec={simulation.getTimeSec}
              getClockMs={simulation.getClockMs}
              healthWarning={simulation.healthWarning}
            />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25" />
        </Link>

        <div className="pointer-events-none absolute top-2 left-2 flex items-center gap-1.5">
          <span className="rounded bg-black/65 px-1.5 py-0.5 font-mono text-[11px] text-white/90">
            {camera.id}
          </span>
          {hasAlert ? (
            <span className="flex animate-pulse items-center gap-1 rounded bg-critical px-1.5 py-0.5 text-[11px] font-semibold text-white">
              <CircleAlert className="size-3" />
              ALERTA
            </span>
          ) : null}
          {highlighted && !hasAlert ? (
            <span className="rounded bg-warning px-1.5 py-0.5 text-[11px] font-semibold text-black">
              NUEVO
            </span>
          ) : null}
        </div>

        {/*
          Barra de acciones del NVR: sólo aparece al pasar el cursor sobre la
          celda y se apoya en la esquina superior derecha, libre del OSD del
          feed (que ocupa la inferior derecha).
        */}
        <div
          className="absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-md border border-white/10 bg-black/65 p-0.5 opacity-0 backdrop-blur-sm transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
          data-testid={`camera-toolbar-${camera.id}`}
        >
          <TileAction
            label="Reproducción instantánea"
            testId={`toolbar-instant-${camera.id}`}
            onClick={() => toast.info(`Reproducción instantánea de ${camera.id}.`)}
          >
            <RotateCcw />
          </TileAction>
          <TileAction
            label="Capturar imagen"
            testId={`toolbar-snapshot-${camera.id}`}
            onClick={handleSnapshot}
          >
            <CameraIcon />
          </TileAction>
          <TileAction
            label="Zoom digital"
            testId={`toolbar-zoom-${camera.id}`}
            onClick={() => setZoom((current) => (current === 1 ? 2 : 1))}
          >
            <ZoomIn />
          </TileAction>
          <TileAction
            label="Control PTZ"
            testId={`toolbar-ptz-${camera.id}`}
            onClick={() => toast.info('Control PTZ disponible en la ficha de cámara.')}
          >
            <Move />
          </TileAction>
          <TileAction
            label="Audio"
            testId={`toolbar-audio-${camera.id}`}
            onClick={() => toast.info('Canal de audio unidireccional (simulado).')}
          >
            <Volume2 />
          </TileAction>
          <TileAction
            label="Pantalla completa"
            testId={`toolbar-fullscreen-${camera.id}`}
            onClick={handleFullscreen}
          >
            <Maximize />
          </TileAction>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 px-2.5 py-2">
          <span className="truncate text-xs font-medium text-white">{camera.name}</span>
          <span className="shrink-0 text-[10px] text-white/60">{camera.resolution}</span>
        </div>
      </div>
    </div>
  );
}

function TileAction({
  label,
  onClick,
  testId,
  children,
}: {
  label: string;
  onClick: () => void;
  testId: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      data-testid={testId}
      className="flex size-6 items-center justify-center rounded text-white/70 transition-colors hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&_svg]:size-3.5"
    >
      {children}
    </button>
  );
}
