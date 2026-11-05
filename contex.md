# Informe funcional — Plataforma de seguridad perimetral inteligente

**Proyecto:** Sistema de videovigilancia perimetral con inteligencia artificial  
**Alcance:** 36 cámaras IP industriales  
**Tecnología del mockup:** Next.js, React y TypeScript  
**Objetivo:** desarrollar una plataforma web interactiva para supervisión, detección, análisis y gestión de incidentes perimetrales.

---

## 1. Objetivo del software

Desarrollar una plataforma centralizada de seguridad perimetral que permita monitorear las cámaras de una instalación industrial, identificar situaciones anormales mediante inteligencia artificial y administrar las alertas generadas.

El sistema debe facilitar al personal de seguridad la identificación temprana de amenazas, la evaluación de incidentes y la revisión de evidencias.

El alcance inicial comprende exclusivamente las áreas perimetrales, accesos y zonas de aproximación a las instalaciones.

## 2. Funcionalidades de inteligencia artificial

### A. Detección de personas

- Identificación de personas dentro del campo visual de las cámaras.
- Detección de personas que ingresan a áreas restringidas.
- Cruce de líneas virtuales.
- Aproximación a cercos o barreras perimetrales.
- Ingreso desde una dirección no autorizada.
- Detección de grupos de personas.
- Presencia humana fuera de horarios habituales.

### B. Detección de vehículos

- Identificación de automóviles, camionetas, camiones y motocicletas.
- Detección de vehículos próximos al perímetro.
- Ingreso o salida por accesos no autorizados.
- Circulación en sentido contrario.
- Estacionamiento en zonas no habituales.
- Permanencia prolongada de vehículos.
- Aproximaciones repetidas a instalaciones sensibles.
- Reconocimiento de placas como módulo opcional.

### C. Detección de permanencia y merodeo

El sistema debe analizar cuánto tiempo permanece una persona o vehículo en determinada zona.

**Ejemplos:**

- Persona detenida durante más de 2 minutos junto al cerco.
- Vehículo estacionado durante 5 minutos en una zona poco habitual.
- Persona que se aproxima repetidamente al perímetro.
- Personas que recorren varias veces el mismo sector sin ingresar.

Los tiempos y condiciones deben ser configurables por cámara o zona. Una permanencia prolongada no implica necesariamente una amenaza.

### D. Comportamientos sospechosos

- Trayectorias de desplazamiento inusuales.
- Cambios bruscos de dirección.
- Carreras en áreas donde normalmente no existe tránsito.
- Aproximaciones reiteradas a cercos o portones.
- Concentraciones inusuales de personas.
- Posibles intentos de escalamiento de cercos.
- Posible manipulación de barreras, cerraduras o accesos.
- Posibles acciones de vandalismo.

Estas últimas funciones requieren modelos especializados, validación de precisión y confirmación de un operador.

### E. Detección de sabotaje o fallas de cámaras

- Pérdida de conexión.
- Obstrucción del lente.
- Cambios abruptos en el encuadre.
- Imagen completamente oscura.
- Congelamiento del vídeo.
- Fallas de transmisión.
- Cambios anormales de calidad de imagen.

Estas alertas deben diferenciarse de los incidentes de seguridad.

---

## 3. Módulos del sistema web

### Módulo 1. Dashboard principal

Pantalla de resumen general de la seguridad de la instalación.

**Elementos:**

- Total de cámaras instaladas.
- Cámaras conectadas, desconectadas o con fallas.
- Incidentes activos.
- Alertas críticas.
- Personas y vehículos detectados.
- Eventos recientes.
- Gráficos de incidentes por hora y día.
- Distribución de incidentes por zona.
- Estado general del sistema.

Debe permitir navegar directamente desde una alerta hacia la cámara o incidente correspondiente.

### Módulo 2. Centro de videovigilancia

Interfaz de monitoreo de las 36 cámaras.

**Funcionalidades:**

- Visualización en cuadrículas de 1, 4, 9 o 16 cámaras.
- Paginación y selección de cámaras.
- Pantalla completa.
- Selección por zonas o sectores.
- Indicadores de conexión.
- Identificación visual de cámaras con alertas.
- Vista detallada de cada cámara.
- Superposición de cuadros de detección de personas y vehículos.
- Visualización de líneas virtuales y áreas de vigilancia.
- Acceso al historial de eventos de una cámara.

Para el mockup se utilizarán vídeos demostrativos o imágenes de referencia. No será necesario conectar flujos RTSP reales.

### Módulo 3. Mapa de seguridad perimetral

Mostrar una representación de las instalaciones industriales.

