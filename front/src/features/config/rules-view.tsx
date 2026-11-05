'use client';

import { DataTable, createDataTableColumns, createSelectionColumn } from '@/components/data-table';
import { FormField } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import { SeverityBadge } from '@/components/status-badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CAMERAS } from '@/data/cameras';
import { ZONES, VIRTUAL_LINES } from '@/data/zones';
import {
  DIRECTION_LABEL,
  NOTIFICATION_CHANNEL_LABEL,
  OBJECT_TYPE_LABEL,
  RULE_EVENT_LABEL,
  SEVERITY_LABEL,
  SEVERITY_ORDER,
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
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

/**
 * Motor de reglas de seguridad (módulo 6 del pliego).
 *
 * Cada regla es editable y se valida en vivo: los errores bloquean el guardado
 * y los avisos señalan configuraciones operativas riesgosas.
 */

/** Orden operativo de la severidad: crítica primero. */
const SEVERITY_RANK: Record<Severity, number> = { critica: 0, alta: 1, media: 2, baja: 3 };

export function RulesView() {
  const rules = useRulesStore((state) => state.rules);
  const updateRule = useRulesStore((state) => state.updateRule);
  const toggleRule = useRulesStore((state) => state.toggleRule);
  const addRule = useRulesStore((state) => state.addRule);

  // La vista previa evalúa la regla contra la escena simulada actual.
  const previewTracks = useSimulationStore((state) => state.tracks);
  const previewSecond = useSimulationStore((state) => Math.floor(timelineSecOf(state.clockMs)));

  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(rules[0]?.id ?? null);
  const [draft, setDraft] = useState<SecurityRule | null>(null);
  const [pendingDisable, setPendingDisable] = useState<SecurityRule | null>(null);

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

  const startEditing = useCallback((rule: SecurityRule): void => {
    setSelectedRuleId(rule.id);
    setDraft({ ...rule });
  }, []);

  const requestToggle = useCallback(
    (rule: SecurityRule, enabled: boolean): void => {
      if (enabled) {
        toggleRule(rule.id, true);
        return;
      }
      setPendingDisable(rule);
    },
    [toggleRule],
  );

  const columns = useMemo(() => {
    const helper = createDataTableColumns<SecurityRule>();

    return helper.columns([
      createSelectionColumn<SecurityRule>(),
      helper.accessor((rule) => rule.name, {
        id: 'name',
        header: 'Regla',
        cell: ({ row }) => (
          <>
            <button
              type="button"
              className="text-left font-medium text-foreground hover:text-info"
              onClick={() => startEditing(row.original)}
              data-testid={`rule-row-${row.original.id}`}
            >
              {row.original.name}
            </button>
            <span className="block text-xs text-muted-foreground">
              {RULE_EVENT_LABEL[row.original.event]} · {OBJECT_TYPE_LABEL[row.original.objectType]}
            </span>
          </>
        ),
      }),
      helper.accessor((rule) => describeRuleScope(rule, context), {
        id: 'scope',
        header: 'Ámbito',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {describeRuleScope(row.original, context)}
          </span>
        ),
      }),
      helper.accessor((rule) => rule.severity, {
        id: 'severity',
        header: 'Severidad',
        filterFn: 'arrHas',
        sortFn: (rowA, rowB, columnId) => {
          const a = SEVERITY_RANK[rowA.getValue<Severity>(columnId)] ?? 0;
          const b = SEVERITY_RANK[rowB.getValue<Severity>(columnId)] ?? 0;
          return a - b;
        },
        cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
      }),
      helper.accessor((rule) => (rule.enabled ? 'activa' : 'inactiva'), {
        id: 'enabled',
        header: 'Activa',
        filterFn: 'arrHas',
        cell: ({ row }) => (
          <Switch
            checked={row.original.enabled}
            onCheckedChange={(checked) => requestToggle(row.original, checked)}
            aria-label={`Activar ${row.original.name}`}
            data-testid={`rule-toggle-${row.original.id}`}
          />
        ),
      }),
    ]);
  }, [context, requestToggle, startEditing]);

  function patch(patchValue: Partial<SecurityRule>): void {
    setDraft((current) => (current ? { ...current, ...patchValue } : current));
  }

  function confirmDisable(): void {
    if (!pendingDisable) return;
    toggleRule(pendingDisable.id, false);
    toast.info(`Regla «${pendingDisable.name}» desactivada.`);
    setPendingDisable(null);
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
              Selecciona una fila para editarla.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={rules}
              columns={columns}
              getRowId={(rule) => rule.id}
              searchText={(rule) =>
                `${rule.name} ${rule.event} ${rule.objectType} ${rule.severity} ${describeRuleScope(rule, context)}`
              }
              searchPlaceholder="Buscar por nombre, evento o ámbito…"
              filters={[
                {
                  columnId: 'severity',
                  label: 'Severidad',
                  options: SEVERITY_ORDER.map((severity) => ({
                    value: severity,
                    label: SEVERITY_LABEL[severity],
                  })),
                },
                {
                  columnId: 'enabled',
                  label: 'Estado',
                  options: [
                    { value: 'activa', label: 'Activa' },
                    { value: 'inactiva', label: 'Inactiva' },
                  ],
                },
              ]}
              pageSize={10}
              noun="reglas"
              isRowSelected={(rule) => rule.id === selectedRuleId}
              emptyMessage="No hay reglas que coincidan con los filtros aplicados."
            />
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
                <FormField label="Nombre" htmlFor="rule-name">
                  <Input
                    id="rule-name"
                    value={draft.name}
                    onChange={(event) => patch({ name: event.target.value })}
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Tipo de objeto" htmlFor="rule-object">
                    <Select
                      value={draft.objectType}
                      onValueChange={(value) => patch({ objectType: value as ObjectType })}
                    >
                      <SelectTrigger id="rule-object" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="persona">Persona</SelectItem>
                        <SelectItem value="vehiculo">Vehículo</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Evento esperado" htmlFor="rule-event">
                    <Select
                      value={draft.event}
                      onValueChange={(value) => patch({ event: value as RuleEvent })}
                    >
                      <SelectTrigger id="rule-event" className="w-full">
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
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Ámbito" htmlFor="rule-scope-kind">
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
                      <SelectTrigger id="rule-scope-kind" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="camara">Cámara</SelectItem>
                        <SelectItem value="zona">Zona</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="Aplicar a" htmlFor="rule-scope">
                    <Select
                      value={draft.scopeId}
                      onValueChange={(value) => patch({ scopeId: value })}
                    >
                      <SelectTrigger id="rule-scope" className="w-full">
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
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Horario desde" htmlFor="rule-start">
                    <Input
                      id="rule-start"
                      value={draft.schedule.start}
                      onChange={(event) =>
                        patch({
                          schedule: { ...draft.schedule, start: event.target.value },
                        })
                      }
                    />
                  </FormField>
                  <FormField label="Horario hasta" htmlFor="rule-end">
                    <Input
                      id="rule-end"
                      value={draft.schedule.end}
                      onChange={(event) =>
                        patch({
                          schedule: { ...draft.schedule, end: event.target.value },
                        })
                      }
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <FormField label="Permanencia (s)" htmlFor="rule-dwell">
                    <Input
                      id="rule-dwell"
                      type="number"
                      min={0}
                      value={draft.minDwellSeconds}
                      onChange={(event) => patch({ minDwellSeconds: Number(event.target.value) })}
                    />
                  </FormField>
                  <FormField label="Espera (s)" htmlFor="rule-cooldown">
                    <Input
                      id="rule-cooldown"
                      type="number"
                      min={0}
                      value={draft.cooldownSeconds}
                      onChange={(event) => patch({ cooldownSeconds: Number(event.target.value) })}
                    />
                  </FormField>
                  <FormField label="Sentido" htmlFor="rule-direction">
                    <Select
                      value={draft.direction}
                      onValueChange={(value) => patch({ direction: value as CrossingDirection })}
                    >
                      <SelectTrigger id="rule-direction" className="w-full">
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
                  <FormField label="Severidad" htmlFor="rule-severity">
                    <Select
                      value={draft.severity}
                      onValueChange={(value) => patch({ severity: value as Severity })}
                    >
                      <SelectTrigger id="rule-severity" className="w-full">
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

                  <FormField label="Canal de notificación" htmlFor="rule-channel">
                    <Select
                      value={draft.notificationChannel}
                      onValueChange={(value) =>
                        patch({ notificationChannel: value as NotificationChannel })
                      }
                    >
                      <SelectTrigger id="rule-channel" className="w-full">
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
                  </FormField>
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

      <AlertDialog
        open={pendingDisable !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDisable(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar la regla</AlertDialogTitle>
            <AlertDialogDescription>
              «{pendingDisable?.name}» dejará de generar alertas del perímetro. Los incidentes ya
              registrados se conservan y la regla se puede volver a activar en cualquier momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDisable}>
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
