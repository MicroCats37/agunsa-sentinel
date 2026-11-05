/**
 * Obstrucciones observadas durante la evaluación.
 *
 * Las cuatro obstrucciones que el informe documenta sobre las fichas de
 * cámara. El hallazgo es real y verificable; lo que **no** se puede afirmar sin
 * recorrido en sitio es el área que queda oculta ni la cobertura de las
 * cámaras vecinas.
 */
export interface Obstruction {
  id: string;
  /** Cámara del inventario asociada. */
  cameraId: string;
  ip: string;
  /** Descripción del obstáculo observada en el fotograma. */
  subject: string;
  /** Efecto declarado sobre la cobertura. */
  effect: string;
  /** Condición para cerrar el hallazgo. */
  verification: string;
}

export const OBSTRUCTIONS: readonly Obstruction[] = [
  {
    id: 'OC03',
    cameraId: 'C03',
    ip: '100.168.80.51',
    subject: 'Poste central',
    effect:
      'Obstrucción visible; área oculta y cobertura de cámaras vecinas por medir. El poste blanco ocupa el centro y divide la escena nocturna.',
    verification:
      'Reubicar el encuadre fuera del poste, limpiar y enfocar; después repetir la prueba día/noche y medir la cobertura vecina.',
  },
  {
    id: 'OC16',
    cameraId: 'C16',
    ip: '100.168.160.17',
    subject: 'Apilamiento de contenedores',
    effect:
      'Obstrucción visible; área oculta y cobertura de cámaras vecinas por medir. Los contenedores apilados ocultan el área posterior.',
    verification:
      'Coordinar restricciones de apilamiento y reubicar la cámara; añadir cobertura sólo tras una prueba con objetivo.',
  },
  {
    id: 'OC31',
    cameraId: 'C31',
    ip: '100.168.100.8',
    subject: 'Vegetación y techos',
    effect:
      'Obstrucción visible; área oculta y cobertura de cámaras vecinas por medir. La vegetación ocupa buena parte del encuadre.',
    verification:
      'Solicitar el perfil principal, corregir la vegetación y conciliar calle/poste del inventario duplicado.',
  },
  {
    id: 'OC35',
    cameraId: 'C35',
    ip: '100.168.100.14',
    subject: 'Obstáculo cercano y orientación',
    effect:
      'Obstrucción visible; área oculta y cobertura de cámaras vecinas por medir. La reja cercana domina el encuadre.',
    verification:
      'Reubicar el objetivo de cobertura, revisar el perfil de 640 × 480 y verificar orientación en campo.',
  },
];

export const OBSTRUCTION_BY_ID = new Map(OBSTRUCTIONS.map((item) => [item.id, item] as const));

export const OBSTRUCTION_BY_CAMERA = new Map(
  OBSTRUCTIONS.map((item) => [item.cameraId, item] as const),
);

/**
 * Advertencia del informe: no se infiere que toda la zona carezca de cobertura.
 * Se conserva literal porque condiciona la fase 4 del plan.
 */
export const OBSTRUCTION_CAVEAT =
  'Estos hallazgos no se ubican geográficamente por falta de vínculo IP-poste. No se infiere que toda la zona carezca de cobertura: confirmar con recorrido y vistas vecinas. No agregar cámaras por una estimación visual sin prueba del objetivo de vigilancia.';
