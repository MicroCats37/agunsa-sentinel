import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { IncidentStatusBadge, SeverityBadge } from '@/components/status-badge';
import { formatDateTime } from '@/domain/clock';
import type { Incident } from '@/domain/types';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

/**
 * Tabla de últimos incidentes.
 *
 * Reemplaza a la lista de eventos recientes con una lectura tabular: el
 * operador ordena por severidad y estado sin abrir cada ficha.
 */
export interface RecentIncidentsCardProps {
  title: string;
  description: string;
  incidents: readonly Incident[];
  /** Enlace de la llamada a la acción. */
  action?: { label: string; href: string };
}

export function RecentIncidentsCard({
  title,
  description,
  incidents,
  action,
}: RecentIncidentsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {action ? (
          <CardAction>
            <Button variant="ghost" size="sm" asChild className="px-0 hover:bg-transparent">
              <Link href={action.href}>
                {action.label}
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent className="px-0">
        {incidents.length === 0 ? (
          <Empty className="mx-(--card-spacing) mb-4 border border-border/60">
            <EmptyHeader>
              <EmptyTitle>Sin incidentes registrados</EmptyTitle>
              <EmptyDescription>
                Todavía no hay detecciones que revisar en el histórico.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table containerClassName="max-h-[420px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[110px]">Incidente</TableHead>
                <TableHead className="w-[150px]">Fecha y hora</TableHead>
                <TableHead className="w-[90px]">Cámara</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="w-[110px]">Severidad</TableHead>
                <TableHead className="w-[120px]">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell>
                    <Link
                      href={`/incidentes/${incident.id}`}
                      className="font-medium text-info hover:underline"
                    >
                      {incident.id}
                    </Link>
                    {incident.simulated ? (
                      <span className="mt-0.5 block text-[11px] text-warning">Origen: consola</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {formatDateTime(incident.occurredAt)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{incident.cameraId}</TableCell>
                  <TableCell className="max-w-[280px] truncate">{incident.type}</TableCell>
                  <TableCell>
                    <SeverityBadge severity={incident.severity} />
                  </TableCell>
                  <TableCell>
                    <IncidentStatusBadge status={incident.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
