/**
 * Reglas de arquitectura de AGUNSA Sentinel.
 *
 * La regla por capas es el punto central de este archivo: `domain/` es puro,
 * `data/` sólo conoce el dominio, `store/` conoce datos y dominio,
 * `components/` reciben los datos por props y `features/` es la única capa
 * que compone el resto.
 *
 *   domain  ← data ← store ← features ← app-shell ← app
 *   lib (plumbing) → domain
 *   components (presentación, sin acceso al store) → domain, lib
 *
 * Además se fuerzan tres módulos profundos (una única interfaz pública cada
 * uno) y la ausencia de ciclos y de módulos huérfanos.
 */
module.exports = {
  forbidden: [
    {
      name: 'domain-purity',
      severity: 'error',
      comment: 'El dominio es puro: no conoce datos, estado, UI ni rutas.',
      from: { path: '^src/domain/.*\\.tsx?$' },
      to: { path: '^src/(data|store|components|features|app-shell|lib)/.*\\.tsx?$' },
    },
    {
      name: 'data-layer-scope',
      severity: 'error',
      comment: 'Los datos simulados sólo dependen del dominio.',
      from: { path: '^src/data/.*\\.tsx?$' },
      to: { path: '^src/(store|components|features|app-shell|lib)/.*\\.tsx?$' },
    },
    {
      name: 'lib-layer-scope',
      severity: 'error',
      comment: 'El plumbing compartido no depende de ninguna capa de producto.',
      from: { path: '^src/lib/.*\\.tsx?$' },
      to: { path: '^src/(data|store|components|features|app-shell)/.*\\.tsx?$' },
    },
    {
      name: 'store-layer-scope',
      severity: 'error',
      comment: 'El store conoce dominio y datos, nunca la UI.',
      from: { path: '^src/store/.*\\.tsx?$' },
      to: { path: '^src/(components|features|app-shell)/.*\\.tsx?$' },
    },
    {
      name: 'components-are-prop-driven',
      severity: 'error',
      comment: 'Los componentes reciben los datos por props: no acceden al store.',
      from: { path: '^src/components/.*\\.tsx?$' },
      to: { path: '^src/(data|store|features|app-shell)/.*\\.tsx?$' },
    },
    {
      name: 'features-do-not-know-the-shell',
      severity: 'error',
      comment: 'Las features no dependen del armazón de aplicación.',
      from: { path: '^src/features/.*\\.tsx?$' },
      to: { path: '^src/app-shell/.*\\.tsx?$' },
    },
    {
      name: 'app-shell-does-not-import-routes',
      severity: 'error',
      comment: 'El armazón no importa las rutas.',
      from: { path: '^src/app-shell/.*\\.tsx?$' },
      to: { path: '^app/.*\\.tsx?$' },
    },
    {
      name: 'routes-compose-features',
      severity: 'error',
      comment: 'Las rutas componen features; la lógica vive en las features.',
      from: { path: '^app/.*\\.tsx?$' },
      to: { path: '^src/(domain|data|store|components|lib)/.*\\.tsx?$' },
    },
    {
      name: 'camera-feed-entry-point-only',
      severity: 'error',
      comment:
        'El feed de cámara es un módulo profundo: sólo se importa src/components/camera-feed/index.tsx.',
      from: { pathNot: '^src/components/camera-feed/' },
      to: { path: '^src/components/camera-feed/(?!index\\.tsx?$)' },
    },
    {
      name: 'perimeter-scene-entry-point-only',
      severity: 'error',
      comment:
        'La escena 3D es un módulo profundo: sólo se importa src/features/map/three-scene/index.ts.',
      from: { pathNot: '^src/features/map/three-scene/' },
      to: { path: '^src/features/map/three-scene/(?!index\\.ts$)' },
    },
    {
      name: 'zone-editor-entry-point-only',
      severity: 'error',
      comment:
        'El editor de zonas es un módulo profundo: sólo se importa src/features/config/zone-editor/index.tsx.',
      from: { pathNot: '^src/features/config/zone-editor/' },
      to: { path: '^src/features/config/zone-editor/(?!index\\.tsx?$)' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Sin ciclos de dependencia.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      severity: 'error',
      comment: 'Todo módulo en src/ y app/ debe ser alcanzable desde una ruta.',
      from: {
        orphan: true,
        path: '^(src|app)/.*\\.tsx?$',
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
    },
    reporterOptions: {
      dot: { collapsePattern: 'node_modules/(?:@[^/]+/[^/]+|[^/]+)' },
    },
  },
};
