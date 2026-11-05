import type { Metadata } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import { AppShell } from '@/app-shell/app-shell';
import './globals.css';

/**
 * IBM Plex Sans (variable): una sola familia con una escala clara y
 * cifras tabulares, adecuada para una sala de control.
 */
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'AGUNSA Sentinel',
    template: '%s · AGUNSA Sentinel',
  },
  description:
    'Plataforma de videovigilancia perimetral inteligente con detección de personas y vehículos. Mockup simulado.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`dark ${plexSans.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
