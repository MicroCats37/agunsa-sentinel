'use client';

import { Toaster } from '@/components/ui/sonner';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LiveEngine } from '@/features/simulation/live-engine';
import gsap from 'gsap';
import { usePathname, useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useRef,
  useTransition,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { AppSidebar } from './sidebar';
import { StoreHydrator } from './store-hydrator';
import { Topbar } from './topbar';

/**
 * Estructura de la aplicación: navegación lateral, barra superior y contenido.
 *
 * La transición de ruta la gobierna GSAP y es de **entrada**: la vista nueva
 * aparece con un fundido corto cuando ya está montada. Nunca se anima la
 * salida, porque ocultar el contenido antes de navegar deja la pantalla en
 * blanco durante la carga y hace que un segundo clic se quede sin efecto.
 *
 * Mientras la ruta se resuelve se muestra una barra de progreso fina, de dos
 * píxeles, bajo la barra superior.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const contentRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  /** Entrada de la vista: fundido corto desde arriba. */
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = gsap.context(() => {
      if (reduced) {
        gsap.set(content, { opacity: 1, y: 0 });
        return;
      }
      gsap.fromTo(
        content,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.34, ease: 'power3.out', clearProps: 'transform' },
      );
    }, content);

    return () => ctx.revert();
  }, [pathname]);

  /**
   * Barra de progreso de la navegación.
   *
   * Sólo anima `transform` y `opacity`: nunca `width`, que provocaría
   * recálculo de layout en cada fotograma.
   */
  useEffect(() => {
    const bar = progressRef.current;
    if (!bar) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      gsap.set(bar, { scaleX: isPending ? 1 : 0, opacity: isPending ? 1 : 0 });
      return;
    }

    if (isPending) {
      gsap.fromTo(
        bar,
        { scaleX: 0, opacity: 1 },
        { scaleX: 0.85, duration: 1.6, ease: 'power2.out', overwrite: true },
      );
      return;
    }

    gsap.to(bar, {
      scaleX: 1,
      opacity: 0,
      duration: 0.25,
      ease: 'power2.out',
      overwrite: true,
      onComplete: () => {
        gsap.set(bar, { scaleX: 0 });
      },
    });
  }, [isPending]);

  /**
   * Navegación interna con estado de carga.
   *
   * El enlace es un `Link` de Next y su `onClick` se ejecuta antes de que el
   * router interprete el evento, así que aquí se toma el control con
   * `preventDefault` y se navega dentro de una transición: eso permite
   * mantener visible la vista anterior y marcar la barra de progreso hasta
   * que la ruta nueva esté lista.
   */
  const handleNavigate = useCallback(
    (href: string, event: MouseEvent<HTMLAnchorElement>): void => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (href === pathname) return;

      event.preventDefault();
      startTransition(() => {
        router.push(href);
      });
    },
    [pathname, router, startTransition],
  );

  return (
    <SidebarProvider className="h-screen w-full overflow-hidden bg-background text-foreground">
      <StoreHydrator />
      <LiveEngine />
      <TooltipProvider>
        <AppSidebar onNavigate={handleNavigate} />
        <SidebarInset className="relative min-w-0">
          <div
            ref={progressRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 z-50 h-0.5 origin-left scale-x-0 bg-info opacity-0"
          />
          <Topbar />
          <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1680px] px-5 py-5 lg:px-6">{children}</div>
          </div>
        </SidebarInset>
      </TooltipProvider>
      <Toaster position="bottom-right" closeButton richColors={false} />
    </SidebarProvider>
  );
}
