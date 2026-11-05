'use client';

import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { USERS } from '@/data/users';
import { formatDateTime } from '@/domain/clock';
import { USER_ROLE_LABEL, USER_ROLE_SUMMARY } from '@/domain/labels';
import type { UserRole } from '@/domain/types';
import { useActivityStore } from '@/store/activity-store';
import { BellRing, History, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

/**
 * Administración de usuarios y roles (módulo 8 del pliego).
 *
 * Incluye el registro de operadores, la matriz de permisos por rol, la
 * configuración de notificaciones y el historial de acciones del turno.
 */
const ROLES: readonly UserRole[] = ['administrador', 'supervisor', 'operador', 'consulta'];

const PERMISSION_MATRIX: readonly { label: string; values: readonly boolean[] }[] = [
  { label: 'Ver cámaras en vivo', values: [true, true, true, true] },
  { label: 'Configurar zonas y reglas', values: [true, true, false, false] },
  { label: 'Administrar usuarios', values: [true, false, false, false] },
  { label: 'Confirmar y descartar incidentes', values: [true, true, true, false] },
  { label: 'Cerrar incidentes', values: [true, true, true, false] },
  { label: 'Ver analítica y reportes', values: [true, true, true, true] },
  { label: 'Simular incidentes (demo)', values: [true, true, true, false] },
];

const NOTIFICATION_CHANNELS = [
  { id: 'app', label: 'Notificación en la plataforma', enabled: true },
  { id: 'email', label: 'Correo electrónico al supervisor', enabled: true },
  { id: 'sms', label: 'SMS al jefe de turno', enabled: false },
  { id: 'webhook', label: 'Webhook hacia el sistema de、视频', enabled: false },
] as const;

export function UsersView() {
  const entries = useActivityStore((state) => state.entries);
  const [channels, setChannels] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NOTIFICATION_CHANNELS.map((channel) => [channel.id, channel.enabled])),
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Módulo 8 · Administración"
        title="Usuarios, roles y auditoría"
        description="Operadores del centro de control, permisos por rol, canales de notificación y trazabilidad de las acciones realizadas sobre el perímetro."
      />

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card size="sm" className="overflow-hidden">
          <CardHeader>
            <CardTitle>Usuarios registrados</CardTitle>
            <CardDescription>
              {USERS.filter((user) => user.active).length} activos de {USERS.length} usuarios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead className="w-[140px]">Rol</TableHead>
                  <TableHead className="w-[180px]">Turno</TableHead>
                  <TableHead className="w-[100px]">Estado</TableHead>
                  <TableHead className="w-[150px]">Última actividad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {USERS.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <span className="block font-medium">{user.name}</span>
                      <span className="block text-xs text-muted-foreground">{user.email}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-border bg-muted text-muted-foreground"
                      >
                        {USER_ROLE_LABEL[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{user.shift}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          user.active
                            ? 'border-normal/40 bg-normal/10 text-normal'
                            : 'border-border bg-muted text-muted-foreground'
                        }
                      >
                        {user.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {formatDateTime(user.lastActivity)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Roles y permisos</CardTitle>
              <CardDescription>Matriz de acceso por rol del centro de control.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {ROLES.map((role) => (
                  <div key={role} className="rounded-lg border border-border px-3 py-2">
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      <ShieldCheck className="size-3.5 text-info" />
                      {USER_ROLE_LABEL[role]}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {USER_ROLE_SUMMARY[role]}
                    </p>
                  </div>
                ))}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Permiso</TableHead>
                      {ROLES.map((role) => (
                        <TableHead key={role} className="w-[92px] text-center">
                          {USER_ROLE_LABEL[role].slice(0, 6)}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PERMISSION_MATRIX.map((permission) => (
                      <TableRow key={permission.label}>
                        <TableCell className="text-xs">{permission.label}</TableCell>
                        {permission.values.map((allowed, index) => (
                          <TableCell key={index} className="text-center">
                            <span
                              className={`inline-block size-2 rounded-full ${
                                allowed ? 'bg-normal' : 'bg-muted-foreground/30'
                              }`}
                              aria-label={allowed ? 'Permitido' : 'Denegado'}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Notificaciones</CardTitle>
              <CardDescription>Canales por los que se avisa al turno.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {NOTIFICATION_CHANNELS.map((channel) => (
                  <li
                    key={channel.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <BellRing className="size-3.5 text-muted-foreground" />
                      {channel.label}
                    </span>
                    <Switch
                      checked={channels[channel.id] ?? false}
                      onCheckedChange={(checked) =>
                        setChannels((current) => ({ ...current, [channel.id]: checked }))
                      }
                      aria-label={channel.label}
                    />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Historial de acciones</CardTitle>
          <CardDescription>
            Auditoría de los cambios aplicados sobre las cámaras, zonas, reglas e incidentes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Todavía no hay acciones registradas en esta sesión. Usa «Simular incidente» para
              generar una.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {entries.slice(0, 12).map((entry) => (
                <li key={entry.id} className="flex items-start gap-3 py-2.5">
                  <History className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">{entry.action}</span>
                    <span className="block text-xs text-muted-foreground">
                      {entry.target} · {entry.detail}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                    {formatDateTime(entry.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