**Funcionalidades:**

- Plano 2D de la instalación.
- Ubicación de las 36 cámaras.
- Sectores o zonas perimetrales.
- Colores de estado por cámara.
- Visualización de alertas sobre el mapa.
- Selección de una cámara desde su ubicación.
- Identificación de zonas con mayor concentración de incidentes.
- Acceso directo al vídeo o detalle del evento.

Se podrá utilizar inicialmente un plano industrial ficticio para demostrar el funcionamiento.

### Módulo 4. Gestión de incidentes y alertas

Centralizar los eventos detectados.

Cada incidente debe incluir:

- Identificador único.
- Fecha y hora.
- Cámara y zona.
- Tipo de incidente.
- Nivel de severidad.
- Confianza del modelo, cuando corresponda.
- Imagen de evidencia.
- Clip de vídeo disponible.
- Estado del incidente.
- Operador responsable.
- Observaciones.

**Estados de gestión:**

1. Nuevo.
2. En revisión.
3. Confirmado.
4. Descartado.
5. En atención.
6. Resuelto.

Se debe permitir filtrar por cámara, fecha, severidad, categoría y estado.

Un operador debe poder confirmar o descartar una detección, asignarse el incidente, registrar observaciones y cerrar su atención.

### Módulo 5. Configuración de zonas inteligentes

Permitir definir gráficamente las condiciones de vigilancia.

**Herramientas:**

- Dibujar polígonos sobre la imagen de una cámara.
- Crear líneas virtuales.
- Configurar direcciones de cruce.
- Definir zonas restringidas.
- Crear zonas de permanencia.
- Configurar tiempos máximos permitidos.
- Establecer horarios de vigilancia.
- Habilitar o deshabilitar reglas por cámara.

Ejemplo: definir una zona de aproximación frente a un cerco y generar una alerta cuando una persona permanezca allí más de 120 segundos.

### Módulo 6. Motor de reglas de seguridad

Administrar las reglas que producen alertas.

**Reglas configurables:**

- Tipo de objeto: persona o vehículo.
- Cámara o zona aplicable.
- Evento esperado.
- Horario de aplicación.
- Tiempo mínimo de permanencia.
- Dirección de desplazamiento.
- Nivel de severidad.
- Tiempo de espera para evitar alertas repetidas.
- Canal de notificación.

Ejemplo: si se detecta una persona cruzando una línea virtual de ingreso entre las 22:00 y las 06:00, generar una alerta crítica.

### Módulo 7. Análisis estadístico y reportes

- Cantidad de incidentes por período.
- Clasificación por categoría.
- Zonas con mayor actividad.
- Horarios con más incidentes.
- Frecuencia de eventos por cámara.
- Alertas confirmadas y descartadas.
- Tiempo promedio de atención.
- Exportación de reportes en PDF y Excel, para la versión definitiva.

### Módulo 8. Administración del sistema

- Registro de cámaras.
- Organización de sectores.
- Estado de servicios de vídeo e IA.
- Administración de usuarios.
- Roles y permisos.
- Configuración de notificaciones.
- Historial de acciones.
- Auditoría de cambios.

**Roles iniciales:**

- Administrador: configuración completa.
- Supervisor: análisis y gestión de incidentes.
- Operador: monitoreo y atención de alertas.
- Consulta: acceso de solo lectura.

---

## 4. Niveles de prioridad

| Funcionalidad | Prioridad |
|---|---|
| Dashboard de seguridad | Alta |
| Monitoreo de cámaras | Alta |
| Detección de personas y vehículos | Alta |
| Cruce de líneas virtuales | Alta |
| Permanencia inusual | Alta |
| Alertas y gestión de incidentes | Alta |
| Mapa de cámaras | Alta |
| Configuración de zonas y reglas | Alta |
| Detección de vehículos estacionados | Media |
| Merodeo y trayectorias repetitivas | Media |
| Estadísticas y reportes | Media |
| Detección de sabotaje de cámaras | Media |
| Escalamiento de cercos | Avanzada |
| Manipulación de estructuras | Avanzada |
| Reconocimiento de placas | Opcional |
| Reconocimiento de vandalismo | Avanzada |

Las funcionalidades avanzadas pueden aparecer en el mockup como demostraciones simuladas, sin considerarse capacidades de IA ya implementadas.

---

## 5. Requerimientos del mockup en Next.js

El agente deberá desarrollar una aplicación web navegable y visualmente representativa de un centro de control industrial.

**Stack propuesto:**

