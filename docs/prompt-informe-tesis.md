# Prompt para la sesión del informe técnico completo (tesis)

> Copia todo lo que está debajo de la línea y pégalo como primer mensaje en una sesión nueva de Claude Code abierta en esta carpeta (`~/Proyectos/PT`).

---

Necesito que elabores el **informe técnico completo y exhaustivo** de este proyecto. Es el sistema de mi tesis de ingeniería (IPN, ESIME Zacatenco): adquisición y visualización de datos para la caracterización del campo magnético en un montaje de estimulación magnética transcraneal (TMS) sobre un phantom de solución salina.

## Para qué es el informe (léelo antes de empezar)

Mi tesis ya está escrita y tiene un avance anterior. Otro proyecto de Claude (en claude.ai) está revisando y corrigiendo esa tesis. **Ese revisor no tiene acceso al código**: solo va a tener lo que tú escribas. Con tu informe va a comparar lo que dice mi último avance contra lo que el sistema hace hoy, detectar qué cambió y plasmar todas las funciones en la tesis.

Por eso el informe debe:

1. Describir el sistema **tal como está hoy**, con todo detalle, desde el hardware hasta la interfaz, de modo que alguien que nunca vio el código lo entienda por completo.
2. Explicar **cómo se conecta cada pieza con las demás** (física, eléctrica, lógica y en la red), no solo qué es cada pieza.
3. Dejar **muy clara la evolución**: qué decisiones cambiaron, cuándo y por qué, con una tabla «antes → ahora» que el revisor pueda contrastar con mi avance (por ejemplo, términos o componentes que un texto viejo pudo nombrar de otra forma).
4. Distinguir siempre entre lo que está **implementado y verificado**, lo que está **implementado pero verificado solo en simulación o en el PC**, y lo que está **pendiente**. No inventes resultados ni des por probado algo que no lo está.

## Reglas de trabajo

- **No modifiques ni borres ningún archivo existente.** No ejecutes migraciones, no cambies la configuración, no hagas commits, no instales nada. Solo puedes **crear archivos nuevos** dentro de `docs/tesis/`.
- Lee primero `CLAUDE.md` completo (es la fuente de contexto del proyecto) y respeta sus reglas, en especial: lee `graphify-out/GRAPH_REPORT.md` antes de cualquier búsqueda con Glob o Grep y después afina con `graphify query`, `path` o `explain`. Si usas subagentes para leer código, incluye esta regla en sus instrucciones.
- **`CLAUDE.md` es un registro histórico**: varias notas fueron reemplazadas por otras posteriores (por ejemplo, la asignación de los ejes X e Y y la posición de descanso de la mesa cambiaron el 2026-11-13 y otra vez el 2026-11-14). **Contrasta cada dato con el código actual** (`firmware/config.py`, `server/services/…`, `server/setup_db.sql`, `frontend/src/…`, `package.json`) y, si hay contradicción, manda el código. Anota las contradicciones que encuentres en el archivo de evolución.
- Lee también toda la documentación: `README.md`, `COMANDOS.md`, `docs/firmware-pico-w.md`, `docs/sensor-qmc5883p.md`, `docs/instructivo-calibracion-y-conexiones.md`, `docs/fase7-revision-diseno.md`, `firmware/README.md`, `firmware_hall_1d/README.md`, los comentarios de las migraciones `server/migrations/*.sql` y `deploy/tms-server.service`. `nginx/tms.conf` se puede leer pero no tocar.
- Usa `git log` (con fechas) para reconstruir la cronología, y `git status`/`git diff --stat` para saber qué hay sin commit.
- Puedes correr las pruebas para reportar cifras reales: `cd server && npm test` (unitarias) y `python3 firmware/pruebas_pc/prueba_logica.py` si se ejecuta sin hardware. Reporta el número que salga, no el que diga la documentación. Las de integración necesitan una base de prueba; si no puedes levantarla, di cuántas hay y cómo se verificaron según la documentación.
- Si te sirve para la sección de resultados, puedes hacer **solo consultas `SELECT`** a la MariaDB local (`tms_db`, credenciales en `server/.env`) para obtener estadísticas de las sesiones guardadas (cuántas son simuladas y cuántas reales `hw`, puntos, duración, ritmo por punto). Nada de `INSERT`, `UPDATE`, `DELETE` ni `ALTER`.
- **No incluyas secretos** en el informe: nada de contraseñas, tokens, el contenido de `secretos.py` o `.env`, ni nombres o claves de redes Wi-Fi. Puedes decir que existen y cómo se protegen.
- **No menciones asistentes de IA, Claude ni sesiones de Claude** en ninguna parte del informe. La metodología se describe como desarrollo incremental por fases con control de versiones (git). Los archivos `docs/prompts-*.md` son internos: úsalos solo para entender el alcance de cada fase.
- Los sensores (QMC5883P y Hall 49E) son **sensores de prueba para validar el sistema**. Descríbelos así y **no argumentes** que no miden el pulso real de la bobina TMS.
- «Python no se usa» en `CLAUDE.md` significa que **no hay ningún puente en Python en el servidor**. El firmware de la Pico W sí está en **MicroPython**; descríbelo como tal.
- Escribe en **español**, en prosa completa y con registro de tesis (impersonal, formal, sin coloquialismos). Unidades del SI con su símbolo (mm, µT, mT, G, Hz, ms). Usa un solo criterio para el separador decimal y declara cuál en el índice.

