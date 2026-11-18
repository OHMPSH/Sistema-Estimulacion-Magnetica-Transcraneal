# 16 — Evolución y cambios

Este documento reconstruye la evolución del SAVD para que pueda contrastarse con cualquier texto anterior de la tesis: una cronología con fechas y commits, una tabla «antes → ahora → motivo» con todos los cambios relevantes, la lista de términos obsoletos con su equivalente actual, los hallazgos de la auditoría inicial y cómo se resolvieron, y las contradicciones encontradas entre la documentación del proyecto y el código vigente (en caso de contradicción, manda el código). No se indicó la fecha del último avance de tesis, por lo que todos los cambios llevan su fecha para que el revisor sitúe cuáles son posteriores.

---

## 1. Cronología

Las fechas son las de los commits de git y las horas, del centro de México (UTC−6), salvo que se indique UTC; la base de datos guarda las horas en UTC, por lo que una sesión de la tarde-noche local aparece con la fecha del día siguiente en UTC. «Sin registrar» indica cambios presentes en la copia de trabajo que aún no tienen commit.

| Fecha | Commit | Hito |
|---|---|---|
| 12 jun 2026 | — | Primera sesión simulada guardada en la base local (versión inicial, simulación en el navegador) |
| 14 jun 2026 | `22d3e7f` | **Primer commit:** frontend React (dashboard con gráfica de líneas, mapa 3D de flechas, superficie de Plotly, tabla, KPI, historial), backend Express MVC mínimo (sesiones y mediciones, sin autenticación), configuración de Nginx y guía de instalación |
| 14 jun 2026 | `9b01e47` | Configuración de despliegue de producción con Nginx y systemd |
| 22 jun 2026 | `d142de9` | README original («Sistema Automatizado de Adquisición y Visualización de Datos», Pico 2 W, filtro MFB de Bessel) |
| 9 nov 2026 | `0538f54`, `f53fbf8` | Commits de prueba |
| 9 nov 2026 | `010cb13` | **Fase 1:** base del backend |
| 9 nov 2026 | `f158ab0` | **Fase 2:** inicio de sesión, usuarios y roles |
| 10 nov 2026 | `97fb8d3` | **Fase 3:** configuración, modos de operación y simulador en el servidor |
| 10 nov 2026 | `4fde037` | **Fases 4 a 8:** Pico W como cliente, trazabilidad, frontend funcional, accesibilidad y diseño, pruebas y despliegue |
| 10 nov 2026 | `9c63c8e` | Paso libre (migración 006) y zona de muestreo por sesión (migración 007) |
| 10 nov 2026 | `d694dbc`, `582427a` | Integración de la rama `chore/dev-script` (script de desarrollo) |
| 10 nov 2026 | `4d6658a` | **Firmware completo de la Pico W** en MicroPython (para un HMC5883L; PIO + DMA, homing con finales de carrera, barrido fila por fila) |
| 10 nov 2026 | `b5116c8`, `e21b706` | Programa de calibración de la mesa y calibración de la velocidad (50 pulsos/mm, pulsos simétricos) |
| 11 nov 2026 | `f1e1d76` | **Firmware del Hall 49E** (`firmware_hall_1d/`), sin finales de carrera, con límites de 410, 562 y 88 mm |
| 12 nov 2026 | `27530e3` | **Descubrimiento del QMC5883P**: programas de prueba del QMC5883P; se borran las pruebas del HMC5883L y la biblioteca de Arduino |
| 11 nov 2026, 18:50–19:20 (12 nov, 00:50–01:20 UTC) | — | Primeras sesiones reales en la mesa con el Hall 49E (sesiones 59 a 65) |
| 12 nov 2026, 14:13–14:17 | — | Sesiones reales 66 y 67 con el firmware principal y el QMC5883P |
| 13 nov 2026 | `bd5af92` | Firmware cliente con QMC5883P y **serpentina**; servidor con dos modelos de sensor (migración 008) y serpentina; **mapa 3D de puntos medidos**; **cierre automático** de las sesiones reales; colores de los datos Okabe–Ito |
| 13 nov 2026, 15:33–17:26 | — | Barridos completos con el QMC5883P en la mesa (sesiones 69, 72, 73 y 74) y paso fino de 3 mm (sesión 75, interrumpida) |
| 13 nov 2026 | Sin registrar | **Punto de inicio de la medición** (migración 009 y Configuración › General); **sábana 3D** con estilo de figura científica; **tiempo estimado**; firmware 2.1 con X ↔ Y intercambiados, posición de arranque (0, 410, 88) y sentidos (+1, −1, −1) |
| 13–14 nov 2026 | Sin registrar | Firmware 2.2: se deshace el intercambio X ↔ Y (X corto, Y largo), descanso en (0, 562, 88), inicio en el origen, sentidos (+1, +1, +1) y orden de movimiento de los ejes. Pruebas cortas en la mesa con las versiones 2.0, 2.1 y 2.2 (sesiones 76 a 82, del 13 nov a las 18:22 al 13 nov a las 19:15; 14 nov 00:22–01:15 UTC) |
| Posterior (sin registrar) | Sin registrar | La posición de descanso del firmware vuelve a **(0, 0, 0)** («(0, 562, 88) mandaba Y y Z contra su tope»), sin cambiar la versión `pico-tms-2.2` |

