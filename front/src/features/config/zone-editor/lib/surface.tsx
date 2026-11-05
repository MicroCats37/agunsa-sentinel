'use client';

import type { Point, VirtualLine, Zone } from '@/domain/types';

/**
 * Superficie de dibujo del editor de zonas.
 *
 * Trabaja en coordenadas normalizadas (0..1) sobre el lienzo del feed, de modo
 * que los polígonos definidos aquí son válidos en cualquier resolución de
 * cámara.
 */

export type EditorMode = 'select' | 'polygon' | 'line';

export interface SurfaceProps {
  zones: readonly Zone[];
  lines: readonly VirtualLine[];
  selectedZoneId: string | null;
  mode: EditorMode;
  draftPoints: readonly Point[];
  onSurfaceClick: (point: Point) => void;
  onSelectZone: (zoneId: string) => void;
}

const ZONE_FILL: Record<Zone['kind'], string> = {
  perimetro: 'rgba(63, 178, 127, 0.18)',
  restringida: 'rgba(229, 72, 77, 0.2)',
  permanencia: 'rgba(232, 163, 61, 0.2)',
  vigilancia: 'rgba(79, 157, 240, 0.18)',
};

const ZONE_STROKE: Record<Zone['kind'], string> = {
  perimetro: '#3fb27f',
  restringida: '#e5484d',
  permanencia: '#e8a33d',
  vigilancia: '#4f9df0',
};

export function Surface({
  zones,
  lines,
  selectedZoneId,
  mode,
  draftPoints,
  onSurfaceClick,
  onSelectZone,
}: SurfaceProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={`absolute inset-0 h-full w-full ${
        mode === 'select' ? 'cursor-default' : 'cursor-crosshair'
      }`}
      data-testid="zone-surface"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        onSurfaceClick({
          x: (event.clientX - rect.left) / rect.width,
          y: (event.clientY - rect.top) / rect.height,
        });
      }}
    >
      {zones.map((zone) => {
        const selected = zone.id === selectedZoneId;
        return (
          <g key={zone.id} onClick={(event) => event.stopPropagation()}>
            <polygon
              points={zone.polygon.map((point) => `${point.x * 100},${point.y * 100}`).join(' ')}
              fill={ZONE_FILL[zone.kind]}
              stroke={ZONE_STROKE[zone.kind]}
              strokeWidth={selected ? 2.4 : 1.4}
              strokeDasharray={zone.enabled ? undefined : '4 3'}
              vectorEffect="non-scaling-stroke"
              className="cursor-pointer"
              onClick={() => onSelectZone(zone.id)}
              opacity={zone.enabled ? 1 : 0.55}
            />
            {selected ? (
              <>
                {zone.polygon.map((point, index) => (
                  <circle
                    key={index}
                    cx={point.x * 100}
                    cy={point.y * 100}
                    r={1.1}
                    fill="#0a0e13"
                    stroke={ZONE_STROKE[zone.kind]}
                    strokeWidth={1.6}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </>
            ) : null}
          </g>
        );
      })}

      {lines.map((line) => (
        <g key={line.id} opacity={line.enabled ? 1 : 0.5}>
          <line
            x1={line.from.x * 100}
            y1={line.from.y * 100}
            x2={line.to.x * 100}
            y2={line.to.y * 100}
            stroke="#fbbf24"
            strokeWidth={1.8}
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={line.from.x * 100}
            cy={line.from.y * 100}
            r={0.9}
            fill="#fbbf24"
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={line.to.x * 100}
            cy={line.to.y * 100}
            r={0.9}
            fill="#fbbf24"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}

      {draftPoints.length > 0 ? (
        <g>
          <polyline
            points={draftPoints.map((point) => `${point.x * 100},${point.y * 100}`).join(' ')}
            fill="rgba(79, 157, 240, 0.14)"
            stroke="#4f9df0"
            strokeWidth={1.6}
            strokeDasharray="3 2"
            vectorEffect="non-scaling-stroke"
          />
          {draftPoints.map((point, index) => (
            <circle
              key={index}
              cx={point.x * 100}
              cy={point.y * 100}
              r={1}
              fill="#4f9df0"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      ) : null}
    </svg>
  );
}