## Preguntas que debes hacerme antes de redactar

Hazme estas preguntas en un solo mensaje al principio (después de leer `CLAUDE.md`) y espera mi respuesta:

1. ¿Cuál es la fecha aproximada (o el contenido general) de mi último avance de tesis? Con eso marcarás en la cronología qué cambió **después** de ese avance.
2. ¿Qué pruebas con el hardware real ya hice (Pico W con la mesa y el QMC5883P, sensor Hall con la mesa, calibración de pasos por milímetro) y con qué resultado? La documentación dice que el firmware final está «sin probar en la mesa», pero en la base hay sesiones reales; necesito que el informe diga el estado verdadero.
3. ¿Hay algo del sistema que quieras que se explique con más profundidad o que se omita?

Si alguna respuesta la puedes obtener tú del código o de la base, no me la preguntes.

## Formato de la entrega

Una carpeta **`docs/tesis/`** con varios archivos Markdown, uno por tema, y un índice. Cada archivo debe poder leerse por separado (el revisor los recibirá como archivos sueltos), así que al principio de cada uno pon un párrafo de contexto de dos o tres líneas.

Apoyos obligatorios:

- **Diagramas en Mermaid** (bloques, secuencia, flujo, estados y entidad-relación), cada uno con un título y un párrafo que lo explique.
- **Tablas** para todo lo que sea enumerable: pines, registros, endpoints, tablas y columnas, parámetros de configuración, versiones de tecnologías, comparaciones antes/ahora.
- **Ecuaciones en LaTeX** (`$…$` en línea y `$$…$$` en bloque), con cada símbolo definido y sus unidades.
- **No incluyas fragmentos de código.** Los algoritmos se explican en prosa, con ecuaciones, tablas o diagramas de flujo.
- Al final de cada archivo, una sección breve **«Fuentes en el proyecto»** con las rutas de los archivos de los que salió la información (sirve de trazabilidad, no va a la tesis).

## Archivos y contenido mínimo

Puedes ajustar la división si lo justificas, pero cubre **todo** lo siguiente:

**`00-indice-y-guia-para-el-revisor.md`**
Índice con una línea por archivo, criterios del informe (separador decimal, unidades, convención de estados *verificado / solo simulación o PC / pendiente*) y cómo usar el archivo de evolución para comparar con el avance de tesis.

**`01-resumen-y-alcance.md`**
Qué es el sistema, el problema que resuelve, objetivos, alcance y límites; qué partes son simuladas y cuáles reales; resumen del estado actual en una tabla.

**`02-arquitectura-general.md`**
- Diagrama de bloques de todo el sistema: sensor → Pico W → red (hotspot) → Raspberry Pi 5 (Nginx → Node/Express → MariaDB) → navegadores de varios usuarios.
- Modelos y patrones que usa y por qué: cliente-servidor, MVC en el backend (rutas → middleware → controladores → modelos, más servicios), proxy inverso, API REST con JSON, publicación de eventos al navegador con Server-Sent Events, el dispositivo como cliente HTTP con latido (sondeo), una sola fuente de datos (el navegador nunca genera datos).
- El recorrido completo de una medición de punta a punta, como diagrama de secuencia y en prosa.
- Por qué el router de Express se monta en `/api` y en `/` (desarrollo con Vite frente a producción con Nginx).

