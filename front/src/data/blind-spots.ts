/**
 * Puntos ciegos históricos documentados en el plano del cliente.
 *
 * `PLANO DE CAMARAS PERIMETRICAS.pdf` (fuente E2) anota tres puntos ciegos.
 * Son **anotaciones históricas, no mediciones nuevas**: el informe lo dice de
 * forma explícita y por eso el mockup no les asigna distancia ni extensión.
 */
export interface BlindSpot {
  id: string;
  /** Descripción literal de la anotación del plano. */
  annotation: string;
  /** Ubicación aproximada en el plano (borde superior izquierdo / lateral…). */
  location: string;
  /** Naturaleza del punto ciego según el informe. */
  kind: 'vegetacion' | 'distancia';
  /** Estado del hallazgo: anotación heredada, pendiente de medir. */
  status: 'historico';
  note: string;
}

export const BLIND_SPOTS: readonly BlindSpot[] = [
  {
    id: 'PC1',
    annotation: 'Árboles',
    location: 'Borde superior izquierdo',
    kind: 'vegetacion',
    status: 'historico',
    note: 'Anotación histórica en el borde superior izquierdo del plano.',
  },
  {
    id: 'PC2',
    annotation: 'Distancia',
    location: 'Lateral izquierdo',
    kind: 'distancia',
    status: 'historico',
    note: 'Anotación histórica en el lateral izquierdo del plano.',
  },
  {
    id: 'PC3',
    annotation: 'Distancia',
    location: 'Lateral derecho',
    kind: 'distancia',
    status: 'historico',
    note: 'Anotación histórica en el lateral derecho del plano.',
  },
];

export const BLIND_SPOT_BY_ID = new Map(BLIND_SPOTS.map((spot) => [spot.id, spot] as const));

/**
 * Advertencia del informe que acompaña a los puntos ciegos.
 * Se muestra literalmente en la ruta de modernización.
 */
export const BLIND_SPOT_CAVEAT =
  'PC1-PC3 son anotaciones históricas, no mediciones nuevas. A-D son sectores documentales; X no es un sector físico. Para cerrar el plano hay que identificar calles, numerar postes, vincular cada IP con foto del montaje y serie, medir altura/dirección y distancias, y luego trazar cobertura y recorridos de cable.';
