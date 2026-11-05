import { planToWorld } from '@/data/plan';
import type { Camera, CameraStatus } from '@/domain/types';
import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Sprite,
  SpriteMaterial,
  SphereGeometry,
} from 'three';
import { PALETTE, STATUS_COLOR } from './palette';

/**
 * Marcadores de cámara en la escena 3D.
 *
 * Cada cámara se representa con un equipo real: poste, brazo y cuerpo tipo
 * bala (o domo), coloreado por estado. Las cámaras en alerta llevan un halo
 * emisivo pulsante y todas proyectan el cono de su campo de visión, que es lo
 * que convierte la vista 3D en información y no en decoración.
 */

export interface MarkerHandles {
  group: Group;
  /** Objetos seleccionables por raycasting. */
  pickables: Mesh[];
  /** Halos animados en el bucle de render. */
  pulses: Sprite[];
  setSelected: (cameraId: string | null) => void;
  setHovered: (cameraId: string | null) => void;
  updateStatuses: (cameras: readonly Camera[]) => void;
  dispose: () => void;
}

/** Altura del cuerpo de la cámara sobre el suelo. */
const BODY_HEIGHT = 3;
/** Altura del poste. */
const POST_HEIGHT = 2.9;
/** Distancia del lente al eje del poste, según el heading. */
const LENS_OFFSET = 1.25;

/** Longitud base del cono de visión, en múltiplos del radio de la planta. */
const CONE_BASE_RATIO = 0.24;
/** FOV de referencia para normalizar el alcance del cono. */
const CONE_REFERENCE_FOV = 70;