**`03-hardware.md`**
- Cada componente con modelo exacto, función, alimentación y conexión: Raspberry Pi 5 (servidor), Raspberry Pi Pico W (RP2040; aclara que no es la Pico 2 W), módulo QMC5883P (por qué no es HMC5883L ni QMC5883L), sensor Hall 49E, drivers TB6600, motores NEMA 17, husillos T8, mesa cartesiana con eje Z.
- Tabla de cableado con pines físicos y GPIO (I²C en GP0/GP1, ADC en GP26, STEP/DIR de cada eje).
- Mecánica: recorridos de cada eje (X eje corto, Y eje largo, Z), posición de descanso, origen de la medición, ausencia de finales de carrera y cómo se resuelve, orden de movimiento de los ejes para no chocar, holgura por eje.
- Cálculo de la resolución: avance del husillo, pasos por vuelta, micropasos, mm por paso teórico frente a los pulsos por mm configurados, velocidad máxima, rampas, y el requisito de error posicional menor que ±1 mm. Con ecuaciones.
- Red: hotspot, varios usuarios simultáneos, cómo la Pico encuentra al servidor.

**`04-sensores-y-medicion.md`**
- QMC5883P: registros, secuencia de inicialización, lectura (DRDY, formato de 16 bits, orden de bytes), rangos (2, 8, 12, 30 G) con cuentas por gauss y fondo de escala, bit OVFL de saturación, promediado de N lecturas, medición y resta del fondo (campo terrestre), reinicio ante errores de I²C.
- Ecuación de conversión de cuentas a µT (y a mT/G), con el offset, y la del módulo $|B|$.
- Hall 49E: principio lineal, sensibilidad, resolución del ADC, calibración del cero, cómo se envían sus datos al servidor (formato HMC) y la advertencia de unidades.
- Historia del sensor: el HMC5883L esperado, por qué no respondía, el descubrimiento del QMC5883P y cómo el servidor admite los dos modelos.

**`05-firmware-pico-w.md`**
- MicroPython y versión mínima; módulos del firmware y responsabilidad de cada uno (`main`, `config`, `red`, `cliente`, `sensor`, `motores`, `barrido`, `led`, `registro`, `banco`), con un diagrama de módulos.
- Arquitectura: bucle cooperativo con generadores, generación de pulsos con PIO y DMA (los motores se mueven mientras se envía un lote), rampas de aceleración.
- Máquina de estados de la Pico (espera, homing/arranque, midiendo, error) en diagrama de estados; señales del LED.
- Recorrido en serpentina (contrato de orden de puntos), conversión de coordenadas de la zona a coordenadas de máquina con el punto de inicio y el sentido de cada eje (con ecuaciones), validación de que la zona cabe en la mesa.
- Numeración `seq`, búfer de lecturas, envío por lotes, reanudación tras un reinicio o una caída de Wi-Fi, regreso al descanso al terminar, detener, fallar o interrumpir.
- Programas independientes de prueba y calibración (`prueba_calibracion.py`, `prueba_qmc5883p.py`, `medicion_campo_qmc5883p.py`, `prueba_hall_49e.py`, `banco.py`) y para qué sirve cada uno.
- `firmware_hall_1d/`: en qué difiere del firmware principal.
- Pruebas del firmware en el PC (stubs, sensor falso, pruebas de lógica y de punta a punta contra el servidor).

**`06-protocolo-de-comunicacion.md`**
- Autenticación de la Pico con token Bearer (cómo se genera, se guarda como hash y se revoca).
- Latido: campos que envía, respuesta (`sesion_activa` con su geometría, sensor, `ultimo_seq`, punto de inicio), intervalo, sincronización de reloj y detección de «en línea / sin señal».
- Envío de lotes: formato, límite por lote, idempotencia por `(sesión, seq)`, respuesta con aceptadas, duplicadas y rechazadas, cierre automático de la sesión al completarse.
- SSE hacia los navegadores: tipos de evento, ids, búfer de reenvío, `Last-Event-ID`, reconexión y resincronización.
- Diagramas de secuencia: arranque de la Pico, una sesión real completa, pérdida de conexión y reanudación, varios navegadores mirando a la vez.

