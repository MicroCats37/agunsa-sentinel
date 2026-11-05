'use client';

import { Callout } from '@/components/callout';
import { DetailList } from '@/components/detail-list';
import { CameraStatusBadge, SeverityBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { CAMERAS } from '@/data/cameras';
import { getSector } from '@/data/sectors';
import {
  CLASSIFICATION_HINT,
  CLASSIFICATION_LABEL,
  PRIORITY_LABEL,
  VIEW_INTENT_LABEL,
} from '@/domain/labels';
import type { Camera } from '@/domain/types';
import { useCamerasStore } from '@/store/cameras-store';
import { ArrowUpRight, FileText, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { SimulationCameraFeed } from '@/features/simulation/simulation-camera-feed';

/**
 * Ficha rápida de cámara (hoja lateral).
 *
 * Se abre al seleccionar una cámara en la cuadrícula de monitoreo: el
 * operador ve la evaluación real del equipo sin abandonar el monitor y puede
 * saltar a la ficha completa.
 */
export function CameraDetailSheet({
  cameraId,
  open,
  onOpenChange,
}: {
  cameraId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const overrides = useCamerasStore((state) => state.overrides);

  const camera = useMemo<Camera | undefined>(() => {
    const base = CAMERAS.find((item) => item.id === cameraId);
    if (!base) return undefined;
    const override = overrides[base.id];
    return override ? { ...base, ...override } : base;
  }, [cameraId, overrides]);

  if (!camera) return null;

  const sector = getSector(camera.sectorId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="size-4 text-info" />
            {camera.id} · {camera.name}
          </SheetTitle>
          <SheetDescription>
            {sector?.name ?? camera.sectorId} · {camera.ip} · modelo {camera.spec.model}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-6">
          <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
            <SimulationCameraFeed camera={camera} sectorName={sector?.name} showDetections />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-border bg-muted text-foreground"
              data-testid="sheet-classification"
            >
              {CLASSIFICATION_LABEL[camera.assessment.classification]}
            </Badge>
            <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
              {PRIORITY_LABEL[camera.assessment.priority]}
            </Badge>
            <CameraStatusBadge status={camera.status} />
            {camera.alertSeverity ? <SeverityBadge severity={camera.alertSeverity} /> : null}
          </div>

          <p className="text-xs text-muted-foreground">
            {CLASSIFICATION_HINT[camera.assessment.classification]}
          </p>

          <DetailList
            columns={2}
            items={[
              { label: 'Resolución recibida', value: camera.resolution },
              { label: 'Inspección diurna', value: camera.assessment.dayResult },
              { label: 'Inspección nocturna', value: camera.assessment.nightResult },
              { label: 'Campo de visión', value: `${camera.spec.horizontalFovDeg}°` },
              { label: 'Lente', value: `${camera.spec.focalLengthMm.toFixed(1)} mm` },
              { label: 'Alcance IR', value: `${camera.spec.irDistanceM} m` },
              { label: 'Cobertura', value: VIEW_INTENT_LABEL[camera.viewIntent] },
              { label: 'Rumbo en el plano', value: `${camera.heading}°` },
            ]}
          />

          <Callout tone="info" title="Evaluación de campo">
            <DetailList
              items={[
                { label: 'Hallazgo diurno', value: camera.assessment.dayFinding },
                { label: 'Hallazgo nocturno', value: camera.assessment.nightFinding },
                { label: 'Acción recomendada', value: camera.assessment.recommendedAction },
              ]}
            />
          </Callout>

          {camera.assessment.obstructionId ? (
            <Badge variant="outline" className="w-fit border-warning/45 bg-warning/10 text-warning">
              Obstrucción {camera.assessment.obstructionId} documentada
            </Badge>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/monitoreo/${camera.id}`}>
                <FileText className="size-3.5" />
                Ficha completa
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="text-info">
              <Link href={`/mapa`}>
                Ver en el mapa
                <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