export function buildMarkers(cameras: readonly Camera[], sceneRadius: number): MarkerHandles {
  const group = new Group();
  const pickables: Mesh[] = [];
  const pulses: Sprite[] = [];
  const disposables: { dispose: () => void }[] = [];

  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const postGeometry = track(new CylinderGeometry(0.14, 0.18, POST_HEIGHT, 8));
  const postMaterial = track(
    new MeshStandardMaterial({
      color: PALETTE.steelDark,
      roughness: 0.5,
      metalness: 0.62,
    }),
  );
  const bracketGeometry = track(new BoxGeometry(0.62, 0.09, 0.09));
  const bracketMaterial = track(
    new MeshStandardMaterial({
      color: PALETTE.steel,
      roughness: 0.45,
      metalness: 0.7,
    }),
  );
  const bulletGeometry = track(new CylinderGeometry(0.3, 0.3, 1.1, 16));
  const domeGeometry = track(new SphereGeometry(0.36, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2));
  const domeBaseGeometry = track(new CylinderGeometry(0.26, 0.26, 0.18, 14));
  const lensGeometry = track(new CylinderGeometry(0.24, 0.28, 0.22, 16));
  const statusGeometry = track(new SphereGeometry(0.2, 14, 10));
  const proxyGeometry = track(new SphereGeometry(0.85, 10, 8));

  const proxyMaterial = track(new MeshBasicMaterial({ visible: false }));

  const haloTexture = track(createHaloTexture());

  const bodyByCameraId = new Map<string, Mesh>();
  const lensByCameraId = new Map<string, Mesh>();
  const haloByCameraId = new Map<string, Sprite>();

  for (const camera of cameras) {
    const position = planToWorld(camera.position);
    const marker = new Group();
    marker.position.set(position.x, 0, position.z);
    // El heading del plano (0 = este, 90 = sur) se traduce a la rotación Y.
    marker.rotation.y = -(camera.heading * Math.PI) / 180;

    const post = new Mesh(postGeometry, postMaterial);
    post.position.y = POST_HEIGHT / 2;
    post.castShadow = true;
    marker.add(post);

    const bracket = new Mesh(bracketGeometry, bracketMaterial);
    bracket.position.set(0.3, POST_HEIGHT - 0.1, 0);
    bracket.castShadow = true;
    marker.add(bracket);

    const statusColor = STATUS_COLOR[camera.status];
    const bodyMaterial = track(
      new MeshStandardMaterial({
        color: statusColor,
        emissive: new Color(statusColor),
        emissiveIntensity: emissiveIntensityFor(camera.status),
        roughness: 0.42,
        metalness: 0.36,
      }),
    );

    const body = new Mesh(
      camera.spec.formFactor === 'dome' ? domeGeometry : bulletGeometry,
      bodyMaterial,
    );
    if (camera.spec.formFactor === 'dome') {
      body.position.set(0.62, BODY_HEIGHT - 0.05, 0);
      body.rotation.z = Math.PI / 2;
      const base = new Mesh(domeBaseGeometry, postMaterial);
      base.position.set(0.62, BODY_HEIGHT - 0.34, 0);
      marker.add(base);
    } else {
      body.position.set(0.62, BODY_HEIGHT, 0);
      body.rotation.z = Math.PI / 2;
    }
    body.castShadow = true;
    marker.add(body);
    bodyByCameraId.set(camera.id, body);

    const lensMaterial = track(
      new MeshStandardMaterial({
        color: 0x1b232e,
        emissive: new Color(statusColor),
        emissiveIntensity: emissiveIntensityFor(camera.status) * 0.7,
        roughness: 0.22,
        metalness: 0.75,
      }),
    );
    const lens = new Mesh(lensGeometry, lensMaterial);
    lens.position.set(LENS_OFFSET, BODY_HEIGHT, 0);
    lens.rotation.z = Math.PI / 2;
    marker.add(lens);
    lensByCameraId.set(camera.id, lens);

    const statusMaterial = track(
      new MeshStandardMaterial({
        color: statusColor,
        emissive: new Color(statusColor),
        emissiveIntensity: camera.status === 'alerta' ? 2.4 : 0.9,
        roughness: 0.3,
      }),
    );
    const statusLight = new Mesh(statusGeometry, statusMaterial);
    statusLight.position.set(0.28, BODY_HEIGHT + 0.32, 0);
    marker.add(statusLight);

    // Proxy de selección: no se dibuja, pero sí responde al raycasting.
    const proxy = new Mesh(proxyGeometry, proxyMaterial);
    proxy.position.set(LENS_OFFSET, BODY_HEIGHT, 0);
    proxy.userData.cameraId = camera.id;
    marker.add(proxy);
    pickables.push(proxy);

    // Halo emisivo para las cámaras en alerta.
    if (camera.status === 'alerta') {
      const haloMaterial = track(
        new SpriteMaterial({
          map: haloTexture,
          color: statusColor,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          blending: AdditiveBlending,
        }),
      );
      const halo = new Sprite(haloMaterial);
      halo.scale.setScalar(2.6);
      halo.position.set(LENS_OFFSET, BODY_HEIGHT, 0);
      marker.add(halo);
      pulses.push(halo);
      haloByCameraId.set(camera.id, halo);
    }

    // Cono de visión: cuña translúcida derivada del heading y del FOV real.
    const coneLength =
      sceneRadius * CONE_BASE_RATIO * (CONE_REFERENCE_FOV / Math.max(20, camera.fov));
    const cone = createFovCone(camera.fov, coneLength, BODY_HEIGHT, statusColor);
    cone.group.position.set(LENS_OFFSET, 0, 0);
    marker.add(cone.group);
    disposables.push(
      cone.geometry,
      cone.material,
      cone.arc.geometry,
      cone.arc.material as { dispose: () => void },
    );

    group.add(marker);
  }

  let selectedId: string | null = null;
  let hoveredId: string | null = null;

  function applyEmphasis(cameraId: string): void {
    const body = bodyByCameraId.get(cameraId);
    const lens = lensByCameraId.get(cameraId);
    if (body) {
      const material = body.material as MeshStandardMaterial;
      const base = emissiveIntensityFor(
        (body.userData.status as CameraStatus | undefined) ?? 'activa',
      );
      const selected = cameraId === selectedId;
      const hovered = cameraId === hoveredId;
      material.emissiveIntensity = base + (selected ? 1.1 : 0) + (hovered ? 0.55 : 0);
      body.scale.setScalar(selected ? 1.35 : hovered ? 1.15 : 1);
    }
    if (lens) {
      const material = lens.material as MeshStandardMaterial;
      material.emissiveIntensity =
        (cameraId === selectedId ? 1.9 : cameraId === hoveredId ? 1.2 : 0.55) *
        emissiveIntensityFor(
          (bodyByCameraId.get(cameraId)?.userData.status as CameraStatus | undefined) ?? 'activa',
        );
    }
  }

  for (const [id, body] of bodyByCameraId) {
    const camera = cameras.find((item) => item.id === id);
    if (camera) body.userData.status = camera.status;
  }

  return {
    group,
    pickables,
    pulses,
    setSelected: (cameraId) => {
      selectedId = cameraId;
      for (const id of bodyByCameraId.keys()) applyEmphasis(id);
    },
    setHovered: (cameraId) => {
      if (cameraId === hoveredId) return;
      hoveredId = cameraId;
      for (const id of bodyByCameraId.keys()) applyEmphasis(id);
    },
    updateStatuses: (updated) => {
      const statusById = new Map(updated.map((camera) => [camera.id, camera.status] as const));
      for (const [id, body] of bodyByCameraId) {
        const status = statusById.get(id);
        if (!status) continue;
        const color = STATUS_COLOR[status];
        const material = body.material as MeshStandardMaterial;
        material.color.setHex(color);
        material.emissive.setHex(color);
        body.userData.status = status;
      }
      for (const [id, lens] of lensByCameraId) {
        const status = statusById.get(id);
        if (!status) continue;
        const material = lens.material as MeshStandardMaterial;
        material.emissive.setHex(STATUS_COLOR[status]);
      }
      for (const id of bodyByCameraId.keys()) applyEmphasis(id);
    },
    dispose: () => {
      for (const disposable of disposables) disposable.dispose();
      haloTexture.dispose();
    },
  };
}