**`07-backend.md`**
- Tecnologías con versión exacta (de `package.json`) y por qué se eligieron.
- Estructura de carpetas y responsabilidad de cada capa; descripción de cada servicio (`configuracion`, `sesiones`, `ingesta`, `simulador`, `tiempoReal`, `dispositivo`, `conversionSensor`, `trazabilidad`, `geometria`, `version`, `passwords`, `sesionUsuario`, `limiteIntentos`).
- Tabla completa de la API: método, ruta, rol requerido, qué hace y códigos de respuesta; convención de respuestas JSON y de códigos 400/401/403/404/409/410/422/429.
- Reglas de negocio: una sola sesión abierta (cola de promesas), cierre de sesiones huérfanas al arrancar, copias de la configuración con cada sesión, cálculo de huecos y puntos recibidos, saturación, exportación CSV en streaming con encabezado de metadatos, borrado lógico y restauración, notas.
- Configuración del sistema: cada clave (`general`, `modo_operacion`, `barrido`, `sensor`, `simulacion`, `dispositivo`, `visualizacion`, `datos`), sus campos, valores por defecto y validaciones, y cómo se difunden los cambios.
- Modos de operación simulación / real y qué cambia en cada uno.

**`08-base-de-datos.md`**
- MariaDB, diagrama entidad-relación de todas las tablas, tabla por tabla con columnas, tipos, claves e índices.
- Decisiones: todo en UTC, DOUBLE para el campo, crudos del sensor guardados, `UNIQUE(sesion_id, seq)`, JSON para copias de configuración y huecos, borrado lógico, usuario de la aplicación con permisos mínimos.
- Las migraciones 001 a 009: qué hace cada una y en qué orden.

**`09-modelo-fisico-y-simulacion.md`**
- Modelo de la espira circular exacta: ecuaciones de las componentes radial y axial del campo con las integrales elípticas completas $K(k)$ y $E(k)$, su cálculo por la media aritmético-geométrica (AGM), la normalización al campo en el centro y el *standoff*. Paso de coordenadas cilíndricas a cartesianas.
- Generador pseudoaleatorio con semilla (mulberry32), ruido gaussiano (Box–Muller), inyección de huecos y saturaciones, ritmo por punto según la velocidad (DC/AC), reproducibilidad (la semilla se guarda con la sesión).
- Cómo se verificó el simulador (contra la fórmula analítica en el eje; CSV contra el simulador con semilla fija).

**`10-geometria-de-la-malla.md`**
- Zona de muestreo, paso libre en mm (igual en X, Y y Z), límites de la base, número de puntos por eje y de planos, total de puntos, límite de puntos por sesión, tolerancias. Con ecuaciones y la tabla de ejemplos (5 mm → 845 puntos, 10 mm → 147, 20 mm → 32, 7,5 mm → 243).
- El recorrido en serpentina y la correspondencia índice ↔ posición, igual en el servidor, el simulador, el firmware y la interfaz; diagrama del recorrido.

**`11-frontend.md`**
- Tecnologías con versión exacta y su papel (React 18, Vite 5, Bootstrap 5 e iconos, Chart.js, Three.js, Plotly en su variante gl3d, fuentes locales).
- Estructura: páginas, contextos, hooks, componentes; navegación en la URL sin enrutador externo; un único flujo SSE compartido; carga de lo ya medido al conectarse.
- Cada pantalla y lo que permite hacer según el rol: inicio de sesión y cambio obligatorio de contraseña, dashboard en vivo (barra de parámetros de la medición, progreso, tiempo estimado, indicadores), Mediciones pasadas (filtros, notas, eliminar/restaurar, CSV, sábana 3D de una sesión pasada), Configuración por secciones, menú lateral, indicador de la Pico W y etiqueta SIMULACIÓN/REAL.
- **Cada gráfica en detalle**: gráfica de líneas Bx/By/Bz, mapa 3D de puntos medidos, sábana 3D (superficie de |B| o de una componente por plano, escalas de color, exportación PNG/SVG), tabla de lecturas, tarjetas KPI: qué datos muestra, ejes y unidades, cómo se actualiza en vivo y por qué se diseñó así.
- Temas oscuro/claro/sistema, paleta de datos (Okabe–Ito), accesibilidad (contraste WCAG AA, foco, movimiento reducido) y rendimiento (tamaño del bundle, carga diferida, un render por cuadro).

