'use client';

import { OBSTRUCTIONS } from '@/data/obstructions';
import {
  PLAN_BUILDINGS,
  PLAN_FENCE,
  PLAN_GATES,
  PLAN_HEIGHT,
  PLAN_WIDTH,
  PLAN_YARDS,
} from '@/data/plan';
import { SECTORS } from '@/data/sectors';
import { CLASSIFICATION_COLOR } from '@/domain/classification';
import { fovWedge, toPolygonPoints } from '@/domain/facing';
import type { Camera, Incident } from '@/domain/types';
import gsap from 'gsap';
import { useEffect, useMemo, useRef } from 'react';

/**
 * Plano 2D de la instalación (módulo 3 del pliego).
 *
 * Dibuja el mismo plano que la escena 3D: cerco, edificios, patios, portones,
 * sectores y las 36 cámaras. Al seleccionar una cámara se abre su ficha.
 *
 * Dos decisiones de fondo:
 *  - el **cono de visión** de cada cámara se deriva de su rumbo y de su campo
 *    de visión real, y apunta **hacia fuera** del recinto: una cámara
 *    perimetral vigila el exterior;
 *  - el color del marcador es el de la **clasificación del informe** (verde =
 *    buena general, ámbar = limitada, rojo = deficiente, gris = sin imagen),
 *    no el estado operativo.
 */

export interface PerimeterMap2DProps {
  cameras: readonly Camera[];
  incidents: readonly Incident[];
  selectedCameraId: string | null;
  onSelect: (cameraId: string) => void;
}

/**
 * Color de la clasificación del informe.
 *
 * Reexportado desde el dominio: la paleta es única para el plano 2D, la
 * escena isométrica, la vista geoespacial y el registro de cámaras.
 */
export const CLASSIFICATION_FILL = CLASSIFICATION_COLOR;