function emissiveIntensityFor(status: CameraStatus): number {
  switch (status) {
    case 'alerta':
      return 1.5;
    case 'activa':
      return 0.32;
    case 'fallando':
      return 0.45;
    case 'inactiva':
      return 0.06;
  }
}

/**
 * Cuña de visión.
 *
 * Se construye como un abanico de triángulos desde el lente hasta el arco del
 * terreno: el volumen del cono se lee desde cualquier ángulo de cámara.
 */
function createFovCone(
  fovDeg: number,
  length: number,
  apexHeight: number,
  color: number,
): { group: Group; geometry: BufferGeometry; material: MeshBasicMaterial; arc: Line } {
  const half = (fovDeg * Math.PI) / 360;
  const segments = 22;
  const apex = { x: 0, y: apexHeight, z: 0 };
  const vertices: number[] = [];

  const pointAt = (index: number): { x: number; y: number; z: number } => {
    const angle = -half + (index / segments) * half * 2;
    return { x: Math.cos(angle) * length, y: 0, z: Math.sin(angle) * length };
  };

  for (let i = 0; i < segments; i++) {
    const a = pointAt(i);
    const b = pointAt(i + 1);
    vertices.push(apex.x, apex.y, apex.z, a.x, a.y, a.z, b.x, b.y, b.z);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));

  const material = new MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.11,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    fog: true,
  });

  const mesh = new Mesh(geometry, material);
  mesh.renderOrder = 2;

  // Arco del alcance sobre el terreno: marca el límite de la cobertura.
  const arcPoints: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const p = pointAt(i);
    arcPoints.push(p.x, 0.06, p.z);
  }
  const arcGeometry = new BufferGeometry();
  arcGeometry.setAttribute('position', new Float32BufferAttribute(arcPoints, 3));
  const arcMaterial = new LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.55,
  });
  const arc = new Line(arcGeometry, arcMaterial);

  const group = new Group();
  group.add(mesh);
  group.add(arc);

  return { group, geometry, material, arc };
}

/** Textura radial del halo de alerta. */
function createHaloTexture(): CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
    gradient.addColorStop(0.25, 'rgba(255,255,255,0.45)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = 'srgb';
  return texture;
}
