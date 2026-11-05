'use client';

import { Callout } from '@/components/callout';
import { DetailList } from '@/components/detail-list';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BLIND_SPOT_CAVEAT, BLIND_SPOTS } from '@/data/blind-spots';
import {
  CAPACITY_CAVEAT,
  CAPACITY_FORMULA,
  CAPACITY_REFERENCE,
  CAPACITY_ROWS,
  RETENTION_DAYS,
  RESERVE_FACTOR,
} from '@/data/capacity';
import {
  ACCEPTANCE_CRITERIA,
  ARCHITECTURE_CAVEAT,
  ARCHITECTURE_CHAIN,
  CHANGE_ACT_NOTE,
  CONCLUSIONS,
  CYBERSECURITY_MEASURES,
  REQUESTED_DECISIONS,
  VIABILITY_CONCLUSION,
} from '@/data/architecture';
import { CLASSIFICATION_SUMMARY } from '@/data/camera-inventory';
import {
  MONITORING_CENTRE_COMPOSITION,
  MONITORING_CENTRE_CONDITION,
  MONITORING_CENTRE_DATA,
} from '@/data/monitoring-centre';
import { OBSTRUCTION_CAVEAT, OBSTRUCTIONS } from '@/data/obstructions';
import {
  INTERVENTION_PHASES,
  LIFECYCLE_NOTE,
  PROCUREMENT_NOTE,
  REPLACEMENT_RULE,
} from '@/data/phases';
import { SECTOR_DISCREPANCY } from '@/data/sectors';
import { SOURCES, SOURCES_FOOTNOTE } from '@/data/sources';
import { CLASSIFICATION_LABEL } from '@/domain/labels';
import type { CameraClassification } from '@/domain/types';
import {
  ArrowRight,
  Boxes,
  CircleAlert,
  ClipboardCheck,
  Cpu,
  FileText,
  Gauge,
  HardDrive,
  Link2,
  MonitorCog,
  Network,
  ShieldCheck,
} from 'lucide-react';

/**
 * Plan de modernización (módulo de gestión del proyecto).
 *
 * Traduce el informe de evaluación CCTV a un documento operable: las cinco
 * fases de intervención, el dimensionamiento de capacidad, la arquitectura
 * propuesta, las medidas de ciberseguridad, el concepto del centro de
 * monitoreo, las conclusiones y los criterios de aceptación.
 *
 * No es relleno: es el documento que el cliente presenta para aprobar el
 * levantamiento, la corrección y la fase de inversión.
 */
