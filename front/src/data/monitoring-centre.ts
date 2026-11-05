/**
 * Concepto del centro de monitoreo.
 *
 * Referencia de intención aportada por el cliente: dos contenedores de 20
 * pies, un nivel, diez pantallas, cuatro puestos de monitoreo y dos
 * administrativos. **No representa obra ejecutada ni diseño estructural
 * aprobado**: el informe corrige supuestos antes de convertir la imagen en un
 * expediente de implementación.
 */

export interface MonitoringCentreDatum {
  /** Dato de la referencia del cliente. */
  datum: string;
  /** Evaluación y condición de aprobación del informe. */
  assessment: string;
}

export const MONITORING_CENTRE_DATA: readonly MonitoringCentreDatum[] = [
  {
    datum: '6,058 × 4,876 m',
    assessment:
      'El producto es 29,54 m² de envolvente exterior, no área útil neta. Descontar muros, aislamiento, refuerzos, gabinete y circulaciones.',
  },
  {
    datum: 'Altura exterior 2,591 m',
    assessment:
      'No valida los 2,39 m interiores útiles. Medir después de piso, techo, aislamiento, luminarias y bandejas.',
  },
  {
    datum: 'Diez pantallas de 43 a 50 pulgadas en 5 × 2',
    assessment:
      'En formato 16:9, cinco pantallas de 43 pulgadas requieren aproximadamente 4,76 m de imagen; cinco de 50, 5,53 m. Añadir marcos, soportes, accesos y tolerancias. Verificar pared interior real y carga estructural.',
  },
  {
    datum: 'Pasillo aproximado 2,40 m',
    assessment:
      'No confirmado. Dibujar escritorios, sillas en uso, gabinete, puertas y evacuación con dimensiones interiores; la imagen no es un cálculo de accesibilidad.',
  },
  {
    datum: 'Gabinete 24U y dos equipos de aire',
    assessment:
      '24U no prueba capacidad suficiente. Inventariar U, profundidad, peso, disipación y mantenimiento. Calcular climatización por equipos/personas/sol y continuidad; no elegir BTU sólo por render.',
  },
  {
    datum: 'Unión de dos contenedores',
    assessment:
      'Aberturas y retiro de paredes requieren diseño estructural, refuerzos, anclajes, cimentación y revisión competente. Validar seguridad eléctrica, incendio y evacuación antes de habilitar.',
  },
];

/** Composición declarada del módulo. */
export const MONITORING_CENTRE_COMPOSITION = {
  containers: 2,
  containerType: '20 pies',
  levels: 1,
  screens: 10,
  screenInches: { min: 43, max: 50 },
  screenLayout: '5 × 2',
  monitoringPosts: 4,
  adminPosts: 2,
  corridorM: 2.4,
  cabinetU: 24,
  hvacUnits: 2,
  exteriorEnvelopeM2: 29.54,
  exteriorHeightM: 2.591,
  interiorHeightM: 2.39,
} as const;

/** Condición de viabilidad enunciada por el informe. */
export const MONITORING_CENTRE_CONDITION =
  'La propuesta es una alternativa conceptual. La modernización puede desarrollarse por etapas, pero el módulo no debe comprarse o modificarse con esta lámina como único plano. Exigir diseño dimensionado, cálculo de cargas, especialidades y presupuesto validado.';