---

## 2. Tabla «antes → ahora → motivo»

### 2.1 Hardware y sensores

| Antes | Ahora | Motivo |
|---|---|---|
| Raspberry Pi **Pico 2 W** (README original y nombre de un commit) | Raspberry Pi **Pico W** (RP2040) | Es el microcontrolador disponible; la Pico 2 W usa otro chip (RP2350) |
| Firmware en «C++ / MicroPython» | Solo **MicroPython** ≥ 1.22 | Un solo lenguaje; MicroPython da acceso al PIO y al DMA del RP2040 |
| Acondicionamiento analógico con un **filtro activo MFB de Bessel** | Sin etapa analógica: el QMC5883P es digital (I²C) y el Hall 49E se lee directamente en el ADC con promediado de 256 muestras | No se implementó; los sensores de prueba no la necesitan |
| «Sensor Hall» de tres ejes (simulación inicial) y luego magnetómetro **HMC5883L** (0x1E) | Magnetómetro **QMC5883P** (0x2C) como sensor principal de prueba, y **Hall 49E** de un eje como alternativa | El módulo comprado como HMC5883L resultó ser un QMC5883P; el Hall permitió probar el sistema mientras tanto |
| Rango del HMC5883L de 1,3 Ga | 1,9 Ga para el HMC5883L (10 nov) y, desde el 12 nov, QMC5883P en **30 G** por defecto | Con 1,3 Ga saturaban 4 de los 845 puntos simulados; el QMC5883P real admite hasta 30 G |
| Saturación indicada por −4096 | Bit **OVFL** del QMC5883P en el campo `saturado`; −4096 solo en el formato HMC5883L | Así funciona el chip real |
| Homing con **finales de carrera** (firmware del 10 nov) | **Sin finales de carrera**: la posición al arrancar se toma como referencia («posición de descanso»), con límites de software | Los interruptores no están instalados; el código de homing con finales se conserva |
| Pines y recorridos «pendientes» | X: GP10/GP11, 0–410 mm (eje corto); Y: GP12/GP13, 0–562 mm (eje largo); Z: GP14/GP15, 0–88 mm; ENA común GP16 | Medidos con el programa de calibración |
| Asignación de ejes intercambiada (13 nov: X largo, Y corto) | Desde el 14 nov, X corto e Y largo, igual que el programa de calibración | Unificar los nombres con la calibración y el instructivo |
| Posición de arranque = origen (12 nov) → (0, 410, 88) (13 nov) → (0, 562, 88) (14 nov) | **(0, 0, 0)** en el código vigente | La mesa real descansa en un extremo; (0, 562, 88) mandaba Y y Z contra su tope |
| Sentidos de la zona (+1, −1, −1) (13 nov) | **(+1, +1, +1)**: X+, Y+, Z+, con $z = 0$ como el plano más bajo | Medir desde el origen hacia dentro de la mesa |
| Pulsos de paso cortos (10 µs) y factor teórico de 200 pulsos/mm (1/8 de micropaso) | Pulsos **simétricos** largos y **50 pulsos/mm** (400 pulsos por vuelta) | Con 3,3 V, el optoacoplador del TB6600 no respondía a pulsos cortos; calibración con la mesa real |
| Eje Z manual con un botón (GP21) por plano | Z con motor (`MODO_Z = "motor"`) o sin eje Z (`"ninguno"`) | La mesa tiene motor en Z |
| Watchdog y `machine.reset()` | Sin reinicios automáticos | Un reinicio tomaría como referencia la posición en que quedó la mesa |
| Sin compensación de holgura | Aproximación unidireccional con 0,5 mm por eje | Alcanzar cada punto siempre desde el mismo lado |

