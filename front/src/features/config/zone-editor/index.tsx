'use client';

import { CameraFeed } from '@/components/camera-feed';
import { FormField } from '@/components/form-field';
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
import { Input } from '@/components/ui/input';
import { Item, ItemActions, ItemContent, ItemGroup, ItemTitle } from '@/components/ui/item';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type {
  Camera,
  CrossingDirection,
  Point,
  Severity,
  VirtualLine,
  Zone,
  ZoneKind,
} from '@/domain/types';
import { DIRECTION_LABEL, ZONE_KIND_LABEL } from '@/domain/labels';
import { useSimulationStore } from '@/store/simulation-store';
import { SquareStack } from 'lucide-react';
import { useState } from 'react';
import { Surface, type EditorMode } from './lib/surface';

/**
 * Módulo profundo del editor de zonas inteligentes.
 *
 * Interfaz pública única (`ZoneEditor`): dibuja polígonos sobre la imagen de la
 * cámara, gestiona líneas virtuales y expone las propiedades de la zona
 * seleccionada. El resto del editor vive en `lib/`.
 */
export interface ZoneEditorProps {
  camera: Camera;
  zones: readonly Zone[];
  lines: readonly VirtualLine[];
  onSelectZone: (zoneId: string | null) => void;
  onUpdateZone: (zone: Zone) => void;
  onCreateZone: (zone: Zone) => void;
  onToggleZone: (zoneId: string, enabled: boolean) => void;
  onToggleLine: (lineId: string, enabled: boolean) => void;
}

