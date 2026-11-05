import type { GeospatialZone, GeoPoint } from '@/domain/types';
import type { Cartesian3, Entity, PolygonGraphics, PolylineGraphics, Viewer } from 'cesium';
import gsap from 'gsap';
import type { CesiumModule } from './cesium';

/**
 * Animación de las zonas georreferenciadas.
 *
 * Reglas de movimiento (GSAP):
 *  - **Entrada**: la figura aparece con escala y opacidad (0,86 → 1) en
 *    700 ms. Es la firma visual del «lo acabo de dibujar».
 *  - **Pulso**: las zonas de detección activas laten de forma sutil (la
 *    opacidad oscila apenas) para que el operador las encuentre en el mapa.
 *  - **Alarma**: una zona con evento activo parpadea en el color semántico de
 *    alarma (rojo AGUNSA) en lugar de su color propio.
 *
 * El motor de Cesium trabaja en modo `requestRenderMode`: cada fotograma
 * mutado pide un repintado explícito, y el ticker se apaga cuando no queda
 * ninguna zona dinámica en pantalla.
 */

/** Color semántico de alarma (token AGUNSA `--alarm`). */
const ALARM_COLOR = '#c8202a';
/** Duración de la entrada de una figura. */
const REVEAL_DURATION = 0.7;
/** Periodo del pulso de una zona activa. */
const PULSE_DURATION = 2.4;

interface ZoneVisual {
  zone: GeospatialZone;
  entity: Entity;
  outline: Entity;
  polygon: PolygonGraphics;
  polyline: PolylineGraphics;
  centroid: GeoPoint;
  /** Escala del polígono alrededor de su centroide. */
  scale: number;
  /** Opacidad actual del relleno. */
  alpha: number;
  /** Opacidad base del relleno. */
  baseAlpha: number;
  alarmed: boolean;
  pulsing: boolean;
}

export interface ZoneAnimatorHandle {
  /** Crea, actualiza y elimina las entidades para que coincidan con la lista. */
  sync: (zones: readonly GeospatialZone[]) => void;
  /** Marca las zonas con evento activo: parpadean en rojo de alarma. */
  setAlarm: (zoneIds: ReadonlySet<string>) => void;
  /** Muestra u oculta la capa de zonas sin destruir las entidades. */
  setVisible: (visible: boolean) => void;
  /** Detiene el ticker de animación y destruye las entidades. */
  dispose: () => void;
}

function centroidOf(polygon: readonly GeoPoint[]): GeoPoint {
  if (polygon.length === 0) return { longitude: 0, latitude: 0 };
  return polygon.reduce(
    (acc, point) => ({
      longitude: acc.longitude + point.longitude / polygon.length,
      latitude: acc.latitude + point.latitude / polygon.length,
    }),
    { longitude: 0, latitude: 0 },
  );
}

function scaledPositions(
  cesium: CesiumModule,
  polygon: readonly GeoPoint[],
  centroid: GeoPoint,
  scale: number,
): Cartesian3[] {
  return polygon.map((point) => {
    const longitude = centroid.longitude + (point.longitude - centroid.longitude) * scale;
    const latitude = centroid.latitude + (point.latitude - centroid.latitude) * scale;
    return cesium.Cartesian3.fromDegrees(longitude, latitude);
  });
}

