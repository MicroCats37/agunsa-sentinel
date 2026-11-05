import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from 'cn';

export type ServiceTone = 'normal' | 'info' | 'warning' | 'critical';

export interface ServiceStatus {
  id: string;
  label: string;
  status: string;
  tone: ServiceTone;
}

export interface SystemStatusCardProps {
  title: string;
  description: string;
  services: readonly ServiceStatus[];
}

const toneDot: Record<ServiceTone, string> = {
  normal: 'bg-normal',
  info: 'bg-info',
  warning: 'bg-warning',
  critical: 'bg-critical',
};

/**
 * Estado general del sistema.
 *
 * Lista de los servicios del centro de control con su estado. El color se
 * limita al punto: rojo, ámbar o verde nunca invaden el texto.
 */
export function SystemStatusCard({ title, description, services }: SystemStatusCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3" data-testid="panel-services">
          {services.map((service) => (
            <li
              key={service.id}
              className="flex items-center justify-between gap-3 border-b border-border/60 pb-2.5 last:border-0 last:pb-0"
            >
              <span className="flex items-center gap-2 text-sm text-foreground">
                <span
                  className={cn('size-1.5 shrink-0 rounded-full', toneDot[service.tone])}
                  aria-hidden="true"
                />
                {service.label}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">{service.status}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
