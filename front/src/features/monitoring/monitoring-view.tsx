'use client';

import { CameraFeed, type CameraFeedHandle } from '@/components/camera-feed';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CAMERAS } from '@/data/cameras';
import { SECTORS } from '@/data/sectors';
import type { Camera, SceneHour } from '@/domain/types';
import { useSimulationFeed } from '@/features/simulation/use-simulation-feed';
import { CameraDetailSheet } from '@/features/monitoring/camera-detail-sheet';
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
  Search,
  SlidersHorizontal,
  Square,
  Volume2,
  ZoomIn,
} from 'lucide-react';
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

const STATUS_FILTERS: readonly { value: StatusFilter; label: string }[] = [
  { value: 'todas', label: 'Todos los estados' },
  { value: 'alerta', label: 'Con alerta' },
  { value: 'fallando', label: 'Con falla' },
  { value: 'activa', label: 'Activas' },
];

export function MonitoringView() {
  const overrides = useCamerasStore((state) => state.overrides);
  const highlightedCameraId = useCamerasStore((state) => state.highlightedCameraId);
  const gridLayout = useUiStore((state) => state.gridLayout);
  const setGridLayout = useUiStore((state) => state.setGridLayout);
  const monitoringPage = useUiStore((state) => state.monitoringPage);
  const setMonitoringPage = useUiStore((state) => state.setMonitoringPage);
  const sectorFilter = useUiStore((state) => state.sectorFilter);
  const setSectorFilter = useUiStore((state) => state.setSectorFilter);
  const sceneHour = useUiStore((state) => state.sceneHour);
  const setSceneHour = useUiStore((state) => state.setSceneHour);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todas');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailCameraId, setDetailCameraId] = useState<string | null>(null);

  function onOpenDetail(cameraId: string): void {
    setDetailCameraId(cameraId);
  }

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

  const activeFilterCount = (sectorFilter !== 'todos' ? 1 : 0) + (statusFilter !== 'todas' ? 1 : 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Módulo 2 · Centro de videovigilancia"
        title="Monitor de cámaras"
        description="Las cámaras con alerta se listan primero y se marcan con borde, distintivo y pulso. Pasa el cursor sobre una celda para desplegar sus acciones rápidas."
      />

      <Card size="sm">
        <div className="flex flex-wrap items-center gap-2 px-(--card-spacing) py-(--card-spacing)">
          <InputGroup className="w-[220px]">
            <InputGroupAddon>
              <Search className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por ID o nombre…"
              aria-label="Buscar cámara"
            />
          </InputGroup>

          {/*
            Filtros combinables: sector y estado viven en el mismo panel para
            que el operador refine sin recorrer selects sueltos.
          */}
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5" data-testid="monitor-filters">
                <SlidersHorizontal className="size-3.5" />
                Filtros
                {activeFilterCount > 0 ? (
                  <Badge variant="negative" className="ml-0.5">
                    {activeFilterCount}
                  </Badge>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[320px] p-0">
              <Command>
                <CommandInput placeholder="Buscar sector o estado…" />
                <CommandList>
                  <CommandGroup heading="Sector">
                    <CommandItem
                      value="sector todos"
                      onSelect={() => {
                        setSectorFilter('todos');
                        setFiltersOpen(false);
                      }}
                      data-checked={sectorFilter === 'todos' ? 'true' : undefined}
                    >
                      Todos los sectores
                    </CommandItem>
                    {SECTORS.map((sector) => (
                      <CommandItem
                        key={sector.id}
                        value={`sector ${sector.id} ${sector.name}`}
                        onSelect={() => {
                          setSectorFilter(sector.id);
                          setFiltersOpen(false);
                        }}
                        data-checked={sectorFilter === sector.id ? 'true' : undefined}
                      >
                        {sector.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup heading="Estado">
                    {STATUS_FILTERS.map((filter) => (
                      <CommandItem
                        key={filter.value}
                        value={`estado ${filter.value} ${filter.label}`}
                        onSelect={() => {
                          setStatusFilter(filter.value);
                          setFiltersOpen(false);
                        }}
                        data-checked={statusFilter === filter.value ? 'true' : undefined}
                      >
                        {filter.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <NativeSelect
            value={sceneHour === null ? 'auto' : String(sceneHour)}
            onChange={(event) =>
              setSceneHour(event.target.value === 'auto' ? null : Number(event.target.value))
            }
            aria-label="Hora de la escena"
            className="w-[168px]"
          >
            <NativeSelectOption value="auto">Hora · automática</NativeSelectOption>
            <NativeSelectOption value="9">Hora · 09:00</NativeSelectOption>
            <NativeSelectOption value="14">Hora · 14:00</NativeSelectOption>
            <NativeSelectOption value="19">Hora · 19:00</NativeSelectOption>
            <NativeSelectOption value="22">Hora · 22:00</NativeSelectOption>
          </NativeSelect>

          <ToggleGroup
            type="single"
            value={String(gridLayout)}
            onValueChange={(value) => {
              if (value) setGridLayout(Number(value) as GridLayout);
            }}
            variant="outline"
            size="sm"
            spacing={0}
            aria-label="Disposición de la cuadrícula"
          >
            {LAYOUTS.map((layout) => {
              const Icon = layout.icon;
              return (
                <ToggleGroupItem
                  key={layout.value}
                  value={String(layout.value)}
                  aria-label={layout.label}
                  title={layout.label}
                  data-testid={`layout-${layout.value}`}
                >
                  <Icon className="size-3.5" />
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>

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
          {sceneHour === null
            ? 'Modo día/noche automático según el reloj de la plataforma.'
            : `Hora forzada a las ${String(sceneHour).padStart(2, '0')}:00 — el filtro IR-cut y la iluminación infrarroja responden a esa hora.`}
        </span>
      </div>

      {pageCameras.length === 0 ? (
        <Empty className="border border-border/60">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyTitle>Ninguna cámara coincide con el filtro</EmptyTitle>
            <EmptyDescription>
              Ajusta la búsqueda o los filtros de sector y estado para recuperar la lista.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
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
              sceneHour={sceneHour}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </div>
      )}

      <CameraDetailSheet
        cameraId={detailCameraId}
        open={detailCameraId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailCameraId(null);
        }}
      />
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
  sceneHour,
  onOpenDetail,
}: {
  camera: Camera;
  highlighted: boolean;
  sectorName: string;
  sceneHour: SceneHour;
  onOpenDetail: (cameraId: string) => void;
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
        <button
          type="button"
          onClick={() => onOpenDetail(camera.id)}
          aria-label={`Abrir ficha de ${camera.id}`}
          data-testid={`camera-open-${camera.id}`}
          className="block h-full w-full cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
        >
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
              sceneHour={sceneHour}
              getTimeSec={simulation.getTimeSec}
              getClockMs={simulation.getClockMs}
              healthWarning={simulation.healthWarning}
            />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25" />
        </button>

        {/*
          Distintivos sobre el vídeo: el color viene de los tokens semánticos y
          la base translúcida mantiene la lectura sobre cualquier fotograma.
        */}
        <div className="pointer-events-none absolute top-2 left-2 flex items-center gap-1.5">
          <span className="rounded bg-background/75 px-1.5 py-0.5 font-mono text-[11px] text-foreground/90 backdrop-blur-sm">
            {camera.id}
          </span>
          {hasAlert ? (
            <Badge
              variant="negative"
              className="border-critical/50 bg-background/75 text-critical backdrop-blur-sm"
            >
              <CircleAlert className="size-3" />
              ALERTA
            </Badge>
          ) : null}
          {highlighted && !hasAlert ? (
            <Badge
              variant="outline"
              className="border-warning/50 bg-background/75 text-warning backdrop-blur-sm"
            >
              NUEVO
            </Badge>
          ) : null}
        </div>

        {/*
          Barra de acciones del NVR: aparece al pasar el cursor, al enfocar con
          el teclado y siempre en punteros gruesos, donde no existe el hover.
        */}
        <div
          className="absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-lg border border-border bg-background/85 p-0.5 opacity-0 backdrop-blur-sm transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100"
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
            onClick={() =>
              toast.info('Canal de audio unidireccional disponible en la ficha de cámara.')
            }
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
          <span className="shrink-0 text-[10px] text-white/60 tabular-nums">
            {camera.resolution}
          </span>
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
      className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&_svg]:size-3.5"
    >
      {children}
    </button>
  );
}
