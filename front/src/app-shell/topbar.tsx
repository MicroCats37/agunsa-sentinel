'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { CURRENT_USER } from '@/data/users';
import { USER_ROLE_LABEL } from '@/domain/labels';
import { LiveTransport } from '@/features/simulation/live-transport';
import { LogOut, Search, Settings, UserRound } from 'lucide-react';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { AlertDrawer } from './alert-drawer';
import { OperationClock } from './operation-clock';
import { ThemeToggle } from './theme-toggle';

/**
 * Atajo de teclado del buscador.
 *
 * Devuelve la etiqueta que se muestra en la píldora y enfoca el campo al
 * pulsar ⌘K (macOS) o Ctrl+K (resto de plataformas).
 */
function useSearchShortcut(inputRef: RefObject<HTMLInputElement | null>): string {
  const [label, setLabel] = useState('Ctrl K');

  useEffect(() => {
    const isApple = /mac|iphone|ipad|ipod/i.test(navigator.userAgent);
    setLabel(isApple ? '⌘K' : 'Ctrl K');
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key.toLowerCase() !== 'k') return;
      if (!event.metaKey && !event.ctrlKey) return;
      event.preventDefault();
      inputRef.current?.focus();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [inputRef]);

  return label;
}

/** Barra superior: contexto de la sesión, transporte de la operación y usuario. */
export function Topbar() {
  const searchRef = useRef<HTMLInputElement>(null);
  const shortcut = useSearchShortcut(searchRef);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      <SidebarTrigger className="md:hidden" />

      <form
        role="search"
        onSubmit={(event) => event.preventDefault()}
        className="relative w-full max-w-[320px]"
      >
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={searchRef}
          type="search"
          name="q"
          placeholder="Buscar..."
          aria-label="Buscar en el centro de control"
          className="h-9 w-full max-w-[320px] pr-14 pl-9"
          data-testid="global-search"
        />
        <Kbd className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2">
          {shortcut}
        </Kbd>
      </form>

      <div className="ml-auto flex items-center gap-2">
        <span className="hidden items-center gap-2 text-xs text-muted-foreground lg:flex">
          <span>Centro de control · turno noche</span>
          <span className="h-4 w-px bg-border" aria-hidden="true" />
          <OperationClock />
        </span>

        <LiveTransport />

        <AlertDrawer />

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors duration-(--duration-fast) hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              data-testid="topbar-user-trigger"
            >
              <Avatar className="size-7">
                <AvatarFallback className="bg-info/15 text-[11px] font-semibold text-info">
                  {CURRENT_USER?.name
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden min-w-0 sm:block">
                <span className="block truncate text-xs leading-tight font-medium">
                  {CURRENT_USER?.name}
                </span>
                <span className="block truncate text-[11px] leading-tight text-muted-foreground">
                  {CURRENT_USER ? USER_ROLE_LABEL[CURRENT_USER.role] : '—'}
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <span className="block text-sm">{CURRENT_USER?.name}</span>
              <span className="block text-xs font-normal text-muted-foreground">
                {CURRENT_USER?.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <UserRound className="size-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Settings className="size-4" />
              Preferencias
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <LogOut className="size-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