### 2.2 Adquisición, protocolo y servidor

| Antes | Ahora | Motivo |
|---|---|---|
| **Simulación en el navegador** (`useAcquisition`, `setInterval`) que enviaba cada muestra con `POST /api/mediciones` | **Simulador en el servidor** que usa el mismo servicio de ingesta que las lecturas reales; el navegador nunca genera datos | Una sola fuente de datos; todos los navegadores ven lo mismo; no se mezclan datos simulados y reales |
| Física aproximada con un denominador $(R^2 + r^2 + z^2)^{3/2}$ y ruido uniforme sin semilla; valores redondeados a 4 decimales antes de guardar | **Espira circular exacta** con integrales elípticas $K(m)$ y $E(m)$ por AGM, ruido gaussiano (Box–Muller) con semilla (mulberry32), sin redondear | Exactitud física, reproducibilidad y precisión (verificado contra la fórmula analítica en el eje con error < $10^{-9}$) |
| `POST /api/mediciones` sin autenticación | Retirada (responde **410**); la Pico envía **lotes** a `POST /api/dispositivo/mediciones` con **token** | Seguridad e integridad |
| Sin noción de dispositivo | Tabla `dispositivos`, token como SHA-256, **latido** cada 5 s con la sesión activa, estado «en línea / sin señal», estado y error informados por la Pico | Control y supervisión del hardware |
| Sin numeración de lecturas | **`seq`** por sesión e índice único `(sesion_id, seq)`: ingesta idempotente y reanudación tras un reinicio | Robustez ante pérdidas de red |
| La Pico enviaba unidades físicas (ejemplo inicial) | La Pico envía **cuentas crudas** y el servidor convierte con la copia del sensor de la sesión | Trazabilidad; la calibración puede cambiar sin tocar el firmware |
| Varias sesiones abiertas posibles; sesiones abiertas tras un reinicio | **Una sola sesión abierta** (cola de promesas, 409); **cierre de huérfanas** al arrancar | Evitar datos mezclados |
| Sesiones reales cerradas a mano por el operador | **Cierre automático** al recibir todos los `seq` esperados (13 nov) | El botón «Detener» seguía activo al terminar |
| Recorrido **fila por fila** (X, luego Y, luego Z) en el simulador y en el firmware del 10 nov (y en el firmware del Hall) | **Serpentina** en el firmware, el servidor, el simulador, el emulador y la interfaz (12–13 nov) | Desplazamientos mínimos; entre puntos consecutivos solo cambia un índice en ±1 |
| Zona centrada bajo la bobina con `X_BOBINA_MM` (firmware del 10 nov) → origen de zona fijo `ORIGEN_ZONA_*_MM` (11–12 nov) | **Punto de inicio de la medición** configurable por un administrador, copiado con cada sesión real y enviado a la Pico (13 nov) | Elegir en qué parte de la mesa se mide sin recompilar el firmware |
| Saturación de un eje rechazada con 422 | Lectura **guardada y marcada** como saturada (componentes nulas, crudos conservados) | No perder información; los huecos se calculan después |
| Estado de la Pico visible solo en modo real | Visible en los dos modos, con el estado (espera, homing, midiendo, error) y el error | Ver que la Pico está conectada aunque el sistema esté en simulación |
| Sin metadatos de reproducibilidad | Copias de configuración, semilla, versiones de software (con commit) y firmware, usuario, puntos esperados y recibidos, huecos | Trazabilidad científica |
| Sin login | **Login con roles** (admin, operador, observador), scrypt, cookie `HttpOnly`/`SameSite=Strict`, límite de intentos | La auditoría encontró inserción y borrado sin autenticación |
| Cookie con duración de 12 h (`Max-Age`) | Cookie de sesión del navegador (sin `Max-Age`), expiración de 12 h en el servidor y **inicio de sesión obligatorio en cada pestaña** | Pedido del tesista: cada pestaña o navegador nuevo pide credenciales |
| Constantes fijas en el frontend (`constants/system.js`) | **Configuración en la base de datos**, editable por un administrador y difundida por SSE | Ajustar sin recompilar |
| SSE sin identificadores | SSE con `id`, búfer de 2 000 eventos, `Last-Event-ID`, `retry` y resincronización | No perder eventos al reconectarse |
| Borrado físico de sesiones | **Borrado lógico** con restauración | Evitar pérdidas por error |
| CSV generado en el navegador sin metadatos | **CSV en el servidor**, en *streaming*, con encabezado de metadatos y columnas con unidades | Trazabilidad |
| Errores 500 por CORS detrás de Nginx; rutas que no coincidían con el proxy | CORS sin errores; router montado en `/api` y en `/` | Funcionar detrás de Nginx sin modificar su configuración |

