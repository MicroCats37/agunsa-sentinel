'use client';

import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

function subscribe(callback: () => void): () => void {
  const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

function getSnapshot(): boolean {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Tracks whether the viewport is narrower than the mobile breakpoint.
 *
 * Reads the media query through `useSyncExternalStore` so the first client
 * render already knows the viewport size: no layout flash when the sidebar
 * switches between its drawer and its docked variant.
 */
export function useIsMobile(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
