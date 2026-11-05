import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // El repositorio contiene otros lockfiles (proyecto heredado en la raíz);
  // fijamos la raíz de trazado para que el build sea determinista.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
