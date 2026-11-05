'use client';

import { Badge } from '@/components/ui/badge';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { useCamerasStore } from '@/store/cameras-store';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_SECTIONS, type NavLinkHandler } from './navigation';
import { NavSecondary } from './nav-secondary';
import { NavUser } from './nav-user';

/**
 * Estado de los elementos de navegación.
 *
 * En reposo el rótulo y el icono se quedan en gris apagado. El elemento
 * activo invierte la paleta: superficie blanca (`--sidebar-primary`) con
 * texto e icono casi negros (`--sidebar-primary-foreground`). Las utilidades
 * de estado activo se escriben como variantes arbitrarias porque ganan en
 * especificidad a las del tema (`data-active:*`), que sólo pintan el hover.
 */
const MENU_ITEM =
  'text-muted-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:hover:bg-sidebar-primary data-[active=true]:hover:text-sidebar-primary-foreground';

export interface AppSidebarProps {
  /** Sustituye la navegación nativa para animar el cambio de ruta. */
  onNavigate: NavLinkHandler;
}

/**
 * Barra lateral de navegación.
 *
 * Identifica el producto y el estado del centro de control: un indicador
 * discreto de sistema operativo.
 *
 * El bloque superior usa la marca real de AGUNSA (logotipo y bloque CST
 * GROUP) en lugar de una tipografía sustitutiva: la identidad del cliente no
 * se improvisa.
 */
export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  const overrides = useCamerasStore((state) => state.overrides);

  const online = Object.values(overrides).filter((override) => override.status === 'activa').length;
  const baseOnline = 29 - Object.keys(overrides).length;
  const connected = Math.max(0, baseOnline + online);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="gap-3 p-4 pb-3 group-data-[collapsible=icon]:p-1">
        <div className="flex items-center gap-3">
          {/*
           * Logotipo real de AGUNSA · CST GROUP. Se conserva la marca de
           * cliente: lo que no va en pantalla es el nombre del producto.
           */}
          <img
            src="/brand/logo-agunsa-cst.png"
            alt="AGUNSA · CST GROUP"
            className="h-9 w-auto shrink-0 object-contain group-data-[collapsible=icon]:hidden"
            data-testid="sidebar-brand-lockup"
          />
          {/*
           * Rail colapsado: el mismo lockup real recortado al monograma de
           * CST. Es una recorte del PNG de marca, no un logotipo inventado.
           */}
          <span
            className="relative hidden size-9 shrink-0 overflow-hidden group-data-[collapsible=icon]:block"
            aria-hidden="true"
          >
            <img
              src="/brand/logo-agunsa-cst.png"
              alt=""
              className="absolute top-0 left-0 h-[288px] w-[867px] max-w-none origin-top-left scale-[0.1517]"
            />
          </span>
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground group-data-[collapsible=icon]:hidden">
          Seguridad perimetral inteligente
        </p>
        <span
          className="flex w-full items-center justify-center gap-1.5 rounded-full border border-border py-1 text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase group-data-[collapsible=icon]:hidden"
          data-testid="sidebar-system-status"
        >
          <span className="size-1.5 rounded-full bg-normal" aria-hidden="true" />
          Sistema operativo
        </span>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {NAV_SECTIONS.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {section.title}
            </SidebarGroupLabel>
            <SidebarMenu>
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      title={item.description}
                      data-testid={`nav-${item.href.replaceAll('/', '-')}`}
                      className={MENU_ITEM}
                    >
                      <Link
                        href={item.href}
                        onClick={(event) => onNavigate(item.href, event)}
                        aria-current={active ? 'page' : undefined}
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="gap-3 p-3">
        <NavSecondary onNavigate={onNavigate} />

        <div className="flex flex-col gap-1.5 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">Cámaras en línea</span>
            <Badge variant="positive">Normal</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="tabular-nums">{connected}</span> de 36 cámaras operativas
          </p>
        </div>

        <div className="flex flex-col gap-2 group-data-[collapsible=icon]:hidden">
          <p className="text-[11px] leading-relaxed text-muted-foreground/70">
            Capturas en vivo reenviadas por el visor NVR. Detecciones confirmadas por el motor de
            reglas.
          </p>
        </div>

        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
