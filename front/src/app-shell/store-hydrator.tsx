'use client';

import { useEffect } from 'react';
import { useActivityStore } from '@/store/activity-store';
import { useCamerasStore } from '@/store/cameras-store';
import { useHydrationStore } from '@/store/hydration';
import { useIncidentsStore } from '@/store/incidents-store';
import { useRulesStore } from '@/store/rules-store';
import { useUiStore } from '@/store/ui-store';
import { useZonesStore } from '@/store/zones-store';

/**
 * Rehidratación del almacenamiento local.
 *
 * Se ejecuta una sola vez, después del montaje, para que el HTML generado en el
 * servidor y el primer render del cliente coincidan. Las tiendas se declaran
 * con `skipHydration` y se rehidratan aquí de forma explícita.
 */
export function StoreHydrator() {
  useEffect(() => {
    void Promise.all([
      useCamerasStore.persist.rehydrate(),
      useIncidentsStore.persist.rehydrate(),
      useRulesStore.persist.rehydrate(),
      useZonesStore.persist.rehydrate(),
      useUiStore.persist.rehydrate(),
      useActivityStore.persist.rehydrate(),
    ]).then(() => {
      useHydrationStore.getState().markHydrated();
    });
  }, []);

  return null;
}
