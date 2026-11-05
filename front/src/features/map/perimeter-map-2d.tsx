'use client';

import {
  PLAN_BUILDINGS,
  PLAN_FENCE,
  PLAN_GATES,
  PLAN_HEIGHT,
  PLAN_WIDTH,
  PLAN_YARDS,
} from '@/data/plan';
import { SECTORS } from '@/data/sectors';
import type { Camera, Incident } from '@/domain/types';
import { useMemo } from 'react';

/**
 * Plano 2D de la instalación (módulo 3 del pliego).
 *
 * Dibuja el mismo plano que la escena 3D: cerco, edificios, patios, portones,
 * sectores y las 36 cámaras. Al seleccionar una cámara se abre su ficha.
 */

export interface PerimeterMap2DProps {
  cameras: readonly Camera[];
  incidents: readonly Incident[];
  selectedCameraId: string | null;
  onSelect: (cameraId: string) => void;
}

const STATUS_FILL: Record<Camera['status'], string> = {
  activa: '#3fb27f',
  alerta: '#e5484d',
  fallando: '#e8a33d',
  inactiva: '#5c6b80',
};

const POLYGON = PLAN_FENCE.map((point) => `${point.x},${point.y}`).join(' ');

export function PerimeterMap2D({
  cameras,
  incidents,
  selectedCameraId,
  onSelect,
}: PerimeterMap2DProps) {
  const incidentCountByCamera = useMemo(() => {
    const counts = new Map<string, number>();
    for (const incident of incidents) {
      counts.set(incident.cameraId, (counts.get(incident.cameraId) ?? 0) + 1);
    }
    return counts;
  }, [incidents]);

  const sectorIncidentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const incident of incidents) {
      counts.set(incident.sectorId, (counts.get(incident.sectorId) ?? 0) + 1);
    }
    return counts;
  }, [incidents]);

  const maxSectorIncidents = Math.max(1, ...sectorIncidentCounts.values());

  return (
    <svg
      viewBox={`0 0 ${PLAN_WIDTH} ${PLAN_HEIGHT}`}
      className="h-full w-full"
      role="img"
      aria-label="Plano perimetral de la instalación con la posición de las 36 cámaras"
      data-testid="perimeter-map-2d"
    >
      <defs>
        <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#151c26" strokeWidth="1" />
        </pattern>
        <pattern id="map-hatch" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M 0 8 L 8 0" stroke="#1d2733" strokeWidth="1" />
        </pattern>
      </defs>

      <rect width={PLAN_WIDTH} height={PLAN_HEIGHT} fill="#0a0e13" />
      <rect width={PLAN_WIDTH} height={PLAN_HEIGHT} fill="url(#map-grid)" />

      {/* Sectores perimetrales. */}
      {SECTORS.map((sector) => {
        const count = sectorIncidentCounts.get(sector.id) ?? 0;
        const intensity = count / maxSectorIncidents;
        return (
          <g key={sector.id}>
            <polygon
              points={sector.polygon.map((point) => `${point.x},${point.y}`).join(' ')}
              fill="#3b82f6"
              fillOpacity={0.04 + intensity * 0.09}
              stroke="#3b82f6"
              strokeOpacity={0.24 + intensity * 0.4}
              strokeWidth={1.2}
              strokeDasharray="6 5"
            />
            <text
              x={sector.polygon[0]?.x ?? 0}
              y={(sector.polygon[0]?.y ?? 0) + 16}
              fill="#5f7086"
              fontSize="12"
              fontWeight="600"
              letterSpacing="0.08em"
            >
              {sector.name.toUpperCase()}
            </text>
            {count > 0 ? (
              <text
                x={(sector.polygon[0]?.x ?? 0) + 150}
                y={(sector.polygon[0]?.y ?? 0) + 16}
                fill="#e8a33d"
                fontSize="11"
              >
                {count} inc.
              </text>
            ) : null}
          </g>
        );
      })}

      {/* Patios y estacionamientos. */}
      {PLAN_YARDS.map((yard) => (
        <g key={yard.id}>
          <rect
            x={yard.x}
            y={yard.y}
            width={yard.width}
            height={yard.height}
            fill="url(#map-hatch)"
            stroke="#2b3746"
            strokeWidth="1"
          />
          <text x={yard.x + 10} y={yard.y + 18} fill="#5f7086" fontSize="11" letterSpacing="0.06em">
            {yard.name.toUpperCase()}
          </text>
        </g>
      ))}

      {/* Edificios. */}
      {PLAN_BUILDINGS.map((building) => (
        <g key={building.id}>
          <rect
            x={building.x}
            y={building.y}
            width={building.width}
            height={building.height}
            fill="#151d27"
            stroke="#3a4a5e"
            strokeWidth="1.4"
            rx="3"
          />
          <text
            x={building.x + building.width / 2}
            y={building.y + building.height / 2}
            fill="#7d8ea3"
            fontSize="13"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {building.name}
          </text>
        </g>
      ))}

      {/* Cerco perimetral. */}
      <polygon
        points={POLYGON}
        fill="none"
        stroke="#6b7f96"
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeDasharray="14 6"
      />

      {/* Portones. */}
      {PLAN_GATES.map((gate) => (
        <g key={gate.id}>
          <line
            x1={gate.from.x}
            y1={gate.from.y}
            x2={gate.to.x}
            y2={gate.to.y}
            stroke="#e8a33d"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <text
            x={gate.from.x + (gate.kind === 'principal' ? -12 : 12)}
            y={gate.from.y - 10}
            fill="#e8a33d"
            fontSize="11"
            textAnchor={gate.kind === 'principal' ? 'end' : 'start'}
          >
            {gate.name}
          </text>
        </g>
      ))}

      {/* Cámaras. */}
      {cameras.map((camera) => {
        const selected = camera.id === selectedCameraId;
        const incidentCount = incidentCountByCamera.get(camera.id) ?? 0;
        const rad = (camera.heading * Math.PI) / 180;
        const tipX = camera.position.x + Math.cos(rad) * 22;
        const tipY = camera.position.y + Math.sin(rad) * 22;

        return (
          <g
            key={camera.id}
            onClick={() => onSelect(camera.id)}
            className="cursor-pointer"
            data-testid={`map-camera-${camera.id}`}
          >
            <title>{`${camera.id} · ${camera.name} · ${incidentCount} incidentes`}</title>
            {camera.status === 'alerta' ? (
              <circle
                cx={camera.position.x}
                cy={camera.position.y}
                r={16}
                fill="none"
                stroke="#e5484d"
                strokeWidth="1.5"
                opacity="0.75"
              >
                <animate attributeName="r" values="12;22;12" dur="2.4s" repeatCount="indefinite" />
                <animate
                  attributeName="opacity"
                  values="0.8;0;0.8"
                  dur="2.4s"
                  repeatCount="indefinite"
                />
              </circle>
            ) : null}
            <line
              x1={camera.position.x}
              y1={camera.position.y}
              x2={tipX}
              y2={tipY}
              stroke={STATUS_FILL[camera.status]}
              strokeWidth="2"
              opacity="0.7"
            />
            <circle
              cx={camera.position.x}
              cy={camera.position.y}
              r={selected ? 9 : 6.5}
              fill={STATUS_FILL[camera.status]}
              stroke={selected ? '#ffffff' : '#0a0e13'}
              strokeWidth={selected ? 2.5 : 1.5}
            />
            {selected ? (
              <text
                x={camera.position.x + 12}
                y={camera.position.y - 10}
                fill="#e8eef5"
                fontSize="12"
                fontWeight="600"
              >
                {`${camera.id} · ${camera.name}`}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
