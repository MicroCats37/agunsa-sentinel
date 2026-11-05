'use client';

import { FACILITY_PERIMETER } from '@/data/geospatial/camera-geography';
import { DRAWING_TYPES, DRAWING_TYPE_ORDER } from '@/data/geospatial/facility-layout';
import { CLASSIFICATION_COLOR } from '@/domain/classification';
import type { Camera, GeospatialZone, GeoPoint } from '@/domain/types';
import type { Cartesian2, Entity, Viewer } from 'cesium';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadCesium, publishSceneStatus, supportsWebGL, type CesiumModule } from './lib/cesium';
import {
  addBlockoutStructures,
  addBuildings,
  addCameras,
  addCameraCone,
  addFacilityPerimeter,
  addPerimeterWall,
  addPlaceLabels,
  addRoadLabels,
  addRoads,
  emptyGroups,
  type SceneGroups,
} from './lib/entities';
import { FACILITY_GROUND_HEIGHT, FACILITY_ORIGIN } from './lib/geometry';
import { GlassPanel } from './glass-panel';
import { LiveCameraFrame } from './live-camera-frame';
import { createZoneAnimator, type ZoneAnimatorHandle } from './lib/zone-animation';

/**
 * Vista geoespacial de AGUNSA Callao (CesiumJS).
 *
 * Es la tercera representación del mismo recinto: el plano 2D (SVG), la
 * escena isométrica (Three.js) y esta vista sobre el terreno real con
 * imagen satelital, relieve público y la geometría abierta de OpenStreetMap.
 *
 * Reglas de la escena:
 *  - la cámara se elige en el terreno y la ficha es **la misma** que muestran
 *    las otras dos vistas;
 *  - el color del marcador es el de la clasificación del informe CCTV;
 *  - las zonas dibujadas se guardan en la tienda de zonas y se animan con
 *    GSAP (entrada, pulso y destello de alarma).
 */

/** Alcance de la cámara según el modo de vista. */
export type SceneScope = 'contexto' | 'instalacion' | 'recinto';
/** Proyección de la cámara: perspectiva o planta. */
export type SceneProjection = 'perspectiva' | 'planta';
/** Exageración vertical del terreno. */
export type SceneExaggeration = 1 | 1.5 | 2;

/** Capas que el operador puede mostrar u ocultar. */
export interface SceneLayers {
  perimeter: boolean;
  facilityModel: boolean;
  buildings: boolean;
  roads: boolean;
  labels: boolean;
  cameras: boolean;
  zones: boolean;
}

const DEFAULT_LAYERS: SceneLayers = {
  perimeter: true,
  facilityModel: true,
  buildings: true,
  roads: true,
  labels: true,
  cameras: true,
  zones: true,
};

const IMAGERY_URL =
  'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer';

export interface CesiumSceneProps {
  cameras: readonly Camera[];
  selectedCameraId: string | null;
  onSelect: (cameraId: string) => void;
  zones: readonly GeospatialZone[];
  onZonesChange: (zones: GeospatialZone[]) => void;
  theme: 'light' | 'dark';
  /** Hora de la escena (0–24): gobierna la atmósfera del visor. */
  hour: number;
  /** Solicitud de encuadre sobre una cámara concreta. */
  focusRequest?: { cameraId: string; token: number } | null;
}

interface HoverCamera {
  id: string;
  left: number;
  top: number;
}

