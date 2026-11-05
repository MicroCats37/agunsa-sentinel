'use client';

import { CameraFeed } from '@/components/camera-feed';
import { PageHeader } from '@/components/page-header';
import { CameraStatusBadge, SeverityBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CAMERAS } from '@/data/cameras';
import { getSector } from '@/data/sectors';
import { formatDateTime, PLATFORM_NOW_ISO } from '@/domain/clock';
import { RULE_EVENT_LABEL, ZONE_KIND_LABEL } from '@/domain/labels';
import type { Camera, IlluminationPreference } from '@/domain/types';
import { useSimulationFeed } from '@/features/simulation/use-simulation-feed';
import { useCamerasStore } from '@/store/cameras-store';
import { useIncidentsStore } from '@/store/incidents-store';
import { useRulesStore } from '@/store/rules-store';
import { useUiStore } from '@/store/ui-store';
import { useZonesStore } from '@/store/zones-store';
import { ArrowLeft, Boxes, ChevronRight, Eye, Film, LineChart, Radar } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CameraSpecPanel } from './camera-spec-panel';

/**
 * Ficha de cámara (módulo 2 del pliego).
 *
 * Organiza el equipo en cinco pestañas: directo, grabaciones, eventos, zonas
 * inteligentes y especificaciones. El directo incluye el feed con
 * superposiciones, zonas y líneas virtuales configuradas para la cámara.
 */
const ILLUMINATION_OPTIONS: readonly { value: IlluminationPreference; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'dia', label: 'Día' },
  { value: 'noche', label: 'Noche (IR)' },
];

