'use client';

import { FACILITY_PERIMETER } from '@/data/geospatial/camera-geography';
import { CLASSIFICATION_COLOR } from '@/domain/classification';
import { geoDistanceMeters } from '@/domain/geography';
import { CLASSIFICATION_HINT, CLASSIFICATION_LABEL, PRIORITY_LABEL } from '@/domain/labels';
import type { Camera, GeospatialZone } from '@/domain/types';
import { ChevronDown, GripVertical, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

/**
 * Panel de cristal sobre la vista geoespacial.
 *
 * Es el equivalente del panel «Información general» del proyecto heredado, con
 * la misma Conducta —flotante, arrastrable y minimizable— pero con la
 * piel de AGUNSA: cristal azul marino, desenfoque de fondo y filete de luz.
 *
 * Dos reglas de fondo:
 *  - **legibilidad**: el relleno es marino translúcido con desenfoque, de modo
 *    que se lee sobre la imagen satelital sin taparla;
 *  - **no bloquea los controles**: vive en la esquina inferior izquierda,
 *    se puede mover a cualquier punto del visor y se minimiza a una barra.
 */

export interface GlassPanelProps {
  /** Cámara seleccionada en cualquier vista. */
  camera: Camera | null;
  cameras: readonly Camera[];
  /** Zonas georreferenciadas visibles en la vista. */
  zones: readonly GeospatialZone[];
  /** Selección de cámara desde el panel. */
  onSelect: (cameraId: string) => void;
  /** Restablece el encuadre de la vista geoespacial. */
  onResetView: () => void;
}

/** Margen mínimo respecto al borde del visor. */
const EDGE_MARGIN = 12;

export function GlassPanel({ camera, cameras, zones, onSelect, onResetView }: GlassPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    panelRect: DOMRect;
    stageRect: DOMRect;
  } | null>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [openSection, setOpenSection] = useState<GlassSectionId | null>('resumen');
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const startDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      if ((event.target as HTMLElement).closest('button, a')) return;
      const panel = panelRef.current;
      const stage = panel?.parentElement;
      if (!panel || !stage) return;

      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: offset.x,
        originY: offset.y,
        panelRect: panel.getBoundingClientRect(),
        stageRect: stage.getBoundingClientRect(),
      };
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [offset],
  );

  const moveDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    const boundedX = Math.min(
      drag.stageRect.right - EDGE_MARGIN - drag.panelRect.right,
      Math.max(drag.stageRect.left + EDGE_MARGIN - drag.panelRect.left, deltaX),
    );
    const boundedY = Math.min(
      drag.stageRect.bottom - EDGE_MARGIN - drag.panelRect.bottom,
      Math.max(drag.stageRect.top + EDGE_MARGIN - drag.panelRect.top, deltaY),
    );

    setOffset({ x: drag.originX + boundedX, y: drag.originY + boundedY });
  }, []);

  const finishDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  const perimeterMeters = FACILITY_PERIMETER.reduce((sum, point, index) => {
    const next = FACILITY_PERIMETER[(index + 1) % FACILITY_PERIMETER.length];
    return next ? sum + geoDistanceMeters(point, next) : sum;
  }, 0);

  const counts = cameras.reduce(
    (acc, item) => {
      acc[item.assessment.classification] += 1;
      return acc;
    },
    { buena_general: 0, limitada: 0, deficiente: 0, sin_imagen: 0 } as Record<
      Camera['assessment']['classification'],
      number
    >,
  );

  return (
    <div
      ref={panelRef}
      className="absolute bottom-4 left-4 z-30 w-[min(366px,calc(100%-2rem))]"
      style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }}
      data-testid="geospatial-glass-panel"
    >
      <section
        className={`glass-panel ${dragging ? 'is-dragging' : ''}`}
        aria-label="Información general del recinto"
      >
        <header
          className="glass-panel__head"
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        >
          <GripVertical className="glass-panel__grip" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="glass-panel__title">Información general</p>
            <p className="glass-panel__subtitle">
              AGUNSA Callao · {cameras.length} cámaras evaluadas
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="glass-panel__action"
              onClick={onResetView}
              aria-label="Restablecer la vista geoespacial"
              title="Restablecer la vista"
            >
              <RotateCcw className="size-3.5" />
            </button>
            <button
              type="button"
              className="glass-panel__action"
              onClick={() => setCollapsed((value) => !value)}
              aria-expanded={!collapsed}
              aria-label={
                collapsed ? 'Expandir información general' : 'Minimizar información general'
              }
              title={collapsed ? 'Expandir' : 'Minimizar'}
              data-testid="glass-panel-toggle"
            >
              {collapsed ? <Maximize2 className="size-3.5" /> : <Minimize2 className="size-3.5" />}
            </button>
          </div>
        </header>

        <div className="glass-panel__body" data-collapsed={collapsed ? 'true' : 'false'}>
          {camera ? (
            <GlassSection
              id="camara"
              title="Cámara seleccionada"
              open={openSection === 'camara'}
              onToggle={() => setOpenSection(openSection === 'camara' ? null : 'camara')}
            >
              <CameraSheet camera={camera} zones={zones} />
            </GlassSection>
          ) : (
            <GlassSection
              id="resumen"
              title="Resumen del recinto"
              open={openSection === 'resumen'}
              onToggle={() => setOpenSection(openSection === 'resumen' ? null : 'resumen')}
            >
              <PerimeterSheet counts={counts} perimeterMeters={perimeterMeters} zones={zones} />
            </GlassSection>
          )}

          <GlassSection
            id="camaras"
            title="Cámaras del recinto"
            open={openSection === 'camaras'}
            onToggle={() => setOpenSection(openSection === 'camaras' ? null : 'camaras')}
          >
            <CameraRoster cameras={cameras} selectedId={camera?.id ?? null} onSelect={onSelect} />
          </GlassSection>
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------- *
 * Contenido: cámara seleccionada
 * -------------------------------------------------------------------- */

