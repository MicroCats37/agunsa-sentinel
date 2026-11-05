'use client';

import { PageHeader } from '@/components/page-header';
import { SeverityBadge } from '@/components/status-badge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CAMERAS } from '@/data/cameras';
import { ZONES, VIRTUAL_LINES } from '@/data/zones';
import {
  DIRECTION_LABEL,
  NOTIFICATION_CHANNEL_LABEL,
  OBJECT_TYPE_LABEL,
  RULE_EVENT_LABEL,
} from '@/domain/labels';
import { describeRuleScope, validateRule, type RuleIssue } from '@/domain/rule-validation';
import { evaluateRule } from '@/domain/rule-eval';
import type {
  CrossingDirection,
  NotificationChannel,
  ObjectType,
  RuleEvent,
  SecurityRule,
  Severity,
} from '@/domain/types';
import { useRulesStore } from '@/store/rules-store';
import { timelineSecOf, useSimulationStore } from '@/store/simulation-store';
import { AlertTriangle, CheckCircle2, Plus, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

/**
 * Motor de reglas de seguridad (módulo 6 del pliego).
 *
 * Cada regla es editable y se valida en vivo: los errores bloquean el guardado
 * y los avisos señalan configuraciones operativas riesgosas.
 */
export function RulesView() {
  const rules = useRulesStore((state) => state.rules);
  const updateRule = useRulesStore((state) => state.updateRule);
  const toggleRule = useRulesStore((state) => state.toggleRule);
  const addRule = useRulesStore((state) => state.addRule);

  // La vista previa evalúa la regla contra la escena simulada actual.
  const previewTracks = useSimulationStore((state) => state.tracks);
  const previewSecond = useSimulationStore((state) =>
    Math.floor(timelineSecOf(state.clockMs)),
  );

  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(rules[0]?.id ?? null);
  const [draft, setDraft] = useState<SecurityRule | null>(null);

  const context = useMemo(() => ({ cameras: CAMERAS, zones: ZONES }), []);
  const issues = useMemo(() => (draft ? validateRule(draft, context) : []), [context, draft]);
  const errors = issues.filter((issue) => issue.level === 'error');

  const preview = useMemo(() => {
    if (!draft) return [];
    return evaluateRule(draft, {
      cameras: CAMERAS,
      zones: ZONES,
      lines: VIRTUAL_LINES,
      tracks: new Map(Object.entries(previewTracks)),
      nowSec: previewSecond,
    });
  }, [draft, previewTracks, previewSecond]);

  const selected = rules.find((rule) => rule.id === selectedRuleId) ?? null;

  function startEditing(rule: SecurityRule): void {
    setSelectedRuleId(rule.id);
    setDraft({ ...rule });
  }

  function patch(patchValue: Partial<SecurityRule>): void {
    setDraft((current) => (current ? { ...current, ...patchValue } : current));
  }

  function save(): void {
    if (!draft) return;
    const validation = validateRule(draft, context);
    if (validation.some((issue) => issue.level === 'error')) {
      toast.error('Corrige los errores de validación antes de guardar.');
      return;
    }
    updateRule(draft);
    toast.success(`Regla «${draft.name}» guardada.`);
  }

  function createRule(): void {
    const base: SecurityRule = {
      id: `reg-nuevo-${rules.length + 1}`,
      name: 'Nueva regla de seguridad',
      objectType: 'persona',
      scopeKind: 'camara',
      scopeId: CAMERAS[0]?.id ?? 'C01',
      event: 'presencia',
      schedule: { start: '00:00', end: '23:59', days: [0, 1, 2, 3, 4, 5, 6] },
      minDwellSeconds: 0,
      direction: 'cualquiera',
      severity: 'media',
      cooldownSeconds: 300,
      notificationChannel: 'app',
      enabled: true,
      simulated: true,
    };
    addRule(base);
    setSelectedRuleId(base.id);
    setDraft({ ...base });
    toast.info('Regla creada. Edítala y actívala cuando esté lista.');
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Módulo 6 · Motor de reglas"
        title="Reglas de seguridad"
        description="Las reglas son las que convierten una detección en una alerta. Define el objeto, el ámbito, el evento esperado, el horario, la permanencia mínima, el sentido de desplazamiento y el canal de notificación."
        actions={
          <Button onClick={createRule}>
            <Plus />
            Nueva regla
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card size="sm" className="overflow-hidden">
          <CardHeader>
            <CardTitle>Reglas configuradas</CardTitle>
            <CardDescription>
              {rules.filter((rule) => rule.enabled).length} activas de {rules.length} registradas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Regla</TableHead>
                  <TableHead className="w-[180px]">Ámbito</TableHead>
                  <TableHead className="w-[110px]">Severidad</TableHead>
                  <TableHead className="w-[90px]">Activa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow
                    key={rule.id}
                    data-selected={rule.id === selectedRuleId}
                    className={rule.id === selectedRuleId ? 'bg-muted/60' : undefined}
                  >
                    <TableCell>
                      <button
                        type="button"
                        className="text-left font-medium text-foreground hover:text-info"
                        onClick={() => startEditing(rule)}
                        data-testid={`rule-row-${rule.id}`}
                      >
                        {rule.name}
                      </button>
                      <span className="block text-xs text-muted-foreground">
                        {RULE_EVENT_LABEL[rule.event]} · {OBJECT_TYPE_LABEL[rule.objectType]}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {describeRuleScope(rule, context)}
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={rule.severity} />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(checked) => toggleRule(rule.id, checked)}
                        aria-label={`Activar ${rule.name}`}
                        data-testid={`rule-toggle-${rule.id}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Editor de regla</CardTitle>
            <CardDescription>
              {selected ? selected.name : 'Selecciona una regla de la lista.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {draft ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="rule-name">Nombre</Label>
                  <Input
                    id="rule-name"
                    value={draft.name}
                    onChange={(event) => patch({ name: event.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="rule-object">Tipo de objeto</Label>
                    <Select
                      value={draft.objectType}
                      onValueChange={(value) => patch({ objectType: value as ObjectType })}
                    >
                      <SelectTrigger id="rule-object">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="persona">Persona</SelectItem>
                        <SelectItem value="vehiculo">Vehículo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="rule-event">Evento esperado</Label>
                    <Select
                      value={draft.event}
                      onValueChange={(value) => patch({ event: value as RuleEvent })}
                    >
                      <SelectTrigger id="rule-event">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          [
                            'presencia',
                            'cruce_linea',
                            'acceso_restringido',
                            'permanencia',
                            'estacionamiento',
                            'acercamiento_perimetro',
                            'agrupacion',
                            'sentido_contrario',
                          ] as RuleEvent[]
                        ).map((event) => (
                          <SelectItem key={event} value={event}>
                            {RULE_EVENT_LABEL[event]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="rule-scope-kind">Ámbito</Label>
                    <Select
                      value={draft.scopeKind}
                      onValueChange={(value) =>
                        patch({
                          scopeKind: value as SecurityRule['scopeKind'],
                          scopeId:
                            value === 'camara' ? (CAMERAS[0]?.id ?? '') : (ZONES[0]?.id ?? ''),
                        })
                      }
                    >
                      <SelectTrigger id="rule-scope-kind">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="camara">Cámara</SelectItem>
                        <SelectItem value="zona">Zona</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="rule-scope">Aplicar a</Label>
                    <Select
                      value={draft.scopeId}
                      onValueChange={(value) => patch({ scopeId: value })}
                    >
                      <SelectTrigger id="rule-scope">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {draft.scopeKind === 'camara'
                          ? CAMERAS.map((camera) => (
                              <SelectItem key={camera.id} value={camera.id}>
                                {camera.id} · {camera.name}
                              </SelectItem>
                            ))
                          : ZONES.map((zone) => (
                              <SelectItem key={zone.id} value={zone.id}>
                                {zone.name}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="rule-start">Horario desde</Label>
                    <Input
                      id="rule-start"
                      value={draft.schedule.start}
                      onChange={(event) =>
                        patch({
                          schedule: { ...draft.schedule, start: event.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="rule-end">Horario hasta</Label>
                    <Input
                      id="rule-end"
                      value={draft.schedule.end}
                      onChange={(event) =>
                        patch({
                          schedule: { ...draft.schedule, end: event.target.value },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="rule-dwell">Permanencia (s)</Label>
                    <Input
                      id="rule-dwell"
                      type="number"
                      min={0}
                      value={draft.minDwellSeconds}
                      onChange={(event) => patch({ minDwellSeconds: Number(event.target.value) })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="rule-cooldown">Espera (s)</Label>
                    <Input
                      id="rule-cooldown"
                      type="number"
                      min={0}
                      value={draft.cooldownSeconds}
                      onChange={(event) => patch({ cooldownSeconds: Number(event.target.value) })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="rule-direction">Sentido</Label>
                    <Select
                      value={draft.direction}
                      onValueChange={(value) => patch({ direction: value as CrossingDirection })}
                    >
                      <SelectTrigger id="rule-direction">
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
                    <Label htmlFor="rule-severity">Severidad</Label>
                    <Select
                      value={draft.severity}
                      onValueChange={(value) => patch({ severity: value as Severity })}
                    >
                      <SelectTrigger id="rule-severity">
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

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="rule-channel">Canal de notificación</Label>
                    <Select
                      value={draft.notificationChannel}
                      onValueChange={(value) =>
                        patch({ notificationChannel: value as NotificationChannel })
                      }
                    >
                      <SelectTrigger id="rule-channel">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['app', 'email', 'sms', 'webhook'] as NotificationChannel[]).map(
                          (channel) => (
                            <SelectItem key={channel} value={channel}>
                              {NOTIFICATION_CHANNEL_LABEL[channel]}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <IssueList issues={issues} />

                {preview.length > 0 ? (
                  <div className="rounded-lg border border-border px-3 py-2.5">
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                      Vista previa de evaluación
                    </p>
                    <ul className="flex flex-col gap-1.5" data-testid="rule-preview">
                      {preview.map((entry) => (
                        <li
                          key={entry.cameraId}
                          className="flex items-start justify-between gap-3 text-xs"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-foreground">
                              {entry.cameraName}
                            </span>
                            <span className="block text-muted-foreground">{entry.reason}</span>
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              entry.fired
                                ? 'shrink-0 border-critical/40 bg-critical/10 text-critical'
                                : 'shrink-0 border-border bg-muted text-muted-foreground'
                            }
                          >
                            {entry.fired ? 'Dispararía' : 'Inactiva'}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="flex items-center gap-2">
                  <Button onClick={save} disabled={errors.length > 0} data-testid="save-rule">
                    <Save />
                    Guardar regla
                  </Button>
                  <Button variant="ghost" onClick={() => setDraft(null)}>
                    Cancelar
                  </Button>
                  <Badge
                    variant="outline"
                    className={
                      errors.length > 0
                        ? 'ml-auto border-critical/40 bg-critical/10 text-critical'
                        : 'ml-auto border-normal/40 bg-normal/10 text-normal'
                    }
                  >
                    {errors.length > 0 ? (
                      <>
                        <AlertTriangle className="size-3" />
                        {errors.length} error(es)
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-3" />
                        Validación correcta
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Selecciona una regla para editarla.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function IssueList({ issues }: { issues: RuleIssue[] }) {
  if (issues.length === 0) {
    return (
      <p className="rounded-lg border border-normal/30 bg-normal/5 px-3 py-2 text-xs text-normal">
        La configuración es válida.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5" data-testid="rule-issues">
      {issues.map((issue, index) => (
        <li
          key={`${issue.field}-${index}`}
          className={`rounded-lg border px-3 py-2 text-xs ${
            issue.level === 'error'
              ? 'border-critical/35 bg-critical/8 text-critical'
              : 'border-warning/35 bg-warning/8 text-warning'
          }`}
        >
          {issue.message}
        </li>
      ))}
    </ul>
  );
}
