'use client';

import gsap from 'gsap';
import { useEffect, useId, useRef } from 'react';

/**
 * Sparkline de tendencia.
 *
 * Gráfico mínimo en SVG, sin dependencias: la tendencia de un indicador cabe
 * en 96×28 píxeles y no necesita ejes ni leyenda.
 *
 * La línea se dibuja una sola vez, en el primer render del componente:
 * `stroke-dashoffset` recorre el trazo hasta cero en 600 ms. Con
 * `prefers-reduced-motion` la línea aparece completa desde el primer
 * fotograma, sin movimiento y sin perder el color.
 */

export type SparkTone = 'info' | 'normal' | 'warning' | 'critical' | 'muted';

/** Tokens del tema: el sparkline no inventa colores propios. */
const TONE_COLOR: Record<SparkTone, string> = {
  info: 'var(--color-info)',
  normal: 'var(--color-normal)',
  warning: 'var(--color-warning)',
  critical: 'var(--color-critical)',
  muted: 'var(--muted-foreground)',
};

/**
 * Longitud normalizada del trazo. `pathLength` la reescala al largo real
 * dibujado, así el patrón de guiones no depende del viewBox ni del estirado
 * horizontal del componente.
 */
const PATH_LENGTH = 100;

/** Duración del dibujo de la línea, en segundos. */
const DRAW_DURATION = 0.6;

/**
 * Escape para `prefers-reduced-motion`: la línea se ve completa desde el
 * primer fotograma. La regla gana al atributo que la oculta antes del dibujo.
 */
const REDUCED_MOTION_CSS =
  '@media (prefers-reduced-motion: reduce){.spark-line{stroke-dashoffset:0 !important}}';

export interface SparklineProps {
  data: readonly number[];
  tone?: SparkTone;
  className?: string;
  /** Etiqueta accesible con la tendencia. */
  label?: string;
}

export function Sparkline({ data, tone = 'info', className, label }: SparklineProps) {
  const gradientId = useId().replace(/:/g, '');
  const lineRef = useRef<SVGPolylineElement | null>(null);
  const drawnRef = useRef(false);
  const hasSeries = data.length >= 2;

  useEffect(() => {
    const line = lineRef.current;
    if (!line || drawnRef.current) return;
    drawnRef.current = true;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(line, { strokeDasharray: 'none', strokeDashoffset: 0 });
      return;
    }

    const context = gsap.context(() => {
      gsap.set(line, { strokeDasharray: PATH_LENGTH, strokeDashoffset: PATH_LENGTH });
      gsap.to(line, {
        strokeDashoffset: 0,
        duration: DRAW_DURATION,
        ease: 'power2.out',
        onComplete: () => {
          gsap.set(line, { strokeDasharray: 'none', strokeDashoffset: 0 });
        },
      });
    });

    return () => {
      drawnRef.current = false;
      context.revert();
    };
  }, [hasSeries]);

  if (!hasSeries) return null;

  const width = 96;
  const height = 28;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const step = width / (data.length - 1);

  const points = data.map((value, index) => {
    const x = index * step;
    const y = height - ((value - min) / span) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const color = TONE_COLOR[tone];
  const area = `0,${height} ${points.join(' ')} ${width},${height}`;

  return (
    <>
      <style>{REDUCED_MOTION_CSS}</style>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={className}
        role="img"
        aria-label={label ?? 'Tendencia'}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`spark-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#spark-${gradientId})`} />
        <polyline
          ref={lineRef}
          className="spark-line"
          points={points.join(' ')}
          pathLength={PATH_LENGTH}
          strokeDasharray={PATH_LENGTH}
          strokeDashoffset={PATH_LENGTH}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={width}
          cy={Number(points[points.length - 1]?.split(',')[1] ?? 0)}
          r="2"
          fill={color}
        />
      </svg>
    </>
  );
}
