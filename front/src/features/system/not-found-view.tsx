import { Button } from '@/components/ui/button';
import Link from 'next/link';

/**
 * Pantalla de recurso no encontrado.
 *
 * Vive en `features/` para respetar la regla de arquitectura: las rutas
 * componen features y no contienen lógica de presentación.
 */
export function NotFoundView() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-xs font-semibold tracking-[0.18em] text-warning uppercase">Error 404</p>
      <h1 className="text-2xl font-semibold tracking-tight">Recurso no encontrado</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        La ruta solicitada no existe en el mockup de AGUNSA Sentinel. Vuelve al dashboard para
        retomar la operación.
      </p>
      <Button asChild>
        <Link href="/dashboard">Ir al dashboard</Link>
      </Button>
    </div>
  );
}
