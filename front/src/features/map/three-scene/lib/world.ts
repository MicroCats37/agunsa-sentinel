import {
  PLAN_BUILDINGS,
  PLAN_CONTAINERS,
  PLAN_FENCE,
  PLAN_GATES,
  PLAN_LIGHTS,
  PLAN_TANKS,
  PLAN_TO_WORLD,
  PLAN_YARDS,
  planToWorld,
} from '@/data/plan';
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Shape,
  ShapeGeometry,
  Vector3,
} from 'three';
import { PALETTE } from './palette';

/**
 * Construcción de la planta industrial en 3D.
 *
 * El perímetro, los edificios y los marcadores comparten las coordenadas del
 * plano 2D: `planToWorld` es el único puente entre ambos sistemas.
 *
 * Los materiales son PBR reales (rugosidad y metalicidad distintas para
 * hormigón, acero, chapa y asfalto) para que las naves no se lean como
 * siluetas planas bajo la luz.
 */

export interface WorldHandles {
  group: Group;
  dispose: () => void;
}

/** Altura del poste de la cámara sobre el suelo (unidades de mundo). */
export const CAMERA_POST_HEIGHT = 2.4;
/** Altura de la lente dentro del cuerpo de la cámara. */
export const CAMERA_LENS_HEIGHT = 2.25;

