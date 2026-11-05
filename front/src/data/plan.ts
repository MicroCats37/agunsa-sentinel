import type { Point } from '@/domain/types';

/**
 * Plano de la instalación industrial ficticia de AGUNSA.
 *
 * Este módulo es la única fuente de coordenadas de la planta: tanto el plano 2D
 * (SVG) como la escena 3D (Three.js) consumen estas mismas unidades, de modo
 * que la posición de una cámara es idéntica en ambas vistas.
 */

export const PLAN_WIDTH = 1200;
export const PLAN_HEIGHT = 780;

/** Conversión de unidades de plano a unidades de mundo (Three.js). */
export const PLAN_TO_WORLD = 0.1;

export interface PlanRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlanBuilding extends PlanRect {
  id: string;
  name: string;
  kind: 'almacen' | 'oficinas' | 'nave' | 'deposito';
  /** Altura en unidades de mundo para la vista isométrica. */
  elevation: number;
}

export interface PlanYard extends PlanRect {
  id: string;
  name: string;
  kind: 'patio' | 'estacionamiento';
}

export interface PlanGate {
  id: string;
  name: string;
  kind: 'principal' | 'servicio' | 'peatonal';
  from: Point;
  to: Point;
}

export interface PlanLight {
  id: string;
  position: Point;
  height: number;
}

/** Cerco perimetral: octógono con esquinas achaflanadas. */
export const PLAN_FENCE: readonly Point[] = [
  { x: 110, y: 60 },
  { x: 1090, y: 60 },
  { x: 1140, y: 110 },
  { x: 1140, y: 670 },
  { x: 1090, y: 720 },
  { x: 110, y: 720 },
  { x: 60, y: 670 },
  { x: 60, y: 110 },
];

export const PLAN_BUILDINGS: readonly PlanBuilding[] = [
  {
    id: 'ed-almacen-a',
    name: 'Almacén A',
    kind: 'almacen',
    x: 200,
    y: 200,
    width: 300,
    height: 170,
    elevation: 5.4,
  },
  {
    id: 'ed-almacen-b',
    name: 'Almacén B',
    kind: 'almacen',
    x: 545,
    y: 200,
    width: 230,
    height: 170,
    elevation: 4.6,
  },
  {
    id: 'ed-tanques',
    name: 'Depósito de tanques',
    kind: 'deposito',
    x: 880,
    y: 190,
    width: 170,
    height: 150,
    elevation: 2.4,
  },
  {
    id: 'ed-nave',
    name: 'Nave de despacho',
    kind: 'nave',
    x: 200,
    y: 430,
    width: 270,
    height: 180,
    elevation: 4,
  },
  {
    id: 'ed-control',
    name: 'Edificio de control',
    kind: 'oficinas',
    x: 520,
    y: 430,
    width: 190,
    height: 180,
    elevation: 8.2,
  },
];

export const PLAN_YARDS: readonly PlanYard[] = [
  {
    id: 'yd-patio',
    name: 'Patio de maniobras',
    kind: 'patio',
    x: 820,
    y: 400,
    width: 240,
    height: 160,
  },
  {
    id: 'yd-estacionamiento',
    name: 'Estacionamiento',
    kind: 'estacionamiento',
    x: 820,
    y: 575,
    width: 240,
    height: 75,
  },
];

export const PLAN_GATES: readonly PlanGate[] = [
  {
    id: 'gate-principal',
    name: 'Acceso Principal · Av. Nestor Gambetta',
    kind: 'principal',
    from: { x: 600, y: 60 },
    to: { x: 680, y: 60 },
  },
  {
    id: 'gate-servicio',
    name: 'Acceso de Servicio · Calle Arica',
    kind: 'servicio',
    from: { x: 1140, y: 480 },
    to: { x: 1140, y: 540 },
  },
  {
    id: 'gate-peatonal',
    name: 'Puerta peatonal · Calle Siete',
    kind: 'peatonal',
    from: { x: 60, y: 330 },
    to: { x: 60, y: 380 },
  },
];

export const PLAN_LIGHTS: readonly PlanLight[] = [
  { id: 'luz-n-1', position: { x: 250, y: 95 }, height: 6.4 },
  { id: 'luz-n-2', position: { x: 600, y: 95 }, height: 6.4 },
  { id: 'luz-n-3', position: { x: 950, y: 95 }, height: 6.4 },
  { id: 'luz-s-1', position: { x: 250, y: 685 }, height: 6.4 },
  { id: 'luz-s-2', position: { x: 600, y: 685 }, height: 6.4 },
  { id: 'luz-s-3', position: { x: 950, y: 685 }, height: 6.4 },
  { id: 'luz-e-1', position: { x: 1105, y: 250 }, height: 6.4 },
  { id: 'luz-e-2', position: { x: 1105, y: 540 }, height: 6.4 },
  { id: 'luz-o-1', position: { x: 95, y: 250 }, height: 6.4 },
  { id: 'luz-o-2', position: { x: 95, y: 540 }, height: 6.4 },
  { id: 'luz-patio', position: { x: 940, y: 480 }, height: 7.2 },
];

/** Tanques dentro del depósito, usados por la escena 3D. */
export const PLAN_TANKS: readonly { id: string; position: Point; radius: number }[] = [
  { id: 'tanque-1', position: { x: 935, y: 240 }, radius: 38 },
  { id: 'tanque-2', position: { x: 1000, y: 240 }, radius: 38 },
  { id: 'tanque-3', position: { x: 967, y: 300 }, radius: 30 },
];

/**
 * Contenedores de carga en la playa de maniobras.
 *
 * Son el elemento portuario que ancla la identidad AGUNSA: chapa naval
 * pintada en azul corporativo y acero.
 */
export interface PlanContainer extends PlanRect {
  id: string;
  tone: 'navy' | 'steel';
  stacked: boolean;
}

export const PLAN_CONTAINERS: readonly PlanContainer[] = [
  { id: 'cont-1', x: 838, y: 412, width: 56, height: 26, tone: 'navy', stacked: true },
  { id: 'cont-2', x: 900, y: 412, width: 56, height: 26, tone: 'steel', stacked: false },
  { id: 'cont-3', x: 962, y: 412, width: 56, height: 26, tone: 'navy', stacked: false },
  { id: 'cont-4', x: 838, y: 452, width: 56, height: 26, tone: 'steel', stacked: false },
  { id: 'cont-5', x: 900, y: 452, width: 56, height: 26, tone: 'navy', stacked: true },
  { id: 'cont-6', x: 962, y: 452, width: 56, height: 26, tone: 'steel', stacked: false },
];

/**
 * Traduce coordenadas de plano a coordenadas de mundo 3D.
 *
 * El origen del mundo se sitúa en el centro del plano: así la escena queda
 * simétrica alrededor del eje vertical y el encuadre de la cámara se puede
 * derivar del tamaño real de la instalación.
 */
export function planToWorld(point: Point): { x: number; y: number; z: number } {
  return {
    x: (point.x - PLAN_WIDTH / 2) * PLAN_TO_WORLD,
    y: 0,
    z: (point.y - PLAN_HEIGHT / 2) * PLAN_TO_WORLD,
  };
}
