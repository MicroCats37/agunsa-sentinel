'use client';

import { Button } from '@/components/ui/button';
import { ClipboardList } from 'lucide-react';
import Link from 'next/link';
import type { NavLinkHandler } from './navigation';

const PROMO_HREF = '/modernizacion';

export interface NavSecondaryProps {
  /** Sustituye la navegación nativa para animar el cambio de ruta. */
  onNavigate: NavLinkHandler;
}

/**
 * Tarjeta promocional del pie de la barra lateral.
 *
 * Anuncia la fase de modernización del proyecto y ofrece el acceso directo a
 * su detalle. La ilustración es un icono real dentro de una cápsula con
 * borde: no se inventa un gráfico que no exista en el producto.
 */
export function NavSecondary({ onNavigate }: NavSecondaryProps) {
  return (
    <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3 group-data-[collapsible=icon]:hidden">
      <div className="flex items-start gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-sidebar-border bg-background">
          <ClipboardList className="size-4 text-info" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] leading-tight font-semibold text-sidebar-foreground">
            Plan de modernización
          </p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Fases, capacidad y criterios de aceptación del proyecto.
          </p>
        </div>
      </div>
      <Button asChild variant="default" size="sm" className="mt-3 w-full">
        <Link href={PROMO_HREF} onClick={(event) => onNavigate(PROMO_HREF, event)}>
          Ver plan
        </Link>
      </Button>
    </div>
  );
}
