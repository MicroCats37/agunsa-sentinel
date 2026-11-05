import { PLAN_BUILDINGS, PLAN_FENCE, PLAN_TO_WORLD, PLAN_WIDTH, planToWorld } from '@/data/plan';
import { Vector3, type PerspectiveCamera } from 'three';
/**
 * Encuadre de la vista 3D.
 *
 * La cámara inicial no se posiciona a ojo: se calcula a partir del volumen
 * real de la instalación. Se projectan las esquinas de la caja envolvente sobre
 * el frustum y se ajustan distancia y objetivo hasta que TODA la planta
 * (cerco, naves, patios y portones) queda dentro del encuadre, con margen.
 *
 * El ajuste se itera porque al desplazar el objetivo para centrar la escena
 * cambia la proyección; dos o tres pasadas converges.
 */

export interface SceneBounds {
  min: Vector3;
  max: Vector3;
  center: Vector3;
  /** Radio de la esfera envolvente en el plano del suelo. */
  radius: number;
  corners: Vector3[];
}

export interface SceneFraming {
  target: Vector3;
  position: Vector3;
  distance: number;
  /** Distancia mínima de órbita (acercarse a un sector). */
  minDistance: number;
  /** Distancia máxima de órbita (ver la planta completa). */
  maxDistance: number;
}

/** Altura de cámara sobre el suelo, en grados. */
const ELEVATION_DEG = 30;
/** Azimut de cámara sobre el plano, en grados. */
const AZIMUTH_DEG = 40;
/** Fracción del semiancho del frustum que ocupa la instalación. */
const FILL = 0.94;

export function computeBounds(): SceneBounds {
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);

  const grow = (point: Vector3): void => {
    min.min(point);
    max.max(point);
  };

  for (const vertex of PLAN_FENCE) {
    const world = planToWorld(vertex);
    grow(new Vector3(world.x, 0, world.z));
  }

  for (const building of PLAN_BUILDINGS) {
    const world = planToWorld({
      x: building.x + building.width / 2,
      y: building.y + building.height / 2,
    });
    grow(new Vector3(world.x, building.elevation, world.z));
  }

  const center = min.clone().add(max).multiplyScalar(0.5);
  const radius = Math.hypot(max.x - min.x, max.z - min.z) / 2;

  const corners: Vector3[] = [];
  for (const x of [min.x, max.x]) {
    for (const y of [min.y, max.y]) {
      for (const z of [min.z, max.z]) {
        corners.push(new Vector3(x, y, z));
      }
    }
  }

  return { min, max, center, radius, corners };
}

/** Dirección de observación: tres cuartos desde el sureste, 30° sobre el horizonte. */
export function cameraDirection(): Vector3 {
  const elevation = (ELEVATION_DEG * Math.PI) / 180;
  const azimuth = (AZIMUTH_DEG * Math.PI) / 180;
  return new Vector3(
    Math.cos(elevation) * Math.sin(azimuth),
    Math.sin(elevation),
    Math.cos(elevation) * Math.cos(azimuth),
  ).normalize();
}

/**
 * Calcula la pose de cámara que encuadra la instalación completa.
 *
 * `aspect` es la proporción del contenedor: cambia el encuadre horizontal y,
 * por tanto, la distancia necesaria.
 */
export function frameScene(
  bounds: SceneBounds,
  camera: PerspectiveCamera,
  aspect: number,
): SceneFraming {
  const direction = cameraDirection();
  const target = bounds.center.clone();
  target.y = bounds.max.y * 0.28;

  const tanV = Math.tan((camera.fov * Math.PI) / 360);
  const tanH = tanV * aspect;

  let distance = Math.max(bounds.radius * 1.6, 10);
  const scratch = new Vector3();

  for (let iteration = 0; iteration < 8; iteration++) {
    camera.position.copy(target).addScaledVector(direction, distance);
    camera.lookAt(target);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const corner of bounds.corners) {
      scratch.copy(corner).project(camera);
      minX = Math.min(minX, scratch.x);
      maxX = Math.max(maxX, scratch.x);
      minY = Math.min(minY, scratch.y);
      maxY = Math.max(maxY, scratch.y);
    }

    const extent = Math.max(Math.abs(minX), Math.abs(maxX), Math.abs(minY), Math.abs(maxY));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Reencuadre: se desplaza el objetivo para centrar el contenido y se
    // corrige la distancia para que quepa con el margen previsto.
    const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    target.addScaledVector(right, centerX * distance * tanH);
    target.addScaledVector(up, centerY * distance * tanV);

    if (Math.abs(extent - FILL) < 0.002) break;
    distance = Math.max(4, distance * (extent / FILL));
  }

  const position = target.clone().addScaledVector(direction, distance);

  return {
    target,
    position,
    distance,
    minDistance: Math.max(6, bounds.radius * 0.35),
    maxDistance: bounds.radius * 3.4,
  };
}

/** Altura del suelo en el borde del plano, para el cálculo del encuadre. */
export const PLAN_WORLD_WIDTH = PLAN_WIDTH * PLAN_TO_WORLD;
