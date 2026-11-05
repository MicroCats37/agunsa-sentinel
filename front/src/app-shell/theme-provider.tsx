'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

/**
 * Theme provider.
 *
 * `next-themes` with the `class` strategy: the `dark` class is applied on
 * `<html>` and the preference is persisted in `localStorage`. The server
 * always renders the light theme and the client resolves the stored theme
 * before painting, so there is no hydration mismatch.
 *
 * The default theme is dark — the reference product language is a near-black
 * canvas — and the switcher offers the light theme and the system as the
 * remaining states. `disableTransitionOnChange` is kept because the theme
 * change is animated with View Transitions: without it, the inner colors
 * would tween on their own against the crossfade.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      storageKey="agunsa-sentinel:theme"
    >
      {children}
    </NextThemesProvider>
  );
}