function CameraSheet({ camera, zones }: { camera: Camera; zones: readonly GeospatialZone[] }) {
  const related = zones.filter((zone) => zone.cameraId === camera.id);
  const color = CLASSIFICATION_COLOR[camera.assessment.classification];

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold text-[var(--glass-text)]">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
          {camera.id} · {camera.name}
        </p>
        <p className="mt-1 text-[11px] text-[var(--glass-muted)]">
          {camera.ip} · {camera.spec.model}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: `${color}26`, color: '#eef6f7' }}
        >
          {CLASSIFICATION_LABEL[camera.assessment.classification]}
        </span>
        <span className="rounded-full bg-white/12 px-2 py-0.5 text-[10px] font-semibold text-[var(--glass-text)]">
          {PRIORITY_LABEL[camera.assessment.priority]}
        </span>
        <span className="rounded-full bg-white/12 px-2 py-0.5 text-[10px] font-semibold text-[var(--glass-text)]">
          {camera.resolution}
        </span>
      </div>

      <p className="text-[11px] leading-snug text-[var(--glass-muted)]">
        {CLASSIFICATION_HINT[camera.assessment.classification]}
      </p>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
        <GlassSpec label="Campo de visión" value={`${camera.spec.horizontalFovDeg}°`} />
        <GlassSpec label="Lente" value={`${camera.spec.focalLengthMm.toFixed(1)} mm`} />
        <GlassSpec label="Alcance IR" value={`${camera.spec.irDistanceM} m`} />
        <GlassSpec label="WDR" value={`${camera.spec.wdrDb} dB`} />
        <GlassSpec label="Alimentación" value={camera.spec.poeClass} />
        <GlassSpec label="ONVIF" value={camera.spec.onvifProfiles.join(' / ')} />
        <GlassSpec label="Inspección diurna" value={camera.assessment.dayResult} />
        <GlassSpec label="Inspección nocturna" value={camera.assessment.nightResult} />
      </dl>

      <div className="border-t border-white/12 pt-2.5">
        <p className="text-[10px] font-semibold tracking-[0.1em] text-[var(--glass-muted)] uppercase">
          Hallazgo diurno
        </p>
        <p className="mt-1 text-[11px] leading-snug text-[var(--glass-text)]">
          {camera.assessment.dayFinding}
        </p>
        <p className="mt-2 text-[10px] font-semibold tracking-[0.1em] text-[var(--glass-muted)] uppercase">
          Hallazgo nocturno
        </p>
        <p className="mt-1 text-[11px] leading-snug text-[var(--glass-text)]">
          {camera.assessment.nightFinding}
        </p>
        <p className="mt-2 text-[10px] font-semibold tracking-[0.1em] text-[var(--glass-muted)] uppercase">
          Acción recomendada
        </p>
        <p className="mt-1 text-[11px] leading-snug text-[var(--glass-text)]">
          {camera.assessment.recommendedAction}
        </p>
      </div>

      <div className="border-t border-white/12 pt-2.5">
        <p className="text-[10px] font-semibold tracking-[0.1em] text-[var(--glass-muted)] uppercase">
          Encuadre en el terreno
        </p>
        <p className="mt-1 text-[11px] leading-snug text-[var(--glass-text)]">
          {camera.geo.latitude.toFixed(5)}°, {camera.geo.longitude.toFixed(5)}° ·{' '}
          {camera.geo.height.toFixed(1)} m s. n. m. · azimut {camera.geo.heading.toFixed(0)}°
        </p>
        <p className="mt-1 text-[10px] leading-snug text-[var(--glass-muted)]/80">
          {camera.geo.source}. Posición provisional: el informe no vincula cada IP con un poste
          verificado.
        </p>
      </div>

      {related.length > 0 ? (
        <p className="border-t border-white/12 pt-2.5 text-[11px] text-[var(--glass-muted)]">
          {related.length} zona(s) georreferenciada(s) cubren este equipo.
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------- *
 * Lista de cámaras del recinto
 * -------------------------------------------------------------------- */

function CameraRoster({
  cameras,
  selectedId,
  onSelect,
}: {
  cameras: readonly Camera[];
  selectedId: string | null;
  onSelect: (cameraId: string) => void;
}) {
  return (
    <div className="border-t border-white/12 pt-2.5">
      <p className="text-[10px] font-semibold tracking-[0.1em] text-[var(--glass-muted)] uppercase">
        Cámaras del recinto
      </p>
      <ul className="mt-1.5 max-h-[136px] overflow-y-auto pr-1">
        {cameras.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              aria-pressed={item.id === selectedId}
              onClick={() => onSelect(item.id)}
              className={`flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-[11px] transition-colors ${
                item.id === selectedId
                  ? 'bg-white/14 text-[var(--glass-text)]'
                  : 'text-[var(--glass-muted)] hover:bg-white/8 hover:text-[var(--glass-text)]'
              }`}
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: CLASSIFICATION_COLOR[item.assessment.classification] }}
                aria-hidden="true"
              />
              <span className="font-semibold">{item.id}</span>
              <span className="truncate">{item.name}</span>
              <span className="ml-auto shrink-0 tabular-nums">{item.ip}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------- *
 * Contenido: información general del recinto
 * -------------------------------------------------------------------- */

function PerimeterSheet({
  counts,
  perimeterMeters,
  zones,
}: {
  counts: Record<Camera['assessment']['classification'], number>;
  perimeterMeters: number;
  zones: readonly GeospatialZone[];
}) {
  const detection = zones.filter((zone) => zone.kind === 'deteccion');

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-1.5">
        <GlassKpi label="Buena general" value={counts.buena_general} color="#2f8f5b" />
        <GlassKpi label="Limitada" value={counts.limitada} color="#d59616" />
        <GlassKpi label="Deficiente" value={counts.deficiente} color="#c8202a" />
        <GlassKpi label="Sin imagen" value={counts.sin_imagen} color="#6e7880" />
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
        <GlassSpec label="Perímetro OSM" value={`${Math.round(perimeterMeters)} m`} />
        <GlassSpec label="Vértices del recinto" value={`${FACILITY_PERIMETER.length}`} />
        <GlassSpec label="Zonas en el terreno" value={`${zones.length}`} />
        <GlassSpec label="Zonas de detección" value={`${detection.length}`} />
      </dl>

      <p className="border-t border-white/12 pt-2.5 text-[11px] leading-snug text-[var(--glass-muted)]">
        Imagen satelital y relieve de ArcGIS World Imagery / World Elevation, con geometría abierta
        de OpenStreetMap. Sin clave personal: la base necesita conexión, no credenciales.
      </p>

      <p className="text-[11px] leading-snug text-[var(--glass-muted)]">
        Selecciona una cámara en el terreno para abrir su ficha completa con IP, modelo,
        clasificación, hallazgos y especificaciones técnicas.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------- *
 * Piezas del panel
 * -------------------------------------------------------------------- */

/** Secciones plegables del panel de cristal. */
type GlassSectionId = 'resumen' | 'camara' | 'camaras';

function GlassSection({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: GlassSectionId;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section
      data-testid={`glass-section-${id}`}
      className="border-b border-white/10 last:border-b-0"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 py-2 text-left text-[10px] font-semibold tracking-[0.12em] text-[var(--glass-muted)] uppercase transition-colors hover:text-[var(--glass-text)]"
      >
        <span>{title}</span>
        <ChevronDown
          className={`size-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open ? <div className="pb-2.5">{children}</div> : null}
    </section>
  );
}

function GlassSpec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] tracking-[0.06em] text-[var(--glass-muted)] uppercase">{label}</dt>
      <dd className="mt-0.5 truncate font-medium text-[var(--glass-text)]">{value}</dd>
    </div>
  );
}

function GlassKpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-white/12 bg-white/6 px-2.5 py-2">
      <p className="flex items-center gap-1.5 text-[10px] tracking-[0.04em] text-[var(--glass-muted)] uppercase">
        <span
          className="size-2 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        {label}
      </p>
      <p className="mt-0.5 text-lg leading-none font-semibold text-[var(--glass-text)] tabular-nums">
        {value}
      </p>
    </div>
  );
}
