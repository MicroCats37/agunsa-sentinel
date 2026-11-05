/**
 * Fuentes y trazabilidad del informe.
 *
 * `E` son fuentes de evidencia del cliente; `S` son referencias públicas
 * consultadas el 03/11/2026.
 */
export interface SourceRef {
  id: string;
  title: string;
  detail: string;
  url?: string;
  kind: 'evidencia' | 'referencia';
}

export const SOURCES: readonly SourceRef[] = [
  {
    id: 'E1',
    title: 'Inventario',
    detail:
      'RELACION DE CAMARAS - IMUPESA.xlsx: 37 filas y 36 IP únicas. Modelo y sector documentales; falta contraste con etiqueta física. C31 100.168.100.8 tiene doble asignación.',
    kind: 'evidencia',
  },
  {
    id: 'E2',
    title: 'Plano',
    detail:
      'PLANO DE CAMARAS PERIMETRICAS.pdf aportado por el cliente. Tres puntos ciegos anotados históricamente. Sin escala ni vínculo IP-poste validado.',
    kind: 'evidencia',
  },
  {
    id: 'E3',
    title: 'Sesiones de captura',
    detail:
      'JSON/CSV y JPEG originales de 02/11/2026 20:55-20:56 y 03/11/2026 14:47-14:48 Lima. Hashes por fotografía en el paquete. 28 + 31 = 59 imágenes.',
    kind: 'evidencia',
  },
  {
    id: 'E4',
    title: 'Centro de monitoreo',
    detail:
      'Imagen conceptual adjuntada por el cliente en esta solicitud. No equivale a memoria de cálculo, plano conforme a obra o cotización.',
    kind: 'evidencia',
  },
  {
    id: 'S1',
    title: 'ONVIF Profile T',
    detail: 'Perfil de vídeo en streaming y multidifusión.',
    url: 'https://www.onvif.org/profiles/profile-t/',
    kind: 'referencia',
  },
  {
    id: 'S2',
    title: 'ONVIF Profile G',
    detail: 'Perfil de grabación en el borde.',
    url: 'https://www.onvif.org/profiles/profile-g/',
    kind: 'referencia',
  },
  {
    id: 'S3',
    title: 'ONVIF Conformant Products',
    detail: 'La conformidad se verifica por modelo y versión de firmware/software.',
    url: 'https://www.onvif.org/conformant-products/',
    kind: 'referencia',
  },
  {
    id: 'S4',
    title: 'Hanwha SNO-L6083R',
    detail: 'Modelo discontinuado en esa página regional; soporte local por confirmar.',
    url: 'https://www.hanwhavision.com/mea/products/product-details/SNO-L6083R',
    kind: 'referencia',
  },
  {
    id: 'S5',
    title: 'NIST SP 800-215',
    detail:
      'Referencia de arquitectura segura de red; medidas concretas de CCTV propuestas por este informe.',
    url: 'https://csrc.nist.gov/pubs/sp/800/215/final',
    kind: 'referencia',
  },
];

export const SOURCE_BY_ID = new Map(SOURCES.map((source) => [source.id, source] as const));

/** Cierre de trazabilidad del informe. */
export const SOURCES_FOOTNOTE =
  'Fuentes web consultadas el 03/11/2026. Recomendaciones y cálculos de capacidad son propuestas de diseño, no mediciones del sistema ni certificaciones de cumplimiento.';
