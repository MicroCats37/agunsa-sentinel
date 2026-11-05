import type { Camera } from '@/domain/types';

/**
 * Fondos de los feeds de cámara.
 *
 * Cada tipo de cámara tiene su propio escenario (cerco perimetral, acceso
 * vehicular, estacionamiento, interior de almacén) con dos versiones: día e
 * ICR nocturno. El fondo se dibuja una sola vez en un lienzo fuera de
 * pantalla y luego se copia en cada fotograma, de modo que el coste por
 * cámara se mantiene constante.
 */

export type BackgroundMode = 'dia' | 'noche';

export interface ScenePalette {
  skyTop: string;
  skyBottom: string;
  groundTop: string;
  groundBottom: string;
  structure: string;
  structureLight: string;
  accent: string;
  /** Color de la iluminación artificial y su halo. */
  lamp: string;
  /** Tinte general del ambiente (marino de AGUNSA en exterior). */
  ambient: string;
}

const DAY: ScenePalette = {
  skyTop: '#2f5f96',
  skyBottom: '#b7cde0',
  groundTop: '#6a7078',
  groundBottom: '#4a5058',
  structure: '#9aa4ad',
  structureLight: '#c6ced5',
  accent: '#e0a33c',
  lamp: 'rgba(255, 238, 198, 0.85)',
  ambient: '#1b3a5f',
};

const NIGHT: ScenePalette = {
  skyTop: '#070a10',
  skyBottom: '#1c2430',
  groundTop: '#2a3039',
  groundBottom: '#10141a',
  structure: '#39414b',
  structureLight: '#59636f',
  accent: '#8fa4bb',
  lamp: 'rgba(255, 236, 194, 0.9)',
  ambient: '#16233a',
};

const INTERIOR_DAY: ScenePalette = {
  skyTop: '#d8dde2',
  skyBottom: '#eef1f4',
  groundTop: '#8d939a',
  groundBottom: '#6c7278',
  structure: '#aab2ba',
  structureLight: '#d3d9de',
  accent: '#c8b48a',
  lamp: 'rgba(255, 244, 214, 0.95)',
  ambient: '#9aa6b2',
};

const INTERIOR_NIGHT: ScenePalette = {
  skyTop: '#0a0d11',
  skyBottom: '#161a20',
  groundTop: '#272d34',
  groundBottom: '#101317',
  structure: '#333a42',
  structureLight: '#4e565f',
  accent: '#a89a80',
  lamp: 'rgba(255, 240, 206, 0.9)',
  ambient: '#2c3239',
};

export function paletteFor(camera: Camera, mode: BackgroundMode): ScenePalette {
  const interior = camera.scene === 'almacen';
  if (interior) return mode === 'dia' ? INTERIOR_DAY : INTERIOR_NIGHT;
  return mode === 'dia' ? DAY : NIGHT;
}

export function renderBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  camera: Camera,
  mode: BackgroundMode,
): void {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  const palette = paletteFor(camera, mode);

  switch (camera.scene) {
    case 'acceso':
      drawAccessScene(ctx, width, height, palette, mode);
      break;
    case 'estacionamiento':
      drawParkingScene(ctx, width, height, palette, mode);
      break;
    case 'almacen':
      drawWarehouseScene(ctx, width, height, palette, mode);
      break;
    case 'perimetro':
    default:
      drawPerimeterScene(ctx, width, height, palette, mode);
      break;
  }

  drawVignette(ctx, width, height, mode);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Utilidades de escena                                                */
/* ------------------------------------------------------------------ */

function verticalGradient(
  ctx: CanvasRenderingContext2D,
  from: number,
  to: number,
  top: string,
  bottom: string,
): void {
  const gradient = ctx.createLinearGradient(0, from, 0, to);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, from, ctx.canvas.width, to - from);
}