### 2.3 Base de datos

| Antes | Ahora | Motivo |
|---|---|---|
| Dos tablas: `sesiones(id, modo, iniciada_en, terminada_en)` y `mediciones` con FLOAT y todas las columnas obligatorias | Seis tablas (`usuarios`, `sesiones_login`, `sesiones`, `mediciones`, `configuracion`, `dispositivos`); campo en **DOUBLE**; componentes que admiten nulos (saturación); crudos, `seq`, `saturado` y hora del dispositivo | Precisión, saturación, trazabilidad e idempotencia |
| Sesiones en hora local y mediciones en UTC | **Todo en UTC** | El CSV salía desfasado 6 h |
| Usuario de la aplicación con `ALL PRIVILEGES` y contraseña escrita en el script | Permisos mínimos (`SELECT, INSERT, UPDATE, DELETE`); contraseña elegida al instalar y solo en `.env` | Seguridad |
| Paso fijo (5 mm), luego `TINYINT` con 5, 10 o 20 mm | `DECIMAL(4,1)`: paso libre con un decimal | Migración 006 |
| Placa fija de 60 × 60 mm y Z de 0 a 20 mm (`grid_size_mm`, `z_max_mm`) | Zona por sesión (`zona_x/y/z_mm`) y límites de la base por eje (`limite_x/y/z_mm`) | Migración 007 |

### 2.4 Interfaz

