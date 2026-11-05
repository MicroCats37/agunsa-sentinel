import blockout from './facility-blockout.json';

/**
 * Modelo volumétrico conceptual de AGUNSA Callao (fase 3A).
 *
 * Las coordenadas son metros Este/Norte respecto del centro de trabajo
 * (`metadata.origin`). Las dimensiones y alturas son **preliminares**: sirven
 * para validar navegación, operación de cámaras y lectura del eje Z hasta
 * contar con planos o medición en campo.
 *
 * No es apta para ingeniería: así lo declara la fuente original.
 */

export interface BlockoutPoint {
  east: number;
  north: number;
}

export interface BlockoutStructure {
  id: string;
  name: string;
  east: number;
  north: number;
  width: number;
  depth: number;
  height: number;
  heading: number;
  wallColor: string;
  roofColor: string;
}

export interface BlockoutContainerRow {
  id: string;
  name: string;
  east: number;
  north: number;
  count: number;
  lanes: number;
  spacing: number;
  laneSpacing: number;
  heading: number;
  stackPattern: number[];
}

export interface BlockoutContainerSpec {
  length: number;
  width: number;
  height: number;
  colors: string[];
}

export interface PerimeterWallSpec {
  height: number;
  thickness: number;
  maxSegmentLength: number;
  color: string;
  texture: string;
}

export interface FacilityBlockout {
  metadata: {
    phase: string;
    status: string;
    origin: { latitude: number; longitude: number };
    units: string;
    coordinateFrame: string;
    renderInitialLayout: boolean;
    sourceNote: string;
  };
  structures: BlockoutStructure[];
  containerRows: BlockoutContainerRow[];
  container: BlockoutContainerSpec;
  perimeter: BlockoutPoint[];
  perimeterWall: PerimeterWallSpec;
}

export const FACILITY_BLOCKOUT = blockout as FacilityBlockout;

/** Contenedor apilado individual, expandido de una fila de patio. */
export interface ExpandedContainer {
  id: string;
  name: string;
  east: number;
  north: number;
  heading: number;
  width: number;
  depth: number;
  height: number;
  stack: number;
  color: string;
}

/**
 * Expande las filas de patio de forma determinista: el mismo contenedor
 * resulta siempre en la misma posición, en Cesium y en cualquier renderer.
 */
export function expandContainerRows(): ExpandedContainer[] {
  const containers: ExpandedContainer[] = [];

  FACILITY_BLOCKOUT.containerRows.forEach((row, rowIndex) => {
    const heading = (row.heading * Math.PI) / 180;
    const along = { east: Math.cos(heading), north: Math.sin(heading) };
    const across = { east: -Math.sin(heading), north: Math.cos(heading) };

    for (let lane = 0; lane < row.lanes; lane += 1) {
      for (let index = 0; index < row.count; index += 1) {
        const stack = row.stackPattern[index % row.stackPattern.length] ?? 1;
        containers.push({
          id: `${row.id}-l${lane + 1}-c${index + 1}`,
          name: `${row.name} · fila ${lane + 1} · posición ${index + 1}`,
          east: row.east + along.east * row.spacing * index + across.east * row.laneSpacing * lane,
          north:
            row.north + along.north * row.spacing * index + across.north * row.laneSpacing * lane,
          heading: row.heading,
          width: FACILITY_BLOCKOUT.container.length,
          depth: FACILITY_BLOCKOUT.container.width,
          height: FACILITY_BLOCKOUT.container.height * stack,
          stack,
          color:
            FACILITY_BLOCKOUT.container.colors[
              (index + lane + rowIndex) % FACILITY_BLOCKOUT.container.colors.length
            ] ?? '#6d7d84',
        });
      }
    }
  });

  return containers;
}
