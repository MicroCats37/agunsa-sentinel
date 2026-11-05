'use client';

import { SeverityBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { formatDateTime } from '@/domain/clock';
import { isIncidentActive } from '@/domain/incident-status';
import { SEVERITY_ORDER } from '@/domain/labels';
import type { Severity } from '@/domain/types';
import { useIncidentsStore } from '@/store/incidents-store';
import gsap from 'gsap';
import { Bell, CheckCheck, ChevronRight, CircleAlert } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Bandeja de alertas de la barra superior.
 *
 * Lista viva de los incidentes activos con severidad, cámara y hora. Cada
 * entrada abre la ficha del incidente y puede marcarse como leída, de modo que
 * el operador sabe qué ha revisado y qué no.
 */
export function AlertDrawer() {
  const [open, setOpen] = useState(false);
  const incidents = useIncidentsStore((state) => state.incidents);
  const readIncidentIds = useIncidentsStore((state) => state.readIncidentIds);
  const markRead = useIncidentsStore((state) => state.markRead);
  const markAllRead = useIncidentsStore((state) => state.markAllRead);

  const active = useMemo(() => {
    return incidents
      .filter((incident) => isIncidentActive(incident.status))
      .sort((a, b) => {
        const severity = severityRank(b.severity) - severityRank(a.severity);
        if (severity !== 0) return severity;
        return Date.parse(b.occurredAt) - Date.parse(a.occurredAt);
      });
  }, [incidents]);

  const unread = active.filter((incident) => !readIncidentIds.includes(incident.id));

  /*
   * Entrada escalonada de la lista: GSAP conduce la línea de tiempo y cada
   * alerta entra con su propio desplazamiento. Con movimiento reducido la
   * lista aparece sin animación.
   */
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list || !open) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const items = list.querySelectorAll('[data-alert-entry]');
    if (reduced || items.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        items,
        { autoAlpha: 0, x: 18 },
        {
          autoAlpha: 1,
          x: 0,
          duration: 0.28,
          ease: 'power2.out',
          stagger: 0.045,
          clearProps: 'transform,visibility',
        },
      );
    }, list);

    return () => ctx.revert();
  }, [open, active.length]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Alertas activas (${unread.length} sin revisar)`}
          data-testid="alert-drawer-trigger"
        >
          <Bell className="size-4" />
          {unread.length > 0 ? (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-critical px-1 text-[10px] font-bold text-white tabular-nums"
              data-testid="alert-drawer-badge"
            >
              {unread.length}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CircleAlert className="size-4 text-warning" />
            Alertas activas
          </SheetTitle>
          <SheetDescription>
            {active.length} incidentes abiertos · {unread.length} sin revisar. La lista se actualiza
            con el motor de reglas en tiempo real.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-between gap-2 px-4">
          <Button
            variant="outline"
            size="xs"
            onClick={() => markAllRead(active.map((incident) => incident.id))}
            disabled={unread.length === 0}
            data-testid="alert-drawer-mark-all"
          >
            <CheckCheck className="size-3.5" />
            Marcar todo como leído
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {active.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No hay incidentes activos en este momento.
              </p>
              <p className="mt-1 text-xs text-muted-foreground/80">
                Activa la operación en vivo para recibir las detecciones del motor de reglas.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2" ref={listRef}>
              {active.map((incident) => {
                const isUnread = !readIncidentIds.includes(incident.id);
                return (
                  <li key={incident.id} data-alert-entry>
                    <div
                      className={`rounded-lg border transition-colors ${
                        isUnread ? 'border-warning/45 bg-warning/5' : 'border-border bg-card'
                      }`}
                    >
                      <Link
                        href={`/incidentes/${incident.id}`}
                        onClick={() => {
                          markRead(incident.id);
                          setOpen(false);
                        }}
                        className="flex items-start gap-3 px-3 py-2.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        data-testid={`alert-item-${incident.id}`}
                      >
                        <span
                          className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                            isUnread ? 'bg-warning' : 'bg-muted-foreground/50'
                          }`}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {incident.cameraId}
                            </span>
                            <SeverityBadge severity={incident.severity} />
                          </span>
                          <span className="mt-1 block truncate text-sm text-foreground">
                            {incident.type}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">
                            {formatDateTime(incident.occurredAt)}
                          </span>
                        </span>
                        <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                      </Link>
                      <div className="flex justify-end border-t border-border/60 px-3 py-1.5">
                        <Button
                          variant="ghost"
                          size="xs"
                          className="text-[11px] text-muted-foreground"
                          onClick={() => markRead(incident.id)}
                          disabled={!isUnread}
                          data-testid={`alert-read-${incident.id}`}
                        >
                          {isUnread ? 'Marcar como leído' : 'Leído'}
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function severityRank(severity: Severity): number {
  const index = SEVERITY_ORDER.indexOf(severity);
  return index === -1 ? 0 : index;
}
