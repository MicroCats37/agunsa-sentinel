import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { Vector2, type PerspectiveCamera, type Scene, type WebGLRenderer } from 'three';

/**
 * Cadena de post-proceso de la vista 3D.
 *
 * Dos efectos, deliberadamente discretos porque es una herramienta de
 * operación: un bloom suave que sólo recoge los elementos emisivos (halos de
 * alerta, luminarias, conos de visión) y una viñeta ligera que enfoca la
 * atención hacia el centro de la planta.
 */

export interface PostHandles {
  composer: EffectComposer;
  setSize: (width: number, height: number) => void;
  dispose: () => void;
}

export function createPost(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: PerspectiveCamera,
): PostHandles {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.42, 0.65, 0.72);
  composer.addPass(bloom);

  const vignette = new ShaderPass(VignetteShader);
  const offset = vignette.uniforms['offset'];
  const darkness = vignette.uniforms['darkness'];
  if (offset) offset.value = 1.05;
  if (darkness) darkness.value = 0.82;
  composer.addPass(vignette);

  composer.addPass(new OutputPass());

  return {
    composer,
    setSize: (width, height) => {
      composer.setSize(width, height);
    },
    dispose: () => {
      bloom.dispose();
      vignette.dispose();
      composer.dispose();
    },
  };
}
