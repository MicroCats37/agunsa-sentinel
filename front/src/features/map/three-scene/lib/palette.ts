/**
 * Paleta 3D de la instalación.
 *
 * Identidad AGUNSA: azul marino como color corporativo, acero galvanizado
 * para las estructuras ligeras y gris hormigón para los volúmenes built.
 * Ninguna superficie queda en negro puro: la escena se lee siempre.
 */
export const PALETTE = {
  /** Azul marino AGUNSA: cubiertas, contenedores y elementos de marca. */
  navy: 0x14395f,
  navyDeep: 0x0d2743,
  navyBright: 0x1d5488,
  /** Acero galvanizado: cerco, postes y estructuras metálicas. */
  steel: 0x9aa8b6,
  steelDark: 0x63707d,
  /** Hormigón: muros y losas. */
  concrete: 0x9ba4ad,
  concreteDark: 0x717a84,
  /** Asfalto de patios y calzadas. */
  asphalt: 0x3a424c,
  /** Terreno exterior a la planta. */
  ground: 0x1c222a,
  /** Señalética de portones y barreras. */
  gate: 0xe8a33d,
  /** Iluminación artificial. */
  lamp: 0xffeec4,
  /** Tanques de acero. */
  tank: 0xa7b2bd,
  /** Contenedores de carga. */
  containerNavy: 0x1b4674,
  containerSteel: 0x7a8692,
} as const;

/** Color de estado de las cámaras (mismo código que el resto de la aplicación). */
export const STATUS_COLOR = {
  activa: 0x3fb27f,
  alerta: 0xe5484d,
  fallando: 0xe8a33d,
  inactiva: 0x5c6b80,
} as const;

/**
 * Color de la clasificación del informe CCTV.
 *
 * Verde = buena general · ámbar = limitada · rojo = deficiente · gris = sin
 * imagen. Es la misma semántica que usa el registro de cámaras y el plano 2D.
 */
export const CLASSIFICATION_COLOR = {
  buena_general: 0x3fb27f,
  limitada: 0xe8a33d,
  deficiente: 0xe5484d,
  sin_imagen: 0x5c6b80,
} as const;

/** Cielo y fondo de la escena: nunca negro. */
export const SKY_COLOR = 0x101821;
export const FOG_COLOR = 0x121a24;
