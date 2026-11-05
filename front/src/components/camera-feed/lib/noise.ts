/**
 * Texturas de ruido reutilizadas por el renderizador del feed.
 *
 * El grano y las líneas de barrido se pre-generan una sola vez y se pintan
 * como patrón: recalcular ruido píxel a píxel en cada fotograma de 36
 * cámaras sería inviable para el navegador.
 *
 * El grano se genera con un generador determinista para que dos ejecuciones
 * del mockup produzcan exactamente la misma imagen (capturas comparables).
 */

const GRAIN_TILE_SIZE = 128;
const GRAIN_TILE_COUNT = 4;

let grainTiles: HTMLCanvasElement[] | null = null;
let scanlinePattern: CanvasPattern | null = null;

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** PRNG determinista (mulberry32) para el grano: mismo resultado en cada carga. */
function createNoiseRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getGrainTiles(): HTMLCanvasElement[] {
  if (grainTiles !== null) return grainTiles;

  const tiles: HTMLCanvasElement[] = [];
  for (let t = 0; t < GRAIN_TILE_COUNT; t++) {
    const canvas = createCanvas(GRAIN_TILE_SIZE, GRAIN_TILE_SIZE);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      tiles.push(canvas);
      continue;
    }
    const rng = createNoiseRng(0x9e37_79b9 + t * 7919);
    const image = ctx.createImageData(GRAIN_TILE_SIZE, GRAIN_TILE_SIZE);
    const data = image.data;
    for (let i = 0; i < data.length; i += 4) {
      // Distribución centrada: el ruido debe granular, no sesgar el brillo.
      const value = 118 + (rng() - 0.5) * 96;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    tiles.push(canvas);
  }

  grainTiles = tiles;
  return tiles;
}

export function getScanlinePattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (scanlinePattern !== null) return scanlinePattern;

  const canvas = createCanvas(1, 3);
  const tileCtx = canvas.getContext('2d');
  if (!tileCtx) return null;
  tileCtx.fillStyle = 'rgba(0, 0, 0, 0.24)';
  tileCtx.fillRect(0, 0, 1, 1);
  tileCtx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  tileCtx.fillRect(0, 1, 1, 1);

  scanlinePattern = ctx.createPattern(canvas, 'repeat');
  return scanlinePattern;
}
