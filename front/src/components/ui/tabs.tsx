'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import { Tabs as TabsPrimitive } from 'radix-ui';

function Tabs({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn('group/tabs flex gap-2 data-horizontal:flex-col', className)}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  'group/tabs-list relative inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none',
  {
    variants: {
      variant: {
        default: 'bg-muted',
        line: 'gap-1 bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

/** Grosor del indicador en la variante `line`. */
const INDICATOR_THICKNESS = 2;

function TabsList({
  className,
  variant = 'default',
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const indicatorRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    const list = listRef.current;
    const indicator = indicatorRef.current;
    if (!list || !indicator) return;

    let activeTrigger: HTMLElement | null = null;
    let triggerObserver: ResizeObserver | null = null;
    let firstPlacement = true;

    /**
     * Coloca el indicador sobre el trigger activo.
     *
     * La posición se aplica solo con `transform`: animar `left`/`top`
     * obligaría al navegador a recalcular la disposicion en cada fotograma.
     */
    const place = () => {
      const trigger = list.querySelector<HTMLElement>('[role="tab"][data-state="active"]');
      if (!trigger) {
        indicator.style.opacity = '0';
        return;
      }

      if (trigger !== activeTrigger) {
        activeTrigger = trigger;
        triggerObserver?.disconnect();
        triggerObserver = new ResizeObserver(place);
        triggerObserver.observe(trigger);
      }

      const listRect = list.getBoundingClientRect();
      const triggerRect = trigger.getBoundingClientRect();
      const vertical =
        list.closest('[data-slot="tabs"]')?.getAttribute('data-orientation') === 'vertical';

      let offsetX = triggerRect.left - (listRect.left + list.clientLeft);
      let offsetY = triggerRect.top - (listRect.top + list.clientTop);
      let width = triggerRect.width;
      let height = triggerRect.height;

      if (variant === 'line') {
        if (vertical) {
          offsetX = list.clientWidth - INDICATOR_THICKNESS;
          width = INDICATOR_THICKNESS;
        } else {
          offsetY = list.clientHeight - INDICATOR_THICKNESS;
          height = INDICATOR_THICKNESS;
        }
      }

      // La primera colocacion es instantanea: el indicador no debe entrar
      // deslizandose desde el origen.
      if (firstPlacement) {
        firstPlacement = false;
        indicator.style.transition = 'none';
        requestAnimationFrame(() => {
          indicator.style.transition = '';
        });
      }

      indicator.style.width = `${width}px`;
      indicator.style.height = `${height}px`;
      indicator.style.transform = `translateX(${offsetX}px) translateY(${offsetY}px)`;
      indicator.style.transformOrigin = vertical ? 'center top' : 'left center';
      indicator.style.opacity = '1';
    };

    const mutations = new MutationObserver(place);
    mutations.observe(list, {
      attributes: true,
      attributeFilter: ['data-state'],
      childList: true,
      subtree: true,
    });

    const listObserver = new ResizeObserver(place);
    listObserver.observe(list);

    const onWindowResize = () => place();
    window.addEventListener('resize', onWindowResize);

    place();

    return () => {
      mutations.disconnect();
      listObserver.disconnect();
      triggerObserver?.disconnect();
      window.removeEventListener('resize', onWindowResize);
    };
  }, [variant]);

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      <span
        ref={indicatorRef}
        data-slot="tabs-indicator"
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-0 left-0 z-0 opacity-0 transition-[transform,width,height] duration-(--duration-slow) ease-(--ease-out) motion-reduce:transition-none',
          'group-data-[variant=default]/tabs-list:rounded-md group-data-[variant=default]/tabs-list:bg-background group-data-[variant=default]/tabs-list:shadow-sm dark:group-data-[variant=default]/tabs-list:bg-input/30',
          'group-data-[variant=line]/tabs-list:rounded-full group-data-[variant=line]/tabs-list:bg-foreground',
        )}
      />
      {children}
    </TabsPrimitive.List>
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative z-10 inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-colors duration-(--duration-fast) group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        'data-[state=active]:text-foreground',
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 text-sm outline-none', className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
