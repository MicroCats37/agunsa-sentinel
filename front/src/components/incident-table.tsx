import { CapabilityBadge, IncidentStatusBadge, SeverityBadge } from '@/components/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/domain/clock';
import type { Camera, Incident, User, Zone } from '@/domain/types';
import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Tabla de incidentes.
 *
 * Recibe todos los datos por props (capa `components/` no conoce el store) y
 * enlaza cada fila con la ficha del incidente.
 */
export interface IncidentTableProps {
  incidents: Incident[];
  cameras: readonly Camera[];
  zones: readonly Zone[];
  users: readonly User[];
  renderActions?: (incident: Incident) => ReactNode;
  emptyMessage?: string;
}

export function IncidentTable({
  incidents,
  cameras,
  zones,
  users,
  renderActions,
  emptyMessage = 'No hay incidentes que coincidan con los filtros aplicados.',
}: IncidentTableProps) {
  const cameraById = new Map(cameras.map((camera) => [camera.id, camera] as const));
  const zoneById = new Map(zones.map((zone) => [zone.id, zone] as const));
  const userById = new Map(users.map((user) => [user.id, user] as const));

  if (incidents.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[110px]">Incidente</TableHead>
          <TableHead className="w-[150px]">Fecha y hora</TableHead>
          <TableHead className="w-[170px]">Cámara</TableHead>
          <TableHead>Zona / tipo</TableHead>
          <TableHead className="w-[110px]">Severidad</TableHead>
          <TableHead className="w-[120px]">Estado</TableHead>
          <TableHead className="w-[150px]">Responsable</TableHead>
          <TableHead className="w-[100px] text-right">Confianza</TableHead>
          {renderActions ? <TableHead className="w-[120px] text-right">Acciones</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {incidents.map((incident) => {
          const camera = cameraById.get(incident.cameraId);
          const zone = zoneById.get(incident.zoneId);
          const assignee = incident.assigneeId ? userById.get(incident.assigneeId) : undefined;
          return (
            <TableRow key={incident.id} className="align-top">
              <TableCell>
                <Link
                  href={`/incidentes/${incident.id}`}
                  className="font-medium text-info hover:underline"
                  data-testid={`incident-link-${incident.id}`}
                >
                  {incident.id}
                </Link>
                {incident.simulated ? (
                  <span className="mt-1 block text-[11px] text-warning">
                    Generado por simulación
                  </span>
                ) : null}
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {formatDateTime(incident.occurredAt)}
              </TableCell>
              <TableCell>
                <span className="font-medium">{incident.cameraId}</span>
                <span className="block max-w-[170px] truncate text-xs text-muted-foreground">
                  {camera?.name ?? '—'}
                </span>
              </TableCell>
              <TableCell>
                <span className="block max-w-[260px] truncate">{incident.type}</span>
                <span className="block max-w-[260px] truncate text-xs text-muted-foreground">
                  {zone?.name ?? incident.zoneId}
                </span>
                <CapabilityBadge capability={incident.capability} />
              </TableCell>
              <TableCell>
                <SeverityBadge severity={incident.severity} />
              </TableCell>
              <TableCell>
                <IncidentStatusBadge status={incident.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {assignee?.name ?? <span className="text-muted-foreground/70">Sin asignar</span>}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {incident.confidence === null ? '—' : `${Math.round(incident.confidence * 100)}%`}
              </TableCell>
              {renderActions ? (
                <TableCell className="text-right">{renderActions(incident)}</TableCell>
              ) : null}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