function drawVignette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mode: BackgroundMode,
): void {
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.22,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.78,
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.65, mode === 'dia' ? 'rgba(0,0,0,0.16)' : 'rgba(0,0,0,0.22)');
  gradient.addColorStop(1, mode === 'dia' ? 'rgba(0,0,0,0.52)' : 'rgba(0,0,0,0.68)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawLightCone(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  spread: number,
  reach: number,
  palette: ScenePalette,
): void {
  const gradient = ctx.createLinearGradient(x, y, x, y + reach);
  gradient.addColorStop(0, 'rgba(255, 236, 194, 0.28)');
  gradient.addColorStop(0.55, 'rgba(255, 228, 176, 0.09)');
  gradient.addColorStop(1, 'rgba(255, 222, 166, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(x - 5, y);
  ctx.lineTo(x + 5, y);
  ctx.lineTo(x + spread, y + reach);
  ctx.lineTo(x - spread, y + reach);
  ctx.closePath();
  ctx.fill();
  void palette;
}

function drawLightPole(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  height: number,
  reach: number,
  palette: ScenePalette,
): void {
  drawLightCone(ctx, x, baseY - height, height * 0.62, reach, palette);
  ctx.fillStyle = '#171d24';
  ctx.fillRect(x - 1.5, baseY - height, 3, height);
  ctx.fillStyle = '#39434e';
  ctx.fillRect(x - 7, baseY - height - 3, 14, 4);
  ctx.fillStyle = palette.lamp;
  ctx.fillRect(x - 5, baseY - height + 1, 10, 2.5);
}

function drawDistantSkyline(
  ctx: CanvasRenderingContext2D,
  width: number,
  baseY: number,
  color: string,
): void {
  ctx.fillStyle = color;
  let x = -10;
  let seed = 7;
  while (x < width) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const w = 18 + (seed % 34);
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const h = 10 + (seed % 30);
    ctx.fillRect(x, baseY - h, w, h);
    x += w + 3;
  }
}

/** Contenedores portuarios al fondo: el ancla visual de la identidad AGUNSA. */
function drawContainerRow(
  ctx: CanvasRenderingContext2D,
  width: number,
  baseY: number,
  scale: number,
  navy: string,
  steel: string,
): void {
  const tones = [navy, steel, navy, steel, navy];
  let x = -width * 0.05;
  let index = 0;
  while (x < width * 1.02) {
    const w = width * 0.075 * scale;
    const h = width * 0.028 * scale;
    const tone = tones[index % tones.length] ?? steel;
    ctx.fillStyle = tone;
    ctx.fillRect(x, baseY - h, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let i = 1; i < 6; i++) {
      ctx.fillRect(x + (w / 6) * i, baseY - h, 1, h);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x, baseY - h, w, 1.5);
    x += w * 1.08;
    index += 1;
  }
}

function drawTreeLine(
  ctx: CanvasRenderingContext2D,
  width: number,
  baseY: number,
  color: string,
): void {
  ctx.fillStyle = color;
  let x = -8;
  let seed = 991;
  while (x < width + 8) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const w = 14 + (seed % 26);
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const h = 12 + (seed % 26);
    ctx.beginPath();
    ctx.ellipse(x + w / 2, baseY - h * 0.45, w / 2, h * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    x += w * 0.62;
  }
}

/* ------------------------------------------------------------------ */
/* Escenario: cerco perimetral                                         */
/* ------------------------------------------------------------------ */

function drawPerimeterScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: ScenePalette,
  mode: BackgroundMode,
): void {
  const horizon = height * 0.44;

  verticalGradient(ctx, 0, horizon, palette.skyTop, palette.skyBottom);
  if (mode === 'dia') {
    drawContainerRow(ctx, width, horizon + 2, 1, '#1d3f68', '#7d8894');
    drawDistantSkyline(ctx, width, horizon - 4, 'rgba(120, 136, 152, 0.45)');
  } else {
    drawDistantSkyline(ctx, width, horizon - 4, 'rgba(16, 23, 32, 0.9)');
  }
  drawTreeLine(
    ctx,
    width,
    horizon,
    mode === 'dia' ? 'rgba(38, 58, 42, 0.92)' : 'rgba(9, 14, 20, 0.92)',
  );

  // Camino de tierra al otro lado del cerco.
  verticalGradient(ctx, horizon, height * 0.56, '#4a4740', '#3a3833');

  // Banda de suelo en primer plano.
  verticalGradient(ctx, height * 0.56, height, palette.groundTop, palette.groundBottom);

  // Cerco: malla de rombos + postes.
  const fenceTop = height * 0.34;
  const fenceBottom = height * 0.8;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, fenceTop, width, fenceBottom - fenceTop);
  ctx.clip();

  ctx.strokeStyle = mode === 'dia' ? 'rgba(120, 138, 155, 0.32)' : 'rgba(150, 168, 185, 0.16)';
  ctx.lineWidth = 0.8;
  const step = 13;
  for (let i = -height; i < width + height; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, fenceTop);
    ctx.lineTo(i + (fenceBottom - fenceTop), fenceBottom);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i, fenceTop);
    ctx.lineTo(i - (fenceBottom - fenceTop), fenceBottom);
    ctx.stroke();
  }

  ctx.strokeStyle = mode === 'dia' ? 'rgba(120, 132, 145, 0.5)' : 'rgba(178, 194, 208, 0.42)';
  ctx.lineWidth = 2.2;
  for (let x = 6; x < width; x += 46) {
    ctx.beginPath();
    ctx.moveTo(x, fenceTop);
    ctx.lineTo(x, fenceBottom);
    ctx.stroke();
  }

  ctx.strokeStyle = mode === 'dia' ? 'rgba(112, 126, 140, 0.62)' : 'rgba(198, 212, 224, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, fenceTop);
  ctx.lineTo(width, fenceTop);
  ctx.moveTo(0, fenceBottom);
  ctx.lineTo(width, fenceBottom);
  ctx.stroke();

  ctx.strokeStyle = mode === 'dia' ? 'rgba(120, 132, 145, 0.34)' : 'rgba(190, 205, 220, 0.3)';
  ctx.lineWidth = 0.9;
  for (let y = fenceTop - 9; y < fenceTop; y += 4.5) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  drawLightPole(ctx, width * 0.78, height * 0.72, height * 0.46, height * 0.6, palette);
  drawLightPole(ctx, width * 0.16, height * 0.62, height * 0.32, height * 0.42, palette);

  // Vegetación en primer plano.
  ctx.fillStyle = mode === 'dia' ? 'rgba(30, 46, 32, 0.9)' : 'rgba(8, 12, 16, 0.85)';
  ctx.beginPath();
  ctx.ellipse(width * 0.05, height * 0.93, width * 0.16, height * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(width * 0.97, height * 0.97, width * 0.2, height * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
}

/* ------------------------------------------------------------------ */
/* Escenario: acceso vehicular                                          */
/* ------------------------------------------------------------------ */

function drawAccessScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: ScenePalette,
  mode: BackgroundMode,
): void {
  const horizon = height * 0.36;

  verticalGradient(ctx, 0, horizon, palette.skyTop, palette.skyBottom);
  if (mode === 'dia') {
    drawContainerRow(ctx, width, horizon + 1, 0.85, '#1d3f68', '#7d8894');
  } else {
    drawDistantSkyline(ctx, width, horizon, 'rgba(18, 25, 34, 0.92)');
  }

  // Caseta de control a la izquierda.
  const boothX = width * 0.03;
  const boothW = width * 0.19;
  const boothTop = height * 0.26;
  const boothBottom = height * 0.68;
  ctx.fillStyle = mode === 'dia' ? '#b9c2ca' : '#232b34';
  ctx.fillRect(boothX, boothTop, boothW, boothBottom - boothTop);
  ctx.fillStyle = mode === 'dia' ? '#8d97a1' : '#2f3944';
  ctx.fillRect(boothX - 4, boothTop - 5, boothW + 8, 7);
  ctx.fillStyle = 'rgba(255, 224, 160, 0.35)';
  ctx.fillRect(boothX + boothW * 0.16, boothTop + 9, boothW * 0.68, (boothBottom - boothTop) * 0.3);
  ctx.fillStyle = 'rgba(255, 236, 190, 0.5)';
  ctx.fillRect(boothX + boothW * 0.2, boothTop + 12, boothW * 0.6, (boothBottom - boothTop) * 0.24);

  // Barrera levadiza.
  const barrierY = height * 0.55;
  ctx.fillStyle = '#1a2028';
  ctx.fillRect(width * 0.22, barrierY - 3, 6, height * 0.18);
  ctx.save();
  ctx.translate(width * 0.25, barrierY);
  ctx.rotate(-0.06);
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#c0392b' : '#e8e4dc';
    ctx.fillRect(i * (width * 0.045), -4, width * 0.045, 8);
  }
  ctx.restore();

  // Calzada.
  verticalGradient(ctx, horizon, height, mode === 'dia' ? '#5d646c' : '#242a31', '#0d1116');
  ctx.fillStyle = 'rgba(226, 232, 238, 0.22)';
  for (let i = 0; i < 7; i++) {
    ctx.fillRect(width * 0.42 + i * width * 0.09, height * 0.86, width * 0.055, 3);
  }
  ctx.fillStyle = 'rgba(226, 232, 238, 0.16)';
  ctx.fillRect(width * 0.34, height * 0.62, width * 0.66, 2.5);

  drawLightPole(ctx, width * 0.86, height * 0.5, height * 0.42, height * 0.55, palette);
  drawLightPole(ctx, width * 0.3, height * 0.42, height * 0.3, height * 0.4, palette);
}

/* ------------------------------------------------------------------ */
/* Escenario: estacionamiento                                           */
/* ------------------------------------------------------------------ */

function drawParkingScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: ScenePalette,
  mode: BackgroundMode,
): void {
  const horizon = height * 0.3;

  verticalGradient(ctx, 0, horizon, palette.skyTop, palette.skyBottom);
  if (mode === 'dia') {
    drawContainerRow(ctx, width, horizon + 1, 0.8, '#1d3f68', '#7d8894');
  } else {
    drawDistantSkyline(ctx, width, horizon, 'rgba(15, 21, 29, 0.92)');
  }
  verticalGradient(ctx, horizon, height, mode === 'dia' ? '#5b6169' : '#1b2027', '#090c10');

  // Calles de estacionamiento en perspectiva.
  ctx.strokeStyle = 'rgba(228, 234, 240, 0.16)';
  ctx.lineWidth = 1.4;
  for (let i = -2; i < 9; i++) {
    const topX = width * 0.5 + (i - 3) * width * 0.035;
    const bottomX = width * 0.5 + (i - 3) * width * 0.17;
    ctx.beginPath();
    ctx.moveTo(topX, horizon);
    ctx.lineTo(bottomX, height);
    ctx.stroke();
  }

  // Vehículos estacionados (estáticos).
  const rows = [
    { y: height * 0.42, scale: 0.45 },
    { y: height * 0.66, scale: 0.8 },
  ];
  for (const row of rows) {
    let x = -width * 0.06;
    while (x < width) {
      const w = width * 0.11 * row.scale;
      const h = height * 0.1 * row.scale;
      ctx.fillStyle = mode === 'dia' ? '#5d6873' : 'rgba(8, 11, 15, 0.92)';
      ctx.beginPath();
      ctx.roundRect(x, row.y, w, h, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(120, 140, 160, 0.12)';
      ctx.fillRect(x + w * 0.14, row.y + h * 0.18, w * 0.72, h * 0.34);
      x += w * 1.35;
    }
  }

  drawLightPole(ctx, width * 0.24, height * 0.58, height * 0.4, height * 0.52, palette);
  drawLightPole(ctx, width * 0.72, height * 0.58, height * 0.4, height * 0.52, palette);
}

/* ------------------------------------------------------------------ */
/* Escenario: interior de almacén                                      */
/* ------------------------------------------------------------------ */

function drawWarehouseScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: ScenePalette,
  mode: BackgroundMode,
): void {
  const ceiling = height * 0.16;
  const floorLine = height * 0.72;

  verticalGradient(ctx, 0, ceiling, mode === 'dia' ? '#c8ced4' : '#0a0d11', palette.skyBottom);
  verticalGradient(ctx, ceiling, floorLine, palette.groundTop, palette.structureLight);
  verticalGradient(ctx, floorLine, height, palette.groundTop, palette.groundBottom);

  // Luminarias de techo.
  ctx.fillStyle = palette.lamp;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(width * (0.16 + i * 0.3), ceiling * 0.45, width * 0.16, 3.5);
  }
  ctx.fillStyle = 'rgba(255, 238, 200, 0.08)';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(width * (0.16 + i * 0.3), ceiling * 0.6);
    ctx.lineTo(width * (0.32 + i * 0.3), ceiling * 0.6);
    ctx.lineTo(width * (0.4 + i * 0.3), floorLine);
    ctx.lineTo(width * (0.08 + i * 0.3), floorLine);
    ctx.closePath();
    ctx.fill();
  }

  // Estanterías con carga.
  for (let i = 0; i < 3; i++) {
    const x = width * (0.04 + i * 0.33);
    const w = width * 0.24;
    const top = ceiling + height * 0.08;
    const bottom = floorLine - height * 0.02;
    ctx.fillStyle = mode === 'dia' ? '#5f6873' : 'rgba(24, 29, 35, 0.95)';
    ctx.fillRect(x, top, w, bottom - top);
    ctx.strokeStyle = mode === 'dia' ? 'rgba(96, 108, 122, 0.5)' : 'rgba(126, 142, 158, 0.3)';
    ctx.lineWidth = 1.2;
    for (let s = 1; s < 4; s++) {
      const sy = top + ((bottom - top) / 4) * s;
      ctx.beginPath();
      ctx.moveTo(x, sy);
      ctx.lineTo(x + w, sy);
      ctx.stroke();
    }
    ctx.fillStyle = mode === 'dia' ? 'rgba(176, 138, 78, 0.55)' : 'rgba(150, 122, 76, 0.28)';
    for (let b = 0; b < 3; b++) {
      const by = top + ((bottom - top) / 4) * b + 4;
      ctx.fillRect(x + 5, by, w - 10, (bottom - top) / 4 - 9);
    }
  }

  // Columnas y suelo en perspectiva.
  ctx.fillStyle = mode === 'dia' ? 'rgba(150, 158, 166, 0.9)' : 'rgba(12, 16, 20, 0.9)';
  for (let i = 0; i < 2; i++) {
    ctx.fillRect(width * (0.28 + i * 0.44), ceiling, width * 0.025, floorLine - ceiling);
  }
  ctx.strokeStyle = 'rgba(150, 165, 180, 0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 9; i++) {
    const x = width * (i / 8);
    ctx.beginPath();
    ctx.moveTo(width * 0.5 + (x - width * 0.5) * 0.35, floorLine);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
}