| Antes | Ahora | Motivo |
|---|---|---|
| Paso fijo «0,5 cm» (malla de 13 × 13 × 5 = 845); después, botones de 0,5, 1 y 2 cm | **Paso libre en mm** escrito en un campo, con un botón de 5 mm | Necesidades del experimento |
| Malla siempre de 60 × 60 × 20 mm | **Zona de muestreo** X × Y × Z elegida por sesión, con «Toda la base» | Medir solo la región de interés |
| **Mapa 3D de flechas** (al principio con orientación especular $(x, z, y)$; desde la Fase 6, diestra y con flechas de 1,5 a 9 mm según $\|B\|$ relativo al máximo de la sesión) | **Mapa 3D de puntos medidos** (esferas coloreadas por plano), orientación diestra | Pedido del tesista: ver la cobertura del barrido; la magnitud la muestran la sábana y la gráfica |
| «**Superficie de \|B\| por plano**» con escala **Jet**, colores neón y escala configurable | «**Sábana 3D**»: \|B\| o una componente, huella máxima total o un plano, Viridis y RdBu simétrica, rango fijo por sesión, estilo de figura científica, exportación PNG y SVG, giro durante el barrido; también desde el historial | Figuras utilizables en la tesis, escalas perceptualmente uniformes |
| Gráfica de líneas con el eje X por muestra o por tiempo | Eje X = **índice del punto en la malla**: los huecos se ven como cortes | La gráfica anterior ocultaba los huecos |
| KPI con la posición del **siguiente** punto | KPI con la **última lectura recibida** | Corregir el desfase |
| Colores de los datos neón: $B_x$ cian #00E5FF, $B_y$ magenta #FF00C8, $B_z$ verde #00FFA3 (y en el tema claro de la Fase 7, $B_x$ #0062A8) | **Okabe–Ito** en los dos temas: $B_x$ #0072B2, $B_y$ #D55E00, $B_z$ #009E73; $\|B\|$ en el color del texto; planos en azul pizarra | Sobriedad para la tesis y legibilidad para personas con daltonismo; los neón quedan para los estados |
| Solo tema oscuro | Oscuro, **claro** y del sistema, con contraste AA | Uso en laboratorio con luz diurna y para las figuras |
| Plotly completo (paquete inicial de 5 746 kB) y fuentes desde una CDN | `plotly.js-gl3d-dist-min` en carga diferida (paquete inicial de 878,6 kB) y fuentes locales | Rendimiento y funcionamiento sin internet |
| Una sola página con un historial simple | Páginas con navegación en la URL, menú lateral, historial con filtros en el servidor, notas, borrado lógico y restauración, configuración por secciones, administración de usuarios | Requisitos multiusuario |
| Sin estimación de tiempo | **Tiempo estimado** del barrido (histórico y actual) | Planificar las mediciones reales, que tardan casi un segundo por punto |

### 2.5 Afirmaciones del texto original que conviene revisar

| Afirmación del README original | Situación actual |
|---|---|
| «Reduce el ciclo de mapeo topográfico de tres horas a treinta minutos» | No hay ninguna medición que lo respalde. Con el ritmo real medido (0,74 a 0,78 s por punto con paso de 10 mm), un barrido de 845 puntos duraría unos 10 a 11 minutos, pero no se ha realizado ninguno completo con el hardware |
| «Digitalización simultánea (3-DOF) de los tres ejes, orquestada por una instancia dedicada» | El QMC5883P mide los tres ejes internamente; la Pico promedia 10 lecturas por medición. No hay digitalización analógica concurrente |
| «Procesamiento en el borde (*edge computing*)» | La conversión a unidades físicas se hace en el **servidor**, a propósito, para conservar los crudos; la Pico solo promedia y numera |
| «Base de datos en tercera forma normal (3FN)» | El esquema está normalizado en sus tablas principales, pero guarda deliberadamente copias JSON de la configuración por sesión (desnormalización intencional para la reproducibilidad) |
| «C++ / MicroPython», «filtro MFB de Bessel», «Pico 2W» | Ver la tabla 2.1 |

---

## 3. Términos obsoletos y su equivalente actual

