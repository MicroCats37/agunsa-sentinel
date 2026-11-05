import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { AppShell } from '@/app-shell/app-shell';
import { ThemeProvider } from '@/app-shell/theme-provider';
import './globals.css';

/**
 * Geist Sans (variable): a neutral grotesque with tabular figures, the
 * typographic voice of the reference product.
 */
const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
});

/**
 * Geist Mono (variable): reserved for identifiers, codes and telemetry.
 */
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Centro de control perimetral',
    template: '%s · Centro de control perimetral',
  },
  description:
    'Plataforma de videovigilancia perimetral inteligente con detección de personas y vehículos.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Estilos de los widgets de Cesium: se sirven desde `public/CESIUM`. */}
        <link rel="stylesheet" href="/CESIUM/Widgets/widgets.css" />
      </head>
      <body>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
