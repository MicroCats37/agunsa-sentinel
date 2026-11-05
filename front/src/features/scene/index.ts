/**
 * Módulo profundo de la vista geoespacial.
 *
 * Interfaz pública única: `GeospatialScene`. La construcción del motor
 * Cesium, la carga de sus recursos, el dibujo de zonas y la animación quedan
 * privados detrás de este punto de entrada.
 */

export { GeospatialScene } from './geospatial-scene';
export { GeospatialPage } from './geospatial-page';
export type {
  CesiumSceneProps,
  SceneExaggeration,
  SceneLayers,
  SceneProjection,
  SceneScope,
} from './geospatial-scene';
