'use client';

import gsap from 'gsap';
import * as React from 'react';
import { cn } from 'cn';

/**
 * Control segmentado con indicador deslizante.
 *
 * La pastilla activa no salta entre opciones: GSAP la desplaza y la ajusta al
 * ancho de la opcion seleccionada. Con `prefers-reduced-motion` la colocacion
 * es instantanea.
 */

export interface SegmentedControlOption {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onValueChange: (value: string) => void;
  size?: 'sm' | 'md';
  ariaLabel?: string;
  className?: string;
}

const sizeClasses: Record<'sm' | 'md', string> = {
  sm: 'gap-1 px-2 py-0.5 text-[11px]',
  md: 'gap-1.5 px-2.5 py-1 text-xs',
};

const DURATION = 0.28;

export function SegmentedControl({
  options,
  value,
  onValueChange,
  size = 'md',
  ariaLabel,
  className,
}: SegmentedControlProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const indicatorRef = React.useRef<HTMLSpanElement>(null);
  const placeRef = React.useRef<((animate: boolean) => void) | null>(null);
  const valueRef = React.useRef(value);
  const optionsRef = React.useRef(options);

  valueRef.current = value;
  optionsRef.current = options;

  React.useEffect(() => {
    const container = containerRef.current;
    const indicator = indicatorRef.current;
    if (!container || !indicator) return;

    const ctx = gsap.context(() => {
      const activeTrigger = (): HTMLButtonElement | null => {
        const index = optionsRef.current.findIndex((option) => option.value === valueRef.current);
        if (index < 0) return null;
        const triggers = container.querySelectorAll<HTMLButtonElement>(
          '[data-slot="segmented-trigger"]',
        );
        return triggers[index] ?? null;
      };

      const place = (animate: boolean) => {
        const trigger = activeTrigger();
        if (!trigger) {
          gsap.set(indicator, { opacity: 0 });
          return;
        }

        const target = {
          x: trigger.offsetLeft,
          y: trigger.offsetTop,
          width: trigger.offsetWidth,
          height: trigger.offsetHeight,
          opacity: 1,
        };

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!animate || reduced) {
          gsap.set(indicator, target);
          return;
        }

        gsap.to(indicator, {
          ...target,
          duration: DURATION,
          ease: 'power3.out',
          overwrite: true,
        });
      };

      placeRef.current = place;
      place(false);

      const resizeObserver = new ResizeObserver(() => place(false));
      resizeObserver.observe(container);
      container
        .querySelectorAll<HTMLButtonElement>('[data-slot="segmented-trigger"]')
        .forEach((trigger) => resizeObserver.observe(trigger));

      const onWindowResize = () => place(false);
      window.addEventListener('resize', onWindowResize);

      return () => {
        resizeObserver.disconnect();
        window.removeEventListener('resize', onWindowResize);
      };
    }, container);

    return () => {
      placeRef.current = null;
      ctx.revert();
    };
  }, []);

  React.useEffect(() => {
    placeRef.current?.(true);
  }, [value]);

  const activeIndex = options.findIndex((option) => option.value === value);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (options.length === 0) return;

    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();

    const current = activeIndex < 0 ? 0 : activeIndex;
    let next = current;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
      next = (current + 1) % options.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
      next = (current - 1 + options.length) % options.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = options.length - 1;

    const option = options[next];
    if (!option) return;

    onValueChange(option.value);
    const triggers = containerRef.current?.querySelectorAll<HTMLButtonElement>(
      '[data-slot="segmented-trigger"]',
    );
    triggers?.[next]?.focus();
  };

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={ariaLabel}
      data-slot="segmented-control"
      className={cn(
        'relative inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5',
        className,
      )}
      onKeyDown={handleKeyDown}
    >
      <span
        ref={indicatorRef}
        data-slot="segmented-indicator"
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 z-0 rounded-md bg-primary opacity-0 shadow-sm"
      />
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            data-slot="segmented-trigger"
            data-value={option.value}
            data-state={active ? 'active' : 'inactive'}
            tabIndex={active || (activeIndex < 0 && index === 0) ? 0 : -1}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'relative z-10 inline-flex items-center rounded-md font-medium text-muted-foreground transition-colors duration-(--duration-fast)',
              sizeClasses[size],
              active && 'text-primary-foreground',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