export function ZoneEditor({
  camera,
  zones,
  lines,
  onSelectZone,
  onUpdateZone,
  onCreateZone,
  onToggleZone,
  onToggleLine,
}: ZoneEditorProps) {
  const [mode, setMode] = useState<EditorMode>('select');
  const [draftPoints, setDraftPoints] = useState<Point[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const previewTracks = useSimulationStore((state) => state.tracks[camera.id] ?? []);

  const selected = zones.find((zone) => zone.id === selectedZoneId) ?? null;

  function handleSurfaceClick(point: Point): void {
    if (mode === 'select') return;
    setDraftPoints((current) => [...current, point]);
  }

  function closePolygon(): void {
    if (draftPoints.length < 3) return;
    const zone: Zone = {
      id: `zn-nuevo-${camera.id.toLowerCase()}-${draftPoints.length}`,
      name: `${camera.name} · zona dibujada`,
      kind: 'vigilancia',
      cameraId: camera.id,
      sectorId: camera.sectorId,
      polygon: draftPoints,
      maxDwellSeconds: 120,
      direction: null,
      schedule: { start: '00:00', end: '23:59', days: [0, 1, 2, 3, 4, 5, 6] },
      severity: 'media',
      enabled: true,
    };
    onCreateZone(zone);
    setSelectedZoneId(zone.id);
    onSelectZone(zone.id);
    setDraftPoints([]);
    setMode('select');
  }

  function cancelDraft(): void {
    setDraftPoints([]);
    setMode('select');
  }

  function handleSelectZone(zoneId: string): void {
    setSelectedZoneId(zoneId);
    onSelectZone(zoneId);
  }

  function patchSelected(patch: Partial<Zone>): void {
    if (!selected) return;
    onUpdateZone({ ...selected, ...patch });
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Lienzo de edición · {camera.name}</CardTitle>
          <CardDescription>
            Cambia a «Dibujar polígono» y haz clic sobre la imagen para fijar los vértices. Las
            coordenadas se guardan normalizadas al encuadre de la cámara.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={(value) => {
                if (!value) return;
                if (value === 'select') {
                  setMode('select');
                  setDraftPoints([]);
                  return;
                }
                setMode(value as EditorMode);
              }}
              variant="outline"
              size="sm"
              spacing={0}
              aria-label="Modo de edición"
            >
              <ToggleGroupItem value="select" data-testid="editor-mode-select">
                Seleccionar
              </ToggleGroupItem>
              <ToggleGroupItem value="polygon" data-testid="editor-mode-polygon">
                Dibujar polígono
              </ToggleGroupItem>
              <ToggleGroupItem value="line" disabled title="Disponible en la versión definitiva">
                Dibujar línea
              </ToggleGroupItem>
            </ToggleGroup>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
                {draftPoints.length} vértices
              </Badge>
              <Button size="sm" onClick={closePolygon} disabled={draftPoints.length < 3}>
                Cerrar polígono
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelDraft}
                disabled={draftPoints.length === 0}
              >
                Descartar
              </Button>
            </div>
          </div>

          <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
            <CameraFeed camera={camera} targets={previewTracks} compact />
            <Surface
              zones={zones}
              lines={lines}
              selectedZoneId={selectedZoneId}
              mode={mode}
              draftPoints={draftPoints}
              onSurfaceClick={handleSurfaceClick}
              onSelectZone={handleSelectZone}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Propiedades de la zona</CardTitle>
            <CardDescription>
              {selected ? selected.name : 'Selecciona una zona sobre el lienzo.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selected ? (
              <div className="flex flex-col gap-3">
                <FormField label="Nombre" htmlFor="zone-name">
                  <Input
                    id="zone-name"
                    value={selected.name}
                    onChange={(event) => patchSelected({ name: event.target.value })}
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Tipo" htmlFor="zone-kind">
                    <Select
                      value={selected.kind}
                      onValueChange={(value) => patchSelected({ kind: value as ZoneKind })}
                    >
                      <SelectTrigger id="zone-kind">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          ['perimetro', 'restringida', 'permanencia', 'vigilancia'] as ZoneKind[]
                        ).map((kind) => (
                          <SelectItem key={kind} value={kind}>
                            {ZONE_KIND_LABEL[kind]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Severidad" htmlFor="zone-severity">
                    <Select
                      value={selected.severity}
                      onValueChange={(value) => patchSelected({ severity: value as Severity })}
                    >
                      <SelectTrigger id="zone-severity">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['critica', 'alta', 'media', 'baja'] as Severity[]).map((severity) => (
                          <SelectItem key={severity} value={severity}>
                            {severity}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    label="Permanencia máx. (s)"
                    htmlFor="zone-dwell"
                    hint="Segundos que un objeto puede permanecer dentro."
                  >
                    <Input
                      id="zone-dwell"
                      type="number"
                      min={0}
                      value={selected.maxDwellSeconds ?? 0}
                      onChange={(event) =>
                        patchSelected({
                          maxDwellSeconds:
                            event.target.value === '' ? null : Number(event.target.value),
                        })
                      }
                    />
                  </FormField>
                  <FormField label="Sentido" htmlFor="zone-direction">
                    <Select
                      value={selected.direction ?? 'cualquiera'}
                      onValueChange={(value) =>
                        patchSelected({
                          direction: value === 'cualquiera' ? null : (value as CrossingDirection),
                        })
                      }
                    >
                      <SelectTrigger id="zone-direction">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['entrada', 'salida', 'cualquiera'] as CrossingDirection[]).map(
                          (direction) => (
                            <SelectItem key={direction} value={direction}>
                              {DIRECTION_LABEL[direction]}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Horario desde" htmlFor="zone-start">
                    <Input
                      id="zone-start"
                      value={selected.schedule.start}
                      onChange={(event) =>
                        patchSelected({
                          schedule: { ...selected.schedule, start: event.target.value },
                        })
                      }
                    />
                  </FormField>
                  <FormField label="Horario hasta" htmlFor="zone-end">
                    <Input
                      id="zone-end"
                      value={selected.schedule.end}
                      onChange={(event) =>
                        patchSelected({
                          schedule: { ...selected.schedule, end: event.target.value },
                        })
                      }
                    />
                  </FormField>
                </div>

                <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                  <span className="text-sm">Zona habilitada</span>
                  <Switch
                    checked={selected.enabled}
                    onCheckedChange={(checked) => onToggleZone(selected.id, checked)}
                    aria-label="Habilitar zona"
                  />
                </label>
              </div>
            ) : (
              <Empty className="border border-border/60">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <SquareStack />
                  </EmptyMedia>
                  <EmptyTitle>Ninguna zona seleccionada</EmptyTitle>
                  <EmptyDescription>
                    Selecciona una zona sobre el lienzo o dibuja un polígono nuevo.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Zonas y líneas de esta cámara</CardTitle>
            <CardDescription>
              {zones.length} zonas · {lines.length} líneas virtuales.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ItemGroup className="gap-1.5">
              {zones.map((zone) => (
                <Item key={zone.id} variant="outline" size="sm">
                  <ItemContent>
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left text-xs text-foreground hover:text-info"
                      onClick={() => handleSelectZone(zone.id)}
                    >
                      {zone.name}
                    </button>
                  </ItemContent>
                  <ItemActions>
                    <Switch
                      checked={zone.enabled}
                      onCheckedChange={(checked) => onToggleZone(zone.id, checked)}
                      aria-label={`Habilitar ${zone.name}`}
                    />
                  </ItemActions>
                </Item>
              ))}
              {zones.length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">Sin zonas configuradas.</p>
              ) : null}
            </ItemGroup>
            <p className="mt-3 mb-1.5 text-xs font-medium text-muted-foreground">
              Líneas virtuales
            </p>
            <ItemGroup className="gap-1.5">
              {lines.map((line) => (
                <Item key={line.id} variant="outline" size="sm">
                  <ItemContent>
                    <ItemTitle className="truncate text-xs font-normal text-foreground">
                      {line.name}
                    </ItemTitle>
                  </ItemContent>
                  <ItemActions>
                    <Switch
                      checked={line.enabled}
                      onCheckedChange={(checked) => onToggleLine(line.id, checked)}
                      aria-label={`Habilitar ${line.name}`}
                    />
                  </ItemActions>
                </Item>
              ))}
              {lines.length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">Sin líneas configuradas.</p>
              ) : null}
            </ItemGroup>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
