import { planToWorld } from '@/data/plan';
import type { Camera } from '@/domain/types';
import {
  ACESFilmicToneMapping,
  AmbientLight,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  PCFShadowMap,
  PerspectiveCamera,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { computeBounds, frameScene } from './lib/framing';
import { buildMarkers, type MarkerHandles } from './lib/markers';
import { FOG_COLOR, SKY_COLOR } from './lib/palette';
import { createPost, type PostHandles } from './lib/post';
import { buildWorld, type WorldHandles } from './lib/world';

/**
 * Módulo profundo de la vista 3D del perímetro.
 *
 * Interfaz pública única: `createPerimeterScene(container, options)`. Toda la
 * construcción de la escena, el control orbital, el raycasting y el ciclo de
 * render quedan privados detrás de este punto de entrada.
 */
export interface PerimeterSceneOptions {
  cameras: readonly Camera[];
  onSelect: (cameraId: string) => void;
  /** Desactiva la rotación automática (movimiento reducido del sistema). */
  reducedMotion?: boolean;
}

export interface PerimeterSceneHandle {
  dispose: () => void;
  setSelected: (cameraId: string | null) => void;
  updateCameras: (cameras: readonly Camera[]) => void;
  focusCamera: (cameraId: string) => void;
}

/** Segundos de inactividad antes de retomar la rotación automática. */
const IDLE_RESUME_SECONDS = 7;
/** Velocidad de rotación automática (grados por segundo). */
const AUTO_ROTATE_SPEED = 0.32;

export function createPerimeterScene(
  container: HTMLElement,
  options: PerimeterSceneOptions,
): PerimeterSceneHandle {
  const scene = new Scene();
  scene.background = new Color(SKY_COLOR);
  scene.fog = new Fog(FOG_COLOR, 120, 420);

  const renderer = new WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  // PCFShadowMap: en three r182+ PCFSoftShadowMap está obsoleto y cae de vuelta
  // a este filtro, que ya es suave y no emite avisos por consola.
  renderer.shadowMap.type = PCFShadowMap;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.touchAction = 'none';
  renderer.domElement.setAttribute('data-testid', 'perimeter-map-3d-canvas');

  const camera = new PerspectiveCamera(42, 1, 0.5, 900);
  camera.position.set(80, 70, 110);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.minPolarAngle = 0.14;
  controls.maxPolarAngle = Math.PI / 2 - 0.06;
  controls.enablePan = true;
  controls.panSpeed = 0.6;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.8;

  /* Iluminación: sol direccional con sombras + relleno hemisférico + ambiente. */
  const bounds = computeBounds();

  const hemisphere = new HemisphereLight(0x9ec2e4, 0x2a3138, 1.05);
  scene.add(hemisphere);

  const ambient = new AmbientLight(0x50627a, 0.55);
  scene.add(ambient);

  const sun = new DirectionalLight(0xfff2dc, 2.35);
  sun.position.set(bounds.radius * 0.9, bounds.radius * 1.55, bounds.radius * 0.7);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = bounds.radius * 6;
  sun.shadow.camera.left = -bounds.radius * 1.15;
  sun.shadow.camera.right = bounds.radius * 1.15;
  sun.shadow.camera.top = bounds.radius * 1.15;
  sun.shadow.camera.bottom = -bounds.radius * 1.15;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.035;
  sun.shadow.radius = 2;
  sun.shadow.intensity = 0.78;
  scene.add(sun);
  scene.add(sun.target);

  const fill = new DirectionalLight(0x8fb4d8, 0.5);
  fill.position.set(-bounds.radius * 1.1, bounds.radius * 0.7, -bounds.radius * 0.9);
  scene.add(fill);

  const world: WorldHandles = buildWorld();
  scene.add(world.group);

  const markers: MarkerHandles = buildMarkers(options.cameras, bounds.radius);
  scene.add(markers.group);

  const post: PostHandles = createPost(renderer, scene, camera);

  /* Encuadre: la cámara inicial muestra la instalación completa. */
  const containerWidth = container.clientWidth || 1;
  const containerHeight = container.clientHeight || 1;
  const aspect = containerWidth / containerHeight;
  const framing = frameScene(bounds, camera, aspect);
  camera.position.copy(framing.position);
  controls.target.copy(framing.target);
  controls.minDistance = framing.minDistance;
  controls.maxDistance = framing.maxDistance;
  controls.update();

  /* Entrada: raycasting sobre los marcadores. */
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  let pointerDownAt: { x: number; y: number } | null = null;
  let hoveredCameraId: string | null = null;

  function setPointer(event: PointerEvent): void {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
  }

  function pick(): string | null {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(markers.pickables, false);
    const first = hits[0];
    const cameraId = first?.object.userData.cameraId;
    return typeof cameraId === 'string' ? cameraId : null;
  }

  function handlePointerDown(event: PointerEvent): void {
    pointerDownAt = { x: event.clientX, y: event.clientY };
    suspendAutoRotate();
  }

  function handlePointerUp(event: PointerEvent): void {
    if (!pointerDownAt) return;
    const moved = Math.hypot(event.clientX - pointerDownAt.x, event.clientY - pointerDownAt.y);
    pointerDownAt = null;
    if (moved > 5) return;
    setPointer(event);
    const cameraId = pick();
    if (cameraId) {
      markers.setSelected(cameraId);
      options.onSelect(cameraId);
    }
  }

  function handlePointerMove(event: PointerEvent): void {
    setPointer(event);
    const cameraId = pick();
    if (cameraId === hoveredCameraId) return;
    hoveredCameraId = cameraId;
    markers.setHovered(cameraId);
    renderer.domElement.style.cursor = cameraId ? 'pointer' : 'grab';
  }

  function handlePointerLeave(): void {
    hoveredCameraId = null;
    markers.setHovered(null);
    renderer.domElement.style.cursor = 'grab';
  }

  renderer.domElement.addEventListener('pointerdown', handlePointerDown);
  renderer.domElement.addEventListener('pointerup', handlePointerUp);
  renderer.domElement.addEventListener('pointermove', handlePointerMove);
  renderer.domElement.addEventListener('pointerleave', handlePointerLeave);

  /* Rotación automática: se detiene al interactuar y vuelve tras la inactividad. */
  const reducedMotion =
    options.reducedMotion ??
    (typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let idleTimer: number | null = null;

  function suspendAutoRotate(): void {
    controls.autoRotate = false;
    if (idleTimer !== null) window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      if (!reducedMotion) controls.autoRotate = true;
    }, IDLE_RESUME_SECONDS * 1000);
  }

  controls.addEventListener('start', suspendAutoRotate);
  controls.autoRotate = !reducedMotion;
  controls.autoRotateSpeed = AUTO_ROTATE_SPEED;

  /* Tamaño y pausa fuera de pantalla. */
  function resize(): void {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    post.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  let visible = true;
  const intersection = new IntersectionObserver(
    (entries) => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible) {
        renderer.setAnimationLoop(render);
      } else {
        renderer.setAnimationLoop(null);
      }
    },
    { threshold: 0 },
  );
  intersection.observe(container);

  /* Bucle de render. */
  let last = performance.now();
  let elapsed = 0;

  function render(): void {
    const now = performance.now();
    const delta = Math.min((now - last) / 1000, 0.1);
    last = now;
    elapsed += delta;

    controls.update(delta);

    for (let i = 0; i < markers.pulses.length; i++) {
      const pulse = markers.pulses[i];
      if (!pulse) continue;
      const cycle = (elapsed * 0.55 + i * 0.37) % 1;
      pulse.scale.setScalar(2.2 + cycle * 1.5);
      pulse.material.opacity = 0.85 * (1 - cycle) * (reducedMotion ? 0.6 : 1);
    }

    post.composer.render();
  }

  renderer.setAnimationLoop(render);

  return {
    dispose: () => {
      renderer.setAnimationLoop(null);
      if (idleTimer !== null) window.clearTimeout(idleTimer);
      intersection.disconnect();
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      controls.dispose();
      post.dispose();
      markers.dispose();
      world.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    },
    setSelected: (cameraId) => {
      markers.setSelected(cameraId);
    },
    updateCameras: (cameras) => markers.updateStatuses(cameras),
    focusCamera: (cameraId) => {
      const target = options.cameras.find((camera) => camera.id === cameraId);
      if (!target) return;
      const position = planToWorld(target.position);
      const focus = new Vector3(position.x, 2, position.z);
      controls.target.lerp(focus, 0.6);
      const offset = camera.position.clone().sub(controls.target);
      camera.position.copy(controls.target).add(offset);
    },
  };
}
