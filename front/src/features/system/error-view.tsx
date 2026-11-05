'use client';

import { Button } from '@/components/ui/button';
import { TriangleAlert } from 'lucide-react';

/**
 * Pantalla de error global del mockup.
 *
 * Vive en `features/` porque las rutas sólo componen features: la lógica de
 * presentación no puede vivir en `app/`.
 */
export function ErrorView({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <TriangleAlert className="size-8 text-critical" />
      <h1 className="text-2xl font-semibold tracking-tight">Error en el centro de control</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        La plataforma ha encontrado un error inesperado al mostrar esta vista.
      </p>
      <Button onClick={onReset}>Reintentar</Button>
    </div>
  );
}
