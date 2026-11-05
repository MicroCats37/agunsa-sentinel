import { FACILITY_BLOCKOUT, expandContainerRows } from '@/data/geospatial/facility-blockout';
import { FACILITY_PERIMETER } from '@/data/geospatial/camera-geography';
import { OSM_BUILDINGS, OSM_PLACES, OSM_ROADS } from '@/data/geospatial/osm-context';
import { CLASSIFICATION_COLOR } from '@/domain/classification';
import type { Camera, GeoPoint } from '@/domain/types';
import type { Entity, Viewer } from 'cesium';
import type { CesiumModule } from './cesium';
import { localToGeographic } from './geometry';

/**
 * Construcción de las entidades de la escena geoespacial.
 *
 * Todas las funciones reciben el módulo de Cesium ya cargado: el motor no se
 * importa nunca en el ámbito de este módulo, sólo se usa a través del
 * parámetro `cesium`.
 */

/** Grupos de entidades por capa, para poder mostrarlas y ocultarlas. */
export interface SceneGroups {
  roads: Entity[];
  buildings: Entity[];
  blockout: Entity[];
  userLayout: Entity[];
  labels: Entity[];
  perimeter: Entity[];
  facilityLabels: Entity[];
  cameras: Entity[];
}

export function emptyGroups(): SceneGroups {
  return {
    roads: [],
    buildings: [],
    blockout: [],
    userLayout: [],
    labels: [],
    perimeter: [],
    facilityLabels: [],
    cameras: [],
  };
}

/** Etiquetas de calle con su nombre completo y su forma abreviada. */
const ROAD_LABELS: readonly (readonly [string, string])[] = [
  ['Avenida Coronel Nestor Gambetta', 'Av. Néstor Gambetta'],
  ['Avenida Coronel Néstor Gambetta', 'Av. Néstor Gambetta'],
  ['Avenida Carlos Alberto Izaguirre', 'Av. Carlos Izaguirre'],
  ['Calle Arica', 'Arica'],
  ['Calle 7', 'C. 7'],
  ['Calle Camisea', 'Ca. Camisea'],
  ['Avenida Las Vegas', 'Av. Las Vegas'],
  ['Calle Jose Olaya', 'José Olaya'],
  ['Calle Libertad', 'Libertad'],
  ['Calle Corola', 'Ca. Corola'],
  ['Calle Cuzco', 'Av. Cuzco'],
];

function middleCoordinate(coordinates: readonly GeoPoint[]): GeoPoint {
  return coordinates[Math.floor(coordinates.length / 2)] ?? { longitude: 0, latitude: 0 };
}

/** Vías del entorno, con las arterias principales resaltadas. */
export function addRoads(cesium: CesiumModule, viewer: Viewer, groups: SceneGroups): void {
  OSM_ROADS.forEach((road) => {
    const isMainRoad = ['trunk', 'primary', 'secondary', 'tertiary'].includes(road.kind);
    const entity = viewer.entities.add({
      id: road.id,
      name: road.name,
      polyline: {
        positions: road.coordinates.map((point) =>
          cesium.Cartesian3.fromDegrees(point.longitude, point.latitude),
        ),
        width: isMainRoad ? 3.4 : 1.4,
        material: cesium.Color.fromCssColorString(isMainRoad ? '#f3d38a' : '#ffffff').withAlpha(
          isMainRoad ? 0.72 : 0.48,
        ),
        clampToGround: true,
      },
    });
    groups.roads.push(entity);
  });
}

/** Volúmenes 3D del entorno: muestran la masa urbana real alrededor del recinto. */
export function addBuildings(cesium: CesiumModule, viewer: Viewer, groups: SceneGroups): void {
  OSM_BUILDINGS.forEach((building) => {
    const isWarehouse = building.kind === 'warehouse';
    const entity = viewer.entities.add({
      id: building.id,
      name: building.name,
      polygon: {
        hierarchy: new cesium.PolygonHierarchy(
          building.coordinates.map((point) =>
            cesium.Cartesian3.fromDegrees(point.longitude, point.latitude),
          ),
        ),
        height: 0,
        heightReference: cesium.HeightReference.CLAMP_TO_GROUND,
        extrudedHeight: building.height,
        extrudedHeightReference: cesium.HeightReference.RELATIVE_TO_GROUND,
        material: cesium.Color.fromCssColorString(isWarehouse ? '#d8d3c7' : '#c7c9c8').withAlpha(
          0.68,
        ),
        outline: true,
        outlineColor: cesium.Color.fromCssColorString('#738086').withAlpha(0.75),
      },
    });
    groups.buildings.push(entity);
  });
}

