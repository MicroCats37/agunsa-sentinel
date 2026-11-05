'use client';

import { Toaster } from '@/components/ui/sonner';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LiveEngine } from '@/features/simulation/live-engine';
import gsap from 'gsap';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { AppSidebar } from './sidebar';
import { SimulationTicker } from './simulation-ticker';
import { StoreHydrator } from './store-hydrator';
import { Topbar } from './topbar';

/** Milisegundos que un cambio de ruta puede tardar en resolverse. */
const NAVIGATION_TIMEOUT = 900;

/**
 * Estructura de la aplicación: navegación lateral, barra superior y contenido.
 *
 * La transición de ruta la gobierna GSAP: al pulsar un enlace interno el
 * contenido sale hacia arriba con un fundido corto y entra del mismo modo al
 * montar la nueva vista. Con `prefers-reduced-motion` la navegación es
 * inmediata.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const contentRef = useRef<HTMLDivElement>(null);
  const navigatingRef = useRef(false);

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

    navigatingRef.current = false;
    return () => ctx.revert();
  }, [pathname]);

  /**
   * Navegación interna con transición.
   *
   * El enlace es un `Link` de Next, que ya preventea el evento antes de
   * navegar; por eso el cambio de ruta se pide aquí de forma explícita en
   * lugar de interceptar los clics en un ancestro.
   */
  const handleNavigate = useCallback(
    (href: string, event: MouseEvent<HTMLAnchorElement>): void => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (href === pathname) return;

      const content = contentRef.current;
      if (!content) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      event.preventDefault();
      if (navigatingRef.current) return;
      navigatingRef.current = true;

      gsap
        .timeline()
        .to(content, { opacity: 0, y: -12, duration: 0.16, ease: 'power2.in' })
        .add(() => {
          router.push(href);
        });

      window.setTimeout(() => {
        if (!navigatingRef.current) return;
        navigatingRef.current = false;
        gsap.to(content, {
          opacity: 1,
          y: 0,
          duration: 0.2,
          ease: 'power2.out',
          clearProps: 'transform',
        });
      }, NAVIGATION_TIMEOUT);
    },
    [pathname, router],
  );

  return (
    <SidebarProvider className="h-screen w-full overflow-hidden bg-background text-foreground">
      <StoreHydrator />
      <SimulationTicker />
      <LiveEngine />
      <TooltipProvider>
        <AppSidebar onNavigate={handleNavigate} />
        <SidebarInset className="min-w-0">
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
