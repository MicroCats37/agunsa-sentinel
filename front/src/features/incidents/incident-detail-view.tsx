'use client';

import { EvidenceFrame } from '@/components/camera-feed';
import { PageHeader } from '@/components/page-header';
import {
  CapabilityBadge,
  CategoryBadge,
  IncidentStatusBadge,
  SeverityBadge,
} from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { CAMERAS } from '@/data/cameras';
import { CURRENT_USER, CURRENT_USER_ID, USERS } from '@/data/users';
import { getZone } from '@/data/zones';
import { formatDateTime, PLATFORM_NOW_ISO } from '@/domain/clock';
import { availableStatusActions } from '@/domain/incident-status';
import { useSimulationFeed } from '@/features/simulation/use-simulation-feed';
import { timelineSecOf } from '@/store/simulation-store';
import { useCamerasStore } from '@/store/cameras-store';
import { useIncidentsStore } from '@/store/incidents-store';
import { useActivityStore } from '@/store/activity-store';
import {
  ArrowLeft,
  CheckCircle2,
  CircleUser,
  FileVideo,
  History,
  MessageSquarePlus,
  PlayCircle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

/**
 * Ficha de incidente (módulo 4 del pliego).
 *
 * Es la última etapa del criterio de aceptación: el operador evalúa la
 * evidencia, clasifica el evento y lo cierra siguiendo la máquina de estados.
 */
const STATUS_FLOW = ['nuevo', 'en_revision', 'confirmado', 'en_atencion', 'resuelto'] as const;

export function IncidentDetailView({ incidentId }: { incidentId: string }) {
  const incidents = useIncidentsStore((state) => state.incidents);
  const setStatus = useIncidentsStore((state) => state.setStatus);
  const assign = useIncidentsStore((state) => state.assign);
  const addNote = useIncidentsStore((state) => state.addNote);
  const overrides = useCamerasStore((state) => state.overrides);
  const logActivity = useActivityStore((state) => state.log);

  const [note, setNote] = useState('');

  const incident = useMemo(
    () => incidents.find((item) => item.id === incidentId),
    [incidentId, incidents],
  );
  const simulation = useSimulationFeed(incident?.cameraId ?? '');

  const camera = useMemo(() => {
    if (!incident) return undefined;
    const base = CAMERAS.find((item) => item.id === incident.cameraId);
    if (!base) return undefined;
    const override = overrides[base.id];
    return override ? { ...base, ...override } : base;
  }, [incident, overrides]);

  if (!incident) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Incidente no encontrado"
          description={`El identificador ${incidentId} no existe en el registro simulado.`}
        />
        <Button asChild variant="outline" className="w-fit">
          <Link href="/incidentes">
            <ArrowLeft />
            Volver al listado
          </Link>
        </Button>
      </div>
    );
  }

  const zone = getZone(incident.zoneId);
  const actions = availableStatusActions(incident);
  const assignee = incident.assigneeId
    ? USERS.find((user) => user.id === incident.assigneeId)
    : undefined;
  const currentStep = (() => {
    if (incident.status === 'descartado') return -1;
    const index = STATUS_FLOW.indexOf(incident.status);
    return index === -1 ? -1 : index;
  })();

  function handleTransition(target: Parameters<typeof setStatus>[1]): void {
    const ok = setStatus(incident!.id, target);
    if (!ok) {
      toast.error('Esa transición de estado no está permitida.');
      return;
    }
    logActivity({
      at: PLATFORM_NOW_ISO,
      actorId: CURRENT_USER_ID,
      action: 'Cambio de estado de incidente',
      target: incident!.id,
      detail: `Nuevo estado: ${target}`,
      kind: 'incidente',
    });
    toast.success(`Incidente ${incident!.id} actualizado.`);
  }

  function handleAssignSelf(): void {
    assign(incident!.id, CURRENT_USER_ID);
    logActivity({
      at: PLATFORM_NOW_ISO,
      actorId: CURRENT_USER_ID,
      action: 'Asignación de incidente',
      target: incident!.id,
      detail: `Asignado a ${CURRENT_USER?.name ?? CURRENT_USER_ID}`,
      kind: 'incidente',
    });
    toast.success('Incidente asignado.');
  }

  function handleAddNote(): void {
    const text = note.trim();
    if (text.length === 0) return;
    addNote(incident!.id, text, CURRENT_USER_ID, PLATFORM_NOW_ISO);
    setNote('');
    toast.success('Observación registrada.');
  }

  return (
    <div className="flex flex-col gap-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/incidentes">
          <ArrowLeft />
          Listado de incidentes
        </Link>
      </Button>

      <PageHeader
        eyebrow={`Módulo 4 · Incidente ${incident.id}`}
        title={incident.type}
        description={`Detectado el ${formatDateTime(incident.occurredAt)} en la cámara ${incident.cameraId} (${camera?.name ?? '—'}).`}
        actions={
          <>
            <SeverityBadge severity={incident.severity} />
            <CategoryBadge category={incident.category} />
            <span data-testid="incident-status">
              <IncidentStatusBadge status={incident.status} />
            </span>
            <CapabilityBadge capability={incident.capability} />
          </>
        }
      />

      {/* Flujo de estados. */}
      <Card size="sm">
        <div className="flex flex-wrap items-center gap-2 px-(--card-spacing) py-(--card-spacing)">
          {STATUS_FLOW.map((status, index) => {
            const reached = currentStep >= index && currentStep >= 0;
            const isCurrent = incident.status === status;
            return (
              <div key={status} className="flex items-center gap-2">
                <span
                  className={`rounded-md px-2 py-1 text-xs font-medium ${
                    isCurrent
                      ? 'bg-info/15 text-info ring-1 ring-info/40 ring-inset'
                      : reached
                        ? 'bg-normal/12 text-normal'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {status === 'nuevo'
                    ? 'Nuevo'
                    : status === 'en_revision'
                      ? 'En revisión'
                      : status === 'confirmado'
                        ? 'Confirmado'
                        : status === 'en_atencion'
                          ? 'En atención'
                          : 'Resuelto'}
                </span>
                {index < STATUS_FLOW.length - 1 ? (
                  <span className="h-px w-5 bg-border" aria-hidden="true" />
                ) : null}
              </div>
            );
          })}
          {incident.status === 'descartado' ? (
            <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
              Descartado
            </span>
          ) : null}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Evidencia capturada</CardTitle>
              <CardDescription>
                Fotograma congelado del feed en el instante de la detección (renderizado en el
                navegador).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {camera ? (
                <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
                  <EvidenceFrame
                    camera={camera}
                    targets={simulation.targets}
                    occurredAt={incident.occurredAt}
                    timeSec={timelineSecOf(Date.parse(incident.occurredAt))}
                  />
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Cámara no disponible para capturar evidencia.
                </p>
              )}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Clip de vídeo</CardTitle>
              <CardDescription>
                {incident.hasVideoClip
                  ? `Clip de ${incident.clipDurationSec} s disponible para revisión.`
                  : 'No hay clip de vídeo para este evento.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {incident.hasVideoClip ? (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-3">
                  <PlayCircle className="size-8 shrink-0 text-info" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {incident.id} · {incident.cameraId} · {incident.clipDurationSec} s
                    </p>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full w-[38%] rounded-full bg-info" />
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-border bg-background text-muted-foreground"
                  >
                    <FileVideo className="size-3" />
                    Simulado
                  </Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  El evento seoriginó en una falla de cámara; no se grabó clip.
                </p>
              )}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Datos del evento</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs md:grid-cols-3">
                <Detail label="Cámara" value={`${incident.cameraId} · ${camera?.name ?? '—'}`} />
                <Detail label="Zona" value={zone?.name ?? incident.zoneId} />
                <Detail label="Sector" value={incident.sectorId} />
                <Detail label="Fecha y hora" value={formatDateTime(incident.occurredAt)} />
                <Detail
                  label="Confianza del modelo"
                  value={
                    incident.confidence === null
                      ? 'No aplica'
                      : `${Math.round(incident.confidence * 100)}%`
                  }
                />
                <Detail label="Tipo de objeto" value={incident.objectType} />
                <Detail label="Objetos detectados" value={String(incident.objectCount)} />
                <Detail label="Responsable" value={assignee?.name ?? 'Sin asignar'} />
                <Detail label="Origen" value={incident.simulated ? 'Simulación' : 'Motor de IA'} />
              </dl>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Acciones del operador</CardTitle>
              <CardDescription>El estado sigue la máquina de estados del pliego.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {actions.map((action) => (
                  <Button
                    key={action.target}
                    variant={
                      action.intent === 'confirm'
                        ? 'default'
                        : action.intent === 'discard'
                          ? 'destructive'
                          : 'outline'
                    }
                    onClick={() => handleTransition(action.target)}
                    data-testid={`transition-${action.target}`}
                  >
                    {action.intent === 'confirm' ? <CheckCircle2 className="size-4" /> : null}
                    {action.intent === 'discard' ? <XCircle className="size-4" /> : null}
                    {action.intent === 'advance' ? <History className="size-4" /> : null}
                    {action.intent === 'review' ? <History className="size-4" /> : null}
                    {action.intent === 'resolve' ? <CheckCircle2 className="size-4" /> : null}
                    {action.label}
                  </Button>
                ))}
                {actions.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                    El incidente está en un estado terminal. No admite más transiciones.
                  </p>
                ) : null}

                <Button
                  variant="outline"
                  onClick={handleAssignSelf}
                  disabled={incident.assigneeId === CURRENT_USER_ID}
                  data-testid="assign-self"
                >
                  <CircleUser className="size-4" />
                  {incident.assigneeId === CURRENT_USER_ID
                    ? 'Ya sos el responsable'
                    : 'Asignarme el incidente'}
                </Button>

                <Button asChild variant="ghost" className="text-info">
                  <Link href={`/monitoreo/${incident.cameraId}`}>Abrir la cámara en vivo</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Observaciones</CardTitle>
              <CardDescription>{incident.notes.length} registros del turno.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="mb-3 flex flex-col gap-2">
                {incident.notes.length === 0 ? (
                  <li className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                    Sin observaciones registradas.
                  </li>
                ) : (
                  incident.notes.map((entry, index) => {
                    const author = USERS.find((user) => user.id === entry.authorId);
                    return (
                      <li
                        key={`${entry.at}-${index}`}
                        className="rounded-lg border border-border px-3 py-2"
                      >
                        <p className="text-xs text-foreground">{entry.text}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {author?.name ?? 'Operador'} · {formatDateTime(entry.at)}
                        </p>
                      </li>
                    );
                  })
                )}
              </ul>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Registrar observación del turno…"
                rows={3}
                aria-label="Nueva observación"
              />
              <Button
                className="mt-2 w-full"
                variant="outline"
                onClick={handleAddNote}
                disabled={note.trim().length === 0}
                data-testid="add-note"
              >
                <MessageSquarePlus className="size-4" />
                Añadir observación
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium break-words text-foreground">{value}</dd>
    </div>
  );
}
