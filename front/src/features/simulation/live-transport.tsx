'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SCENARIOS } from '@/data/scenarios';
import { INCIDENT_CATEGORY_LABEL } from '@/domain/labels';
import { useLiveStore } from '@/store/live-store';
import { AlertTriangle, Pause, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { forceScenario } from './force-scenario';

/**
 * Transporte de la operación en vivo.
 *
 * El control del centro de control es un botón de reproducción: al pulsarlo
 * la sala entra en marcha, el reloj avanza y las detecciones llegan solas. El
 * mismo botón abre el panel de transporte, donde además se puede forzar un
 * escenario concreto bajo demanda.
 *
 * El botón conserva el identificador `simulate-incident` y el panel conserva
 * los `scenario-*`: el guion de aceptación depende de ellos.
 */
export function LiveTransport() {
  const router = useRouter();
  const running = useLiveStore((state) => state.running);
  const toggle = useLiveStore((state) => state.toggle);

  const transportLabel = running ? 'Pausar operación en vivo' : 'Iniciar operación en vivo';

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={toggle}
            aria-label={transportLabel}
            title={transportLabel}
            data-testid="simulate-incident"
          >
            {running ? <Pause className="size-4" /> : <Play className="size-4" />}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Transporte</DropdownMenuLabel>
          <DropdownMenuItem onSelect={toggle} data-testid="live-transport-toggle">
            {running ? <Pause className="size-4" /> : <Play className="size-4" />}
            {transportLabel}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel>Forzar escenario</DropdownMenuLabel>
          {SCENARIOS.map((scenario) => (
            <DropdownMenuItem
              key={scenario.id}
              onSelect={() => forceScenario(scenario.id, router)}
              data-testid={`scenario-${scenario.id}`}
              className="items-start gap-2.5 py-2"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{scenario.title}</span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                  {scenario.cameraId} · {INCIDENT_CATEGORY_LABEL[scenario.category]} · severidad{' '}
                  {scenario.severity}
                </span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <span
        className="hidden items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px] tracking-[0.1em] text-muted-foreground uppercase md:inline-flex"
        data-testid="live-status"
      >
        <span
          className={`size-1.5 rounded-full ${running ? 'bg-normal' : 'bg-muted-foreground/50'}`}
          aria-hidden="true"
        />
        {running ? 'En vivo' : 'En pausa'}
      </span>
    </div>
  );
}