export function CesiumScene({
  cameras,
  selectedCameraId,
  onSelect,
  zones,
  onZonesChange,
  theme,
  hour,
  focusRequest,
}: CesiumSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const cesiumRef = useRef<CesiumModule | null>(null);
  const groupsRef = useRef<SceneGroups>(emptyGroups());
  const animatorRef = useRef<ZoneAnimatorHandle | null>(null);
  const coneRef = useRef<Entity | null>(null);
  const handlerRef = useRef<{ destroy: () => void } | null>(null);
  const introTimerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);
  const drawingRef = useRef(false);
  const drawingTypeRef = useRef<GeospatialZone['kind']>('deteccion');
  const verticesRef = useRef<GeoPoint[]>([]);
  const draftRef = useRef<Entity[]>([]);
  const camerasRef = useRef(cameras);
  const onSelectRef = useRef(onSelect);
  const zonesRef = useRef(zones);
  const onZonesChangeRef = useRef(onZonesChange);
  const selectedRef = useRef(selectedCameraId);
  const drawnCounterRef = useRef(0);

  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'degraded' | 'fallback'>(
    'idle',
  );
  const [scope, setScope] = useState<SceneScope>('contexto');
  const [projection, setProjection] = useState<SceneProjection>('perspectiva');
  const [exaggeration, setExaggeration] = useState<SceneExaggeration>(1);
  const [layers, setLayers] = useState<SceneLayers>(DEFAULT_LAYERS);
  const [editing, setEditing] = useState(false);
  const [drawingType, setDrawingType] = useState<GeospatialZone['kind']>('deteccion');
  const [draftVertexCount, setDraftVertexCount] = useState(0);
  const [hovered, setHovered] = useState<HoverCamera | null>(null);
  const [imageryState, setImageryState] = useState<'cargando' | 'ok' | 'degradado'>('cargando');
  const selectedCamera = useMemo(
    () => cameras.find((camera) => camera.id === selectedCameraId) ?? null,
    [cameras, selectedCameraId],
  );
  /**
   * Captura real que corresponde a la hora de la escena.
   *
   * El informe recoge una sesión nocturna y otra diurna; si falta la captura
   * de la hora actual se usa la disponible. Sin evidencia photographica, la
   * vista recurre al feed sintético.
   */
  const selectedPhoto = useMemo(() => {
    if (!selectedCamera) return null;
    const night = hour >= 19 || hour < 6;
    const preferred = night ? selectedCamera.photos.night : selectedCamera.photos.day;
    const fallback = night ? selectedCamera.photos.day : selectedCamera.photos.night;
    if (preferred)
      return { src: preferred, label: night ? '02/11/2026 20:55' : '03/11/2026 14:47' };
    if (fallback) return { src: fallback, label: night ? '03/11/2026 14:47' : '02/11/2026 20:55' };
    return null;
  }, [hour, selectedCamera]);
  const [ready, setReady] = useState(false);

  camerasRef.current = cameras;
  onSelectRef.current = onSelect;
  zonesRef.current = zones;
  onZonesChangeRef.current = onZonesChange;
  selectedRef.current = selectedCameraId;
  drawingRef.current = editing;
  drawingTypeRef.current = drawingType;

  const webGLAvailable = useMemo(supportsWebGL, []);

  /* ------------------------------------------------------------------ *
   * Encuadres
   * ------------------------------------------------------------------ */

  const focusContext = useCallback((cesium: CesiumModule, viewer: Viewer, duration = 1.5) => {
    const target = cesium.Cartesian3.fromDegrees(
      FACILITY_ORIGIN.longitude,
      FACILITY_ORIGIN.latitude,
      FACILITY_GROUND_HEIGHT + 12,
    );
    viewer.camera.flyToBoundingSphere(new cesium.BoundingSphere(target, 1_050), {
      offset: new cesium.HeadingPitchRange(
        cesium.Math.toRadians(27),
        cesium.Math.toRadians(-35),
        3_650,
      ),
      duration,
    });
  }, []);

  const focusFacility = useCallback(
    (cesium: CesiumModule, viewer: Viewer, duration = 1.2, top = false) => {
      const target = cesium.Cartesian3.fromDegrees(
        FACILITY_ORIGIN.longitude,
        FACILITY_ORIGIN.latitude,
        FACILITY_GROUND_HEIGHT + 8,
      );
      viewer.camera.flyToBoundingSphere(new cesium.BoundingSphere(target, 245), {
        offset: new cesium.HeadingPitchRange(
          cesium.Math.toRadians(top ? 0 : 29),
          cesium.Math.toRadians(top ? -89 : -29),
          top ? 940 : 610,
        ),
        duration,
      });
    },
    [],
  );

  const focusCamera = useCallback(
    (cesium: CesiumModule, viewer: Viewer, camera: Camera, duration = 1.4) => {
      const target = cesium.Cartesian3.fromDegrees(
        camera.geo.longitude,
        camera.geo.latitude,
        camera.geo.height,
      );
      viewer.camera.flyToBoundingSphere(new cesium.BoundingSphere(target, 90), {
        offset: new cesium.HeadingPitchRange(
          cesium.Math.toRadians(camera.geo.heading + 180),
          cesium.Math.toRadians(-34),
          320,
        ),
        duration,
      });
    },
    [],
  );

  /* ------------------------------------------------------------------ *
   * Visibilidad de capas
   * ------------------------------------------------------------------ */

  const applyLayerVisibility = useCallback(
    (currentScope: SceneScope, activeLayers: SceneLayers = layers) => {
      const viewer = viewerRef.current;
      if (!viewer || viewer.isDestroyed()) return;
      const groups = groupsRef.current;
      const clean = currentScope === 'recinto';

      groups.roads.forEach((entity) => {
        entity.show = !clean && activeLayers.roads;
      });
      groups.buildings.forEach((entity) => {
        entity.show = !clean && activeLayers.buildings;
      });
      groups.labels.forEach((entity) => {
        entity.show = !clean && activeLayers.labels;
      });
      groups.facilityLabels.forEach((entity) => {
        entity.show = !clean && activeLayers.labels;
      });
      groups.blockout.forEach((entity) => {
        entity.show = activeLayers.facilityModel;
      });
      groups.perimeter.forEach((entity) => {
        entity.show = activeLayers.perimeter;
      });
      groups.cameras.forEach((entity) => {
        entity.show = activeLayers.cameras && !drawingRef.current;
      });
      viewer.scene.requestRender();
    },
    [layers],
  );

  /* ------------------------------------------------------------------ *
   * Construcción del visor
   * ------------------------------------------------------------------ */

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !webGLAvailable) {
      setStatus('fallback');
      publishSceneStatus({ ready: false, status: 'unsupported', cameraCount: 0 });
      return undefined;
    }

    let disposed = false;
    cancelledRef.current = false;
    setStatus('loading');
    publishSceneStatus({ ready: false, status: 'loading', cameraCount: 0 });

    void loadCesium()
      .then((cesium) => {
        if (disposed || cancelledRef.current || !containerRef.current) return;
        cesiumRef.current = cesium;
        createScene(cesium, containerRef.current);
      })
      .catch((error: unknown) => {
        console.error('[mapa] no se pudo iniciar el motor geoespacial.', error);
        setStatus('fallback');
        publishSceneStatus({ ready: false, status: 'unsupported', cameraCount: 0 });
      });

    return () => {
      disposed = true;
      cancelledRef.current = true;
      if (introTimerRef.current !== null) {
        window.clearTimeout(introTimerRef.current);
        introTimerRef.current = null;
      }
      handlerRef.current?.destroy();
      handlerRef.current = null;
      animatorRef.current?.dispose();
      animatorRef.current = null;
      coneRef.current = null;
      groupsRef.current = emptyGroups();
      const viewer = viewerRef.current;
      viewerRef.current = null;
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
    };
    // El visor se crea una sola vez; los cambios de estado se aplican con
    // efectos separados para no reconstruir el motor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webGLAvailable]);

  function createScene(cesium: CesiumModule, container: HTMLElement): void {
    // Cesium crea SkyAtmosphere por defecto. La opción acepta una instancia o
    // `false`, no el booleano `true`.
    const viewer = new cesium.Viewer(container, {
      animation: false,
      baseLayer: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      requestRenderMode: true,
      maximumRenderTimeChange: Number.POSITIVE_INFINITY,
    });
    viewerRef.current = viewer;
    // Sonda de diagnóstico para la verificación automatizada: permite leer la
    // cámara y las capas de imagen sin acoplar la escena a un framework.
    (window as unknown as { __cesiumViewer?: Viewer }).__cesiumViewer = viewer;

    viewer.resolutionScale = 1;
    viewer.scene.msaaSamples = 1;
    viewer.scene.globe.show = true;
    viewer.scene.globe.depthTestAgainstTerrain = true;
    // Terreno plano (elipsoide) a propósito: el servicio de relieve 3D de
    // ArcGIS es intermitente y, cuando su metadato falla, la superficie del
    // globo se queda en una sola tesela y la vista queda en negro. Con el
    // elipsoide la imagen satelital siempre se pinta y los volúmenes, que se
    // apoyan con `RELATIVE_TO_GROUND`, se asientan sobre la imagen.
    viewer.terrainProvider = new cesium.EllipsoidTerrainProvider();
    viewer.scene.globe.enableLighting = false;
    viewer.scene.backgroundColor = cesium.Color.fromCssColorString('#b7d7ea');

    // Capa base de contexto: el mapa de calles de OpenStreetMap no necesita
    // credenciales y carga rápido, de modo que el visor nunca queda vacío
    // mientras llega el satelital.
    viewer.imageryLayers.addImageryProvider(
      new cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' }),
      0,
    );
    viewer.scene.screenSpaceCameraController.minimumZoomDistance = 35;
    viewer.scene.screenSpaceCameraController.maximumZoomDistance = 7_500;
    viewer.scene.screenSpaceCameraController.enableCollisionDetection = true;
    viewer.scene.screenSpaceCameraController.zoomEventTypes = [
      cesium.CameraEventType.WHEEL,
      cesium.CameraEventType.PINCH,
    ];
    viewer.scene.screenSpaceCameraController.translateEventTypes = [
      cesium.CameraEventType.RIGHT_DRAG,
    ];
    viewer.scene.screenSpaceCameraController.rotateEventTypes = [cesium.CameraEventType.LEFT_DRAG];
    viewer.scene.screenSpaceCameraController.tiltEventTypes = [
      cesium.CameraEventType.MIDDLE_DRAG,
      cesium.CameraEventType.PINCH,
    ];

    const removeDraftEntities = (): void => {
      draftRef.current.forEach((entity) => viewer.entities.remove(entity));
      draftRef.current = [];
    };

    const finishDraft = (): void => {
      removeDraftEntities();
      verticesRef.current = [];
      setDraftVertexCount(0);
      viewer.scene.canvas.style.cursor = drawingRef.current ? 'crosshair' : 'grab';
      viewer.scene.requestRender();
    };

    const showDraft = (cursorCoordinate: GeoPoint | null = null): void => {
      removeDraftEntities();
      const fixedVertices = verticesRef.current;
      if (!fixedVertices.length) return;
      const type = DRAWING_TYPES[drawingTypeRef.current] ?? DRAWING_TYPES.deteccion;
      const previewVertices = cursorCoordinate
        ? fixedVertices.concat(cursorCoordinate)
        : fixedVertices.slice();
      const positions = previewVertices.map((vertex) =>
        cesium.Cartesian3.fromDegrees(vertex.longitude, vertex.latitude),
      );

      if (positions.length >= 3) {
        draftRef.current.push(
          viewer.entities.add({
            id: 'zone-draft-fill',
            polygon: {
              hierarchy: new cesium.PolygonHierarchy(positions),
              heightReference: cesium.HeightReference.CLAMP_TO_GROUND,
              material: cesium.Color.fromCssColorString(type.color).withAlpha(0.38),
            },
          }),
        );
      }

      if (positions.length >= 2) {
        const first = positions[0];
        const closed = positions.length >= 3 && first ? positions.concat(first) : positions;
        draftRef.current.push(
          viewer.entities.add({
            id: 'zone-draft-line',
            polyline: {
              positions: closed,
              width: 4,
              material: cesium.Color.WHITE.withAlpha(0.96),
              clampToGround: true,
            },
          }),
        );
      }

      fixedVertices.forEach((vertex, index) => {
        draftRef.current.push(
          viewer.entities.add({
            id: `zone-draft-vertex-${index}`,
            position: cesium.Cartesian3.fromDegrees(vertex.longitude, vertex.latitude),
            point: {
              pixelSize: index === 0 ? 15 : 9,
              color: index === 0 ? cesium.Color.fromCssColorString('#20d8ca') : cesium.Color.WHITE,
              outlineColor: cesium.Color.fromCssColorString('#17343c'),
              outlineWidth: index === 0 ? 3 : 2,
              heightReference: cesium.HeightReference.CLAMP_TO_GROUND,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          }),
        );
      });
      viewer.scene.requestRender();
    };

    const isNearFirstVertex = (screenPosition: Cartesian2): boolean => {
      const first = verticesRef.current[0];
      if (!first) return false;
      const firstScreen = cesium.SceneTransforms.worldToWindowCoordinates(
        viewer.scene,
        cesium.Cartesian3.fromDegrees(first.longitude, first.latitude, FACILITY_GROUND_HEIGHT),
      );
      if (!firstScreen) return false;
      return cesium.Cartesian2.distance(firstScreen, screenPosition) <= 20;
    };

    const commitDraft = (): void => {
      const vertices = verticesRef.current.map((vertex) => ({ ...vertex }));
      if (vertices.length < 3) return;
      const type = DRAWING_TYPES[drawingTypeRef.current] ?? DRAWING_TYPES.deteccion;
      drawnCounterRef.current += 1;
      const zone: GeospatialZone = {
        id: `zone-dibujada-${drawnCounterRef.current}`,
        name: `${type.label} · ${String(drawnCounterRef.current).padStart(2, '0')}`,
        kind: drawingTypeRef.current,
        polygon: vertices,
        height: type.height,
        color: type.color,
        outline: type.outline,
        cameraId: null,
        enabled: true,
      };
      onZonesChangeRef.current([...zonesRef.current, zone]);
      finishDraft();
    };

    const pickGlobeCoordinate = (screenPosition: Cartesian2): GeoPoint | null => {
      const ray = viewer.camera.getPickRay(screenPosition);
      if (!ray) return null;
      const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
      if (!cartesian) return null;
      const cartographic = cesium.Cartographic.fromCartesian(cartesian);
      return {
        longitude: cesium.Math.toDegrees(cartographic.longitude),
        latitude: cesium.Math.toDegrees(cartographic.latitude),
      };
    };

    const pickedCameraId = (screenPosition: Cartesian2): string | null => {
      const picked = viewer.scene.pick(screenPosition);
      const id = picked?.id?.id;
      if (typeof id !== 'string') return null;
      return camerasRef.current.some((camera) => camera.id === id) ? id : null;
    };

    const handler = new cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handlerRef.current = handler;
    handler.setInputAction((movement: { position: Cartesian2 }) => {
      if (!drawingRef.current) {
        const cameraId = pickedCameraId(movement.position);
        if (cameraId) onSelectRef.current(cameraId);
        return;
      }
      const coordinate = pickGlobeCoordinate(movement.position);
      if (!coordinate) return;

      if (verticesRef.current.length >= 3 && isNearFirstVertex(movement.position)) {
        commitDraft();
        return;
      }

      verticesRef.current = verticesRef.current.concat(coordinate);
      setDraftVertexCount(verticesRef.current.length);
      showDraft();
    }, cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction((movement: { endPosition: Cartesian2 }) => {
      if (!drawingRef.current) {
        const cameraId = pickedCameraId(movement.endPosition);
        viewer.scene.canvas.style.cursor = cameraId ? 'pointer' : 'grab';
        if (!cameraId) {
          setHovered(null);
          return;
        }
        const width = viewer.scene.canvas.clientWidth;
        const height = viewer.scene.canvas.clientHeight;
        setHovered({
          id: cameraId,
          left: Math.max(12, Math.min(movement.endPosition.x + 14, width - 340)),
          top: Math.max(82, Math.min(movement.endPosition.y - 18, height - 168)),
        });
        return;
      }
      if (!verticesRef.current.length) return;
      const cursorCoordinate = pickGlobeCoordinate(movement.endPosition);
      if (!cursorCoordinate) return;
      showDraft(cursorCoordinate);
    }, cesium.ScreenSpaceEventType.MOUSE_MOVE);

    handler.setInputAction(() => {
      if (verticesRef.current.length) finishDraft();
    }, cesium.ScreenSpaceEventType.RIGHT_CLICK);

    groupsRef.current = emptyGroups();
    addRoads(cesium, viewer, groupsRef.current);
    addBuildings(cesium, viewer, groupsRef.current);
    addBlockoutStructures(cesium, viewer, groupsRef.current);
    addPerimeterWall(cesium, viewer, groupsRef.current);
    addRoadLabels(cesium, viewer, groupsRef.current);
    addPlaceLabels(cesium, viewer, groupsRef.current);
    addFacilityPerimeter(cesium, viewer, groupsRef.current);
    addCameras(cesium, viewer, groupsRef.current, camerasRef.current, selectedRef.current);

    animatorRef.current = createZoneAnimator(cesium, viewer);
    animatorRef.current.sync(zonesRef.current);

    applyLayerVisibility('contexto');
    focusContext(cesium, viewer, 0);

    void Promise.allSettled([cesium.ArcGisMapServerImageryProvider.fromUrl(IMAGERY_URL)]).then(
      ([imageryResult]) => {
        if (cancelledRef.current || viewer.isDestroyed()) return;
        let degraded = false;
        if (imageryResult.status === 'fulfilled') {
          // El satélite va por encima del mapa de calles: si alguna tesela no
          // llega, se ve la capa de contexto en lugar de un hueco.
          const satelliteLayer = viewer.imageryLayers.addImageryProvider(imageryResult.value, 1);
          satelliteLayer.errorEvent.addEventListener(() => {
            setImageryState('degradado');
          });
          setImageryState('ok');
        } else {
          degraded = true;
          console.error(
            '[mapa] no se pudo cargar la imagen satelital de ArcGIS.',
            imageryResult.reason,
          );
        }
        setStatus(degraded ? 'degraded' : 'ready');
        setReady(true);
        publishSceneStatus({
          ready: true,
          status: degraded ? 'degraded' : 'ready',
          cameraCount: camerasRef.current.length,
        });
        viewer.scene.requestRender();
      },
    );

    introTimerRef.current = window.setTimeout(() => {
      introTimerRef.current = null;
      setScope('instalacion');
      applyLayerVisibility('instalacion');
      focusFacility(cesium, viewer, 4.2);
    }, 850);
  }

  /* ------------------------------------------------------------------ *
   * Capas y zonas
   * ------------------------------------------------------------------ */

  useEffect(() => {
    applyLayerVisibility(scope, layers);
    animatorRef.current?.setVisible(layers.zones);
  }, [applyLayerVisibility, layers, scope]);

  useEffect(() => {
    animatorRef.current?.sync(zones);
  }, [zones]);

  /* ------------------------------------------------------------------ *
   * Cámara seleccionada: marcador y cono de visión
   * ------------------------------------------------------------------ */

  useEffect(() => {
    const viewer = viewerRef.current;
    const cesium = cesiumRef.current;
    if (!viewer || !cesium || viewer.isDestroyed()) return;

    cameras.forEach((camera) => {
      const entity = viewer.entities.getById(camera.id);
      if (!entity?.point || !entity?.label) return;
      const selected = camera.id === selectedCameraId;
      entity.point.pixelSize = new cesium.ConstantProperty(selected ? 13 : 8);
      entity.point.outlineWidth = new cesium.ConstantProperty(selected ? 3 : 2);
      entity.point.outlineColor = new cesium.ConstantProperty(
        selected ? cesium.Color.fromCssColorString('#163240') : cesium.Color.WHITE,
      );
      entity.point.color = new cesium.ConstantProperty(
        cesium.Color.fromCssColorString(CLASSIFICATION_COLOR[camera.assessment.classification]),
      );
      entity.label.showBackground = new cesium.ConstantProperty(selected);
      entity.label.distanceDisplayCondition = new cesium.ConstantProperty(
        new cesium.DistanceDisplayCondition(0, selected ? 1_800 : 380),
      );
    });

    if (coneRef.current) {
      viewer.entities.remove(coneRef.current);
      coneRef.current = null;
    }
    const selectedCamera = cameras.find((camera) => camera.id === selectedCameraId);
    if (selectedCamera && layers.cameras) {
      coneRef.current = addCameraCone(cesium, viewer, selectedCamera);
    }

    viewer.scene.requestRender();
  }, [cameras, layers.cameras, selectedCameraId]);

  /* ------------------------------------------------------------------ *
   * Tema y hora
   * ------------------------------------------------------------------ */

  useEffect(() => {
    const viewer = viewerRef.current;
    const cesium = cesiumRef.current;
    if (!viewer || !cesium || viewer.isDestroyed()) return;
    const night = hour < 6.5 || hour > 19.5;
    const background = theme === 'dark' ? '#07131b' : night ? '#16283a' : '#b7d7ea';
    viewer.scene.backgroundColor = cesium.Color.fromCssColorString(background);
    viewer.scene.fog.enabled = !night;
    viewer.scene.fog.density = theme === 'dark' ? 0.00018 : 0.00008;
    viewer.scene.requestRender();
  }, [hour, theme]);

  /* ------------------------------------------------------------------ *
   * Exageración vertical
   * ------------------------------------------------------------------ */

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    viewer.scene.verticalExaggeration = exaggeration;
    viewer.scene.requestRender();
  }, [exaggeration]);

  /* ------------------------------------------------------------------ *
   * Encuadre solicitado desde otras vistas
   * ------------------------------------------------------------------ */

  useEffect(() => {
    if (!focusRequest) return;
    const viewer = viewerRef.current;
    const cesium = cesiumRef.current;
    if (!viewer || !cesium || viewer.isDestroyed()) return;
    const camera = camerasRef.current.find((item) => item.id === focusRequest.cameraId);
    if (!camera) return;
    focusCamera(cesium, viewer, camera);
  }, [focusCamera, focusRequest]);

  /* ------------------------------------------------------------------ *
   * Modo de dibujo
   * ------------------------------------------------------------------ */

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    viewer.scene.screenSpaceCameraController.enableRotate = !editing;
    viewer.scene.canvas.style.cursor = editing ? 'crosshair' : 'grab';
    if (!editing) {
      verticesRef.current = [];
      setDraftVertexCount(0);
      draftRef.current.forEach((entity) => viewer.entities.remove(entity));
      draftRef.current = [];
    }
    applyLayerVisibility(scope, layers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  /* ------------------------------------------------------------------ *
   * Sólo se repinta cuando la escena está a la vista
   * ------------------------------------------------------------------ */

  useEffect(() => {
    const container = containerRef.current;
    const viewer = viewerRef.current;
    if (!container || !viewer) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        viewer.useDefaultRenderLoop = visible;
        if (visible) viewer.scene.requestRender();
      },
      { threshold: 0.01 },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [ready]);

  /* ------------------------------------------------------------------ *
   * Acciones del operador
   * ------------------------------------------------------------------ */

  function chooseScope(next: SceneScope): void {
    const viewer = viewerRef.current;
    const cesium = cesiumRef.current;
    if (!viewer || !cesium) return;
    if (introTimerRef.current !== null) {
      window.clearTimeout(introTimerRef.current);
      introTimerRef.current = null;
    }
    setScope(next);
    applyLayerVisibility(next, layers);
    if (next === 'contexto') focusContext(cesium, viewer);
    else focusFacility(cesium, viewer, 1.2, next === 'recinto');
  }

  function chooseProjection(next: SceneProjection): void {
    const viewer = viewerRef.current;
    const cesium = cesiumRef.current;
    if (!viewer || !cesium) return;
    setProjection(next);
    focusFacility(cesium, viewer, 1.1, next === 'planta');
  }

  const hoveredCamera = hovered ? cameras.find((camera) => camera.id === hovered.id) : null;

  if (!webGLAvailable) {
    return (
      <div
        className="relative h-full w-full overflow-hidden bg-[var(--card)]"
        data-testid="geospatial-scene-fallback"
      >
        <img
          src="/scene/agunsa_arcgis_satellite.jpg"
          alt="Vista satelital del entorno de AGUNSA Callao"
          className="h-full w-full object-cover opacity-80"
        />
        <p className="absolute inset-x-0 bottom-4 mx-auto w-fit rounded-md border border-border bg-background/90 px-3 py-2 text-xs text-muted-foreground backdrop-blur-sm">
          La vista geoespacial requiere WebGL y aceleración gráfica.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--card)]">
      <div
        ref={containerRef}
        className="h-full w-full"
        data-testid="geospatial-scene-canvas"
        aria-label="Base georreferenciada 3D de las instalaciones de AGUNSA"
      />

      {status === 'loading' ? (
        <div className="pointer-events-none absolute inset-x-0 top-4 mx-auto w-fit rounded-md border border-border bg-background/90 px-3 py-2 text-[11px] text-muted-foreground backdrop-blur-sm">
          Cargando satélite, relieve y contexto 3D…
        </div>
      ) : null}

      {status === 'degraded' ? (
        <div className="pointer-events-none absolute inset-x-0 top-4 mx-auto w-fit rounded-md border border-warning/45 bg-background/90 px-3 py-2 text-[11px] text-warning backdrop-blur-sm">
          La base 3D se cargó parcialmente: una de las capas externas no respondió.
        </div>
      ) : null}

      {hoveredCamera && layers.cameras && !editing ? (
        <div
          className="pointer-events-none absolute z-20 w-[320px] rounded-lg border border-border bg-background/92 px-3 py-2 shadow-lg backdrop-blur-md"
          style={{ left: hovered?.left, top: hovered?.top }}
          role="tooltip"
          data-testid="geospatial-camera-tooltip"
        >
          <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <span
              className="size-2 rounded-full"
              style={{
                backgroundColor: CLASSIFICATION_COLOR[hoveredCamera.assessment.classification],
              }}
              aria-hidden="true"
            />
            {hoveredCamera.id} · {hoveredCamera.name}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {hoveredCamera.assessment.priority} · {hoveredCamera.spec.model} · {hoveredCamera.ip}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Posición provisional sobre el perímetro OSM
          </p>
        </div>
      ) : null}

      <div
        className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/12 bg-[#07131b]/85 px-3 py-1 text-[10px] tracking-[0.08em] text-[var(--glass-muted)] uppercase backdrop-blur-md"
        data-testid="geospatial-imagery-state"
      >
        {imageryState === 'cargando'
          ? 'Cargando imagen satelital…'
          : imageryState === 'ok'
            ? 'Imagen satelital · ArcGIS World Imagery'
            : 'Satélito degradado · mapa de calles OSM'}
      </div>

      <SceneViewTools
        scope={scope}
        projection={projection}
        exaggeration={exaggeration}
        editing={editing}
        draftVertexCount={draftVertexCount}
        drawingType={drawingType}
        layers={layers}
        onLayers={setLayers}
        onScope={chooseScope}
        onProjection={chooseProjection}
        onExaggeration={setExaggeration}
        onDrawingType={setDrawingType}
        onToggleEditing={() => setEditing((value) => !value)}
      />

      <GlassPanel
        camera={selectedCamera}
        cameras={cameras}
        zones={zones}
        onSelect={onSelect}
        onResetView={() => {
          const viewer = viewerRef.current;
          const cesium = cesiumRef.current;
          if (!viewer || !cesium) return;
          setScope('instalacion');
          applyLayerVisibility('instalacion', layers);
          focusFacility(cesium, viewer, 1.2);
        }}
      />

      {selectedCamera ? (
        <div
          className="scene-feed right-3 bottom-16 z-30 w-[min(300px,calc(100%-2rem))]"
          data-testid="geospatial-feed"
        >
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
            <span className="truncate text-[10px] font-semibold tracking-[0.08em] text-[var(--glass-text)] uppercase">
              {selectedCamera.id} · {selectedCamera.name}
            </span>
            <span
              className="size-2 shrink-0 rounded-full"
              style={{
                backgroundColor: CLASSIFICATION_COLOR[selectedCamera.assessment.classification],
              }}
              aria-hidden="true"
            />
          </div>
          <div className="aspect-video w-full bg-black">
            <LiveCameraFrame
              camera={selectedCamera}
              night={hour >= 19 || hour < 6}
              showDetections
              className="block h-full w-full"
            />
          </div>
          <p className="px-2.5 py-1.5 text-[10px] text-[var(--glass-muted)]">
            {selectedPhoto
              ? `Captura del informe · ${selectedPhoto.label}`
              : 'Feed en vivo · sin captura en el informe'}
          </p>
          <p className="px-2.5 pb-1.5 text-[10px] text-[var(--glass-muted)]/80">
            {selectedCamera.ip} · {selectedCamera.resolution} · {selectedCamera.spec.model}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------- *
 * Controles de vista
 * -------------------------------------------------------------------- */

interface SceneViewToolsProps {
  scope: SceneScope;
  projection: SceneProjection;
  exaggeration: SceneExaggeration;
  editing: boolean;
  draftVertexCount: number;
  drawingType: GeospatialZone['kind'];
  layers: SceneLayers;
  onLayers: (layers: SceneLayers) => void;
  onScope: (scope: SceneScope) => void;
  onProjection: (projection: SceneProjection) => void;
  onExaggeration: (value: SceneExaggeration) => void;
  onDrawingType: (value: GeospatialZone['kind']) => void;
  onToggleEditing: () => void;
}

const SCOPE_BUTTONS: { id: SceneScope; label: string }[] = [
  { id: 'contexto', label: 'Mapa completo' },
  { id: 'instalacion', label: 'Instalación' },
  { id: 'recinto', label: 'Recinto limpio' },
];

function SceneViewTools({
  scope,
  projection,
  exaggeration,
  editing,
  draftVertexCount,
  drawingType,
  layers,
  onLayers,
  onScope,
  onProjection,
  onExaggeration,
  onDrawingType,
  onToggleEditing,
}: SceneViewToolsProps) {
  return (
    <div
      className="absolute top-3 right-3 z-20 flex max-w-[min(380px,calc(100%-1.5rem))] flex-col items-end gap-2"
      data-testid="geospatial-view-tools"
    >
      <SceneLayerToggles layers={layers} onChange={onLayers} />

      <div className="flex flex-wrap justify-end gap-1 rounded-lg border border-border bg-background/90 p-1 backdrop-blur-md">
        {SCOPE_BUTTONS.map((button) => (
          <button
            key={button.id}
            type="button"
            disabled={editing}
            aria-pressed={scope === button.id}
            onClick={() => onScope(button.id)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-40 ${
              scope === button.id
                ? 'bg-info/15 text-info ring-1 ring-info/30 ring-inset'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {button.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap justify-end gap-1 rounded-lg border border-border bg-background/90 p-1 backdrop-blur-md">
        {(['perspectiva', 'planta'] as const).map((value) => (
          <button
            key={value}
            type="button"
            disabled={editing}
            aria-pressed={projection === value}
            onClick={() => onProjection(value)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-colors disabled:opacity-40 ${
              projection === value
                ? 'bg-info/15 text-info ring-1 ring-info/30 ring-inset'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-border bg-background/90 p-1 backdrop-blur-md">
        <span className="px-1.5 text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
          Relieve
        </span>
        {([1, 1.5, 2] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={exaggeration === value}
            onClick={() => onExaggeration(value)}
            className={`rounded-md px-2 py-1 text-[11px] font-medium tabular-nums transition-colors ${
              exaggeration === value
                ? 'bg-info/15 text-info ring-1 ring-info/30 ring-inset'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {value}×
          </button>
        ))}
        <button
          type="button"
          aria-pressed={editing}
          onClick={onToggleEditing}
          data-testid="geospatial-toggle-drawing"
          className={`ml-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
            editing
              ? 'bg-warning/15 text-warning ring-1 ring-warning/40 ring-inset'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          {editing ? 'Finalizar dibujo' : 'Dibujar zona'}
        </button>
      </div>

      {editing ? (
        <div
          className="w-[min(380px,calc(100vw-2rem))] rounded-lg border border-border bg-background/94 p-2.5 backdrop-blur-md"
          data-testid="geospatial-drawing-toolbar"
        >
          <div className="flex flex-wrap gap-1">
            {DRAWING_TYPE_ORDER.map((id) => {
              const type = DRAWING_TYPES[id];
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={drawingType === id}
                  onClick={() => onDrawingType(id)}
                  className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                    drawingType === id
                      ? 'bg-info/15 text-info ring-1 ring-info/30 ring-inset'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: type.color }}
                    aria-hidden="true"
                  />
                  {type.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
            Haz clic punto a punto y vuelve al primero para cerrar ·{' '}
            {draftVertexCount ? `${draftVertexCount} vértices` : 'Ninguna figura en curso'}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------- *
 * Capas
 * -------------------------------------------------------------------- */

interface SceneLayerTogglesProps {
  layers: SceneLayers;
  onChange: (layers: SceneLayers) => void;
}

const LAYER_LABELS: { key: keyof SceneLayers; label: string }[] = [
  { key: 'perimeter', label: 'Perímetro real' },
  { key: 'facilityModel', label: 'Muro perimetral' },
  { key: 'buildings', label: 'Volúmenes del entorno' },
  { key: 'roads', label: 'Geometría de vías' },
  { key: 'labels', label: 'Nombres y lugares' },
  { key: 'cameras', label: 'Cámaras perimetrales' },
  { key: 'zones', label: 'Zonas georreferenciadas' },
];

function SceneLayerToggles({ layers, onChange }: SceneLayerTogglesProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col items-end" data-testid="geospatial-layer-controls">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="rounded-lg border border-border bg-background/90 px-2.5 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase backdrop-blur-md hover:text-foreground"
      >
        {open ? 'Ocultar capas' : 'Capas'}
      </button>
      {open ? (
        <div className="mt-2 flex w-[212px] flex-col gap-1.5 rounded-lg border border-border bg-background/92 p-2.5 backdrop-blur-md">
          {LAYER_LABELS.map((layer) => (
            <label
              key={layer.key}
              className="flex items-center gap-2 text-[11px] text-muted-foreground"
            >
              <input
                type="checkbox"
                checked={layers[layer.key]}
                onChange={() => onChange({ ...layers, [layer.key]: !layers[layer.key] })}
                className="size-3 accent-[var(--info)]"
              />
              {layer.label}
            </label>
          ))}
          <p className="mt-1 border-t border-border pt-2 text-[10px] leading-snug text-muted-foreground/80">
            Imagen satelital y relieve de ArcGIS + nombres de OpenStreetMap. Sin clave personal.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export { DRAWING_TYPE_ORDER };
export const FACILITY_PERIMETER_POINTS = FACILITY_PERIMETER;