/** Rótulos de las vías principales. */
export function addRoadLabels(cesium: CesiumModule, viewer: Viewer, groups: SceneGroups): void {
  const used = new Set<string>();
  ROAD_LABELS.forEach(([sourceName, displayName], index) => {
    const road = OSM_ROADS.find(
      (candidate) => candidate.name === sourceName && !used.has(candidate.id),
    );
    if (!road) return;
    used.add(road.id);
    const point = middleCoordinate(road.coordinates);
    const entity = viewer.entities.add({
      id: `osm-road-label-${index}`,
      position: cesium.Cartesian3.fromDegrees(point.longitude, point.latitude),
      label: {
        text: displayName,
        font: '600 12px Inter, sans-serif',
        fillColor: cesium.Color.WHITE,
        outlineColor: cesium.Color.fromCssColorString('#17242a'),
        outlineWidth: 3,
        style: cesium.LabelStyle.FILL_AND_OUTLINE,
        heightReference: cesium.HeightReference.CLAMP_TO_GROUND,
        pixelOffset: new cesium.Cartesian2(0, -4),
        horizontalOrigin: cesium.HorizontalOrigin.CENTER,
        verticalOrigin: cesium.VerticalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new cesium.DistanceDisplayCondition(350, 3_200),
      },
    });
    groups.labels.push(entity);
  });
}

/** Lugares del entorno, con AGUNSA destacado. */
export function addPlaceLabels(cesium: CesiumModule, viewer: Viewer, groups: SceneGroups): void {
  OSM_PLACES.forEach((place) => {
    const isFacility = place.name.includes('AGUNSA');
    const entity = viewer.entities.add({
      id: place.id,
      name: place.name,
      position: cesium.Cartesian3.fromDegrees(place.longitude, place.latitude),
      point: isFacility
        ? {
            pixelSize: 13,
            color: cesium.Color.fromCssColorString('#d9312b'),
            outlineColor: cesium.Color.WHITE,
            outlineWidth: 3,
            heightReference: cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          }
        : undefined,
      label: {
        text: place.name,
        font: isFacility ? '700 14px Inter, sans-serif' : '600 12px Inter, sans-serif',
        fillColor: cesium.Color.WHITE,
        outlineColor: cesium.Color.fromCssColorString('#17242a'),
        outlineWidth: isFacility ? 4 : 3,
        style: cesium.LabelStyle.FILL_AND_OUTLINE,
        heightReference: cesium.HeightReference.CLAMP_TO_GROUND,
        pixelOffset: new cesium.Cartesian2(isFacility ? 15 : 0, isFacility ? -12 : -5),
        horizontalOrigin: isFacility
          ? cesium.HorizontalOrigin.LEFT
          : cesium.HorizontalOrigin.CENTER,
        verticalOrigin: cesium.VerticalOrigin.BOTTOM,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new cesium.DistanceDisplayCondition(
          0,
          isFacility ? 5_000 : 3_200,
        ),
      },
    });
    (isFacility ? groups.facilityLabels : groups.labels).push(entity);
  });
}

/** Perímetro real de referencia: huella y límite georreferenciado. */
export function addFacilityPerimeter(
  cesium: CesiumModule,
  viewer: Viewer,
  groups: SceneGroups,
): void {
  const positions = FACILITY_PERIMETER.map((point) =>
    cesium.Cartesian3.fromDegrees(point.longitude, point.latitude),
  );
  const footprint = viewer.entities.add({
    id: 'facility-perimeter-footprint',
    name: 'AGUNSA Callao · perímetro de referencia OSM',
    polygon: {
      hierarchy: new cesium.PolygonHierarchy(positions),
      material: cesium.Color.fromCssColorString('#1ebbb1').withAlpha(0.12),
      heightReference: cesium.HeightReference.CLAMP_TO_GROUND,
    },
  });
  const boundary = viewer.entities.add({
    id: 'facility-perimeter-boundary',
    name: 'AGUNSA Callao · límite georreferenciado',
    polyline: {
      positions: positions[0] ? positions.concat(positions[0]) : positions,
      width: 5,
      material: cesium.Color.fromCssColorString('#20d8ca').withAlpha(0.96),
      clampToGround: true,
    },
  });
  groups.perimeter.push(footprint, boundary);
}

/**
 * Muro perimetral volumétrico.
 *
 * Cada tramo se construye desde una huella rectangular apoyada en el terreno y
 * se extruye hacia arriba. Así se conserva exactamente el trazado aprobado,
 * sin depender de la altura del centro de una caja 3D.
 */
