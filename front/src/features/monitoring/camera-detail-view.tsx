'use client';

import { CameraFeed } from '@/components/camera-feed';
import { DetailList } from '@/components/detail-list';
import { PageHeader } from '@/components/page-header';
import { SegmentedControl } from '@/components/segmented-control';
import { CameraStatusBadge, SeverityBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CAMERAS } from '@/data/cameras';
import { getSector } from '@/data/sectors';
import { formatDateTime, PLATFORM_NOW_ISO } from '@/domain/clock';
import {
  RULE_EVENT_LABEL,
  CLASSIFICATION_LABEL,
  PRIORITY_LABEL,
  ZONE_KIND_LABEL,
} from '@/domain/labels';
import type { Camera } from '@/domain/types';
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
import { CameraAssessmentPanel } from './camera-assessment-panel';

/**
 * Ficha de cámara (módulo 2 del pliego).
 *
 * Organiza el equipo en cinco pestañas: directo, grabaciones, eventos, zonas
 * inteligentes y especificaciones. El directo incluye el feed con
 * superposiciones, zonas y líneas virtuales configuradas para la cámara.
 */
const SCENE_HOUR_OPTIONS: readonly { value: string; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: '9', label: '09:00' },
  { value: '14', label: '14:00' },
  { value: '19', label: '19:00' },
  { value: '22', label: '22:00' },
];