export function ModernizationView() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Evaluación CCTV · IMUPESA · 03/11/2026"
        title="Plan de intervención y modernización"
        description="Cinco fases, dimensionamiento de capacidad, arquitectura propuesta y condiciones de aceptación. Cada cifra y cada afirmación de este documento procede del informe de evaluación; las hipótesis están marcadas como tales."
        actions={
          <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
            <FileText className="size-3" />
            Alcance condicionado
          </Badge>
        }
      />

      {/* ---------------------------------------------------------------- */}
      {/* Conclusión ejecutiva                                            */}
      {/* ---------------------------------------------------------------- */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Conclusión ejecutiva</CardTitle>
            <CardDescription>
              Qué recomienda el informe antes de cambiar una sola cámara.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-foreground">
              Se recomienda{' '}
              <strong>recuperar y corregir antes de realizar una sustitución masiva</strong>. Se
              recibieron 28 imágenes nocturnas y 31 diurnas de 36 IP únicas. Cinco equipos no
              entregaron imagen en ambas inspecciones; recibir una fotografía no certifica calidad,
              estabilidad ni grabación.
            </p>
            <ul className="flex flex-col gap-2">
              {REQUESTED_DECISIONS.map((decision) => (
                <li key={decision} className="flex items-start gap-2 text-sm text-foreground">
                  <ArrowRight className="mt-0.5 size-4 shrink-0 text-info" />
                  {decision}
                </li>
              ))}
            </ul>
            <Callout>{CHANGE_ACT_NOTE}</Callout>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Clasificación conjunta</CardTitle>
            <CardDescription>
              La categoría manda sobre la prioridad: verde, ámbar, rojo, gris.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2.5">
              {(Object.keys(CLASSIFICATION_SUMMARY) as CameraClassification[]).map((key) => (
                <li
                  key={key}
                  className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{CLASSIFICATION_LABEL[key]}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {CLASSIFICATION_SUMMARY[key].treatment}
                    </span>
                  </span>
                  <span className="shrink-0 text-lg font-semibold tabular-nums">
                    {CLASSIFICATION_SUMMARY[key].count}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Fases                                                            */}
      {/* ---------------------------------------------------------------- */}
      <section className="flex flex-col gap-4">
        <SectionHeading
          icon={<ClipboardCheck className="size-4" />}
          eyebrow="Intervención"
          title="Las cinco fases del plan"
          description="Cada fase tiene un alcance, un entregable, un responsable y una condición de cierre."
        />

        <ol className="flex flex-col gap-3" data-testid="modernization-phases">
          {INTERVENTION_PHASES.map((phase) => (
            <li key={phase.id}>
              <Card size="sm">
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                          {phase.number}
                        </span>
                        <h3 className="text-base font-semibold">{phase.title}</h3>
                      </div>
                      <p className="mt-2 text-sm text-foreground">{phase.scope}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Responsable: <strong className="text-foreground">{phase.owner}</strong>
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 border-t border-border pt-3 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-4">
                      <div>
                        <p className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                          Entregable
                        </p>
                        <p className="mt-0.5 text-sm text-foreground">{phase.deliverable}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                          Condición de cierre
                        </p>
                        <p className="mt-0.5 text-sm text-foreground">{phase.exitCriteria}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Callout title="Regla de reemplazo" icon={Gauge}>
            {REPLACEMENT_RULE}
          </Callout>
          <Callout title="Ciclo de vida" icon={Boxes}>
            {LIFECYCLE_NOTE}
          </Callout>
          <Callout title="Compra y plazo" icon={FileText}>
            {PROCUREMENT_NOTE}
          </Callout>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Puntos ciegos y obstrucciones                                    */}
      {/* ---------------------------------------------------------------- */}
      <section className="flex flex-col gap-4">
        <SectionHeading
          icon={<CircleAlert className="size-4" />}
          eyebrow="Cobertura"
          title="Puntos ciegos y obstrucciones documentadas"
          description="Los puntos ciegos son anotaciones históricas del plano; las obstrucciones son hallazgos observados en los fotogramas."
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Puntos ciegos PC1–PC3</CardTitle>
              <CardDescription>Anotaciones del plano del cliente.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {BLIND_SPOTS.map((spot) => (
                  <li
                    key={spot.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {spot.id} · {spot.annotation}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {spot.location} · {spot.note}
                      </span>
                    </span>
                    <Badge
                      variant="outline"
                      className="border-border bg-muted text-muted-foreground"
                    >
                      Histórico
                    </Badge>
                  </li>
                ))}
              </ul>
              <Callout className="mt-3">{BLIND_SPOT_CAVEAT}</Callout>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Obstrucciones OC</CardTitle>
              <CardDescription>Hallazgos observados sobre las fichas de cámara.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {OBSTRUCTIONS.map((obstruction) => (
                  <li key={obstruction.id} className="rounded-lg border border-border px-3 py-2">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {obstruction.id} · {obstruction.cameraId}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {obstruction.ip}
                      </span>
                      <Badge
                        variant="outline"
                        className="border-warning/45 bg-warning/10 text-warning"
                      >
                        {obstruction.subject}
                      </Badge>
                    </span>
                    <span className="mt-1 block text-xs text-foreground">{obstruction.effect}</span>
                  </li>
                ))}
              </ul>
              <Callout className="mt-3">{OBSTRUCTION_CAVEAT}</Callout>
            </CardContent>
          </Card>
        </div>

        <Callout tone="warning" title="Discrepancia de sector">
          Detectada en la fuente: {SECTOR_DISCREPANCY}
        </Callout>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Capacidad                                                        */}
      {/* ---------------------------------------------------------------- */}
      <section className="flex flex-col gap-4">
        <SectionHeading
          icon={<HardDrive className="size-4" />}
          eyebrow="Dimensionamiento"
          title="Capacidad de grabación y red"
          description="Dimensionamiento de referencia para 36 cámaras, 30 días de retención y 25 % de reserva."
        />

        <Card size="sm">
          <CardContent>
            <Table className="min-w-[620px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Supuesto por cámara</TableHead>
                  <TableHead>Tráfico 36 cámaras</TableHead>
                  <TableHead>Video 30 días</TableHead>
                  <TableHead className="text-right">Con 25 % de reserva</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CAPACITY_ROWS.map((row) => (
                  <TableRow key={row.bitrateMbps}>
                    <TableCell className="font-medium tabular-nums">
                      {row.bitrateMbps} Mb/s
                    </TableCell>
                    <TableCell className="tabular-nums">{row.trafficMbps} Mb/s</TableCell>
                    <TableCell className="tabular-nums">{row.videoTb} TB</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {row.usableTb} TB
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <p className="mt-3 font-mono text-xs text-foreground">{CAPACITY_FORMULA}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Retención {RETENTION_DAYS} días · reserva {RESERVE_FACTOR * 100} %.{' '}
              {CAPACITY_REFERENCE}
            </p>
            <Callout className="mt-2">{CAPACITY_CAVEAT}</Callout>
          </CardContent>
        </Card>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Arquitectura                                                     */}
      {/* ---------------------------------------------------------------- */}
      <section className="flex flex-col gap-4">
        <SectionHeading
          icon={<Network className="size-4" />}
          eyebrow="Arquitectura"
          title="Cadena propuesta para un CCTV modernizado"
          description="Cámaras → switches PoE por zona → red de distribución → VMS y grabación → monitoreo y evidencia."
        />

        <ol className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          {ARCHITECTURE_CHAIN.map((stage, index) => (
            <li key={stage.id}>
              <Card size="sm" className="h-full">
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded bg-primary/15 text-[11px] font-bold text-primary">
                      {index + 1}
                    </span>
                    <h3 className="text-sm font-semibold">{stage.label}</h3>
                  </div>
                  <p className="mt-2 text-xs text-foreground">{stage.requirement}</p>
                  <p className="mt-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
                    <strong className="text-foreground">Validación: </strong>
                    {stage.validation}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>

        <Callout>{ARCHITECTURE_CAVEAT}</Callout>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-normal" />
              Ciberseguridad propuesta
            </CardTitle>
            <CardDescription>
              Medidas concretas de la arquitectura segura de red (NIST SP 800-215).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {CYBERSECURITY_MEASURES.map((measure) => (
                <li key={measure.title} className="rounded-lg border border-border px-3 py-2.5">
                  <p className="text-sm font-medium">{measure.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{measure.detail}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Centro de monitoreo                                               */}
      {/* ---------------------------------------------------------------- */}
      <section className="flex flex-col gap-4">
        <SectionHeading
          icon={<MonitorCog className="size-4" />}
          eyebrow="Operación"
          title="Concepto del centro de monitoreo"
          description="Referencia de intención del cliente: dos contenedores de 20 pies, un nivel, diez pantallas, cuatro puestos de monitoreo y dos administrativos."
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Composición declarada</CardTitle>
              <CardDescription>
                Imagen conceptual aportada por el cliente; no es obra ejecutada.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DetailList
                columns={2}
                items={[
                  {
                    label: 'Contenedores',
                    value: `${MONITORING_CENTRE_COMPOSITION.containers} × 20 pies`,
                  },
                  { label: 'Niveles', value: String(MONITORING_CENTRE_COMPOSITION.levels) },
                  {
                    label: 'Pantallas',
                    value: `${MONITORING_CENTRE_COMPOSITION.screens} (${MONITORING_CENTRE_COMPOSITION.screenLayout})`,
                  },
                  {
                    label: 'Pulgadas',
                    value: `${MONITORING_CENTRE_COMPOSITION.screenInches.min}–${MONITORING_CENTRE_COMPOSITION.screenInches.max}"`,
                  },
                  {
                    label: 'Puestos',
                    value: `${MONITORING_CENTRE_COMPOSITION.monitoringPosts} monitoreo · ${MONITORING_CENTRE_COMPOSITION.adminPosts} admin`,
                  },
                  {
                    label: 'Pasillo',
                    value: `${MONITORING_CENTRE_COMPOSITION.corridorM} m (no confirmado)`,
                  },
                  { label: 'Gabinete', value: `${MONITORING_CENTRE_COMPOSITION.cabinetU}U` },
                  {
                    label: 'Climatización',
                    value: `${MONITORING_CENTRE_COMPOSITION.hvacUnits} equipos`,
                  },
                  {
                    label: 'Envolvente',
                    value: `${MONITORING_CENTRE_COMPOSITION.exteriorEnvelopeM2} m² · ${MONITORING_CENTRE_COMPOSITION.exteriorHeightM} m`,
                  },
                  {
                    label: 'Altura interior',
                    value: `${MONITORING_CENTRE_COMPOSITION.interiorHeightM} m (no validada)`,
                  },
                ]}
              />
              <Callout tone="warning" className="mt-3">
                {MONITORING_CENTRE_CONDITION}
              </Callout>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Viabilidad del módulo y observaciones al diseño</CardTitle>
              <CardDescription>
                Cada dato de la referencia con su condición de aprobación.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2.5">
                {MONITORING_CENTRE_DATA.map((item) => (
                  <li
                    key={item.datum}
                    className="grid grid-cols-1 gap-1 border-b border-border/60 pb-2.5 last:border-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"
                  >
                    <span className="text-sm font-medium">{item.datum}</span>
                    <span className="text-xs text-muted-foreground">{item.assessment}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Conclusiones y aceptación                                        */}
      {/* ---------------------------------------------------------------- */}
      <section className="flex flex-col gap-4">
        <SectionHeading
          icon={<Cpu className="size-4" />}
          eyebrow="Cierre"
          title="Conclusiones y criterios de aceptación"
          description="Lo que el informe concluye y lo que hay que aprobar y registrar para dar el proyecto por cerrado."
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Conclusiones</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-3">
                {CONCLUSIONS.map((conclusion) => (
                  <li key={conclusion.number} className="flex gap-3">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/15 text-[11px] font-bold text-primary">
                      {conclusion.number}
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{conclusion.title}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {conclusion.detail}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Inspección propuesta para cierre</CardTitle>
              <CardDescription>
                Criterios a aprobar y registrar; ninguno es un resultado ya medido.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2.5">
                {ACCEPTANCE_CRITERIA.map((criterion) => (
                  <li key={criterion.title} className="rounded-lg border border-border px-3 py-2.5">
                    <p className="text-sm font-medium">{criterion.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{criterion.criterion}</p>
                  </li>
                ))}
              </ul>
              <Callout tone="info" className="mt-3">
                {VIABILITY_CONCLUSION}
              </Callout>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Trazabilidad                                                     */}
      {/* ---------------------------------------------------------------- */}
      <section className="flex flex-col gap-4">
        <SectionHeading
          icon={<Link2 className="size-4" />}
          eyebrow="Trazabilidad"
          title="Fuentes y trazabilidad"
          description="Evidencia del cliente (E1–E4) y referencias públicas consultadas el 03/11/2026 (S1–S5)."
        />

        <Card size="sm">
          <CardContent>
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {SOURCES.map((source) => (
                <li key={source.id} className="rounded-lg border border-border px-3 py-2.5">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <span className="font-mono text-[11px] text-info">{source.id}</span>
                    {source.title}
                    {source.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-auto text-[11px] text-info hover:underline"
                      >
                        fuente
                      </a>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{source.detail}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground">{SOURCES_FOOTNOTE}</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function SectionHeading({
  icon,
  eyebrow,
  title,
  description,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border-l-2 border-primary pl-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
        {icon}
        {eyebrow}
      </p>
      <h2 className="mt-1 text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