export function addPerimeterWall(cesium: CesiumModule, viewer: Viewer, groups: SceneGroups): void {
  const wall = FACILITY_BLOCKOUT.perimeterWall;
  const maximumSegmentLength = wall.maxSegmentLength || 8;

  FACILITY_BLOCKOUT.perimeter.forEach((start, index) => {
    const end = FACILITY_BLOCKOUT.perimeter[(index + 1) % FACILITY_BLOCKOUT.perimeter.length];
    if (!end) return;
    const deltaEast = end.east - start.east;
    const deltaNorth = end.north - start.north;
    const edgeLength = Math.hypot(deltaEast, deltaNorth);
    const segmentCount = Math.max(1, Math.ceil(edgeLength / maximumSegmentLength));
    const segmentLength = edgeLength / segmentCount;
    const directionEast = deltaEast / edgeLength;
    const directionNorth = deltaNorth / edgeLength;
    const perpendicularEast = -directionNorth;
    const perpendicularNorth = directionEast;
    const halfThickness = wall.thickness / 2;

    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
      const startRatio = segmentIndex / segmentCount;
      const endRatio = (segmentIndex + 1) / segmentCount;
      const segmentStart = {
        east: start.east + deltaEast * startRatio,
        north: start.north + deltaNorth * startRatio,
      };
      const segmentEnd = {
        east: start.east + deltaEast * endRatio,
        north: start.north + deltaNorth * endRatio,
      };
      const footprint = [
        {
          east: segmentStart.east + perpendicularEast * halfThickness,
          north: segmentStart.north + perpendicularNorth * halfThickness,
        },
        {
          east: segmentEnd.east + perpendicularEast * halfThickness,
          north: segmentEnd.north + perpendicularNorth * halfThickness,
        },
        {
          east: segmentEnd.east - perpendicularEast * halfThickness,
          north: segmentEnd.north - perpendicularNorth * halfThickness,
        },
        {
          east: segmentStart.east - perpendicularEast * halfThickness,
          north: segmentStart.north - perpendicularNorth * halfThickness,
        },
      ].map(({ east, north }) => {
        const point = localToGeographic(east, north);
        return cesium.Cartesian3.fromDegrees(point.longitude, point.latitude);
      });

      const wallTexture = new cesium.ImageMaterialProperty({
        image: wall.texture,
        repeat: new cesium.Cartesian2(Math.max(1, segmentLength / 2.4), 2.5),
        transparent: false,
      });

      const entity = viewer.entities.add({
        id: `perimeter-wall-${index + 1}-${segmentIndex + 1}`,
        name: `Muro perimetral ${index + 1}.${segmentIndex + 1}`,
        properties: { phase: '3A', precision: 'conceptual' },
        polygon: {
          hierarchy: new cesium.PolygonHierarchy(footprint),
          height: 0,
          heightReference: cesium.HeightReference.RELATIVE_TO_GROUND,
          extrudedHeight: wall.height,
          extrudedHeightReference: cesium.HeightReference.RELATIVE_TO_GROUND,
          material: wallTexture,
          outline: true,
          outlineColor: cesium.Color.fromCssColorString('#5b211c').withAlpha(0.92),
          closeTop: true,
          closeBottom: true,
        },
      });
      groups.blockout.push(entity);
    }
  });
}

/** Volúmenes conceptuales de la instalación (naves, oficinas, contenedores). */
export function addBlockoutStructures(
  cesium: CesiumModule,
  viewer: Viewer,
  groups: SceneGroups,
): void {
  if (!FACILITY_BLOCKOUT.metadata.renderInitialLayout) return;

  FACILITY_BLOCKOUT.structures.forEach((structure) => {
    const location = localToGeographic(structure.east, structure.north, structure.height / 2);
    const position = cesium.Cartesian3.fromDegrees(
      location.longitude,
      location.latitude,
      location.height,
    );
    const entity = viewer.entities.add({
      id: structure.id,
      name: structure.name,
      position,
      orientation: cesium.Transforms.headingPitchRollQuaternion(
        position,
        new cesium.HeadingPitchRoll(cesium.Math.toRadians(structure.heading || 0), 0, 0),
      ),
      box: {
        dimensions: new cesium.Cartesian3(structure.width, structure.depth, structure.height),
        heightReference: cesium.HeightReference.RELATIVE_TO_GROUND,
        material: cesium.Color.fromCssColorString(structure.wallColor).withAlpha(0.96),
        outline: true,
        outlineColor: cesium.Color.fromCssColorString('#536368').withAlpha(0.82),
      },
    });
    groups.blockout.push(entity);
  });

  expandContainerRows().forEach((container) => {
    const location = localToGeographic(container.east, container.north, container.height / 2);
    const position = cesium.Cartesian3.fromDegrees(
      location.longitude,
      location.latitude,
      location.height,
    );
    const entity = viewer.entities.add({
      id: container.id,
      name: container.name,
      position,
      orientation: cesium.Transforms.headingPitchRollQuaternion(
        position,
        new cesium.HeadingPitchRoll(cesium.Math.toRadians(container.heading || 0), 0, 0),
      ),
      box: {
        dimensions: new cesium.Cartesian3(container.width, container.depth, container.height),
        heightReference: cesium.HeightReference.RELATIVE_TO_GROUND,
        material: cesium.Color.fromCssColorString(container.color).withAlpha(0.98),
      },
    });
    groups.blockout.push(entity);
  });
}