export function buildWorld(): WorldHandles {
  const group = new Group();
  const disposables: { dispose: () => void }[] = [];

  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  /* Terreno exterior y explanada de la planta. */
  const terrainGeometry = track(new PlaneGeometry(420, 340));
  const terrainMaterial = track(
    new MeshStandardMaterial({
      color: PALETTE.ground,
      roughness: 0.98,
      metalness: 0.02,
    }),
  );
  const terrain = new Mesh(terrainGeometry, terrainMaterial);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.06;
  terrain.receiveShadow = true;
  group.add(terrain);

  const padGeometry = track(new ShapeGeometry(fenceShape()));
  const padMaterial = track(
    new MeshStandardMaterial({
      color: PALETTE.asphalt,
      roughness: 0.93,
      metalness: 0.06,
      side: DoubleSide,
    }),
  );
  const pad = new Mesh(padGeometry, padMaterial);
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.01;
  pad.receiveShadow = true;
  group.add(pad);

  /* Patios y áreas asfaltadas. */
  for (const yard of PLAN_YARDS) {
    const geometry = track(
      new PlaneGeometry(yard.width * PLAN_TO_WORLD, yard.height * PLAN_TO_WORLD),
    );
    const material = track(
      new MeshStandardMaterial({
        color: yard.kind === 'patio' ? PALETTE.concreteDark : PALETTE.asphalt,
        roughness: 0.88,
        metalness: 0.08,
        side: DoubleSide,
      }),
    );
    const mesh = new Mesh(geometry, material);
    const position = planToWorld({
      x: yard.x + yard.width / 2,
      y: yard.y + yard.height / 2,
    });
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(position.x, 0.04, position.z);
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  /* Edificios: muro de hormigón + cubierta azul marino AGUNSA. */
  for (const building of PLAN_BUILDINGS) {
    const width = building.width * PLAN_TO_WORLD;
    const depth = building.height * PLAN_TO_WORLD;
    const height = building.elevation;

    const boxGeometry = track(new BoxGeometry(width, height, depth));
    const wallMaterial = track(
      new MeshStandardMaterial({
        color: PALETTE.concrete,
        roughness: 0.86,
        metalness: 0.04,
      }),
    );
    const mesh = new Mesh(boxGeometry, wallMaterial);
    const position = planToWorld({
      x: building.x + building.width / 2,
      y: building.y + building.height / 2,
    });
    mesh.position.set(position.x, height / 2, position.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Cubierta: color corporativo, más lisa y metálica que el hormigón.
    const roofGeometry = track(new BoxGeometry(width + 0.8, 0.45, depth + 0.8));
    const roofMaterial = track(
      new MeshStandardMaterial({
        color: PALETTE.navy,
        roughness: 0.52,
        metalness: 0.34,
      }),
    );
    const roof = new Mesh(roofGeometry, roofMaterial);
    roof.position.set(position.x, height + 0.2, position.z);
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);

    // Aristas: definen el volumen contra el cielo sin añadir geometría pesada.
    const edgesGeometry = track(new EdgesGeometry(boxGeometry));
    const edgesMaterial = track(
      new LineBasicMaterial({
        color: PALETTE.steelDark,
        transparent: true,
        opacity: 0.5,
      }),
    );
    const edges = new LineSegments(edgesGeometry, edgesMaterial);
    edges.position.copy(mesh.position);
    group.add(edges);
  }

  /* Tanques de acero. */
  for (const tank of PLAN_TANKS) {
    const radius = tank.radius * PLAN_TO_WORLD;
    const geometry = track(new CylinderGeometry(radius, radius, radius * 1.35, 24));
    const material = track(
      new MeshStandardMaterial({
        color: PALETTE.tank,
        roughness: 0.34,
        metalness: 0.72,
      }),
    );
    const mesh = new Mesh(geometry, material);
    const position = planToWorld(tank.position);
    mesh.position.set(position.x, (radius * 1.35) / 2, position.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    const capGeometry = track(new CylinderGeometry(radius * 1.06, radius * 1.06, radius * 0.2, 24));
    const capMaterial = track(
      new MeshStandardMaterial({
        color: PALETTE.navy,
        roughness: 0.55,
        metalness: 0.4,
      }),
    );
    const cap = new Mesh(capGeometry, capMaterial);
    cap.position.set(position.x, radius * 1.35, position.z);
    cap.castShadow = true;
    group.add(cap);
  }

  /* Contenedores portuarios. */
  for (const container of PLAN_CONTAINERS) {
    const width = container.width * PLAN_TO_WORLD;
    const depth = container.height * PLAN_TO_WORLD;
    const height = 2.6;
    const geometry = track(new BoxGeometry(width, height, depth));
    const material = track(
      new MeshStandardMaterial({
        color: container.tone === 'navy' ? PALETTE.containerNavy : PALETTE.containerSteel,
        roughness: 0.62,
        metalness: 0.38,
      }),
    );
    const mesh = new Mesh(geometry, material);
    const position = planToWorld({
      x: container.x + container.width / 2,
      y: container.y + container.height / 2,
    });
    mesh.position.set(position.x, height / 2, position.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    if (container.stacked) {
      const upper = new Mesh(geometry, material);
      upper.position.set(position.x, height * 1.55, position.z);
      upper.castShadow = true;
      group.add(upper);
    }
  }

  /* Cerco perimetral: postes instanciados + travesaños de alambre. */
  const fence = buildFence();
  group.add(fence.group);
  disposables.push(
    fence.posts.geometry,
    fence.posts.material as { dispose: () => void },
    fence.rails.geometry,
    fence.rails.material as { dispose: () => void },
  );

  /* Portones. */
  for (const gate of PLAN_GATES) {
    const from = planToWorld(gate.from);
    const to = planToWorld(gate.to);
    const length = Math.hypot(to.x - from.x, to.z - from.z);

    const armGeometry = track(new BoxGeometry(length, 0.28, 0.28));
    const armMaterial = track(
      new MeshStandardMaterial({
        color: PALETTE.gate,
        emissive: new Color(PALETTE.gate),
        emissiveIntensity: 0.35,
        roughness: 0.5,
        metalness: 0.25,
      }),
    );
    const arm = new Mesh(armGeometry, armMaterial);
    arm.position.set((from.x + to.x) / 2, 1.15, (from.z + to.z) / 2);
    arm.rotation.y = Math.atan2(to.z - from.z, to.x - from.x);
    arm.castShadow = true;
    group.add(arm);

    const postGeometry = track(new CylinderGeometry(0.22, 0.26, 1.3, 10));
    const postMaterial = track(
      new MeshStandardMaterial({
        color: PALETTE.navy,
        roughness: 0.55,
        metalness: 0.35,
      }),
    );
    for (const point of [from, to]) {
      const post = new Mesh(postGeometry, postMaterial);
      post.position.set(point.x, 0.65, point.z);
      post.castShadow = true;
      group.add(post);
    }
  }

  /* Alumbrado perimetral. */
  for (const light of PLAN_LIGHTS) {
    const poleGeometry = track(new CylinderGeometry(0.11, 0.15, light.height, 8));
    const poleMaterial = track(
      new MeshStandardMaterial({
        color: PALETTE.steelDark,
        roughness: 0.62,
        metalness: 0.55,
      }),
    );
    const pole = new Mesh(poleGeometry, poleMaterial);
    const position = planToWorld(light.position);
    pole.position.set(position.x, light.height / 2, position.z);
    pole.castShadow = true;
    group.add(pole);

    const headGeometry = track(new BoxGeometry(0.85, 0.18, 0.45));
    const headMaterial = track(
      new MeshStandardMaterial({
        color: PALETTE.lamp,
        emissive: new Color(PALETTE.lamp),
        emissiveIntensity: 1.6,
        roughness: 0.4,
      }),
    );
    const head = new Mesh(headGeometry, headMaterial);
    head.position.set(position.x, light.height + 0.1, position.z);
    group.add(head);
  }

  return {
    group,
    dispose: () => {
      for (const disposable of disposables) disposable.dispose();
    },
  };
}

/** Silueta del cerco, en coordenadas de mundo. */
function fenceShape(): Shape {
  const shape = new Shape();
  PLAN_FENCE.forEach((vertex, index) => {
    const world = planToWorld(vertex);
    if (index === 0) shape.moveTo(world.x, -world.z);
    else shape.lineTo(world.x, -world.z);
  });
  shape.closePath();
  return shape;
}

/**
 * Cerco: postes de acero galvanizado (instanciados) y travesaños de alambre.
 * Los postes se dibujan con una única llamada por ser todos iguales.
 */
function buildFence(): {
  group: Group;
  posts: InstancedMesh;
  rails: LineSegments;
} {
  const group = new Group();
  const positions: Vector3[] = [];

  for (let i = 0; i < PLAN_FENCE.length; i++) {
    const current = PLAN_FENCE[i];
    const next = PLAN_FENCE[(i + 1) % PLAN_FENCE.length];
    if (!current || !next) continue;
    const a = planToWorld(current);
    const b = planToWorld(next);

    positions.push(new Vector3(a.x, 0, a.z), new Vector3(b.x, 0, b.z));
    positions.push(new Vector3(a.x, 1.5, a.z), new Vector3(b.x, 1.5, b.z));
    positions.push(new Vector3(a.x, 2.6, a.z), new Vector3(b.x, 2.6, b.z));
  }

  const postGeometry = new BoxGeometry(0.16, 2.8, 0.16);
  const postMaterial = new MeshStandardMaterial({
    color: PALETTE.steel,
    roughness: 0.46,
    metalness: 0.68,
  });
  const posts = new InstancedMesh(postGeometry, postMaterial, positions.length);
  posts.castShadow = true;
  posts.receiveShadow = true;

  const matrix = new Matrix4();
  positions.forEach((point, index) => {
    matrix.makeTranslation(point.x, 1.4, point.z);
    posts.setMatrixAt(index, matrix);
  });
  posts.instanceMatrix.needsUpdate = true;
  group.add(posts);

  const railPositions: number[] = [];
  for (let i = 0; i < PLAN_FENCE.length; i++) {
    const current = PLAN_FENCE[i];
    const next = PLAN_FENCE[(i + 1) % PLAN_FENCE.length];
    if (!current || !next) continue;
    const a = planToWorld(current);
    const b = planToWorld(next);
    railPositions.push(a.x, 0.6, a.z, b.x, 0.6, b.z);
    railPositions.push(a.x, 2.1, a.z, b.x, 2.1, b.z);
  }
  const railsGeometry = new BufferGeometry();
  railsGeometry.setAttribute('position', new Float32BufferAttribute(railPositions, 3));
  const railsMaterial = new LineBasicMaterial({
    color: PALETTE.steel,
    transparent: true,
    opacity: 0.55,
  });
  const rails = new LineSegments(railsGeometry, railsMaterial);
  group.add(rails);

  return { group, posts, rails };
}
