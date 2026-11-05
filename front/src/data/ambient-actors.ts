import { createRng, hashSeed } from '@/domain/rng';
import type { SimActor } from '@/domain/simulation/types';
import type { Camera } from '@/domain/types';

/**
 * Actores ambientales del perímetro.
 *
 * Son el movimiento de fondo de los encuadres: una persona que recorre la
 * acera, un vehículo que pasa por la calle. **Nunca disparan una regla**: su
 * único papel es que el feed no parezca una imagen fija.
 *
 * Se generan con semilla fija (PRNG determinista) para que la escena sea
 * idéntica en cada ejecución y en cada captura de pantalla.
 */

const AMBIENT_PERIOD_SEC = 40;

export function buildAmbientActors(cameras: readonly Camera[]): SimActor[] {
  const actors: SimActor[] = [];

  for (const camera of cameras) {
    // Las cámaras sin imagen no muestran escena: no ambientar.
    if (camera.assessment.classification === 'sin_imagen') continue;

    const rng = createRng(hashSeed(`ambient:${camera.id}`));
    const isVehicle = rng.chance(0.28);
    const baseY = rng.float(0.6, 0.82);
    const size = isVehicle ? rng.float(0.15, 0.22) : rng.float(0.05, 0.08);
    const period = AMBIENT_PERIOD_SEC + rng.int(0, 25);

    const keyframes: { t: number; x: number; y: number }[] = [];
    for (let t = 0; t <= 1200; t += 10) {
      const phase = (t % period) / period;
      keyframes.push({
        t,
        x: 0.06 + phase * 0.88,
        y: baseY + Math.sin(t / 9) * 0.012,
      });
    }

    actors.push({
      id: `amb-${camera.id}`,
      cameraId: camera.id,
      objectType: isVehicle ? 'vehiculo' : 'persona',
      label: 'Movimiento ambiente',
      size,
      confidence: rng.float(0.68, 0.86),
      ambient: true,
      startSec: 0,
      endSec: null,
      keyframes,
    });
  }

  return actors;
}
