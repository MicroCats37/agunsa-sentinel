import type { Point, Sector } from '@/domain/types';

/**
 * Sectores documentales del perímetro.
 *
 * El informe define cuatro sectores con código (A–D) más una asignación `X`
 * que **no es un sector físico**: es la lista de equipos por conciliar. C31
 * (100.168.100.8) tiene doble asignación entre Arica y Corola.
 *
 * Los polígonos son bandas sobre el cerco del plano: son una aproximación
 * gráfica para leer el mapa, no una medición del terreno.
 */
export const SECTORS: readonly Sector[] = [
  {
    id: 'sec-gambetta',
    code: 'A',
    name: 'A · Gambetta',
    description:
      'Av. Nestor Gambetta (auxiliar). C01–C17 según inventario; Gambetta confirmado por el usuario el 03/11/2026. Falta identificar su borde y sus postes en el plano.',
    polygon: [
      { x: 110, y: 60 },
      { x: 1090, y: 60 },
      { x: 1090, y: 150 },
      { x: 110, y: 150 },
    ],
    incidentDensity: 0,
  },
  {
    id: 'sec-siete',
    code: 'B',
    name: 'B · Siete',
    description:
      'Calle Siete. C18–C22 según las fichas individuales; el resumen de sectores del informe indica C18–C21, por lo que la asignación de C22 queda abierta para la fase 1.',
    polygon: [
      { x: 60, y: 110 },
      { x: 150, y: 110 },
      { x: 150, y: 670 },
      { x: 60, y: 670 },
    ],
    incidentDensity: 0,
  },
  {
    id: 'sec-arica',
    code: 'C',
    name: 'C · Arica',
    description:
      'Calle Arica. C23–C30 según las fichas individuales. C31 también aparece aquí por la duplicidad de inventario.',
    polygon: [
      { x: 1040, y: 110 },
      { x: 1140, y: 110 },
      { x: 1140, y: 670 },
      { x: 1040, y: 670 },
    ],
    incidentDensity: 0,
  },
  {
    id: 'sec-corola',
    code: 'D',
    name: 'D · Corola',
    description:
      'Calle Corola. C32–C36 según inventario. C31 también aparece aquí por la duplicidad de inventario.',
    polygon: [
      { x: 110, y: 630 },
      { x: 1090, y: 630 },
      { x: 1090, y: 720 },
      { x: 110, y: 720 },
    ],
    incidentDensity: 0,
  },
  {
    id: 'sec-por-conciliar',
    code: 'X',
    name: 'X · Por conciliar',
    description:
      'C31 (100.168.100.8): IP repetida en Arica y Corola. No es un sector físico; es una asignación pendiente de conciliación.',
    polygon: [
      { x: 1040, y: 630 },
      { x: 1140, y: 670 },
      { x: 1090, y: 720 },
      { x: 1040, y: 720 },
    ],
    incidentDensity: 0,
  },
];

export const SECTOR_BY_ID = new Map(SECTORS.map((sector) => [sector.id, sector] as const));

export function getSector(sectorId: string): Sector | undefined {
  return SECTOR_BY_ID.get(sectorId);
}

/** Sector asignado por defecto a una cámara del inventario. */
export const DEFAULT_SECTOR_ID = 'sec-gambetta';

/** Tramos del cerco donde se distributes provisionalmente cada sector. */
export const SECTOR_SEGMENTS: Readonly<
  Record<string, { from: Point; to: Point; provisional: boolean }>
> = {
  'sec-gambetta': { from: { x: 150, y: 60 }, to: { x: 1050, y: 60 }, provisional: true },
  'sec-siete': { from: { x: 60, y: 150 }, to: { x: 60, y: 640 }, provisional: true },
  'sec-arica': { from: { x: 1140, y: 150 }, to: { x: 1140, y: 640 }, provisional: true },
  'sec-corola': { from: { x: 1000, y: 720 }, to: { x: 300, y: 720 }, provisional: true },
  'sec-por-conciliar': { from: { x: 1115, y: 695 }, to: { x: 1115, y: 695 }, provisional: true },
};

/**
 * Descrepancia documentada entre el resumen de sectores del informe y las
 * fichas individuales. Se muestra en la ruta de modernización.
 */
export const SECTOR_DISCREPANCY =
  'El resumen de sectores del informe asigna C18–C21 a «B · Siete» y C22–C30 a «C · Arica». Las fichas individuales asignan C22 a CALLE SIETE. El mockup usa la ficha individual (C18–C22 en Siete) y deja la conciliación abierta como parte de la fase 1.';
