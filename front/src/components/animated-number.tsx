'use client';

import gsap from 'gsap';
import { useEffect, useRef, useState } from 'react';

/**
 * Contador animado.
 *
 * Cuando el valor cambia (por ejemplo al simular un incidente) la cifra
 * transita en lugar de saltar: el operador percibe el cambio sin leer un
 * delta. GSAP conduce el tween; con `prefers-reduced-motion` la transición se
 * omite y la cifra salta al valor final.
 *
 * La interpolación conserva decimales: el redondeo ocurre al formatear, no al
 * interpolar. Así la serie no titila entre dos cifras enteras cuando el tween
 * pasa por un punto medio, y la cifra siempre lleva separador de miles.
 */

/** Formato por defecto: español de Chile, con un decimal como máximo. */
const DEFAULT_FORMAT = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 });

export interface AnimatedNumberProps {
  value: number;
  /** Duración aproximada de la transición, en milisegundos. */
  durationMs?: number;
  /** Formato de la cifra. Por defecto, `Intl.NumberFormat('es-CL')`. */
  format?: (value: number) => string;
  /**
   * Cuenta desde cero en la primera aparición. Reservado al momento de
   * entrada del dashboard; el resto de rutas muestran su valor de inmediato.
   */
  animateOnMount?: boolean;
  className?: string;
}

export function AnimatedNumber({
  value,
  durationMs = 700,
  format = (current) => DEFAULT_FORMAT.format(current),
  animateOnMount = false,
  className,
}: AnimatedNumberProps) {
  const from = animateOnMount ? 0 : value;
  const [display, setDisplay] = useState(from);
  const stateRef = useRef({ value: from });
  const displayRef = useRef(from);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      stateRef.current.value = value;
      displayRef.current = value;
      setDisplay(value);
      return;
    }

    if (stateRef.current.value === value) {
      setDisplay(value);
      return;
    }

    const tween = gsap.to(stateRef.current, {
      value,
      duration: durationMs / 1000,
      ease: 'power3.out',
      overwrite: true,
      onUpdate: () => {
        displayRef.current = stateRef.current.value;
        setDisplay(displayRef.current);
      },
    });

    return () => {
      tween.kill();
    };
  }, [value, durationMs]);

  return <span className={className}>{format(display)}</span>;
}

/**
 * Separa una cifra en su parte numérica y su unidad.
 *
 * Los bloques del dashboard reciben la figura ya redactada ("12", "12.5 min").
 * El contador necesita el número para interpolar y la unidad para escribirla
 * al lado, así que el texto se separa aquí en lugar de cambiar el contrato de
 * datos de cada bloque.
 */
export function parseFigure(value: string): { amount: number; unit: string } | null {
  const match = /^(-?\d+(?:[.,]\d+)?)\s*(.*)$/.exec(value.trim());
  const digits = match?.[1];
  if (!digits) return null;
  const amount = Number(digits.replace(',', '.'));
  if (!Number.isFinite(amount)) return null;
  return { amount, unit: match[2] ?? '' };
}