export function CameraDetailView({ cameraId }: { cameraId: string }) {
  const overrides = useCamerasStore((state) => state.overrides);
  const incidents = useIncidentsStore((state) => state.incidents);
  const zones = useZonesStore((state) => state.zones);
  const lines = useZonesStore((state) => state.virtualLines);
  const rules = useRulesStore((state) => state.rules);
  const toggleZone = useZonesStore((state) => state.toggleZone);
  const illumination = useUiStore((state) => state.illumination);
  const setIllumination = useUiStore((state) => state.setIllumination);
  const collapsedPanels = useUiStore((state) => state.collapsedPanels);
  const togglePanel = useUiStore((state) => state.togglePanel);

  const [showDetections, setShowDetections] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showLines, setShowLines] = useState(true);
  const simulation = useSimulationFeed(cameraId);

  const camera = useMemo<Camera | undefined>(() => {
    const base = CAMERAS.find((item) => item.id === cameraId);
    if (!base) return undefined;
    const override = overrides[cameraId];
    return override ? { ...base, ...override } : base;
  }, [cameraId, overrides]);

  const cameraZones = useMemo(
    () => zones.filter((zone) => zone.cameraId === cameraId),
    [cameraId, zones],
  );
  const cameraLines = useMemo(
    () => lines.filter((line) => line.cameraId === cameraId),
    [cameraId, lines],
  );
  const cameraIncidents = useMemo(
    () =>
      incidents
        .filter((incident) => incident.cameraId === cameraId)
        .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)),
    [cameraId, incidents],
  );
  const cameraRules = useMemo(() => {
    const zoneIds = new Set(cameraZones.map((zone) => zone.id));
    return rules.filter((rule) =>
      rule.scopeKind === 'camara' ? rule.scopeId === cameraId : zoneIds.has(rule.scopeId),
    );
  }, [cameraId, cameraZones, rules]);

  if (!camera) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Cámara no encontrada"
          description={`El identificador ${cameraId} no existe en el registro simulado.`}
        />
        <Button asChild variant="outline" className="w-fit">
          <Link href="/monitoreo">
            <ArrowLeft />
            Volver al centro de monitoreo
          </Link>
        </Button>
      </div>
    );
  }

  const sector = getSector(camera.sectorId);
  const panelCollapsed = collapsedPanels['camera-detail'] ?? false;
  const recordings = buildRecordings(camera);

  return (
    <div className="flex flex-col gap-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/monitoreo">
          <ArrowLeft />
          Centro de monitoreo
        </Link>
      </Button>

      <PageHeader
        eyebrow={`Módulo 2 · Ficha de cámara ${camera.id}`}
        title={camera.name}
        description={`${sector?.name ?? camera.sectorId} · ${camera.spec.resolutionWidth}×${camera.spec.resolutionHeight} · lente ${camera.spec.focalLengthMm.toFixed(1)} mm (${camera.spec.horizontalFovDeg}°) · IP ${camera.ip}`}
        actions={
          <>
            <CameraStatusBadge status={camera.status} />
            {camera.alertSeverity ? <SeverityBadge severity={camera.alertSeverity} /> : null}
            <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
              {camera.spec.model}
            </Badge>
          </>
        }
      />

      <Tabs defaultValue="vivo" className="flex flex-col gap-4">
        <TabsList>
          <TabsTrigger value="vivo" data-testid="camera-tab-vivo">
            En vivo
          </TabsTrigger>
          <TabsTrigger value="grabaciones" data-testid="camera-tab-grabaciones">
            Grabaciones
          </TabsTrigger>
          <TabsTrigger value="eventos" data-testid="camera-tab-eventos">
            Eventos
          </TabsTrigger>
          <TabsTrigger value="zonas" data-testid="camera-tab-zonas">
            Zonas
          </TabsTrigger>
          <TabsTrigger value="especificaciones" data-testid="camera-tab-especificaciones">
            Especificaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vivo" className="flex flex-col gap-4">
          <div className="flex items-center justify-end">
            <Button
              variant="outline"
              size="xs"
              onClick={() => togglePanel('camera-detail')}
              data-testid="toggle-detail-panel"
            >
              <ChevronRight className={panelCollapsed ? '' : 'rotate-180'} />
              {panelCollapsed ? 'Mostrar panel lateral' : 'Ocultar panel lateral'}
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
              <Card size="sm">
                <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
                  <CameraFeed
                    camera={camera}
                    sectorName={sector?.name ?? camera.sectorId}
                    targets={simulation.targets}
                    showDetections={showDetections}
                    zones={showZones ? cameraZones : []}
                    lines={showLines ? cameraLines : []}
                    illumination={illumination}
                    getTimeSec={simulation.getTimeSec}
                    getClockMs={simulation.getClockMs}
                    healthWarning={simulation.healthWarning}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-4 px-(--card-spacing) py-3">
                  <Toggle
                    label="Cuadros de detección"
                    checked={showDetections}
                    onChange={setShowDetections}
                    testId="toggle-detections"
                  />
                  <Toggle
                    label="Zonas inteligentes"
                    checked={showZones}
                    onChange={setShowZones}
                    testId="toggle-zones"
                  />
                  <Toggle
                    label="Líneas virtuales"
                    checked={showLines}
                    onChange={setShowLines}
                    testId="toggle-lines"
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Iluminación</span>
                    <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
                      {ILLUMINATION_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setIllumination(option.value)}
                          aria-pressed={illumination === option.value}
                          data-testid={`illumination-${option.value}`}
                          className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                            illumination === option.value
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <span className="ml-auto text-xs text-muted-foreground">
                    Detección y superposiciones simuladas en el navegador.
                  </span>
                </div>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Historial de eventos</CardTitle>
                  <CardDescription>
                    {cameraIncidents.length} eventos registrados para esta cámara.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {cameraIncidents.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Esta cámara no registra eventos en el histórico simulado.
                    </p>
                  ) : (
                    <ul className="flex flex-col divide-y divide-border">
                      {cameraIncidents.slice(0, 10).map((incident) => (
                        <li key={incident.id} className="flex items-center gap-3 py-2.5">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">{incident.type}</span>
                            <span className="block text-[11px] text-muted-foreground">
                              {incident.id} · {formatDateTime(incident.occurredAt)}
                            </span>
                          </span>
                          <SeverityBadge severity={incident.severity} />
                          <Button asChild size="xs" variant="ghost" className="text-info">
                            <Link href={`/incidentes/${incident.id}`}>Abrir</Link>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-4">
              {panelCollapsed ? null : (
                <>
                  <Card size="sm">
                    <CardHeader>
                      <CardTitle>Zonas y líneas virtuales</CardTitle>
                      <CardDescription>
                        Configuración activa para esta cámara ({cameraZones.length} zonas ·{' '}
                        {cameraLines.length} líneas).
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="zonas">
                        <TabsList>
                          <TabsTrigger value="zonas">Zonas</TabsTrigger>
                          <TabsTrigger value="lineas">Líneas</TabsTrigger>
                          <TabsTrigger value="reglas">Reglas</TabsTrigger>
                        </TabsList>

                        <TabsContent value="zonas" className="mt-3 flex flex-col gap-2">
                          {cameraZones.length === 0 ? (
                            <p className="py-4 text-center text-sm text-muted-foreground">
                              Sin zonas configuradas.
                            </p>
                          ) : (
                            cameraZones.map((zone) => (
                              <div
                                key={zone.id}
                                className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">{zone.name}</p>
                                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    {ZONE_KIND_LABEL[zone.kind]}
                                    {zone.maxDwellSeconds !== null
                                      ? ` · máx. ${zone.maxDwellSeconds} s`
                                      : ''}
                                  </p>
                                </div>
                                <Switch
                                  checked={zone.enabled}
                                  onCheckedChange={(checked) => toggleZone(zone.id, checked)}
                                  aria-label={`Activar ${zone.name}`}
                                />
                              </div>
                            ))
                          )}
                        </TabsContent>

                        <TabsContent value="lineas" className="mt-3 flex flex-col gap-2">
                          {cameraLines.length === 0 ? (
                            <p className="py-4 text-center text-sm text-muted-foreground">
                              Sin líneas virtuales configuradas.
                            </p>
                          ) : (
                            cameraLines.map((line) => (
                              <div
                                key={line.id}
                                className="flex items-start gap-3 rounded-lg border border-border px-3 py-2"
                              >
                                <LineChart className="mt-0.5 size-3.5 shrink-0 text-warning" />
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">{line.name}</p>
                                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    Sentido: {line.direction}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </TabsContent>

                        <TabsContent value="reglas" className="mt-3 flex flex-col gap-2">
                          {cameraRules.length === 0 ? (
                            <p className="py-4 text-center text-sm text-muted-foreground">
                              Sin reglas aplicables a esta cámara.
                            </p>
                          ) : (
                            cameraRules.map((rule) => (
                              <div
                                key={rule.id}
                                className="rounded-lg border border-border px-3 py-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="truncate text-sm font-medium">{rule.name}</p>
                                  <SeverityBadge severity={rule.severity} />
                                </div>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  {RULE_EVENT_LABEL[rule.event]} · {rule.schedule.start}–
                                  {rule.schedule.end}
                                  {rule.minDwellSeconds > 0 ? ` · ${rule.minDwellSeconds} s` : ''}
                                </p>
                              </div>
                            ))
                          )}
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>

                  <Card size="sm">
                    <CardHeader>
                      <CardTitle>Registro de la cámara</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                        <Spec label="Identificador" value={camera.id} />
                        <Spec label="Sector" value={sector?.name ?? '—'} />
                        <Spec label="Tipo de escena" value={camera.scene} />
                        <Spec label="Campo de visión" value={`${camera.spec.horizontalFovDeg}°`} />
                        <Spec label="Orientación" value={`${camera.heading}°`} />
                        <Spec label="Resolución" value={camera.resolution} />
                        <Spec label="Dirección IP" value={camera.ip} />
                        <Spec label="Zona principal" value={camera.zoneId} />
                      </dl>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className="border-border bg-muted text-muted-foreground"
                        >
                          <Eye className="size-3" />
                          Motor de IA local
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border-border bg-muted text-muted-foreground"
                        >
                          <Radar className="size-3" />
                          {camera.hasAlert ? 'Detección activa' : 'Sin detecciones'}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border-border bg-muted text-muted-foreground"
                        >
                          <Boxes className="size-3" />
                          {cameraZones.length} zonas
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="grabaciones" className="flex flex-col gap-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Grabaciones disponibles</CardTitle>
              <CardDescription>
                Fragmentos almacenados en el NVR para {camera.id}. Contenido simulado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {recordings.map((recording) => (
                  <li
                    key={recording.id}
                    className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
                  >
                    <Film className="size-4 shrink-0 text-info" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{recording.title}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {recording.window} · {recording.duration} · {recording.size}
                      </span>
                    </span>
                    <Badge
                      variant="outline"
                      className="border-border bg-muted text-muted-foreground"
                    >
                      {recording.kind}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eventos" className="flex flex-col gap-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Eventos de la cámara</CardTitle>
              <CardDescription>
                {cameraIncidents.length} detecciones registradas en el histórico.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cameraIncidents.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Sin eventos registrados para esta cámara.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {cameraIncidents.map((incident) => (
                    <li key={incident.id} className="flex items-center gap-3 py-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{incident.type}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {incident.id} · {formatDateTime(incident.occurredAt)} ·{' '}
                          {incident.confidence !== null
                            ? `confianza ${Math.round(incident.confidence * 100)} %`
                            : 'sin confianza'}
                        </span>
                      </span>
                      <SeverityBadge severity={incident.severity} />
                      <Button asChild size="xs" variant="ghost" className="text-info">
                        <Link href={`/incidentes/${incident.id}`}>Abrir</Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zonas" className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card size="sm">
              <CardHeader>
                <CardTitle>Zonas inteligentes</CardTitle>
                <CardDescription>{cameraZones.length} zonas vinculadas.</CardDescription>
              </CardHeader>
              <CardContent>
                {cameraZones.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Sin zonas configuradas para esta cámara.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {cameraZones.map((zone) => (
                      <li
                        key={zone.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{zone.name}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {ZONE_KIND_LABEL[zone.kind]} · severidad {zone.severity}
                            {zone.maxDwellSeconds !== null
                              ? ` · permanencia máx. ${zone.maxDwellSeconds} s`
                              : ''}
                          </p>
                        </div>
                        <Switch
                          checked={zone.enabled}
                          onCheckedChange={(checked) => toggleZone(zone.id, checked)}
                          aria-label={`Activar ${zone.name}`}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle>Líneas virtuales y reglas</CardTitle>
                <CardDescription>
                  {cameraLines.length} líneas · {cameraRules.length} reglas aplicables.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {cameraLines.map((line) => (
                    <li
                      key={line.id}
                      className="flex items-start gap-3 rounded-lg border border-border px-3 py-2"
                    >
                      <LineChart className="mt-0.5 size-3.5 shrink-0 text-warning" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{line.name}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Sentido: {line.direction} · {line.enabled ? 'activa' : 'inactiva'}
                        </p>
                      </div>
                    </li>
                  ))}
                  {cameraRules.map((rule) => (
                    <li key={rule.id} className="rounded-lg border border-border px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{rule.name}</p>
                        <SeverityBadge severity={rule.severity} />
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {RULE_EVENT_LABEL[rule.event]} · {rule.schedule.start}–{rule.schedule.end}
                      </p>
                    </li>
                  ))}
                  {cameraLines.length === 0 && cameraRules.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                      Sin líneas virtuales ni reglas configuradas.
                    </li>
                  ) : null}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="especificaciones" className="flex flex-col gap-4">
          <CameraSpecPanel camera={camera} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Grabaciones simuladas: fracciones horarias coherentes con el turno. */
function buildRecordings(camera: Camera): {
  id: string;
  title: string;
  window: string;
  duration: string;
  size: string;
  kind: string;
}[] {
  const base = Date.parse(PLATFORM_NOW_ISO);
  const offsets = [0.4, 1.6, 3.2, 6.5, 11.2];
  return offsets.map((offset, index) => {
    const at = new Date(base - offset * 3_600_000);
    return {
      id: `${camera.id}-rec-${index + 1}`,
      title: `Fragmento ${String(index + 1).padStart(2, '0')} · ${
        index % 2 === 0 ? 'detección' : 'continuo'
      }`,
      window: `${String(at.getUTCHours()).padStart(2, '0')}:${String(at.getUTCMinutes()).padStart(
        2,
        '0',
      )} UTC`,
      duration: `${index % 2 === 0 ? 120 : 180} s`,
      size: `${(18 + index * 7).toFixed(0)} MB`,
      kind: index % 2 === 0 ? 'Evento' : 'Programada',
    };
  });
}

function Toggle({
  label,
  checked,
  onChange,
  testId,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  testId: string;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        aria-label={label}
        data-testid={testId}
      />
      {label}
    </label>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
    </div>
  );
}
