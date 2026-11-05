'use client';

import { Badge } from '@/components/ui/badge';
import { CameraStatusBadge } from '@/components/status-badge';
import { useCamerasStore } from '@/store/cameras-store';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_SECTIONS } from './navigation';

/**
 * Barra lateral de navegación.
 *
 * Identifica el producto y marca de forma visible que la plataforma es un
 * mockup simulado, tal como exige el pliego para los elementos de demostración.
 */
export function Sidebar() {
  const pathname = usePathname();
  const overrides = useCamerasStore((state) => state.overrides);

  const online = Object.values(overrides).filter((override) => override.status === 'activa').length;
  const baseOnline = 29 - Object.keys(overrides).length;
  const connected = Math.max(0, baseOnline + online);

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-4 py-4">
        <p className="text-[17px] leading-none font-bold tracking-[0.2em] text-foreground">
          AGUNSA
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span className="h-px w-6 bg-info" aria-hidden="true" />
          <p className="text-[10px] leading-none font-semibold tracking-[0.4em] text-info uppercase">
            Sentinel
          </p>
        </div>
        <p className="mt-2.5 text-[11px] leading-snug text-muted-foreground">
          Seguridad perimetral inteligente
        </p>
      </div>

      <div className="px-4 pt-3">
        <Badge
          variant="outline"
          className="w-full justify-center border-warning/45 bg-warning/10 py-1 text-[11px] font-semibold tracking-[0.12em] text-warning uppercase"
        >
          Mockup simulado
        </Badge>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-5">
            <p className="px-2 pb-2 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground/80 uppercase">
              {section.title}
            </p>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      data-testid={`nav-${item.href.replaceAll('/', '-')}`}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors ${
                        active
                          ? 'bg-info/12 font-medium text-info ring-1 ring-info/25 ring-inset'
                          : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      }`}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">Cámaras en línea</span>
          <CameraStatusBadge status="activa" />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="tabular-nums">{connected}</span> de 36 cámaras operativas
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/70">
          Datos y detección generados localmente. Sin conexión a equipos reales.
        </p>
      </div>
    </aside>
  );
}
