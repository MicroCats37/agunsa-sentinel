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
import { CURRENT_USER } from '@/data/users';
import { USER_ROLE_LABEL } from '@/domain/labels';
import { ChevronsUpDown, LogOut, Settings, UserRound } from 'lucide-react';

/**
 * Bloque de usuario del pie de la barra lateral.
 *
 * Muestra la sesión abierta (iniciales, nombre y rol) y concentra en un menú
 * las acciones de cuenta. En el modo colapsado el rótulo se oculta y sólo
 * queda el avatar.
 */
export function NavUser() {
  const initials = CURRENT_USER?.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          data-testid="nav-user-trigger"
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-info/15 text-[11px] font-semibold text-info">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-[13px] leading-tight font-medium text-sidebar-foreground">
              {CURRENT_USER?.name}
            </span>
            <span className="truncate text-[11px] leading-tight text-muted-foreground">
              {CURRENT_USER ? USER_ROLE_LABEL[CURRENT_USER.role] : '—'}
            </span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" className="w-56">
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
  );
}