export function createZoneAnimator(cesium: CesiumModule, viewer: Viewer): ZoneAnimatorHandle {
  const visuals = new Map<string, ZoneVisual>();
  const tweens = new Map<string, gsap.core.Tween>();
  let alarmIds = new Set<string>();
  let tickerActive = false;

  /*
   * Movimiento reducido: el pulso de las zonas y la entrada de las figuras son
   * animaciones del motor, no de CSS. Con la preferencia del sistema activa
   * las zonas se dibujan en su estado final y el ticker no llega a arrancarse.
   */
  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const applyMaterial = (visual: ZoneVisual): void => {
    const color = visual.alarmed ? ALARM_COLOR : visual.zone.color;
    const alpha = Math.max(0, Math.min(1, visual.alpha));
    visual.polygon.material = new cesium.ColorMaterialProperty(
      cesium.Color.fromCssColorString(color).withAlpha(alpha),
    );
  };

  const applyGeometry = (visual: ZoneVisual): void => {
    const positions = scaledPositions(cesium, visual.zone.polygon, visual.centroid, visual.scale);
    if (positions.length < 3) return;
    visual.polygon.hierarchy = new cesium.ConstantProperty(new cesium.PolygonHierarchy(positions));
    visual.polyline.positions = new cesium.ConstantProperty(positions);
  };

  const tick = (): void => {
    for (const visual of visuals.values()) {
      if (!visual.pulsing && !visual.alarmed) continue;
      applyMaterial(visual);
    }
    viewer.scene.requestRender();
  };

  const setTicker = (active: boolean): void => {
    if (active === tickerActive) return;
    tickerActive = active;
    if (active) {
      gsap.ticker.add(tick);
    } else {
      gsap.ticker.remove(tick);
    }
  };

  const stopTween = (zoneId: string): void => {
    tweens.get(zoneId)?.kill();
    tweens.delete(zoneId);
  };

  const startPulse = (visual: ZoneVisual): void => {
    stopTween(visual.zone.id);
    if (reducedMotion) {
      visual.alpha = visual.baseAlpha;
      applyMaterial(visual);
      return;
    }
    const state = { alpha: visual.baseAlpha };
    const tween = gsap.to(state, {
      alpha: visual.baseAlpha * 1.45,
      duration: PULSE_DURATION,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      delay: (visual.zone.id.charCodeAt(visual.zone.id.length - 1) % 7) * 0.12,
      onUpdate: () => {
        visual.alpha = state.alpha;
        applyMaterial(visual);
      },
    });
    tweens.set(visual.zone.id, tween);
  };

  const reveal = (visual: ZoneVisual, animate: boolean): void => {
    const state = { alpha: 0, scale: 0.86 };
    visual.alpha = 0;
    visual.scale = 0.86;
    applyMaterial(visual);
    applyGeometry(visual);

    const reduced = reducedMotion;

    if (!animate || reduced) {
      visual.alpha = visual.baseAlpha;
      visual.scale = 1;
      applyMaterial(visual);
      applyGeometry(visual);
      return;
    }

    stopTween(visual.zone.id);
    const tween = gsap.to(state, {
      alpha: visual.baseAlpha,
      scale: 1,
      duration: REVEAL_DURATION,
      ease: 'power3.out',
      onUpdate: () => {
        visual.alpha = state.alpha;
        visual.scale = state.scale;
        applyMaterial(visual);
        applyGeometry(visual);
      },
      onComplete: () => {
        tweens.delete(visual.zone.id);
        if (visual.pulsing) startPulse(visual);
      },
    });
    tweens.set(visual.zone.id, tween);
  };

  const createVisual = (zone: GeospatialZone): ZoneVisual => {
    const entity = viewer.entities.add({
      id: `zone-${zone.id}`,
      name: zone.name,
      polygon: {
        hierarchy: new cesium.PolygonHierarchy([]),
        height: 0,
        heightReference: cesium.HeightReference.RELATIVE_TO_GROUND,
        extrudedHeight: zone.height,
        extrudedHeightReference: cesium.HeightReference.RELATIVE_TO_GROUND,
        material: cesium.Color.fromCssColorString(zone.color).withAlpha(0),
        outline: false,
        closeTop: true,
        closeBottom: true,
      },
    });

    const outline = viewer.entities.add({
      id: `zone-outline-${zone.id}`,
      name: `${zone.name} · contorno`,
      polyline: {
        positions: [],
        width: 2,
        material: cesium.Color.fromCssColorString(zone.outline).withAlpha(0.9),
        clampToGround: true,
      },
    });

    const polygon = entity.polygon;
    const polyline = outline.polyline;
    if (!polygon || !polyline) {
      throw new Error('No se pudo crear la geometría de la zona geoespacial.');
    }

    const visual: ZoneVisual = {
      zone,
      entity,
      outline,
      polygon,
      polyline,
      centroid: centroidOf(zone.polygon),
      scale: 1,
      alpha: 0,
      baseAlpha: zone.kind === 'verde' ? 0.72 : 0.84,
      alarmed: false,
      pulsing: zone.kind === 'deteccion' && zone.enabled,
    };

    reveal(visual, true);
    return visual;
  };

  const anyDynamic = (): boolean =>
    [...visuals.values()].some((visual) => (visual.pulsing || visual.alarmed) && !reducedMotion);

  return {
    sync(zones) {
      const alive = new Set<string>();

      for (const zone of zones) {
        alive.add(zone.id);
        const existing = visuals.get(zone.id);
        if (!existing) {
          visuals.set(zone.id, createVisual(zone));
          continue;
        }

        const changedShape =
          existing.zone.polygon.length !== zone.polygon.length ||
          existing.zone.height !== zone.height;
        const changedColor = existing.zone.color !== zone.color;

        existing.zone = zone;
        existing.baseAlpha = zone.kind === 'verde' ? 0.72 : 0.84;
        existing.pulsing = zone.kind === 'deteccion' && zone.enabled;
        existing.alarmed = alarmIds.has(zone.id);

        if (changedShape) {
          existing.centroid = centroidOf(zone.polygon);
          reveal(existing, false);
        } else if (changedColor || existing.alarmed) {
          applyMaterial(existing);
        }

        if (existing.pulsing && !tweens.has(zone.id)) {
          startPulse(existing);
        } else if (!existing.pulsing && tweens.has(zone.id)) {
          stopTween(zone.id);
        }
      }

      for (const [zoneId, visual] of visuals) {
        if (alive.has(zoneId)) continue;
        stopTween(zoneId);
        viewer.entities.remove(visual.entity);
        viewer.entities.remove(visual.outline);
        visuals.delete(zoneId);
      }

      setTicker(anyDynamic());
      viewer.scene.requestRender();
    },

    setAlarm(zoneIds) {
      alarmIds = new Set(zoneIds);
      for (const visual of visuals.values()) {
        const alarmed = alarmIds.has(visual.zone.id);
        if (alarmed === visual.alarmed) continue;
        visual.alarmed = alarmed;
        applyMaterial(visual);
      }
      setTicker(anyDynamic());
      viewer.scene.requestRender();
    },

    setVisible(visible) {
      for (const visual of visuals.values()) {
        visual.entity.show = visible;
        visual.outline.show = visible;
      }
      viewer.scene.requestRender();
    },

    dispose() {
      setTicker(false);
      for (const zoneId of [...tweens.keys()]) stopTween(zoneId);
      for (const visual of visuals.values()) {
        viewer.entities.remove(visual.entity);
        viewer.entities.remove(visual.outline);
      }
      visuals.clear();
    },
  };
}
