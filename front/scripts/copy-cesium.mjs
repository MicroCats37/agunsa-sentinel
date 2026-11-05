import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const sourceRoot = path.join(projectRoot, 'node_modules', 'cesium', 'Build', 'Cesium');
const targetRoot = path.join(projectRoot, 'public', 'CESIUM');
const directories = ['Workers', 'Assets', 'Widgets', 'ThirdParty'];
const bundles = ['Cesium.js', 'index.js'];

if (!fs.existsSync(sourceRoot)) {
  console.error('[copy-cesium] No se encuentra el paquete cesium en node_modules.');
  process.exit(1);
}

fs.rmSync(targetRoot, { recursive: true, force: true });
fs.mkdirSync(targetRoot, { recursive: true });

for (const bundle of bundles) {
  const source = path.join(sourceRoot, bundle);
  if (!fs.existsSync(source)) {
    console.warn(`[copy-cesium] Falta ${bundle} en el paquete de Cesium.`);
    continue;
  }
  fs.copyFileSync(source, path.join(targetRoot, bundle));
  console.log(`[copy-cesium] ${bundle} -> public/CESIUM/${bundle}`);
}

for (const directory of directories) {
  const source = path.join(sourceRoot, directory);
  if (!fs.existsSync(source)) continue;
  fs.cpSync(source, path.join(targetRoot, directory), { recursive: true });
  console.log(`[copy-cesium] ${directory} -> public/CESIUM/${directory}`);
}

console.log('[copy-cesium] Assets estáticos de Cesium listos.');
