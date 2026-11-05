'use client';

import { Toaster } from '@/components/ui/sonner';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { StoreHydrator } from './store-hydrator';
import { Topbar } from './topbar';

/**
 * Estructura de la aplicación: navegación lateral, barra superior y contenido.
 *
 * La navegación interna se envuelve en una View Transition para que el cambio
 * de ruta se lea como un desplazamiento de sala de control y no como un
 * parpadeo. Los navegadores sin soporte degradan a una navegación normal.
 */
interface ViewTransitionApi {
  startViewTransition?: (callback: () => void | Promise<void>) => {
    finished: Promise<void>;
    ready: Promise<void>;
  };
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const pendingRef = useRef<(() => void) | null>(null);

  // Cierra la transición cuando la nueva ruta ya está pintada.
  useEffect(() => {
    if (pendingRef.current) {
      pendingRef.current();
      pendingRef.current = null;
    }
  }, [pathname]);

  function handleClick(event: MouseEvent<HTMLDivElement>): void {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const anchor = (event.target as HTMLElement).closest('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href || !href.startsWith('/')) return;
    if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
    if (anchor.dataset.testid === 'alert-item') return;

    const doc = document as unknown as ViewTransitionApi;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    event.preventDefault();

    if (!doc.startViewTransition || reduced) {
      router.push(href);
      return;
    }

    const transition = doc.startViewTransition(() => {
      router.push(href);
      return new Promise<void>((resolve) => {
        pendingRef.current = resolve;
        // Red de seguridad: si la ruta no cambia (misma página), la transición
        // no debe quedar bloqueada.
        window.setTimeout(() => {
          if (pendingRef.current === resolve) {
            pendingRef.current = null;
            resolve();
          }
        }, 600);
      });
    });

    transition.finished.catch(() => undefined);
  }

  return (
    <div
      className="flex h-screen w-full overflow-hidden bg-background text-foreground"
      onClick={handleClick}
    >
      <StoreHydrator />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1680px] px-5 py-5 lg:px-6">{children}</div>
        </main>
      </div>
      <Toaster position="bottom-right" closeButton richColors={false} />
    </div>
  );
}