- Next.js con App Router.
- React y TypeScript.
- Tailwind CSS.
- Componentes de interfaz con shadcn/ui.
- Lucide Icons.
- Recharts para estadísticas.
- Zustand para estados compartidos, si es necesario.
- Datos simulados en archivos TypeScript o JSON.

### Pantallas mínimas

| Ruta | Pantalla |
|---|---|
| `/dashboard` | Resumen principal |
| `/monitoreo` | Centro de cámaras |
| `/monitoreo/[id]` | Detalle de cámara |
| `/mapa` | Plano perimetral |
| `/incidentes` | Listado de incidentes |
| `/incidentes/[id]` | Gestión del incidente |
| `/analitica` | Estadísticas |
| `/configuracion/camaras` | Administración de cámaras |
| `/configuracion/zonas` | Zonas y líneas virtuales |
| `/configuracion/reglas` | Motor de reglas |
| `/configuracion/usuarios` | Usuarios y roles |

### Datos simulados

Crear inicialmente:

- 36 cámaras distribuidas en sectores perimetrales.
- Cámaras en diferentes estados: activas, inactivas y con alertas.
- Personas y vehículos detectados.
- Incidentes históricos.
- Alertas recientes de distintos niveles.
- Zonas restringidas y zonas de permanencia.
- Reglas configurables.
- Datos estadísticos para gráficos.
- Operadores y usuarios ficticios.

### Interacciones obligatorias

El mockup no debe limitarse a imágenes estáticas.

**Simulación de incidentes:**

Incluir un botón de demostración que permita seleccionar un incidente y una cámara, por ejemplo, *Persona merodeando en el sector norte*.

Al ejecutarlo, el sistema deberá:

1. Generar un incidente simulado.
2. Actualizar los indicadores del dashboard.
3. Mostrar una notificación visual.
4. Resaltar la cámara involucrada.
5. Incorporar el incidente al listado.
6. Permitir acceder a su detalle.
7. Permitir al operador confirmar, descartar o resolver el evento.

**Otras interacciones:**

- Cambiar entre cuadrículas de cámaras.
- Seleccionar cámaras en el mapa.
- Aplicar filtros de incidentes.
- Modificar reglas y tiempos de permanencia.
- Dibujar visualmente zonas de detección.
- Cambiar el estado de un incidente.
- Actualizar estadísticas a partir de los datos simulados.

Los cambios del mockup pueden mantenerse en el almacenamiento local del navegador. Los elementos de demostración deben identificarse como simulados.

---

## 6. Diseño visual esperado

El sistema debe transmitir la apariencia de una plataforma profesional de seguridad industrial.

**Características:**

- Tema oscuro como apariencia principal.
- Barra lateral de navegación.
- Dashboard con indicadores y gráficos.
- Panel de cámaras con estética de videovigilancia profesional.
- Rojo para alertas críticas.
- Ámbar para advertencias.
- Verde para operación normal.
- Azul para información y acciones.
- Notificaciones tipo toast.
- Tablas con filtros y búsqueda.
- Diseño responsive, priorizando escritorio y pantallas grandes.

El centro de monitoreo debe permitir visualizar rápidamente qué cámaras requieren atención, evitando que los elementos decorativos dificulten la operación.

---

## 7. Integración futura con el sistema real

El mockup debe mantener una separación clara entre la interfaz y las fuentes de datos, de modo que posteriormente puedan reemplazarse los datos simulados por servicios reales.

Arquitectura futura:

**Cámaras IP → MediaMTX / DeepStream → Detección IA → Motor de reglas → Backend Django → Next.js**

El frontend consumirá APIs para cámaras, zonas, reglas e incidentes, y utilizará WebSocket o SSE para recibir alertas en tiempo real.

Los vídeos podrán visualizarse mediante WebRTC, cuando exista infraestructura real conectada.

Las tareas de inferencia deberán ejecutarse fuera del navegador, utilizando los servidores con GPU NVIDIA L4.

---

## 8. Resultado esperado

Entregar un mockup funcional de una plataforma de seguridad perimetral con 36 cámaras simuladas, navegación completa y módulos operativos de demostración.

La aplicación deberá permitir presentar a una empresa industrial cómo funcionaría la solución, mostrar ejemplos de eventos y simular el proceso de atención de incidentes.

**Criterio principal de aceptación:** un usuario deberá poder recorrer el flujo completo desde una detección simulada en una cámara hasta la visualización de evidencia, evaluación, clasificación y cierre del incidente.

**Importante:** esta primera entrega representa una prueba de concepto de la interfaz y de los flujos operativos. No supone que los modelos de inteligencia artificial, la transmisión real de vídeo ni las integraciones industriales estén implementados.