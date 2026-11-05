/**
 * Historial de movimiento de los objetos detectados.
 *
 * Cada identificación conserva las últimas posiciones normalizadas para
 * dibujar el rastro: en un NVR real la caja de seguimiento deja una estela
 * que permite leer la trayectoria, no sólo la posición instantánea.
 */

export interface TrailPoint {
  x: number;
  y: number;
}

const MAX_POINTS = 16;

export class MotionTrails {
  private readonly history = new Map<string, TrailPoint[]>();

  push(id: string, x: number, y: number): void {
    const points = this.history.get(id) ?? [];
    points.push({ x, y });
    if (points.length > MAX_POINTS) points.shift();
    this.history.set(id, points);
  }

  get(id: string): readonly TrailPoint[] {
    return this.history.get(id) ?? [];
  }

  /** Elimina el rastro de las identificaciones que ya no están en escena. */
  retain(ids: readonly string[]): void {
    for (const id of [...this.history.keys()]) {
      if (!ids.includes(id)) this.history.delete(id);
    }
  }

  clear(): void {
    this.history.clear();
  }
}
