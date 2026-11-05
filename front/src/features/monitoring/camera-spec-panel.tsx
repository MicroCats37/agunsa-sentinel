'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/domain/clock';
import type { Camera } from '@/domain/types';
import { Activity, Cpu, Gauge, Radio, ShieldCheck, Wifi } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Ficha técnica de la cámara (módulo 2 del pliego).
 *
 * Reproduce la ficha de un equipo IP industrial real: sensor, lente, IR, WDR,
 * alimentación, red, entorno y certificaciones, más el estado de servicio que
 * devuelve el equipo en cada consulta.
 */
export function CameraSpecPanel({ camera }: { camera: Camera }) {
  const spec = camera.spec;
  const uptimeDays = Math.floor(spec.uptimeHours / 24);

  return (
    <div className="flex flex-col gap-4">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Especificaciones del equipo</CardTitle>
          <CardDescription>
            Modelo {spec.model} · {spec.formFactor === 'bullet' ? 'cámara bala' : 'cámara domo'} ·
            valores declarados por el fabricante.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 text-xs sm:grid-cols-2">
            <SpecGroup title="Sensor e imagen">
              <Spec label="Sensor" value={spec.sensor} />
              <Spec label="Resolución" value={`${spec.resolutionWidth}×${spec.resolutionHeight}`} />
              <Spec
                label="Flujo principal"
                value={`${spec.fps} fps · ${spec.subStream} sub-stream`}
              />
              <Spec
                label="Iluminación mínima"
                value={`0,005 lx (F${spec.aperture.toFixed(1)}, AGC on)`}
              />
              <Spec label="Obturador" value="1/3 s – 1/100 000 s" />
              <Spec
                label="Filtre IR-cut"
                value="Conmutación automática (ICR) día color / noche monocromo"
              />
              <Spec label="Rango dinámico" value={`WDR real ≥ ${spec.wdrDb} dB`} />
              <Spec
                label="Reducción de ruido"
                value={spec.dnr ? 'DNR 3D activa' : 'DNR desactivada'}
              />
            </SpecGroup>

            <SpecGroup title="Óptica">
              <Spec
                label="Lente"
                value={`${spec.lensType === 'fija' ? 'Fija' : 'Varifocal motorizada'} ${spec.focalLengthMm.toFixed(1)} mm`}
              />
              <Spec label="Campo de visión horizontal" value={`${spec.horizontalFovDeg}°`} />
              <Spec label="Apertura máxima" value={`F${spec.aperture.toFixed(1)}`} />
            </SpecGroup>

            <SpecGroup title="Iluminación nocturna">
              <Spec label="Distancia IR" value={`${spec.irDistanceM} m`} />
              <Spec label="Longitud de onda" value={`${spec.irWavelengthNm} nm`} />
              <Spec
                label="Smart IR"
                value={spec.smartIr ? 'Activo (caída de exposición)' : 'No disponible'}
              />
            </SpecGroup>

            <SpecGroup title="Codificación">
              <Spec label="Códecs" value="H.265+ / H.265 / H.264+ / H.264 / MJPEG" />
              <Spec label="Códec activo" value={spec.codec} />
              <Spec label="Control de bitrate" value="CBR / VBR" />
              <Spec label="Bitrate configurado" value={`${spec.bitrateKbps} kbps`} />
              <Spec label="Privacidad / ROI" value="4 polígonos de privacidad · ROI 1–4" />
            </SpecGroup>

            <SpecGroup title="Alimentación">
              <Spec label="Alimentación" value="12 V DC ±25 %" />
              <Spec label="PoE" value={spec.poeClass} />
              <Spec
                label="Consumo máximo"
                value={`${spec.powerDrawW} W (${spec.powerDrawIrW} W con IR)`}
              />
            </SpecGroup>

            <SpecGroup title="Red">
              <Spec label="Interfaz" value="1× RJ45 10/100 autosadaptable" />
              <Spec
                label="Protocolos"
                value="IPv4/IPv6, HTTP(S), RTSP, TCP/IP, UDP, DHCP, NTP, SMTP, QoS"
              />
              <Spec label="ONVIF" value={`Perfiles ${spec.onvifProfiles.join(' / ')}`} />
              <Spec label="Usuarios" value="32 usuarios en 3 niveles" />
              <Spec label="Dirección IP" value={camera.ip} />
            </SpecGroup>

            <SpecGroup title="Entorno y certificaciones">
              <Spec
                label="Protección"
                value={`${spec.ipRating}${spec.ikRating ? ` · ${spec.ikRating}` : ''}`}
              />
              <Spec
                label="Temperatura de trabajo"
                value={`${spec.minTempC} °C a ${spec.maxTempC} °C`}
              />
              <Spec label="Humedad" value="≤ 95 %" />
              <Spec label="Carcasa" value="Metal / aleación de aluminio" />
              <Spec label="Mass" value="0,52 kg" />
            </SpecGroup>
          </dl>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Estado de servicio</CardTitle>
          <CardDescription>
            Telemetría del equipo en la última consulta al simulador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2.5">
            <ServiceRow
              icon={<Activity className="size-3.5" />}
              label="Tiempo de servicio"
              value={`${uptimeDays} d · ${spec.uptimeHours % 24} h`}
              tone="normal"
            />
            <ServiceRow
              icon={<Gauge className="size-3.5" />}
              label="Latencia de decodificación"
              value={`${spec.latencyMs} ms`}
              tone="normal"
            />
            <ServiceRow
              icon={<Wifi className="size-3.5" />}
              label="Nivel de señal"
              value={`${spec.signalDbm} dBm`}
              tone={spec.signalDbm < -58 ? 'warning' : 'normal'}
            />
            <ServiceRow
              icon={<Cpu className="size-3.5" />}
              label="Motor de IA"
              value="Detección local activa (persona / vehículo)"
              tone="normal"
            />
            <ServiceRow
              icon={<Radio className="size-3.5" />}
              label="Última señal"
              value={formatDateTime(camera.lastSeen)}
              tone={camera.status === 'inactiva' ? 'warning' : 'normal'}
            />
            <ServiceRow
              icon={<ShieldCheck className="size-3.5" />}
              label="Cumplimiento"
              value={`${spec.onvifProfiles.join(' / ')} · ${spec.ipRating}${spec.ikRating ? ` · ${spec.ikRating}` : ''}`}
              tone="normal"
            />
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function SpecGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 border-b border-border pb-1 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        {title}
      </p>
      <dl className="flex flex-col gap-2">{children}</dl>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium break-words text-foreground">{value}</dd>
    </div>
  );
}

function ServiceRow({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: 'normal' | 'warning';
}) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-border/60 pb-2.5 last:border-0 last:pb-0">
      <span className="flex items-center gap-2 text-sm text-foreground">
        <span className={tone === 'normal' ? 'text-info' : 'text-warning'}>{icon}</span>
        {label}
      </span>
      <Badge
        variant="outline"
        className={
          tone === 'normal'
            ? 'border-border bg-muted text-muted-foreground'
            : 'border-warning/45 bg-warning/10 text-warning'
        }
      >
        {value}
      </Badge>
    </li>
  );
}
