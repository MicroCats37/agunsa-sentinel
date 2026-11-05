'use client';

import { SCENARIOS } from '@/data/scenarios';
import { INCIDENT_CATEGORY_LABEL } from '@/domain/labels';
import { AlertTriangle, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { forceScenario } from './force-scenario';

/**
 * Forzador de escenarios.
 *
 * El operador puede abrir un incidente concreto bajo demanda: el motor de
 * reglas lo registra como cualquier otra detección y la sala salta a su
 * ficha. La barra superior lo ofrece como acción secundaria del transporte;
 * aquí aparece en la tarjeta de escenarios del dashboard.
 *
 * Los identificadores de prueba de esta lista llevan el prefijo `scenario-panel`
 * para no confundirse con el menú de transporte de la barra superior, que es
 * el que recorre el guion de aceptación.
 */
export interface SimulationControlProps {
  /** Presentación del control: vertical en tarjetas o en línea como chips. */
  variant: 'button' | 'panel';
}

export function SimulationControl({ variant }: SimulationControlProps) {
  const router = useRouter();
  const compact = variant === 'button';

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {SCENARIOS.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            data-testid={`scenario-panel-${scenario.id}`}
            onClick={() => forceScenario(scenario.id, router)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-info/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Play className="size-3" />
            {scenario.cameraId}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {SCENARIOS.map((scenario) => (
        <button
          key={scenario.id}
          type="button"
          data-testid={`scenario-panel-${scenario.id}`}
          onClick={() => forceScenario(scenario.id, router)}
          className="group flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-info/60 hover:bg-info/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">{scenario.title}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{scenario.description}</span>
            <span className="mt-1 block text-[11px] text-muted-foreground/80">
              {scenario.cameraId} · {INCIDENT_CATEGORY_LABEL[scenario.category]} · severidad{' '}
              {scenario.severity}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
