'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SCENARIOS } from '@/data/scenarios';
import { INCIDENT_CATEGORY_LABEL } from '@/domain/labels';
import { runSimulation } from '@/store/simulator';
import { AlertTriangle, FlaskConical, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Control de demostración "Simular incidente".
 *
 * Es el disparador del criterio de aceptación del pliego: genera un incidente
 * real dentro del store, que actualiza el dashboard, el listado, el resaltado
 * de la cámara en el mapa y del centro de monitoreo, y abre la ficha del
 * incidente para su evaluación.
 */

export interface SimulationControlProps {
  variant: 'button' | 'panel';
}

export function SimulationControl({ variant }: SimulationControlProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function trigger(scenarioId: string) {
    const outcome = runSimulation(scenarioId);
    if (!outcome) {
      toast.error('No se pudo generar el incidente simulado.');
      return;
    }

    setOpen(false);
    toast.warning(`${outcome.incident.id} · ${outcome.scenarioTitle}`, {
      description: `Cámara ${outcome.cameraId} afectada. El incidente está pendiente de revisión.`,
      duration: 8000,
      action: {
        label: 'Ver incidente',
        onClick: () => router.push(`/incidentes/${outcome.incident.id}`),
      },
    });
    router.push(`/incidentes/${outcome.incident.id}`);
  }

  if (variant === 'panel') {
    return (
      <div className="flex flex-col gap-2">
        {SCENARIOS.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            data-testid={`scenario-${scenario.id}`}
            onClick={() => trigger(scenario.id)}
            className="group flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-info/60 hover:bg-info/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Play className="mt-0.5 size-4 shrink-0 text-info transition-transform group-hover:translate-x-0.5" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">{scenario.title}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {scenario.description}
              </span>
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="simulate-incident" className="border-warning/50">
          <FlaskConical className="text-warning" />
          Simular incidente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="size-4 text-warning" />
            Simular incidente
          </DialogTitle>
          <DialogDescription>
            Genera una detección simulada con el motor de reglas y la deriva al centro de control.
            Todo queda registrado en el almacenamiento local del navegador.
          </DialogDescription>
        </DialogHeader>
        <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              data-testid={`scenario-${scenario.id}`}
              onClick={() => trigger(scenario.id)}
              className="group flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-info/60 hover:bg-info/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{scenario.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {scenario.description}
                </span>
                <span className="mt-1 block text-[11px] text-muted-foreground/80">
                  {scenario.cameraId} · {INCIDENT_CATEGORY_LABEL[scenario.category]} · severidad{' '}
                  {scenario.severity}
                </span>
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
