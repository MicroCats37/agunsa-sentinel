import type * as CesiumNamespace from 'cesium';

/**
 * Carga del motor Cesium en el navegador.
 *
 * Dos decisiones de fondo:
 *
 * 1. **Cesium no se empaqueta.** El paquete publica un bundle ESM de 4,6 MB
 *    (`Build/Cesium/index.js`). Meterlo en el grafo de módulos de Next
 *    dispararía el peso de la compilación y el tiempo de arranque de todas las
 *    rutas. Se sirve como archivo estático desde `public/CESIUM` (lo copia
 *    `scripts/copy-cesium.mjs`) y se importa en tiempo de ejecución.
 *
 * 2. **Los recursos se sirven desde `/CESIUM/`.** Cesium pide sus *Workers*,
 *    *Assets* y *ThirdParty* a `window.CESIUM_BASE_URL`. Hay que fijarlo
 *    **antes** de la primera petición, y el bundle lo lee de forma perezosa,
 *    así que basta con establecerlo al cargar el módulo.
 */

/** Namespace tipado del motor Cesium (sólo tipos: no arrastra el runtime). */
export type CesiumModule = typeof CesiumNamespace;

/** Ruta pública desde la que se sirven los recursos estáticos de Cesium. */
export const CESIUM_BASE_URL = '/CESIUM/';

/** Ruta pública del bundle ESM de Cesium. */
export const CESIUM_MODULE_URL = '/CESIUM/index.js';

/** Ruta pública del bundle IIFE de Cesium (respaldo). */
export const CESIUM_IIFE_URL = '/CESIUM/Cesium.js';

declare global {
  interface Window {
    CESIUM_BASE_URL?: string;
  }
}

/** Marca de escena lista: la usan las capturas de verificación. */
export interface SceneReadyFlag {
  ready: boolean;
  status: 'idle' | 'loading' | 'ready' | 'degraded' | 'unsupported';
  cameraCount: number;
}

declare global {
  interface Window {
    __sceneReady?: SceneReadyFlag;
    __sceneStatus?: () => SceneReadyFlag;
  }
}

/**
 * Publica el estado de la escena en `window` para la verificación automatizada.
 *
 * No es lógica de negocio: es la única forma de que un script externo pueda
 * esperar a que el motor geoespacial esté listo sin acoplar el componente a
 * un framework de pruebas.
 */
export function publishSceneStatus(status: SceneReadyFlag): void {
  if (typeof window === 'undefined') return;
  window.__sceneReady = status;
  window.__sceneStatus = () => status;
}

/**
 * Carga el motor Cesium desde `/CESIUM/Cesium.js`.
 *
 * Se resuelve sólo en el navegador: en el servidor devuelve un error claro en
 * lugar de romper la construcción.
 */
export async function loadCesium(): Promise<CesiumModule> {
  if (typeof window === 'undefined') {
    throw new Error('Cesium sólo puede cargarse en el navegador.');
  }

  window.CESIUM_BASE_URL = CESIUM_BASE_URL;

  // El especificador se mantiene en una variable para que el empaquetador no
  // intente resolverlo como un módulo del proyecto: se resuelve en el
  // navegador contra el directorio público.
  const specifier: string = CESIUM_MODULE_URL;
  try {
    const module = (await import(/* webpackIgnore: true */ specifier)) as CesiumModule;
    if (module && typeof module.Viewer === 'function') return module;
  } catch {
    // Se intenta el bundle IIFE a continuación.
  }

  await loadIifeBundle();
  const fallback = (window as unknown as { Cesium?: CesiumModule }).Cesium;
  if (!fallback || typeof fallback.Viewer !== 'function') {
    throw new Error('No se pudo cargar el motor Cesium desde /CESIUM.');
  }
  return fallback;
}

/** Inyecta el bundle IIFE de Cesium y espera a que publique `window.Cesium`. */
function loadIifeBundle(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-cesium-iife]');
    if (existing) {
      if ((window as unknown as { Cesium?: unknown }).Cesium) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Fallo al cargar Cesium.js')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = CESIUM_IIFE_URL;
    script.async = true;
    script.dataset.cesiumIife = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Fallo al cargar Cesium.js'));
    document.head.appendChild(script);
  });
}

/** Comprueba si el navegador puede crear un contexto WebGL. */
export function supportsWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
