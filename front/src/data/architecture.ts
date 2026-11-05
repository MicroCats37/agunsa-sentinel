/**
 * Arquitectura conceptual propuesta para un CCTV modernizado.
 *
 * Reproduce la cadena y las condiciones de validación del informe. Es una
 * arquitectura conceptual: no describe la red existente ni autoriza compras.
 */

export interface ArchitectureStage {
  id: string;
  /** Etiqueta de la etapa en la cadena. */
  label: string;
  /** Requisito propuesto. */
  requirement: string;
  /** Cómo se valida. */
  validation: string;
}

export const ARCHITECTURE_CHAIN: readonly ArchitectureStage[] = [
  {
    id: 'camaras',
    label: 'Cámaras y perfiles',
    requirement:
      'Seleccionar lente, resolución y respuesta nocturna por objetivo y distancia. Perfil principal para grabar; secundario para mosaicos. No asumir que más megapíxeles corrigen un mal encuadre.',
    validation:
      'Prueba controlada de día y noche por cada objetivo de vigilancia, con distancia y criterio de identificación acordados.',
  },
  {
    id: 'interoperabilidad',
    label: 'Interoperabilidad',
    requirement:
      'Exigir modelo y firmware verificables en ONVIF; Profile T para video y G cuando se requiera grabación en borde.',
    validation: 'Probar eventos y recuperación con el VMS elegido.',
  },
  {
    id: 'red',
    label: 'Red y energía',
    requirement:
      'Segmentar cámaras y administración; switches administrables con presupuesto PoE calculado por consumo máximo. Fibra donde lo requieran distancias/aislamiento; UPS, puesta a tierra y protección eléctrica calculadas.',
    validation:
      'Medir consumo de cámaras, switches, grabadores y puestos; probar recuperación tras corte autorizado.',
  },
  {
    id: 'vms',
    label: 'VMS y almacenamiento',
    requirement:
      'Licencias por canal, usuarios y ampliación; roles, auditoría, alarmas de caída, mapa verificado, reproducción y exportación trazable. Redundancia según criticidad y costo aprobado.',
    validation:
      'Pruebas SAT: caída, recuperación, roles, auditoría y exportación de evidencia.',
  },
  {
    id: 'operacion',
    label: 'Operación',
    requirement:
      'Procedimiento de alarma, escalamiento, preservación de evidencia, mantenimiento y capacitación. Distinguir video en vivo de grabación disponible.',
    validation:
      'Prueba propuesta de 72 horas con registro de pérdidas y recuperación; umbral acordado con Operaciones.',
  },
];

export const ARCHITECTURE_CAVEAT =
  'Arquitectura conceptual: no describe la red existente ni autoriza compras. Evitar que una cámara PTZ sea la única cobertura de un tramo permanente; validar solape con cámaras fijas.';

/** Medidas de ciberseguridad propuestas por el informe. */
export const CYBERSECURITY_MEASURES: readonly { title: string; detail: string }[] = [
  {
    title: 'Cuentas nominales y mínimo privilegio',
    detail:
      'Cada operador usa su propia credencial; los permisos siguen el rol (administrador, supervisor, operador, consulta).',
  },
  {
    title: 'Contraseñas únicas en bóveda',
    detail:
      'No se comparten credenciales de administración de cámaras, switches ni VMS; se guardan en bóveda y se rotan.',
  },
  {
    title: 'Administración remota por VPN o control de acceso',
    detail:
      'La administración se hace por VPN o control de acceso, con MFA cuando esté disponible.',
  },
  {
    title: 'Sin publicación directa en Internet',
    detail:
      'Las cámaras no se publican directamente en Internet: el acceso pasa por el VMS dentro de la red del cliente.',
  },
  {
    title: 'Segmentación y flujo mínimo',
    detail:
      'Segmentar cámaras y administración y permitir sólo los flujos necesarios entre segmentos.',
  },
  {
    title: 'Registro de accesos y respaldo de configuración',
    detail:
      'Registrar los accesos y respaldar la configuración antes de cada cambio, con plan de reversión.',
  },
];

/** Conclusiones del informe, en su orden original. */
export const CONCLUSIONS: readonly { number: number; title: string; detail: string }[] = [
  {
    number: 1,
    title: 'Conectividad y calidad son problemas distintos',
    detail:
      'La prueba diurna recuperó tres cámaras; cinco persistieron sin imagen. La respuesta del visor no permite dictaminar daño físico. Hay imágenes deficientes de día y noche, por lo que la iluminación no es la única causa posible.',
  },
  {
    number: 2,
    title: 'La modernización debe priorizar evidencia útil',
    detail:
      'El aumento de pantallas o megapíxeles no corrige postes, contenedores, enfoque ni falta de grabación. Primero deben recuperarse captura, cobertura y calidad; luego ampliar capacidad y centralizar operación.',
  },
  {
    number: 3,
    title: 'No se puede declarar el perímetro completamente cubierto',
    detail:
      'Faltan la vinculación IP-poste, orientación del plano, campos medidos y pruebas con objetivos. El registro de 36 cámaras no equivale a 36 posiciones comprobadas. La IP de C31 está duplicada entre Arica y Corola.',
  },
];

/** Criterios de aceptación propuestos para el cierre. */
export const ACCEPTANCE_CRITERIA: readonly { title: string; criterion: string }[] = [
  {
    title: 'Cobertura',
    criterion:
      'Recorrido de persona/vehículo por cada tramo y acceso, de día y noche. Registrar objetivo, distancia y si se distingue lo requerido.',
  },
  {
    title: 'Imagen y grabación',
    criterion:
      'Enfoque y contraste útiles; sin obstáculo en objetivo crítico. Revisar tanto imagen en vivo como grabación/exportación, no sólo snapshot.',
  },
  {
    title: 'Continuidad',
    criterion:
      'Ensayo propuesto de 72 horas con registro de pérdidas y recuperación; umbral permitido por acordar. No es resultado ya medido.',
  },
  {
    title: 'Tiempo y evidencia',
    criterion:
      'NTP común; objetivo propuesto de desfase máximo 2 segundos. Exportar evidencia con hora, cámara, integridad y reproducción independiente.',
  },
  {
    title: 'Operación y cierre',
    criterion:
      'Alertas verificadas; roles y backups probados; entrega de plano, inventario, claves por canal seguro, manuales y capacitación.',
  },
];

/** Conclusión de viabilidad condicionada. */
export const VIABILITY_CONCLUSION =
  'Conclusión de viabilidad condicionada: procede avanzar a levantamiento y corrección. La aprobación final del CCTV y del módulo requiere ensayos, ingeniería y actas firmadas; este documento no sustituye esos requisitos.';

/** Decisiones solicitadas al cliente. */
export const REQUESTED_DECISIONS: readonly string[] = [
  'Autorizar levantamiento físico, mantenimiento correctivo y pruebas controladas.',
  'Preparar cotizaciones de renovación selectiva y ampliación sólo después de cerrar ubicación, soporte, cobertura y capacidad.',
];

/** Nota sobre el acta de cambio incluida en el informe. */
export const CHANGE_ACT_NOTE =
  'El acta de cambio incluida es un formato sin firmas ni aprobación.';
