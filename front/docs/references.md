# Referencias de investigación — AGUNSA Sentinel

Material de apoyo para el pulido visual, la simulación de cámara y el render 3D.
Todo lo de aquí proviene de fuentes públicas (búsqueda web), no de copyrighted material.

---

## 1. Identidad visual AGUNSA

**AGUNSA = Agencias Universiales S.A.** — multinacional chilena de agenciamiento marítimo y
logística portuaria, con operación en Panamá (Torre BICSA, Zona Libre de Colón).

| Elemento        | Guía                                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Color dominante | **Azul marino / azul corporativo** — serio, seguro,faq maritime. Es el color de marca y debe ser el acento de la plataforma.  |
| Neutros         | Blanco y gris como base de fondos y soporte de legibilidad. Estética minimalista.                                             |
| Acentos         | Detalles sutiles en tonos claros o grises metálicos para marcar apartados tecnológicos.                                       |
| Logotipo        | Tipográfico, **AGUNSA en mayúsculas**, trazo recto, aspecto industrial/corporativo. Nada de iconos redondeados ni degradados. |
| Contexto        | Marítimo, puerto, contenedores,frastructure portuaria, logística.                                                             |

**Implicación para el producto:** el azul marino AGUNSA debe ser el acento de acciones y
selección (hoy la app usa un azul genérico). Los colores de severidad se mantienen
(rojo crítico / ámbar advertencia / verde normal) porque son semántica operativa, no marca.
El 3D debe usar azul marino, acero y grisHormigón — no negro.

---

## 2. Patrones de UI de videovigilancia real (Hikvision iVMS-4200 / NVR web)

Lo que hace un centro de control real y qué debe replicar el mockup:

| Patrón real                                        | Implementación en el mockup                                                                                                             |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Grid de live view con 1/4/9/16 divisiones          | Ya existe en `/monitoreo`. Las celdas son "ventanas" independientes.                                                                    |
| OSD dentro del vídeo                               | Sobre la imagen: nombre de canal, fecha/hora, resolución/fps, estado REC, nivel de señal.                                               |
| Toolbar flotante al pasar el mouse sobre una celda | Acciones rápidas: reproducción instantánea, captura (snapshot), zoom digital, PTZ, audio. Aparece sobre la celda, no en un menú aparte. |
| Árbol de cámaras a la izquierda                    | Filtrado por sector/grupo, con contadores de estado.                                                                                    |
| Paneles plegables                                  | El operador puede colapsar el árbol o paneles para maximizar el grid.                                                                   |
| Snapping de ventanas                               | Las celdas se posicionan con snap; hay un modo "pantalla completa" por cámara.                                                          |
| Colores de estado del border de la celda           | Verde = operativa, ámbar = atención, rojo = alerta crítica, gris = desconectada.                                                        |
| Split screen con arrastrar-y-soltar                | No obligatorio, pero la selección de cámara desde el mapa debe abrir la celda correspondiente.                                          |

Detalle de la toolbar por celda (iVMS): _Instant playback · Snapshot · Digital zoom · Local
recording · Audio · Full screen_. Iconos pequeños, monocromos, en la esquina inferior derecha
de la celda, visibles solo en hover.

---

## 3. Ficha técnica de una IP 4MP (base para simular cada cámara)

Valores de referencia de una cámara IP industrial 4MP fija (bullet/domo), suficientes para que
cada cámara del mockup tenga specs plausibles y distintas entre sí:

### Sensor e imagen

- Sensor CMOS 1/2.7" progressive scan
- **Resolución 2560×1440 (4 MP)**, stream principal 25/30 fps; sub-stream 720p
- Iluminación mínima 0.005 lux (F1.6, AGC on); 0 lux con IR encendido
- Obturador 1/3 s – 1/100 000 s
- **Filtro IR-cut con conmutación automática (ICR)** → día color / noche IR monocromo
- **WDR real ≥ 120 dB** (o DWDR digital)
- BLC, HLC, DNR 3D, balance de blancos auto/manual, gain, defog, rotación de imagen

### Lente

- Fija 2.8 mm / 3.6 mm / 4 mm (o varifocal motorizada 2.8–12 mm)
- **FOV horizontal ~100° con 2.8 mm**; ~70° con 3.6 mm; ~55° con 4 mm
- Apertura máxima F1.6

### IR

- Distancia IR 30 m (dome) / 50 m (bullet), 850 nm
- **Smart IR**: ajusta la intensidad para evitar sobreexposición de objetos cercanos