/**
 * Marcadores de cámara.
 *
 * El color es el de la **clasificación del informe**, no el del estado
 * operativo: el objetivo es leer de un vistazo la calidad de imagen evaluada.
 */
export function addCameras(
  cesium: CesiumModule,
  viewer: Viewer,
  groups: SceneGroups,
  cameras: readonly Camera[],
  selectedId: string | null,
): void {
  cameras.forEach((camera) => {
    const selected = camera.id === selectedId;
    const color = cesium.Color.fromCssColorString(
      CLASSIFICATION_COLOR[camera.assessment.classification],
    );

    const entity = viewer.entities.add({
      id: camera.id,
      name: `${camera.id} · ${camera.name}`,
      position: cesium.Cartesian3.fromDegrees(
        camera.geo.longitude,
        camera.geo.latitude,
        camera.geo.height,
      ),
      properties: {
        cameraId: camera.id,
        classification: camera.assessment.classification,
        priority: camera.assessment.priority,
        ip: camera.ip,
        model: camera.spec.model,
        heading: camera.geo.heading,
        fov: camera.spec.horizontalFovDeg,
        positionVerified: false,
        positionSource: camera.geo.source,
      },
      point: {
        pixelSize: selected ? 13 : 8,
        color,
        outlineColor: selected ? cesium.Color.fromCssColorString('#163240') : cesium.Color.WHITE,
        outlineWidth: selected ? 3 : 2,
        heightReference: cesium.HeightReference.RELATIVE_TO_GROUND,
        scaleByDistance: new cesium.NearFarScalar(100, 1.45, 3_200, 0.5),
        distanceDisplayCondition: new cesium.DistanceDisplayCondition(0, 5_000),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: camera.id,
        font: '700 10px IBM Plex Mono, monospace',
        fillColor: cesium.Color.WHITE,
        outlineColor: cesium.Color.fromCssColorString('#07131b'),
        outlineWidth: 3,
        style: cesium.LabelStyle.FILL_AND_OUTLINE,
        showBackground: selected,
        backgroundColor: cesium.Color.fromCssColorString('#163240').withAlpha(0.9),
        pixelOffset: new cesium.Cartesian2(0, -15),
        horizontalOrigin: cesium.HorizontalOrigin.CENTER,
        verticalOrigin: cesium.VerticalOrigin.BOTTOM,
        heightReference: cesium.HeightReference.RELATIVE_TO_GROUND,
        scaleByDistance: new cesium.NearFarScalar(90, 1.2, 1_800, 0.72),
        distanceDisplayCondition: new cesium.DistanceDisplayCondition(0, selected ? 1_800 : 380),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    groups.cameras.push(entity);
  });
}

/**
 * Cono de visión de una cámara proyectado sobre el terreno.
 *
 * Es la misma información que muestra el plano 2D, expresada en el mundo
 * real: el operador ve a qué calle mira cada equipo.
 */
export function addCameraCone(cesium: CesiumModule, viewer: Viewer, camera: Camera): Entity {
  const { longitude, latitude } = camera.geo;
  const half = (camera.spec.horizontalFovDeg * Math.PI) / 360;
  const azimuth = (camera.geo.heading * Math.PI) / 180;
  const reach = 42;

  const positions = [cesium.Cartesian3.fromDegrees(longitude, latitude)];
  for (let step = 0; step <= 16; step += 1) {
    const angle = azimuth - half + (step / 16) * half * 2;
    const east = Math.sin(angle) * reach;
    const north = Math.cos(angle) * reach;
    positions.push(
      cesium.Cartesian3.fromDegrees(
        longitude + east / (111_320 * Math.cos((latitude * Math.PI) / 180)),
        latitude + north / 111_320,
      ),
    );
  }

  const color = cesium.Color.fromCssColorString(
    CLASSIFICATION_COLOR[camera.assessment.classification],
  );

  return viewer.entities.add({
    id: `${camera.id}-cone`,
    name: `${camera.id} · cono de visión`,
    polygon: {
      hierarchy: new cesium.PolygonHierarchy(positions),
      material: color.withAlpha(0.22),
      heightReference: cesium.HeightReference.CLAMP_TO_GROUND,
    },
  });
}