| Término anterior | Equivalente actual |
|---|---|
| Raspberry Pi Pico 2 W / Pico 2W | Raspberry Pi Pico W (RP2040) |
| HMC5883L (como sensor real) | QMC5883P; «HMC5883L» sobrevive solo como **formato de cuentas** del servidor que usa el firmware del Hall |
| Sensor Hall de tres ejes | QMC5883P (tres ejes) o Hall 49E (un eje) |
| Filtro MFB de Bessel, acondicionamiento analógico | No existe en el sistema actual |
| Sistema Automatizado de Adquisición y Visualización de Datos | Sistema de Adquisición y Visualización de Datos (SAVD / TMS) |
| Placa de 60 × 60 mm, malla de 13 × 13 | Zona de muestreo por sesión dentro de los límites de la base (60 × 60 × 20 mm por defecto) |
| Paso de 0,5 cm, 1 cm o 2 cm | Paso libre en mm (5, 10 y 20 mm son sugerencias) |
| `grid_n`, `grid_size_mm`, `z_max_mm` | `grid_nx`, `grid_ny`, `limite_x_mm`, `limite_y_mm`, `limite_z_mm` |
| `pasos_mm` (opciones de la configuración) | `pasos_sugeridos_mm`, `paso_min_mm`, `max_puntos_sesion` |
| `lsb_por_ga` como único factor | `cuentas_por_g` (QMC5883P) o `lsb_por_ga` (HMC5883L), según `sensor.modelo` |
| Superficie de \|B\| por plano | Sábana 3D |
| Mapa 3D de flechas / vectores | Mapa 3D de puntos medidos |
| Escala de color Jet | Viridis (\|B\|) y RdBu simétrica (componentes) |
| `POST /api/mediciones` | `POST /api/dispositivo/mediciones` (con token y por lotes) |
| Simulación en el navegador, `useAcquisition` | Simulador del servidor (`services/simulador.js`) y `useSesionActiva` |
| Origen de la zona, `X_BOBINA_MM`, `ORIGEN_ZONA_*_MM` | Punto de inicio de la medición (`general.inicio_medicion`, `sesion_activa.inicio_medicion`) |
| Posición de arranque / homing al origen | Posición de descanso (`POSICION_ARRANQUE_*_MM`); el «homing» sin finales de carrera es ir a esa posición |
| Recorrido raster / fila por fila / «x → y → z» | Serpentina |
| Eje Z manual, botón de Z | Eje Z con motor |
| Sesión real cerrada por el operador | Cierre automático al completar la malla (o manual con «Detener») |
| Rango de 1,3 Ga | QMC5883P en 30 G (HMC5883L en 1,9 Ga solo para el Hall) |

---

## 4. Hallazgos de la auditoría inicial y cómo se resolvieron

| Hallazgo | Resolución |
|---|---|
| Datos simulados y reales mezclados | `origen` por sesión, modo de operación bloqueado con una sesión abierta, etiqueta SIMULACIÓN, filtro por origen (Fases 3 y 5) |
| Unidades y calibración | µT en toda la API, cuentas crudas guardadas, conversión con ganancia y *offset* en el servidor, copia del sensor por sesión (Fases 3 a 5) |
| Pérdida silenciosa de muestras | `seq` idempotente con reintentos, huecos calculados y listados, SSE recuperable (Fases 4 a 6) |
| Inyección y borrado sin autenticación | Login con roles (Fase 2), token de la Pico (Fase 4), borrado lógico (Fase 5) |
| Simulador incorrecto | Espira exacta verificada contra la fórmula en el eje (Fase 3) |
| Ninguna prueba automatizada | 66 unitarias y 10 de integración hoy (Fase 8 y posteriores) |
| Sin metadatos de reproducibilidad | Configuración, semilla y versiones con cada sesión; CSV con encabezado (Fase 5) |
| Precisión float32 | DOUBLE para los datos nuevos (Fase 5); los antiguos conservan su error |
| Gráficas engañosas | Eje X por posición con huecos visibles, escala de color fija por sesión, orientación diestra (Fase 6) |
| Condiciones de carrera | Cola de sesiones, transacción con `FOR UPDATE` en los lotes, guardia contra doble inicio, respuestas viejas descartadas en el historial (Fases 3 a 6) |
| Ritmo marcado por el navegador | Ritmo marcado por el servidor o por la mesa (Fase 3) |
| Rendimiento | Un renderizado por cuadro, Plotly diferido, Three.js bajo demanda (Fase 6) |
| SSE sin identificadores y CSV sin metadatos | Resueltos en la Fase 5 |
| KPI desfasado | KPI con la última lectura (Fase 6) |
| Documentación y carpeta sobrante | Guía de instalación, README, documentos del firmware y del diseño; carpeta sobrante borrada (Fase 8) |