/** Longitud del cono en unidades de plano. */
const CONE_LENGTH = 62;

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
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--map-grid)" strokeWidth="1" />
        </pattern>
        <pattern id="map-hatch" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M 0 8 L 8 0" stroke="var(--map-hatch)" strokeWidth="1" />
        </pattern>
      </defs>

      <rect width={PLAN_WIDTH} height={PLAN_HEIGHT} fill="var(--map-bg)" />
      <rect width={PLAN_WIDTH} height={PLAN_HEIGHT} fill="url(#map-grid)" />

      {/* Sectores perimetrales. */}
      {SECTORS.map((sector) => {
        const count = sectorIncidentCounts.get(sector.id) ?? 0;
        const intensity = count / maxSectorIncidents;
        return (
          <g key={sector.id}>
            <polygon
              points={sector.polygon.map((point) => `${point.x},${point.y}`).join(' ')}
              fill="var(--map-annotation)"
              fillOpacity={0.05 + intensity * 0.1}
              stroke="var(--map-annotation)"
              strokeOpacity={0.28 + intensity * 0.42}
              strokeWidth={1.2}
              strokeDasharray="6 5"
            />
            <text
              x={sector.polygon[0]?.x ?? 0}
              y={(sector.polygon[0]?.y ?? 0) + 16}
              fill="var(--map-label)"
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
            stroke="var(--map-building-stroke)"
            strokeWidth="1"
          />
          <text
            x={yard.x + 10}
            y={yard.y + 18}
            fill="var(--map-label)"
            fontSize="11"
            letterSpacing="0.06em"
          >
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
            fill="var(--map-building)"
            stroke="var(--map-building-stroke)"
            strokeWidth="1.4"
            rx="3"
          />
          <text
            x={building.x + building.width / 2}
            y={building.y + building.height / 2}
            fill="var(--map-label)"
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
        stroke="var(--map-fence)"
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
            x={gate.from.x + (gate.kind === 'principal' ? 0 : 12)}
            y={gate.from.y - 10}
            fill="#e8a33d"
            fontSize="11"
            textAnchor={gate.kind === 'principal' ? 'middle' : 'start'}
          >
            {gate.name}
          </text>
        </g>
      ))}

      {/*
        Obstrucciones documentadas: se marcan sobre el plano con una etiqueta
        discreta. El informe no permite ubicarlas geográficamente, así que se
        dibujan junto al equipo asociado.
      */}
      {OBSTRUCTIONS.map((obstruction) => {
        const camera = cameras.find((item) => item.id === obstruction.cameraId);
        if (!camera) return null;
        return (
          <g key={obstruction.id}>
            <circle
              cx={camera.position.x}
              cy={camera.position.y}
              r="13"
              fill="none"
              stroke="#e8a33d"
              strokeWidth="1.4"
              strokeDasharray="3 3"
            />
            <text
              x={camera.position.x + 16}
              y={camera.position.y + 4}
              fill="#e8a33d"
              fontSize="10"
              fontWeight="600"
            >
              {obstruction.id}
            </text>
          </g>
        );
      })}

      {/* Conos de visión: apuntan hacia el exterior del recinto. */}
      <g data-testid="map-fov-cones">
        {cameras.map((camera) => {
          const wedge = fovWedge(camera.position, camera.heading, camera.fov, CONE_LENGTH);
          const color = CLASSIFICATION_FILL[camera.assessment.classification];
          const selected = camera.id === selectedCameraId;
          return (
            <polygon
              key={`cone-${camera.id}`}
              points={toPolygonPoints(wedge)}
              fill={color}
              fillOpacity={selected ? 0.34 : 0.14}
              stroke={color}
              strokeOpacity={selected ? 0.85 : 0.4}
              strokeWidth={selected ? 1.4 : 0.8}
              data-testid={`map-cone-${camera.id}`}
              data-heading={camera.heading}
            />
          );
        })}
      </g>

      {/* Cámaras. */}
      {cameras.map((camera) => {
        const selected = camera.id === selectedCameraId;
        const incidentCount = incidentCountByCamera.get(camera.id) ?? 0;
        const color = CLASSIFICATION_FILL[camera.assessment.classification];

        return (
          <g
            key={camera.id}
            onClick={() => onSelect(camera.id)}
            className="cursor-pointer"
            data-testid={`map-camera-${camera.id}`}
          >
            <title>{`${camera.id} · ${camera.name} · ${incidentCount} incidentes`}</title>
            {camera.status === 'alerta' ? (
              <AlertHalo x={camera.position.x} y={camera.position.y} />
            ) : null}
            <circle
              cx={camera.position.x}
              cy={camera.position.y}
              r={selected ? 9 : 6.5}
              fill={color}
              stroke={selected ? '#ffffff' : 'var(--map-bg)'}
              strokeWidth={selected ? 2.5 : 1.5}
            />
            {selected ? (
              <text
                x={camera.position.x + 12}
                y={camera.position.y - 10}
                fill="var(--map-text)"
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

/**
 * Halo de alerta.
 *
 * GSAP conduce la expansión y el desvanecido del anillo: al terminar el
 * componente, los tweens se destruyen para no dejar trabajo pendiente.
 */
function AlertHalo({ x, y }: { x: number; y: number }) {
  const ref = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const circle = ref.current;
    if (!circle) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      gsap.set(circle, { attr: { r: 16 }, opacity: 0.75 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.to(circle, {
        attr: { r: 24 },
        duration: 1.2,
        ease: 'power2.out',
        repeat: -1,
        yoyo: true,
      });
      gsap.to(circle, {
        opacity: 0,
        duration: 1.2,
        ease: 'power2.out',
        repeat: -1,
        yoyo: true,
      });
    }, circle);

    return () => ctx.revert();
  }, []);

  return (
    <circle
      ref={ref}
      cx={x}
      cy={y}
      r={16}
      fill="none"
      stroke="#e5484d"
      strokeWidth={1.5}
      opacity={0.75}
    />
  );
}
