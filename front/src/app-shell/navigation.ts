import {
  BarChart3,
  Cctv,
  LayoutDashboard,
  MapPinned,
  Settings2,
  Siren,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from 'lucide-react';

/** Estructura de navegación del centro de control. */
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

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
        href: '/incidentes',
        label: 'Incidentes',
        icon: Siren,
        description: 'Alertas y gestión',
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
];
