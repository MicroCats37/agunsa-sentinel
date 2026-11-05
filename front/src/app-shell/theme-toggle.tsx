'use client';

import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

type ThemeState = 'light' | 'dark' | 'system';

/** Ciclo del conmutador: claro → oscuro → sistema → claro. */
const NEXT_THEME: Record<ThemeState, ThemeState> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
};

/** Describe la acción siguiente, nunca el estado actual. */
const ACTION_LABEL: Record<ThemeState, string> = {
  light: 'Cambiar a tema oscuro',
  dark: 'Cambiar a tema del sistema',
  system: 'Cambiar a tema claro',
};

interface ViewTransitionHost {
  startViewTransition: (callback: () => void | Promise<void>) => unknown;
}

/**
 * Devuelve el documento sólo si el navegador soporta View Transitions.
 * `lib.dom` no siempre declara `startViewTransition`, así que la capacidad se
 * comprueba en tiempo de ejecución en lugar de asumirla.
 */
function getViewTransitionHost(): ViewTransitionHost | null {
  if (typeof document === 'undefined') return null;
  const candidate = document as unknown as Partial<ViewTransitionHost>;
  return typeof candidate.startViewTransition === 'function'
    ? (candidate as ViewTransitionHost)
    : null;
}

function isThemeState(value: string | undefined): value is ThemeState {
  return value === 'light' || value === 'dark' || value === 'system';
}

/**
 * Conmutador de tema de tres estados: claro, oscuro y sistema.
 *
 * El icono refleja el estado actual (`Sun` en claro, `Moon` en oscuro,
 * `Monitor` en sistema) y la etiqueta describe la acción siguiente.
 *
 * El icono se resuelve tras el montaje: el servidor no sabe qué tema tiene
 * guardado el navegador, así que renderiza el estado neutro y el cliente
 * aplica el definitivo.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const current: ThemeState = mounted && isThemeState(theme) ? theme : 'light';

  const applyTheme = (target: ThemeState) => {
    const host = getViewTransitionHost();
    if (!host) {
      setTheme(target);
      return;
    }
    host.startViewTransition(() => {
      setTheme(target);
      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
    });
  };

  const Icon = current === 'light' ? Sun : current === 'dark' ? Moon : Monitor;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => applyTheme(NEXT_THEME[current])}
      aria-label={ACTION_LABEL[current]}
      title={ACTION_LABEL[current]}
      data-testid="theme-toggle"
    >
      <Icon className="size-4" />
    </Button>
  );
}