export function CameraDetailView({ cameraId }: { cameraId: string }) {
  const overrides = useCamerasStore((state) => state.overrides);
  const incidents = useIncidentsStore((state) => state.incidents);
  const zones = useZonesStore((state) => state.zones);
  const lines = useZonesStore((state) => state.virtualLines);
  const rules = useRulesStore((state) => state.rules);
  const toggleZone = useZonesStore((state) => state.toggleZone);
  const sceneHour = useUiStore((state) => state.sceneHour);
  const setSceneHour = useUiStore((state) => state.setSceneHour);
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
          description={`El identificador ${cameraId} no existe en el registro de cámaras.`}
        />
        <Empty className="border border-border/60">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Boxes />
            </EmptyMedia>
            <EmptyTitle>Sin ficha para {cameraId}</EmptyTitle>
            <EmptyDescription>
              El identificador no existe en el registro de las 36 cámaras.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild variant="outline">
              <Link href="/monitoreo">
                <ArrowLeft />
                Volver al centro de monitoreo
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const sector = getSector(camera.sectorId);
  const panelCollapsed = collapsedPanels['camera-detail'] ?? false;
  const recordings = buildRecordings(camera);

  return (
    <div className="flex flex-col gap-5">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/monitoreo">Centro de monitoreo</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem className="text-muted-foreground">
            {sector?.name ?? camera.sectorId}
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{camera.id}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader
        eyebrow={`Módulo 2 · Ficha de cámara ${camera.id}`}
        title={camera.name}
        description={`${sector?.name ?? camera.sectorId} · ${camera.spec.model} · resolución recibida ${camera.resolution} · lente ${camera.spec.focalLengthMm.toFixed(1)} mm (${camera.spec.horizontalFovDeg}°) · IP ${camera.ip}`}
        actions={
          <>
            <Badge
              variant="outline"
              className="border-border bg-muted text-foreground"
              data-testid="camera-classification"
            >
              {CLASSIFICATION_LABEL[camera.assessment.classification]}
            </Badge>
            <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
              {PRIORITY_LABEL[camera.assessment.priority]}
            </Badge>
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
          <TabsTrigger value="evaluacion" data-testid="camera-tab-evaluacion">
            Evaluación
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
                    sceneHour={sceneHour}
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
                    <span className="text-xs text-muted-foreground">Hora</span>
                    <SegmentedControl
                      size="sm"
                      ariaLabel="Hora de la escena"
                      value={sceneHour === null ? 'auto' : String(sceneHour)}
                      onValueChange={(value) =>
                        setSceneHour(value === 'auto' ? null : Number(value))
                      }
                      options={SCENE_HOUR_OPTIONS.map((option) => ({
                        value: option.value,
                        label: option.label,
                      }))}
                    />
                  </div>
                  <span className="ml-auto text-xs text-muted-foreground">
                    Detección y superposiciones procesadas localmente.
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
                    <PanelEmpty
                      title="Sin histórico de eventos"
                      description="Esta cámara no registra eventos en el histórico."
                    />
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
                            <PanelEmpty
                              title="Sin zonas configuradas"
                              description="Esta cámara todavía no tiene zonas inteligentes."
                            />
                          ) : (
                            <DetailList
                              items={cameraZones.map((zone) => ({
                                label: zone.name,
                                value: (
                                  <span className="flex items-center justify-between gap-3">
                                    <span className="text-xs font-normal text-muted-foreground">
                                      {ZONE_KIND_LABEL[zone.kind]}
                                      {zone.maxDwellSeconds !== null
                                        ? ` · máx. ${zone.maxDwellSeconds} s`
                                        : ''}
                                    </span>
                                    <Switch
                                      checked={zone.enabled}
                                      onCheckedChange={(checked) => toggleZone(zone.id, checked)}
                                      aria-label={`Activar ${zone.name}`}
                                    />
                                  </span>
                                ),
                              }))}
                            />
                          )}
                        </TabsContent>

                        <TabsContent value="lineas" className="mt-3 flex flex-col gap-2">
                          {cameraLines.length === 0 ? (
                            <PanelEmpty
                              title="Sin líneas virtuales configuradas"
                              description="No hay líneas de cruce asociadas a esta cámara."
                            />
                          ) : (
                            <DetailList
                              items={cameraLines.map((line) => ({
                                label: line.name,
                                value: (
                                  <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                                    <LineChart className="size-3.5 shrink-0 text-warning" />
                                    Sentido: {line.direction}
                                  </span>
                                ),
                              }))}
                            />
                          )}
                        </TabsContent>

                        <TabsContent value="reglas" className="mt-3 flex flex-col gap-2">
                          {cameraRules.length === 0 ? (
                            <PanelEmpty
                              title="Sin reglas aplicables"
                              description="Ninguna regla del pliego alcanza a esta cámara."
                            />
                          ) : (
                            <DetailList
                              items={cameraRules.map((rule) => ({
                                label: rule.name,
                                value: (
                                  <span className="flex flex-wrap items-center gap-2 text-xs font-normal text-muted-foreground">
                                    <span>
                                      {RULE_EVENT_LABEL[rule.event]} · {rule.schedule.start}–
                                      {rule.schedule.end}
                                      {rule.minDwellSeconds > 0
                                        ? ` · ${rule.minDwellSeconds} s`
                                        : ''}
                                    </span>
                                    <SeverityBadge severity={rule.severity} />
                                  </span>
                                ),
                              }))}
                            />
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
                      <DetailList
                        columns={2}
                        items={[
                          { label: 'Identificador', value: camera.id },
                          { label: 'Sector', value: sector?.name ?? '—' },
                          { label: 'Tipo de escena', value: camera.scene },
                          { label: 'Campo de visión', value: `${camera.spec.horizontalFovDeg}°` },
                          { label: 'Orientación', value: `${camera.heading}°` },
                          { label: 'Resolución', value: camera.resolution },
                          { label: 'Dirección IP', value: camera.ip },
                          { label: 'Zona principal', value: camera.zoneId },
                        ]}
                      />
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
                Fragmentos almacenados en el NVR para {camera.id}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ItemGroup className="gap-2">
                {recordings.map((recording) => (
                  <Item key={recording.id} variant="outline">
                    <ItemMedia variant="icon">
                      <Film className="text-info" />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{recording.title}</ItemTitle>
                      <ItemDescription>
                        {recording.window} · {recording.duration} · {recording.size}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Badge
                        variant="outline"
                        className="border-border bg-muted text-muted-foreground"
                      >
                        {recording.kind}
                      </Badge>
                    </ItemActions>
                  </Item>
                ))}
              </ItemGroup>
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
                <PanelEmpty
                  title="Sin eventos registrados"
                  description="Sin eventos registrados para esta cámara."
                />
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
                  <PanelEmpty
                    title="Sin zonas configuradas"
                    description="Sin zonas configuradas para esta cámara."
                  />
                ) : (
                  <DetailList
                    items={cameraZones.map((zone) => ({
                      label: zone.name,
                      value: (
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-xs font-normal text-muted-foreground">
                            {ZONE_KIND_LABEL[zone.kind]} · severidad {zone.severity}
                            {zone.maxDwellSeconds !== null
                              ? ` · permanencia máx. ${zone.maxDwellSeconds} s`
                              : ''}
                          </span>
                          <Switch
                            checked={zone.enabled}
                            onCheckedChange={(checked) => toggleZone(zone.id, checked)}
                            aria-label={`Activar ${zone.name}`}
                          />
                        </span>
                      ),
                    }))}
                  />
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
                {cameraLines.length === 0 && cameraRules.length === 0 ? (
                  <PanelEmpty
                    title="Sin líneas ni reglas"
                    description="Sin líneas virtuales ni reglas configuradas."
                  />
                ) : (
                  <DetailList
                    items={[
                      ...cameraLines.map((line) => ({
                        label: line.name,
                        value: (
                          <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                            <LineChart className="size-3.5 shrink-0 text-warning" />
                            Sentido: {line.direction} · {line.enabled ? 'activa' : 'inactiva'}
                          </span>
                        ),
                      })),
                      ...cameraRules.map((rule) => ({
                        label: rule.name,
                        value: (
                          <span className="flex flex-wrap items-center gap-2 text-xs font-normal text-muted-foreground">
                            <span>
                              {RULE_EVENT_LABEL[rule.event]} · {rule.schedule.start}–
                              {rule.schedule.end}
                            </span>
                            <SeverityBadge severity={rule.severity} />
                          </span>
                        ),
                      })),
                    ]}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="evaluacion" className="flex flex-col gap-4">
          <CameraAssessmentPanel camera={camera} />
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

/**
 * Estado vacío de un panel lateral.
 *
 * Sustituye al párrafo suelto: título, descripción y filete discontinuo.
 */
function PanelEmpty({ title, description }: { title: string; description: string }) {
  return (
    <Empty className="border border-border/60">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Boxes />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