**`12-seguridad-usuarios-y-roles.md`**
Roles (admin, operador, observador) y la matriz de permisos; contraseñas con scrypt; cookie de sesión y sus atributos; expiración y renovación; límite de intentos; token de la Pico; CORS; HTTPS con Nginx; la cuenta de administrador predeterminada como decisión consciente del proyecto (mencionarla una vez, sin dar la contraseña).

**`13-despliegue-e-infraestructura.md`**
Instalación en la Raspberry Pi 5 (resumen de `COMANDOS.md`), Nginx como proxy inverso con HTTPS, servicio de systemd, compilación del frontend, acceso por IP y por `tms.local` (mDNS), entorno de desarrollo frente a producción, respaldo de la base. Diagrama de despliegue.

**`14-pruebas-y-verificacion.md`**
Estrategia de pruebas: unitarias y de integración con `node:test` (cifras reales al correrlas), emulador de la Pico con pérdidas y duplicados, pruebas del firmware en el PC, verificación en el navegador, revisión de diseño y accesibilidad. Tabla de qué se verificó, cómo y con qué resultado, y qué falta probar con el hardware. Si consultaste la base, estadísticas de las sesiones reales y simuladas.

**`15-metodologia.md`**
Desarrollo incremental por fases (1 a 8 y los cambios posteriores), qué se entregó en cada una y por qué en ese orden; control de versiones con git; criterios de diseño (capas, validación en el servidor, trazabilidad, reproducibilidad, una sola fuente de datos). Sin mencionar IA.

**`16-evolucion-y-cambios.md`** (el más importante para el revisor)
- Cronología con fechas (y commits cuando los haya), marcando lo que es posterior a mi último avance.
- Tabla **«antes → ahora → motivo»** con todos los cambios relevantes, por ejemplo: Pico 2 W → Pico W; HMC5883L → QMC5883P (y el Hall 49E); simulación en el navegador → simulador en el servidor; paso fijo de 0,5/1/2 cm → paso libre; malla fija de 60 × 60 → zona de muestreo por sesión; recorrido fila a fila → serpentina; mapa 3D de flechas → mapa de puntos medidos; «superficie» → sábana 3D con estilo de figura científica; sesiones reales cerradas a mano → cierre automático; homing con finales de carrera → posición de descanso sin finales; asignación y sentido de los ejes; punto de inicio de la medición configurable; colores de los datos; sin login → login con roles; etc. Revisa el código y el historial para completarla, no te limites a esta lista.
- Términos obsoletos que un texto anterior pudo usar y su equivalente actual.
- Contradicciones encontradas entre la documentación y el código.

**`17-limitaciones-pendientes-y-trabajo-futuro.md`**
Lo que falta (pruebas con la mesa, «medir cero», promediado con varias lecturas por punto, física distinta para la solución salina, etc.), cuestiones abiertas y mejoras posibles.

**`18-tecnologias-y-glosario.md`**
Tabla de todas las tecnologías, bibliotecas y herramientas con versión, licencia si es fácil de obtener, propósito y alternativa descartada si la hubo; glosario de términos técnicos y siglas (TMS, SSE, MVC, PIO, DMA, I²C, ADC, OVFL, DRDY, AGM, seq, standoff, phantom…).

## Al terminar

1. Revisa que cada afirmación técnica esté respaldada por el código o la documentación, que las cifras coincidan entre archivos y que no haya secretos.
2. Dame un resumen breve de lo que generaste, la lista de archivos, las contradicciones más importantes que encontraste y cualquier dato que no pudiste confirmar.
3. No hagas commit: los commits los hago yo.
