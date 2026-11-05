'use client';

import { Callout } from '@/components/callout';
import { DetailList } from '@/components/detail-list';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item';
import { BLIND_SPOT_BY_ID } from '@/data/blind-spots';
import { CAPTURE_SESSIONS } from '@/data/camera-inventory';
import { MODEL_PROFILES } from '@/data/model-profiles';
import { OBSTRUCTION_BY_ID } from '@/data/obstructions';
import { getSector } from '@/data/sectors';
import {
  CLASSIFICATION_HINT,
  CLASSIFICATION_LABEL,
  PRIORITY_LABEL,
  VIEW_INTENT_LABEL,
} from '@/domain/labels';
import type { Camera } from '@/domain/types';
import {
  AlertTriangle,
  CalendarClock,
  CircleCheck,
  CircleX,
  Target,
  TriangleAlert,
} from 'lucide-react';

/**
 * Ficha de evaluación CCTV de una cámara.
 *
 * Es la traslación del informe al producto: por cada una de las 36 IP se
 * muestran la clasificación conjunta, la prioridad, el resultado de las dos
 * pruebas con la resolución realmente recibida, los hallazgos originales, la
 * acción recomendada y los puntos que quedan abiertos.
 */
export function CameraAssessmentPanel({ camera }: { camera: Camera }) {
  const assessment = camera.assessment;
  const sector = getSector(camera.sectorId);
  const obstruction = assessment.obstructionId
    ? OBSTRUCTION_BY_ID.get(assessment.obstructionId)
    : undefined;
  const profile = MODEL_PROFILES[camera.spec.model];
  const lifecycle = profile?.lifecycle;

  return (
    <div className="flex flex-col gap-4">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Resultado de la evaluación</CardTitle>
          <CardDescription>
            Inspecciones del {CAPTURE_SESSIONS.diurna.date} ({CAPTURE_SESSIONS.diurna.window}) y del{' '}
            {CAPTURE_SESSIONS.nocturna.date} ({CAPTURE_SESSIONS.nocturna.window}).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-border bg-muted text-foreground"
              data-testid="assessment-classification"
            >
              {CLASSIFICATION_LABEL[assessment.classification]}
            </Badge>
            <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
              {PRIORITY_LABEL[assessment.priority]}
            </Badge>
            <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
              {assessment.dayResult === 'OK' ? (
                <CircleCheck className="size-3 text-normal" />
              ) : (
                <CircleX className="size-3 text-critical" />
              )}
              Día {assessment.dayResult}
            </Badge>
            <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
              {assessment.nightResult === 'OK' ? (
                <CircleCheck className="size-3 text-normal" />
              ) : (
                <CircleX className="size-3 text-critical" />
              )}
              Noche {assessment.nightResult}
            </Badge>
            <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
              {assessment.receivedResolution
                ? `${assessment.receivedResolution.width}×${assessment.receivedResolution.height} recibidos`
                : 'Sin fotograma'}
            </Badge>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {CLASSIFICATION_HINT[assessment.classification]}
          </p>

          <DetailList
            columns={2}
            className="mt-4"
            items={[
              { label: 'Dirección IP', value: camera.ip },
              { label: 'Modelo de inventario', value: camera.spec.model },
              { label: 'Sector documental', value: sector?.name ?? camera.sectorId },
              { label: 'Cobertura', value: VIEW_INTENT_LABEL[camera.viewIntent] },
              {
                label: 'Resolución máxima del equipo',
                value: `${camera.spec.resolutionWidth}×${camera.spec.resolutionHeight}`,
              },
              {
                label: 'Ciclo de vida',
                value:
                  lifecycle === 'discontinuado'
                    ? 'Discontinuado por el fabricante'
                    : lifecycle === 'por_verificar'
                      ? 'Modelo sin verificar (no entregó imagen)'
                      : (profile?.lifecycleNote ?? '—'),
              },
            ]}
          />

          <Callout tone="neutral" className="mt-3">
            {assessment.sectorNote}
          </Callout>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4 text-info" />
              Inspección diurna
            </CardTitle>
            <CardDescription>
              {CAPTURE_SESSIONS.diurna.date} · {CAPTURE_SESSIONS.diurna.window}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">{assessment.dayFinding}</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4 text-info" />
              Inspección nocturna
            </CardTitle>
            <CardDescription>
              {CAPTURE_SESSIONS.nocturna.date} · {CAPTURE_SESSIONS.nocturna.window}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">{assessment.nightFinding}</p>
            {assessment.httpError ? (
              <p className="mt-2 font-mono text-[11px] text-warning">{assessment.httpError}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="size-4 text-warning" />
            Acción recomendada y pendientes
          </CardTitle>
          <CardDescription>
            Criterio del informe: no se reemplaza un equipo por suciedad, bajo perfil o error HTTP.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">{assessment.recommendedAction}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {assessment.pendingItems.map((item) => (
              <li key={item}>
                <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
                  {item}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {obstruction ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TriangleAlert className="size-4 text-warning" />
              Obstrucción {obstruction.id} · {obstruction.subject}
            </CardTitle>
            <CardDescription>
              Hallazgo observado en el fotograma de {obstruction.cameraId} ({obstruction.ip}).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">{obstruction.effect}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Para cerrar: {obstruction.verification}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-muted-foreground" />
            Puntos ciegos históricos del plano
          </CardTitle>
          <CardDescription>
            PC1–PC3 son anotaciones heredadas del plano del cliente, no mediciones: no se pueden
            asignar a una cámara concreta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ItemGroup className="gap-2">
            {[...BLIND_SPOT_BY_ID.values()].map((spot) => (
              <Item key={spot.id} variant="outline" size="sm">
                <ItemContent>
                  <ItemTitle>
                    {spot.id} · {spot.annotation}
                  </ItemTitle>
                  <ItemDescription>
                    {spot.location} · {spot.note}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
                    Histórico
                  </Badge>
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        </CardContent>
      </Card>
    </div>
  );
}
