/**
 * Ticker compartido por todos los feeds de cámara.
 *
 * Un único `requestAnimationFrame` alimenta a los 36 lienzos de la
 * plataforma: evita 36 bucles independientes y permite regular la cadencia
 * global cuando la pestaña no está en primer plano.
 */
type Tick = (elapsedMs: number, deltaMs: number) => void;

const subscribers = new Set<Tick>();
let rafId: number | null = null;
let lastTime = 0;
let startedAt = 0;

/** Cadencia objetivo del feed simulado (fotogramas por segundo). */
export const FEED_FPS = 15;

function loop(now: number): void {
  if (lastTime === 0) {
    lastTime = now;
    startedAt = now;
  }
  const delta = now - lastTime;
  lastTime = now;

  if (document.visibilityState === 'visible') {
    const minDelta = 1000 / FEED_FPS;
    if (delta >= minDelta) {
      for (const subscriber of subscribers) {
        subscriber(now - startedAt, delta);
      }
    }
  }

  rafId = window.requestAnimationFrame(loop);
}

export function subscribeToTicker(tick: Tick): () => void {
  subscribers.add(tick);
  if (rafId === null) {
    rafId = window.requestAnimationFrame(loop);
  }
  return () => {
    subscribers.delete(tick);
    if (subscribers.size === 0 && rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
      lastTime = 0;
    }
  };
}
