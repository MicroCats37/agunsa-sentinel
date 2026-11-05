'use client';

import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CAMERAS } from '@/data/cameras';
import { SECTORS } from '@/data/sectors';
import type { Camera } from '@/domain/types';
import { useZonesStore } from '@/store/zones-store';
import { useState } from 'react';
import { ZoneEditor } from './zone-editor';

/**
 * Configuración de zonas inteligentes (módulo 5 del pliego).
 *
 * Dibuja polígonos y líneas virtuales sobre la imagen de la cámara y permite
 * configurar tiempos máximos de permanencia, horarios y severidad.
 */
export function ZonesView() {
  const zones = useZonesStore((state) => state.zones);
  const virtualLines = useZonesStore((state) => state.virtualLines);
  const updateZone = useZonesStore((state) => state.updateZone);
  const addZone = useZonesStore((state) => state.addZone);
  const toggleZone = useZonesStore((state) => state.toggleZone);
  const toggleLine = useZonesStore((state) => state.toggleLine);

  const [cameraId, setCameraId] = useState(CAMERAS[0]?.id ?? 'CAM-01');
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const camera = CAMERAS.find((item) => item.id === cameraId) as Camera | undefined;
  const cameraZones = zones.filter((zone) => zone.cameraId === cameraId);
  const cameraLines = virtualLines.filter((line) => line.cameraId === cameraId);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Módulo 5 · Zonas inteligentes"
        title="Zonas y líneas virtuales"
        description="Define las condiciones de vigilancia sobre la imagen de la cámara: polígonos de aproximación, áreas restringidas, zonas de permanencia con tiempo máximo y líneas virtuales de cruce."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
              {zones.length} zonas
            </Badge>
            <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
              {virtualLines.length} líneas
            </Badge>
          </div>
        }
      />

      <Card size="sm">
        <div className="flex flex-wrap items-center gap-3 px-(--card-spacing) py-(--card-spacing)">
          <span className="text-xs font-medium text-muted-foreground">Cámara</span>
          <Select value={cameraId} onValueChange={setCameraId}>
            <SelectTrigger className="w-[320px]" aria-label="Seleccionar cámara">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SECTORS.map((sector) => (
                <div key={sector.id}>
                  <p className="px-2 py-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {sector.name}
                  </p>
                  {CAMERAS.filter((item) => item.sectorId === sector.id).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.id} · {item.name}
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            Sector: {SECTORS.find((sector) => sector.id === camera?.sectorId)?.name ?? '—'}
          </span>
        </div>
      </Card>

      {camera ? (
        <ZoneEditor
          camera={camera}
          zones={cameraZones}
          lines={cameraLines}
          onSelectZone={setSelectedZoneId}
          onUpdateZone={updateZone}
          onCreateZone={addZone}
          onToggleZone={toggleZone}
          onToggleLine={toggleLine}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Selecciona una cámara para configurar sus zonas.
        </p>
      )}

      {selectedZoneId ? (
        <p className="text-xs text-muted-foreground">
          Zona activa en el editor:{' '}
          <span className="font-medium text-foreground">{selectedZoneId}</span>
        </p>
      ) : null}
    </div>
  );
}
