/**
 * Plan de intervención en cinco fases.
 *
 * Reproduce la tabla "Plan de intervención y cambios propuestos" del informe,
 * con el alcance, el entregable y el responsable propuestos en cada fase.
 */
export interface InterventionPhase {
  id: string;
  /** Número de fase (1 … 5). */
  number: number;
  title: string;
  /** Alcance tal como lo enuncia el informe. */
  scope: string;
  /** Entregable y responsable propuesto. */
  deliverable: string;
  /** Responsable principal propuesto. */
  owner: string;
  /** Condición que debe cumplirse para dar la fase por cerrada. */
  exitCriteria: string;
}

export const INTERVENTION_PHASES: readonly InterventionPhase[] = [
  {
    id: 'fase-1',
    number: 1,
    title: 'Levantar y recuperar',
    scope:
      '5 sin imagen; C08 intermitente; reloj de C02; inventario/postes/switches.',
    deliverable:
      'TI + integrador: diagnóstico con pruebas y plano trazable; Operaciones autoriza acceso.',
    owner: 'TI + integrador',
    exitCriteria:
      'Cada una de las 36 IP tiene vínculo con poste, serie, altura y dirección; las 5 cámaras sin imagen tienen diagnóstico documentado y el reloj de C02 sincronizado con NTP.',
  },
  {
    id: 'fase-2',
    number: 2,
    title: 'Corregir calidad',
    scope:
      '19 deficientes y 6 limitadas: óptica, foco, iluminación, perfiles y obstáculos.',
    deliverable:
      'Integrador: fotos antes/después, parámetros y comparación día/noche. Seguridad valida objetivo.',
    owner: 'Integrador',
    exitCriteria:
      'Cada cámara corregida repite la prueba diurna y nocturna con evidencia fotográfica antes/después y la Security valida el objetivo de vigilancia.',
  },
  {
    id: 'fase-3',
    number: 3,
    title: 'Renovar selectivamente',
    scope:
      'C24/C33 por ciclo de vida; otros sólo si no superan corrección o soporte es inadecuado.',
    deliverable:
      'TI + compras: ficha técnica, compatibilidad, garantía, soporte, costo y acta de cambio aprobada.',
    owner: 'TI + compras',
    exitCriteria:
      'Acta de cambio aprobada por equipo y sustituciones justificadas una a una: no se cambia una cámara por suciedad, bajo perfil o error HTTP.',
  },
  {
    id: 'fase-4',
    number: 4,
    title: 'Completar cobertura',
    scope: 'PC1-PC3 históricos y OC de fichas. Cantidad adicional por determinar.',
    deliverable:
      'Seguridad + integrador: recorrido, mapa de campos medidos y prueba sin zonas críticas ocultas.',
    owner: 'Seguridad + integrador',
    exitCriteria:
      'Recorrido de persona/vehículo por cada tramo y acceso, de día y noche, sin zonas críticas ocultas ni cobertura duplicada en exceso.',
  },
  {
    id: 'fase-5',
    number: 5,
    title: 'Integrar y aceptar',
    scope: 'VMS, grabación, red, energía, centro de monitoreo y formación.',
    deliverable:
      'Pruebas SAT, documentación conforme a obra y aceptación firmada con pendientes.',
    owner: 'TI + Operaciones + Seguridad',
    exitCriteria:
      'Pruebas SAT ejecutadas, documentación conforme a obra entregada y acta de aceptación firmada con la lista de pendientes abierta.',
  },
];

/** Regla de reemplazo enunciada por el informe. */
export const REPLACEMENT_RULE =
  'Suciedad, bajo perfil o error HTTP no justifican por sí solos cambiar una cámara. Escalar a sustitución cuando la prueba con alimentación/enlace conocidos, limpieza y ajuste deje un defecto persistente, o cuando soporte/compatibilidad no cumplan requisitos aprobados.';

/** Nota de ciclo de vida que obliga a revisar C24 y C33. */
export const LIFECYCLE_NOTE =
  'C24 y C33 figuran en inventario como SNO-L6083R; Hanwha MEA lo lista discontinuado y especifica 1920 × 1080. Eso no confirma años instalados ni fin de soporte local. C33 entregó 640 × 480: verificar perfil y modelo antes de comprar.';

/** Nota de compra y plazo. */
export const PROCUREMENT_NOTE =
  'Cotizar por separado mantenimiento, sustituciones justificadas, ampliación, red/energía, almacenamiento, licencias, módulo y soporte. No se establece un precio ni plazo de obra sin visitas, cantidades y aprobaciones. Conservar versión/configuración previa y plan de reversión para cada cambio.';
