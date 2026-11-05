import {
  BarChart3,
  Cctv,
  ClipboardList,
  Globe2,
  LayoutDashboard,
  MapPinned,
  Settings2,
  Siren,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { MouseEvent } from 'react';

/** Estructura de navegación del centro de control. */
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
  /** Contenido corto que se muestra junto al elemento (estado, contador). */
  badge?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Callback que sustituye la navegación nativa de un enlace interno.
 *
 * Recibe el destino y el evento original para poder prevenirlo, de modo que
 * el armazón decida si la ruta se anima o si el navegador la resuelve.
 */
export type NavLinkHandler = (href: string, event: MouseEvent<HTMLAnchorElement>) => void;

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    title: 'Operación',
    items: [
      {
        href: '/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        description: 'Resumen general de la instalación',
      },
      {
        href: '/monitoreo',
        label: 'Centro de monitoreo',
        icon: Cctv,
        description: '36 cámaras en cuadrícula',
      },
      {
        href: '/mapa',
        label: 'Mapa perimetral',
        icon: MapPinned,
        description: 'Plano 2D y vista 3D',
      },
      {
        href: '/geoespacial',
        label: 'Gemelo digital',
        icon: Globe2,
        description: 'Vista geoespacial sobre el terreno real',
      },
      {
        href: '/incidentes',
        label: 'Incidentes',
        icon: Siren,
        description: 'Alertas y gestión',
      },
      {
        href: '/linea-de-tiempo',
        label: 'Línea de tiempo',
        icon: ClipboardList,
        description: 'Reproducción de la noche',
      },
      {
        href: '/analitica',
        label: 'Analítica',
        icon: BarChart3,
        description: 'Estadísticas y reportes',
      },
    ],
  },
  {
    title: 'Configuración',
    items: [
      {
        href: '/configuracion/camaras',
        label: 'Cámaras',
        icon: Cctv,
        description: 'Registro y servicios',
      },
      {
        href: '/configuracion/zonas',
        label: 'Zonas y líneas',
        icon: Settings2,
        description: 'Zonas inteligentes',
      },
      {
        href: '/configuracion/reglas',
        label: 'Motor de reglas',
        icon: SlidersHorizontal,
        description: 'Reglas de seguridad',
      },
      {
        href: '/configuracion/usuarios',
        label: 'Usuarios y roles',
        icon: Users,
        description: 'Permisos y auditoría',
      },
    ],
  },
  {
    title: 'Proyecto',
    items: [
      {
        href: '/modernizacion',
        label: 'Plan de modernización',
        icon: ClipboardList,
        description: 'Fases, capacidad y aceptación',
      },
    ],
  },
];