---

## 5. Contradicciones entre la documentación y el código

En todos los casos, el informe sigue al código.

| # | Tema | Documentación | Código vigente | Observación |
|---|---|---|---|---|
| 1 | **Posición de descanso de la mesa** | (0, 562, 88) en la bitácora de desarrollo, `firmware/README.md` (sección 3 y «Primera prueba»), el encabezado de `firmware/main.py`, `firmware/banco.py`, el comentario de la migración 009, `docs/firmware-pico-w.md` (1.3) y el instructivo; (0, 410, 88) en la introducción de `firmware/README.md` | **(0, 0, 0)** en `firmware/config.py` | Importante en la operación: la página de Configuración › General también muestra al usuario «La mesa descansa en (0, 562, 88)» (constante `DESCANSO_MM` del frontend). El comentario del cambio en `config.py` está fechado el 2026-11-15, posterior a la fecha de este informe; la versión del firmware no cambió (`pico-tms-2.2`) |
| 2 | Orden del regreso al descanso | `firmware/README.md`: el regreso «sube Z primero» | `Mesa.homing` mueve Z hasta su coordenada de descanso y luego X e Y; con el descanso en Z = 0, eso es **bajar** Z primero | La regla anticolisión se escribió para un descanso con Z arriba; conviene revisarla con el descanso actual |
| 3 | Pruebas con la mesa | `firmware/README.md` («Todavía no se ha probado en la Pico con la mesa y el QMC5883P»), `firmware_hall_1d/README.md` y la bitácora («sin probar en la mesa») | La base tiene 22 sesiones reales y el tesista confirma pruebas correctas con los dos firmwares | Los documentos no se actualizaron tras las pruebas |
| 4 | Cierre de las sesiones reales | `firmware_hall_1d/README.md`: «las sesiones reales no se cierran solas»; el firmware imprime «si el servidor no la cerró solo, ciérrala» | El servidor las cierra al completar la malla desde el 13 nov | Texto viejo sin efecto |
| 5 | Migraciones aplicadas en la base local | La bitácora dice que la 006, la 007 y la 008 **no** se aplicaron | El esquema y la configuración muestran aplicadas de la 002 a la 009 | Se aplicaron después de escribir esas notas |
| 6 | Número de pruebas unitarias | La bitácora (sección de ejecución y tabla de la auditoría) dice 53 | 66 al ejecutarlas | Pruebas añadidas después de la Fase 8 |
| 7 | README de la raíz | Sensor HMC5883L, «mapa 3D de flechas», «superficie de \|B\| por plano», `firmware/` como «ejemplo sin probar en hardware», placa fija de 60 × 60 | QMC5883P, mapa de puntos, sábana 3D, firmware completo, zona por sesión | README desactualizado |
| 8 | Guía de instalación (`COMANDOS.md`) | Sección 11: «orden de registros X, Z, Y del HMC5883L» y el ejemplo de cliente como firmware; árbol con `firmware/` como «ejemplo» | Firmware completo con el QMC5883P | Desactualizada en lo relativo a la Pico |
| 9 | Nombres de los ejes en el programa de calibración | `firmware/README.md` (sección 1): «usa los nombres viejos: su X es la Y del firmware» | Desde el 14 nov, los mismos nombres en los dos (la sección 2.1 del mismo README lo dice bien) | Contradicción interna del README |
| 10 | Orden de la malla en el servidor | `firmware/README.md` (sección 11): `geometria.js` «todavía recorre en raster» | El servidor usa la serpentina | Texto viejo |
| 11 | Micropasos y factor de conversión | El instructivo recomienda 1/8 de micropaso (1 600 pulsos/vuelta, 200 pulsos/mm) | 50 pulsos/mm (400 pulsos/vuelta) en el firmware y en el programa de calibración | Además, la tabla de interruptores DIP para 400 pulsos/vuelta difiere entre el instructivo y el comentario del programa de calibración; manda la serigrafía del propio driver |
| 12 | Encabezado del CSV | — | La línea `unidades` dice «raw en cuentas del HMC5883L (−4096 = desborde)» y `saturado` «algún eje se desbordó», también en las sesiones del QMC5883P | Texto fijo del código que no refleja el modelo de la sesión (la línea `sensor_modelo` sí es correcta) |
| 13 | Comentarios del esquema | `setup_db.sql`: «lecturas del magnetómetro HMC5883L», crudos «del HMC5883L», posiciones «0..60 mm» | Dos modelos de sensor y zonas de cualquier tamaño | Solo comentarios |
| 14 | Comentarios del código | `simulador.js` y `trazabilidad.js`: orden «x → y → z»; `geometria.js`: «el mapa 3D dibuja una flecha por punto»; `setup_db.sql`: `puntos_esperados` «grid_n² × planos» | Serpentina, mapa de puntos, mallas rectangulares | Solo comentarios |
| 15 | Colores de los datos en la revisión de diseño | `docs/fase7-revision-diseno.md` y la sección 7.5 de la bitácora: $B_x$ #00E5FF (oscuro) y #0062A8 (claro) | Okabe–Ito (#0072B2, #D55E00, #009E73) en los dos temas desde el 13 nov | La tabla de contraste de la Fase 7 no incluye los colores actuales de los datos |
| 16 | Escala de la superficie | Clave `visualizacion.escala_superficie` (Jet o Viridis) | El servidor la guarda y valida, pero la interfaz ya no la usa ni la muestra | Opción sin efecto |
| 17 | Ficha del sensor | `docs/sensor-qmc5883p.md`, introducción: «Falta adaptar el servidor» | El servidor está adaptado (lo dice la sección 6 del mismo documento) | Contradicción interna |
| 18 | Ejemplo del protocolo | `docs/firmware-pico-w.md`: la respuesta de ejemplo muestra el sensor HMC5883L y el firmware `pico-tms-1.0` | El sensor por defecto es QMC5883P y el firmware `pico-tms-2.2` | Ejemplo ilustrativo antiguo |
| 19 | Resolución mecánica | La bitácora cita «0,04 mm por paso teórico» | El firmware manda 0,02 mm por pulso (50 pulsos/mm) | No es un error: 0,04 mm es el paso completo del motor con el husillo T8; con 400 pulsos por vuelta la resolución de mando es 0,02 mm |

---

## Fuentes en el proyecto

- Historial de git (`git log --date=short`), `git status`, `git diff --stat` y el contenido del primer commit (`22d3e7f`: `server/setup_db.sql`, `frontend/src/constants/system.js`, `frontend/src/hooks/useAcquisition.js`, `frontend/src/components/charts/Superficie3D.jsx`) y del README original (`d142de9`)
- Bitácora de desarrollo del proyecto (estado de las fases, notas y auditoría)
- `README.md`, `COMANDOS.md`, `docs/*.md`, `firmware/README.md`, `firmware_hall_1d/README.md`
- `firmware/config.py`, `firmware/main.py`, `firmware/banco.py`, `firmware/motores.py`
- `server/migrations/*.sql`, `server/setup_db.sql`, `server/services/*.js`, `server/controllers/mediciones.controller.js`
- `frontend/src/pages/ConfiguracionPage.jsx`, `frontend/src/styles/global.css`
- Base de datos local `tms_db` (consultas `SELECT` del 14 de noviembre de 2026)
