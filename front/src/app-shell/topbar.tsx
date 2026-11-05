'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SimulationControl } from '@/features/simulation/simulation-control';
import { CURRENT_USER } from '@/data/users';
import { USER_ROLE_LABEL } from '@/domain/labels';
import { LogOut, Settings, UserRound } from 'lucide-react';
import { AlertDrawer } from './alert-drawer';
import { SimulatedClock } from './simulated-clock';

/** Barra superior: contexto de la sesión, reloj simulado y acceso a la demo. */
export function Topbar() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card/60 px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="hidden text-xs text-muted-foreground sm:inline">
          Centro de control · turno noche
        </span>
        <span className="hidden h-4 w-px bg-border sm:inline-block" />
        <span className="text-xs text-muted-foreground">
          Hora simulada <SimulatedClock />
        </span>
      </div>

      <div className="flex items-center gap-2">
        <SimulationControl variant="button" />

        <AlertDrawer />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
              Perfil (simulado)
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

        <Badge
          variant="outline"
          className="hidden border-border bg-muted text-[11px] text-muted-foreground lg:inline-flex"
        >
          v1.0 · demo
        </Badge>
      </div>
    </header>
  );
}
