'use client';

import { CameraFeed } from '@/components/camera-feed';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
            <Button
              variant={mode === 'select' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setMode('select');
                setDraftPoints([]);
              }}
              data-testid="editor-mode-select"
            >
              Seleccionar
            </Button>
            <Button
              variant={mode === 'polygon' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('polygon')}
              data-testid="editor-mode-polygon"
            >
              Dibujar polígono
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMode('line')}
              disabled
              title="Disponible en la versión definitiva"
            >
              Dibujar línea
            </Button>
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
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="zone-name">Nombre</Label>
                  <Input
                    id="zone-name"
                    value={selected.name}
                    onChange={(event) => patchSelected({ name: event.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="zone-kind">Tipo</Label>
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
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="zone-severity">Severidad</Label>
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
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="zone-dwell">Permanencia máx. (s)</Label>
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
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="zone-direction">Sentido</Label>
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
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="zone-start">Horario desde</Label>
                    <Input
                      id="zone-start"
                      value={selected.schedule.start}
                      onChange={(event) =>
                        patchSelected({
                          schedule: { ...selected.schedule, start: event.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="zone-end">Horario hasta</Label>
                    <Input
                      id="zone-end"
                      value={selected.schedule.end}
                      onChange={(event) =>
                        patchSelected({
                          schedule: { ...selected.schedule, end: event.target.value },
                        })
                      }
                    />
                  </div>
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
              <p className="py-6 text-center text-sm text-muted-foreground">
                Ninguna zona seleccionada.
              </p>
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
            <ul className="flex flex-col gap-1.5">
              {zones.map((zone) => (
                <li
                  key={zone.id}
                  className="flex items-center justify-between gap-2 rounded border border-border px-2.5 py-1.5"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left text-xs text-foreground hover:text-info"
                    onClick={() => handleSelectZone(zone.id)}
                  >
                    {zone.name}
                  </button>
                  <Switch
                    checked={zone.enabled}
                    onCheckedChange={(checked) => onToggleZone(zone.id, checked)}
                    aria-label={`Habilitar ${zone.name}`}
                  />
                </li>
              ))}
            </ul>
            <p className="mt-3 mb-1.5 text-xs font-medium text-muted-foreground">
              Líneas virtuales
            </p>
            <ul className="flex flex-col gap-1.5">
              {lines.map((line) => (
                <li
                  key={line.id}
                  className="flex items-center justify-between gap-2 rounded border border-border px-2.5 py-1.5"
                >
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                    {line.name}
                  </span>
                  <Switch
                    checked={line.enabled}
                    onCheckedChange={(checked) => onToggleLine(line.id, checked)}
                    aria-label={`Habilitar ${line.name}`}
                  />
                </li>
              ))}
              {lines.length === 0 ? (
                <li className="px-1 text-xs text-muted-foreground">Sin líneas configuradas.</li>
              ) : null}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
