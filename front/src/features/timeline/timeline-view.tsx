'use client';

import { EvidenceFrame } from '@/components/camera-feed';
import { Callout } from '@/components/callout';
import { DetailList } from '@/components/detail-list';
import { PageHeader } from '@/components/page-header';
import { SegmentedControl } from '@/components/segmented-control';
import { SeverityBadge } from '@/components/status-badge';
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
import { CAMERAS } from '@/data/cameras';
import { getSector } from '@/data/sectors';
import { formatClock } from '@/domain/clock';
import { SIMULATION_ENGINE } from '@/store/simulation-store';
import {
  SIMULATION_SPEEDS,
  TIMELINE_END_MS,
  TIMELINE_START_MS,
  timelineSecOf,
  useSimulationStore,
  type SimulationSpeed,
} from '@/store/simulation-store';
import { useSimulationFeed } from '@/features/simulation/use-simulation-feed';
import gsap from 'gsap';
import {
  Camera as CameraIcon,
  CircleAlert,
  FastForward,
  Pause,
  Play,
  Radio,
  Rewind,
  SkipBack,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Línea de tiempo y reproducción de la noche (módulo de operación).
 *
 * Es la pieza que hace creíble la demostración: una misma secuencia, con
 * offsets fijos, que el operador puede rebobinar, avanzar fotograma a
 * fotograma y volver a ver. El scrubber, los eventos y el feed apuntan al
 * mismo reloj simulado.
 */
const ALL_EVENTS = SIMULATION_ENGINE.allEvents();

export function TimelineView() {
  const clockMs = useSimulationStore((state) => state.clockMs);
  const playing = useSimulationStore((state) => state.playing);
  const speed = useSimulationStore((state) => state.speed);
  const seek = useSimulationStore((state) => state.seek);
  const toggle = useSimulationStore((state) => state.toggle);
  const setSpeed = useSimulationStore((state) => state.setSpeed);

  const playheadRef = useRef<HTMLDivElement>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const nowSec = timelineSecOf(clockMs);
  const durationSec = (TIMELINE_END_MS - TIMELINE_START_MS) / 1000;
  const progress = Math.max(0, Math.min(1, nowSec / durationSec));

  const visibleEvents = useMemo(
    () => ALL_EVENTS.filter((event) => event.atSec <= nowSec + 0.001),
    [nowSec],
  );

  const selectedEvent = useMemo(
    () => ALL_EVENTS.find((event) => event.id === selectedEventId) ?? null,
    [selectedEventId],
  );

  /** Eventos por cámara en toda la noche, de más a menos activo. */
  const cameraEventTotals = useMemo(
    () =>
      Object.entries(
        ALL_EVENTS.reduce<Record<string, number>>((acc, event) => {
          if (!event.cameraId) return acc;
          acc[event.cameraId] = (acc[event.cameraId] ?? 0) + 1;
          return acc;
        }, {}),
      ).sort((a, b) => b[1] - a[1]),
    [],
  );

  const activeCameraId = selectedEvent?.cameraId ?? null;
  const simulation = useSimulationFeed(activeCameraId ?? '');
  const activeCamera = CAMERAS.find((camera) => camera.id === activeCameraId);

  /* El cabezal de reproducción se desliza con GSAP: el salto entre eventos
   * se lee como un movimiento, no como un corte. */
  useEffect(() => {
    const playhead = playheadRef.current;
    if (!playhead) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.to(playhead, {
      left: `${progress * 100}%`,
      duration: reduced ? 0 : 0.22,
      ease: 'power2.out',
      overwrite: true,
    });
  }, [progress]);

  function stepTo(seconds: number): void {
    seek(TIMELINE_START_MS + seconds * 1000);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Operación · Reproducción"
        title="Línea de tiempo de la noche"
        description="La secuencia completa del turno: qué cámara vio qué, qué regla se disparó y qué incidente se abrió. El mismo reloj gobierna el feed, el mapa y el listado de incidentes."
        actions={
          <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
            <Radio className="size-3" />
            {visibleEvents.length} eventos hasta {formatClock(new Date(clockMs).toISOString())}
          </Badge>
        }
      />

      <Card size="sm">
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => stepTo(0)}
              aria-label="Ir al inicio"
              data-testid="timeline-rewind"
            >
              <SkipBack />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => stepTo(Math.max(0, nowSec - 30))}
              aria-label="Retroceder 30 segundos"
              data-testid="timeline-back"
            >
              <Rewind />
            </Button>
            <Button
              variant="default"
              size="icon-sm"
              onClick={toggle}
              aria-label={playing ? 'Pausar' : 'Reproducir'}
              data-testid="timeline-play"
            >
              {playing ? <Pause /> : <Play />}
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => stepTo(Math.min(durationSec, nowSec + 30))}
              aria-label="Avanzar 30 segundos"
              data-testid="timeline-forward"
            >
              <FastForward />
            </Button>

            <SegmentedControl
              size="sm"
              ariaLabel="Velocidad de reproducción"
              value={String(speed)}
              onValueChange={(value) => setSpeed(Number(value) as SimulationSpeed)}
              options={SIMULATION_SPEEDS.map((option) => ({
                value: String(option),
                label: `${option}×`,
              }))}
            />

            <span className="ml-auto font-mono text-sm tabular-nums" data-testid="timeline-clock">
              {formatClock(new Date(clockMs).toISOString())}
            </span>
          </div>

          {/* Scrubber con los eventos marcados. */}
          <div className="relative mt-5 h-16 select-none">
            <div className="absolute inset-x-0 top-3 h-1.5 rounded-full bg-muted" />
            <div
              className="absolute top-3 left-0 h-1.5 rounded-full bg-primary transition-[width] duration-150 ease-(--ease-out)"
              style={{ width: `${progress * 100}%` }}
            />

            {ALL_EVENTS.map((event) => {
              const left = `${(event.atSec / durationSec) * 100}%`;
              const passed = event.atSec <= nowSec + 0.001;
              const tone =
                event.kind === 'incidente' || event.kind === 'falla'
                  ? 'bg-critical'
                  : event.kind === 'regla'
                    ? 'bg-warning'
                    : event.kind === 'resolucion'
                      ? 'bg-normal'
                      : 'bg-info';
              return (
                <button
                  key={event.id}
                  type="button"
                  title={`${formatClock(new Date(TIMELINE_START_MS + event.atSec * 1000).toISOString())} · ${event.title}`}
                  onClick={() => {
                    setSelectedEventId(event.id);
                    stepTo(event.atSec);
                  }}
                  data-testid={`timeline-event-${event.id}`}
                  className={`absolute top-1.5 size-4 -translate-x-1/2 rounded-full border-2 border-background transition-transform hover:scale-125 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${tone} ${passed ? 'opacity-100' : 'opacity-35'}`}
                  style={{ left }}
                />
              );
            })}

            <div
              ref={playheadRef}
              className="pointer-events-none absolute top-0 bottom-0 w-0.5 -translate-x-1/2 bg-foreground/70"
              style={{ left: `${progress * 100}%` }}
              data-testid="timeline-playhead"
            />
          </div>

          <input
            type="range"
            min={0}
            max={durationSec}
            step={0.5}
            value={nowSec}
            onChange={(event) => stepTo(Number(event.target.value))}
            aria-label="Posición en la línea de tiempo"
            data-testid="timeline-scrubber"
            className="w-full accent-primary [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-foreground [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-muted [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow-sm"
          />

          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground tabular-nums">
            <span>22:00:00</span>
            <span>22:10:00</span>
            <span>22:20:00</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="size-4 text-warning" />
              Eventos de la secuencia
            </CardTitle>
            <CardDescription>
              Detecciones, reglas disparadas, incidentes, notificaciones y acciones de operador, en
              orden cronológico.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {visibleEvents.length === 0 ? (
              <Empty className="border border-border/60">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Zap />
                  </EmptyMedia>
                  <EmptyTitle>Todavía no hay eventos</EmptyTitle>
                  <EmptyDescription>
                    No hay eventos en este punto de la línea de tiempo. Avanza la reproducción para
                    que el motor de reglas evalúe la secuencia.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="flex max-h-[520px] flex-col gap-1.5 overflow-y-auto pr-1">
                {visibleEvents.map((event) => (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEventId(event.id);
                        stepTo(event.atSec);
                      }}
                      data-testid={`timeline-row-${event.id}`}
                      className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left transition-colors hover:border-info/50 hover:bg-info/5 ${
                        selectedEventId === event.id ? 'border-info/60 bg-info/5' : 'border-border'
                      }`}
                    >
                      <span className="mt-0.5 w-[70px] shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                        {formatClock(
                          new Date(TIMELINE_START_MS + event.atSec * 1000).toISOString(),
                        ).slice(11)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{event.title}</span>
                          {event.severity ? <SeverityBadge severity={event.severity} /> : null}
                          {event.cameraId ? (
                            <Badge
                              variant="outline"
                              className="border-border bg-muted font-mono text-muted-foreground"
                            >
                              {event.cameraId}
                            </Badge>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {event.detail}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CameraIcon className="size-4 text-info" />
                Cámara del evento
              </CardTitle>
              <CardDescription>
                El feed se reconstruye en el instante exacto del evento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeCamera ? (
                <div className="flex flex-col gap-3">
                  <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
                    <SimulationFrame cameraId={activeCamera.id} targets={simulation.targets} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {activeCamera.id}
                    </span>
                    <span className="text-sm font-medium">{activeCamera.name}</span>
                    <Badge
                      variant="outline"
                      className="border-border bg-muted text-muted-foreground"
                    >
                      {getSector(activeCamera.sectorId)?.name ?? activeCamera.sectorId}
                    </Badge>
                  </div>
                  {selectedEvent ? (
                    <p className="text-xs text-muted-foreground">{selectedEvent.detail}</p>
                  ) : null}
                  <Button asChild size="sm" variant="outline" className="w-fit">
                    <Link href={`/monitoreo/${activeCamera.id}`}>Abrir ficha de cámara</Link>
                  </Button>
                </div>
              ) : (
                <Empty className="border border-border/60">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <CircleAlert />
                    </EmptyMedia>
                    <EmptyTitle>Selecciona un evento</EmptyTitle>
                    <EmptyDescription>
                      Selecciona un evento de la lista para ver la cámara y el fotograma en ese
                      instante.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Reparto de la noche</CardTitle>
              <CardDescription>
                Cada cámara aparece con el número de eventos que letocó.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DetailList
                items={cameraEventTotals.map(([cameraId, total]) => ({
                  label: cameraId,
                  value: (
                    <span className="font-mono text-sm text-foreground tabular-nums">{total}</span>
                  ),
                }))}
              />
              <Callout tone="info" className="mt-4">
                {cameraEventTotals[0]
                  ? `${cameraEventTotals[0][0]} concentra ${cameraEventTotals[0][1]} de los ${ALL_EVENTS.length} eventos de la noche: es el punto de partida para revisar la cobertura.`
                  : 'La secuencia todavía no tiene eventos asociados a ninguna cámara.'}
              </Callout>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Fotograma congelado del evento.
 *
 * Reutiliza el renderizador del feed con el instante exacto: es la misma
 * imagen que el operador habría visto en directo.
 */
function SimulationFrame({
  cameraId,
  targets,
}: {
  cameraId: string;
  targets: ReturnType<typeof useSimulationFeed>['targets'];
}) {
  const camera = CAMERAS.find((item) => item.id === cameraId);
  const clockMs = useSimulationStore((state) => state.clockMs);

  if (!camera) return null;

  return (
    <EvidenceFrame
      camera={camera}
      targets={targets}
      occurredAt={new Date(clockMs).toISOString()}
      timeSec={timelineSecOf(clockMs)}
    />
  );
}
