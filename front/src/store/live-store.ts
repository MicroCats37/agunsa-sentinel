import { PLATFORM_NOW_MS } from '@/domain/clock';
import { create } from 'zustand';

/**
 * Transporte de la operación en vivo.
 *
 * El store gobierna dos cosas inseparables: el estado del transporte —en vivo
 * o en pausa— y el reloj de operación que muestra la barra superior.
 *
 * El reloj no depende de la hora real del dispositivo: arranca en el instante
 * de referencia de la plataforma (`PLATFORM_NOW_MS`) y avanza con el tiempo
 * real mientras el transporte está activo. Al pausar se congela y al reanudar
 * continúa desde donde se quedó, de modo que el operador nunca ve el reloj
 * saltar hacia atrás.
 *
 * El store **no** se persiste: al recargar la página el centro de control
 * vuelve a espera, que es el estado en el que debe estar una sala de control.
 * Los incidentes que genere, en cambio, sí quedan en el histórico.
 */
export interface LiveState {
  /** `true` cuando el centro de control está recibiendo detecciones. */
  running: boolean;
  /** Reloj de operación, en milisegundos. */
  clockMs: number;
  /** Instante de plataforma al que está anclado el reloj. */
  anchorMs: number;
  /** Marca de tiempo real del momento en que se fijó el anclaje. */
  anchorRealMs: number;
  /** Pone en marcha la operación en vivo. */
  start: () => void;
  /** Detiene la operación en vivo y congela el reloj. */
  stop: () => void;
  /** Alterna entre marcha y parada. */
  toggle: () => void;
  /** Actualiza el reloj al tiempo real transcurrido desde el anclaje. */
  tick: () => void;
}

/** Milisegundos transcurridos desde el anclaje del reloj. */
function elapsedSince(anchorRealMs: number): number {
  return Math.max(0, Date.now() - anchorRealMs);
}

export const useLiveStore = create<LiveState>()((set, get) => ({
  running: false,
  clockMs: PLATFORM_NOW_MS,
  anchorMs: PLATFORM_NOW_MS,
  anchorRealMs: Date.now(),

  start: () => {
    const state = get();
    if (state.running) return;
    set({
      running: true,
      anchorMs: state.clockMs,
      anchorRealMs: Date.now(),
    });
  },

  stop: () => {
    const state = get();
    if (!state.running) return;
    set({
      running: false,
      clockMs: state.anchorMs + elapsedSince(state.anchorRealMs),
    });
  },

  toggle: () => {
    const state = get();
    if (state.running) state.stop();
    else state.start();
  },

  tick: () => {
    const state = get();
    if (!state.running) return;
    set({ clockMs: state.anchorMs + elapsedSince(state.anchorRealMs) });
  },
}));