### Codificación y overlay

- H.265+ / H.265 / H.264+ / H.264 / MJPEG, multistream
- Control de bitrate CBR / VBR
- **OSD**: texto personalizado + timestamp + nombre de canal sobre el stream
- Privacy masking: hasta 4 polígonos; ROI fijo (1–4 zonas)

### Red

- 1× RJ45 10/100 autosadaptable
- IPv4/IPv6, HTTP(S), TCP/IP, UDP, DHCP, DNS, NTP, **RTSP**, SMTP, FTP, QoS, UPnP
- **ONVIF Profile S/G/T**, CGI, SDK
- 32 usuarios en 3 niveles

### Alimentación y entorno

- 12 V DC ±25 %, **PoE IEEE 802.3af Clase 3**
- Consumo máx. 6.5 W (10 W con IR encendido)
- **IP67 / IP66**, IK10 en domos antivandálicos
- −30 °C a +60 °C, humedad ≤ 95 %
- Carcasa metal / aleación de aluminio; ~0.45–0.65 kg

---

## 4. Cómo se simula una cámara en el canvas

El feed no es un fondo estático: es una **simulación del comportamiento de la cámara**.

| Comportamiento         | Cómo se simula                                                                                                                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modo día / noche       | Según la hora simulada (el reloj de la plataforma). Con IR activo: imagen monocroma (verde o gris), halos de iluminador IR, más ruido, menos contraste. Con ICR: conmutación visible con un leve fundido. |
| FOV por lente          | La lente 2.8 mm muestra más escena que la 4 mm. El encuadre del canvas debe cambiar según la spec de la cámara.                                                                                           |
| Smart IR               | Objetos cerca de la cámara reciben menos IR → se ven "quemados" si no se simula el ajuste. Implementar caída de exposición.                                                                               |
| WDR ≥120 dB            | Escenas con contraste fuerte (cielo/nave vs. sombra) se comprimen en las altas luces: las luces no saturan a blanco puro.                                                                                 |
| Ruido / grano          | Aumenta con la noche y con menos lux;Lower con WDR activo.                                                                                                                                                |
| Detección IA           | Siluetas que se mueven por rutas coherentes con la cámara (peatones en vereda, vehículos en vía de acceso). Cada detección lleva caja, clase y **confianza**.                                             |
| Recorrido (tracking)   | La caja sigue al objeto con histórico/trail. Al cruzar una línea virtual se dispara la regla.                                                                                                             |
| OSD                    | Canal, timestamp de la hora simulada, resolución, fps, REC, nivel de señal, IR. Estilo real: esquina superior izquierda nombre, inferior derecha timestamp.                                               |
| Interrupción de cámara | Para cámaras con falla: congelación, imagen oscura, o pérdida de señal con ruido de nieve — y ese estado debe ser distinguible de un incidente de seguridad.                                              |
| Movimiento por sector  | Los sectores tienen escenas distintas: cerco perimetral, portón, patio de maniobras, interior de almacén, estacionamiento.                                                                                |

---

## 5. Render 3D de la instalación (vista 3D del mapa)

Requisitos de calidad, deducidos de lo anterior:

| Requisito            | Detalle                                                                                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Encuadre             | La cámara inicial debe mostrar **toda la instalación** (cerco, naves, patios), no una esquina. Calcular bounding box del terreno y derivar posición/distancia de cámara a partir de él. |
| Iluminación          | Un sol direccional con sombras (8400K frío o 5500K), hemisférica de relleno, materiales con roughness/metalness para que las naves no se lean como siluetas negras.                     |
| Paleta               | Azul marino AGUNSA, acero, hormigón, con acento en el iluminador de las cámaras. Nada de negro puro en superficies.                                                                     |
| Marcadores de cámara | 36 modelos de cámara 3D pequeños (cuerpo + soporte), coloreados por estado, con halo/emissive en las que están en alerta.                                                               |
| Cono de visión       | Cada cámara proyecta un **wedge translúcido según su heading y su FOV real** (derivado del spec de lente). Esto es lo que convierte el 3D en información y no en decoración.            |
| Interacción          | Raycast para seleccionar; clic en marcador → panel lateral con la cámara; hover → highlight.                                                                                            |
| Dinámica             | Auto-rotación lenta cuando está inactivo, parada al interactuar; transición suave entre vista 2D y 3D.                                                                                  |
| Post                 | Bloom sutil en los emisivos + viñeta. Sin abusar.                                                                                                                                       |
