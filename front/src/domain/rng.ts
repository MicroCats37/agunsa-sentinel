/**
 * Generador pseudoaleatorio determinista (mulberry32).
 *
 * Todo dato simulado se produce con esta función: sin `Math.random()` y sin
 * `Date.now()`, de modo que el servidor y el cliente generan el mismo dataset
 * y el mockup es reproducible entre ejecuciones.
 */

export interface Rng {
  /** Flotante en [0, 1). */
  next(): number;
  /** Entero en [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Flotante en [min, max). */
  float(min: number, max: number): number;
  /** Elemento aleatorio de un array no vacío. */
  pick<T>(items: readonly T[]): T;
  /** `true` con probabilidad `p`. */
  chance(p: number): boolean;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const rng: Rng = {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    float: (min, max) => next() * (max - min) + min,
    pick: <T>(items: readonly T[]): T => {
      const index = Math.floor(next() * items.length);
      const item = items[index];
      if (item === undefined) throw new Error('rng.pick requiere un array no vacío');
      return item;
    },
    chance: (p) => next() < p,
  };

  return rng;
}

/** Hash determinista de una cadena a entero de 32 bits (para derivar semillas). */
export function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
