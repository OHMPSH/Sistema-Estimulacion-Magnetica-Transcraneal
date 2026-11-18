# 11 — Interfaz web (frontend)

Este documento describe la interfaz web del SAVD: las tecnologías y su papel, la estructura del código (páginas, contextos, hooks y componentes), la navegación en la URL sin un enrutador externo, el flujo SSE único compartido, cada pantalla y lo que permite hacer según el rol, cada una de las cinco vistas de datos en detalle (qué muestran, ejes y unidades, cómo se actualizan en vivo y por qué se diseñaron así), los temas de color, la paleta de los datos, la accesibilidad y el rendimiento.

---

## 1. Tecnologías

| Tecnología | Versión instalada | Papel |
|---|---|---|
| React | 18.3.1 (con react-dom 18.3.1) | Biblioteca de componentes de la interfaz |
| Vite | 5.4.21 (con @vitejs/plugin-react 4.7.0) | Servidor de desarrollo con proxy `/api` hacia el backend y compilador de producción a `../dist` |
| Bootstrap | 5.3.8 | Rejilla, formularios, modales y tema (`data-bs-theme`) |
| Bootstrap Icons | 1.13.2 | Iconos |
| Chart.js | 4.5.1 (con react-chartjs-2 5.3.1) | Gráfica de líneas $B_x$, $B_y$, $B_z$ |
| Three.js | 0.165.0 | Mapa 3D de puntos medidos (WebGL) |
| Plotly | `plotly.js-gl3d-dist-min` 3.7.0 (con react-plotly.js 3.0.0) | Sábana 3D; es la variante mínima de Plotly con los trazos 3D, cargada aparte |
| Fuentes | @fontsource Inter, Rajdhani y Share Tech Mono 5.3.0 | Tipografía empaquetada localmente: el dashboard no necesita internet |

El paquete se llama `tms-frontend`, versión 2.0.0. No se usa ningún enrutador externo ni librería de estado: la navegación usa la History API del navegador y el estado compartido, contextos de React. El archivo `frontend/.npmrc` activa `legacy-peer-deps` para que npm no instale el paquete completo de Plotly como dependencia par de react-plotly.js.

---

## 2. Estructura

| Carpeta | Contenido |
|---|---|
| `src/main.jsx` | Importa Bootstrap, los iconos y las fuentes, y envuelve la aplicación en el contexto de autenticación |
| `src/App.jsx` | Decide la pantalla: inicio de sesión, cambio obligatorio de contraseña o la estructura principal (barra superior, menú lateral y página de la URL). El estado del barrido en vivo vive aquí para no perder datos al cambiar de página |
| `src/pages/` | `LoginPage`, `CambiarPasswordPage`, `DashboardPage`, `HistorialPage`, `ConfiguracionPage` |
| `src/context/` | `AuthContext` (usuario, iniciar y cerrar sesión, cambiar la contraseña, preferencias) y `ConfigContext` (configuración, opciones, modo de operación, guardado de claves, tema y movimiento reducido) |
| `src/hooks/` | `useStream` (EventSource único), `useSesionActiva` (estado del barrido), `useDispositivo` (estado de la Pico), `useNavegacion` (URL), `useTokensTema` (colores para las gráficas), `useServerStatus` (salud del servidor cada 15 s), `useTiempoEstimado` (duración y tiempo restante) |
| `src/components/layout/` | `Navbar`, `MenuLateral` |
| `src/components/charts/` | `LineChart`, `Canvas3D`, `Superficie3D` |
| `src/components/panels/` | `ControlPanel` (parámetros, acciones, progreso y tiempo estimado) |
| `src/components/ui/` | `KpiCards`, `DataTable`, `LimiteErrores` (si una vista falla, muestra un aviso en lugar de dejar la página en blanco) |
| `src/components/modals/` | `StartModal`, `StopModal`, `ModalConfirmacion` (sustituye a `window.confirm`), abiertos con referencias de React |
| `src/components/config/` | `SeccionFormulario` (formulario genérico por clave), `SelectorModeloSensor`, `SeccionDispositivo`, `TokenDispositivo`, `SeccionUsuarios` |
| `src/api/cliente.js` | Único punto de acceso a la API: envía siempre la cookie y, ante un 401, devuelve al usuario a la pantalla de inicio de sesión |
| `src/utils/` | `geometria.js` (el mismo cálculo de malla y serpentina que el servidor), `formato.js` (números y fechas con `Intl`) |
| `src/styles/global.css` | Tokens de color de los temas y estilos |

### 2.1 Navegación en la URL

La vista y la sección van en la URL: `?vista=dashboard|historial|configuracion&seccion=general|barrido|sensor|…`. Funcionan el botón «Atrás» y los enlaces directos. Los filtros del historial también viven en la URL (se pueden compartir y sobreviven a la recarga).

### 2.2 Flujo de datos en vivo

- Un **único `EventSource`** hacia `/api/stream` reparte los eventos a quien se suscriba; se abre con la primera suscripción y se cierra cuando ya no queda ninguna.
- `useSesionActiva` carga `GET /api/sesiones/activa` al conectarse, en cada reconexión y con el evento `resincronizar`; aplica los eventos `medicion` de la sesión que sigue (descarta los de otras) y `sesion`; deduplica por `seq`; y agrupa las actualizaciones con `requestAnimationFrame`: un lote de 200 lecturas provoca **un** renderizado, no 200.
- **El navegador no genera datos**: solo dibuja lo que difunde el servidor.

---

## 3. Pantallas y permisos

### 3.1 Inicio de sesión y cambio obligatorio de contraseña

- Cada pestaña nueva y cada navegador recién abierto piden usuario y contraseña, aunque quede una cookie válida: la marca de «sesión iniciada en esta pestaña» vive en `sessionStorage`, que es por pestaña y sobrevive a la recarga (recargar a mitad de un barrido no saca al usuario).
- Si el usuario debe cambiar su contraseña (primer acceso o contraseña restablecida por un administrador), solo ve la pantalla de cambio; el servidor rechaza con 403 cualquier otra ruta.
- Un mensaje único para credenciales incorrectas y el aviso de bloqueo temporal tras cinco intentos fallidos.

### 3.2 Barra superior y menú lateral

- **Barra superior:** botón ☰ del menú lateral, nombre del sistema, etiqueta **SIMULACIÓN** muy visible en ese modo (o REAL), estado del servidor y estado de la Pico W («en línea · midiendo», «sin señal hace N s» o «nunca conectada»). Los estados llevan siempre texto además del punto de color y se anuncian a los lectores de pantalla con `aria-live`. Si la Pico informa un error, aparece un aviso en la parte superior del contenido.
- **Menú lateral** (diálogo modal accesible: el foco queda dentro, se cierra con Esc, con ✕ o tocando fuera, y el foco vuelve al botón ☰), con el usuario y su rol; el **modo de operación** (solo el administrador lo cambia, y no con una sesión abierta); el **tema** (oscuro, claro o sistema); la navegación (Dashboard en vivo, Mediciones pasadas y Configuración) y Cerrar sesión.

### 3.3 Dashboard en vivo

1. **Barra de configuración de la medición** (`ControlPanel`): velocidad (DC rápida o AC normal), paso en mm (campo libre con un botón de 5 mm), medio (campo magnético o solución salina) y zona de muestreo X × Y × Z (con «Toda la base»). Debajo se ve la malla resultante y el total de puntos, con validación inmediata (por ejemplo, si se superan los 25 000 puntos). Con un barrido en curso, la barra muestra los parámetros de esa sesión (que pudo iniciar otra persona) y no se puede cambiar.
2. **Acciones:** «Iniciar» abre un modal de confirmación con el resumen (velocidad, paso, medio, zona, malla y total); «Detener» abre otro con lo medido hasta el momento. Solo operadores y administradores las ven.
3. **Progreso:** barra de progreso, estado («Midiendo el plano Z = 10 mm (40 % del plano)», «Barrido terminado», «Detenido») y **tiempo estimado**.
4. **Indicadores**, las cinco vistas de datos y la tabla (sección 4).

**Tiempo estimado** (`useTiempoEstimado`, sin endpoints nuevos):

- Sin barrido en curso muestra la **duración estimada** de la malla elegida con el ritmo histórico.
- Con barrido muestra el **tiempo restante**, la hora estimada de fin y una cuenta atrás de 1 s.
- El **ritmo histórico** $r_h$ es la mediana de la duración entre los puntos recibidos de las últimas 20 sesiones cerradas del mismo origen (en simulación, también de la misma velocidad) con al menos 10 lecturas, leídas de `GET /api/sesiones`.
- El **ritmo actual** $r_a$ es el tiempo entre la primera y la última lectura de la sesión dividido entre las lecturas menos una. Usa la hora de la Pico si viene, porque el servidor asigna la misma hora a todo un lote.
- El ritmo usado mezcla ambos, con peso creciente para el actual en las primeras 20 lecturas:

$$r = w\,r_a + (1 - w)\,r_h,\qquad w = \min\!\left(1,\ \frac{n - 1}{20}\right),\qquad t_{restante} = (N - n)\, r$$

donde $n$ es el número de lecturas recibidas y $N$ el total esperado. En la base local, el ritmo de las sesiones reales ronda 0,6 a 1 s por lectura y el de las simuladas, 0,07 s (DC) y 0,13 s (AC).

### 3.4 Mediciones pasadas (historial)

- **Filtros** por velocidad, paso (campo libre con sugerencias: los más usados y los que ya hay en el historial), medio y origen, aplicados en el servidor, y por día, aplicado en el navegador en la zona horaria configurada. Las respuestas viejas se descartan si los filtros cambian rápido.
- Cada sesión muestra su identificador real, origen (simulada o Pico W), fechas, quién la inició, puntos recibidos sobre esperados, lecturas saturadas, huecos, máximo y mínimo de $|B|$ y versiones.
- **Notas** editables (administrador u operador que la inició).
- **Exportar CSV** (enlace al CSV que genera el servidor).
- **Ver sábana 3D:** carga las lecturas de la sesión (`GET /api/sesiones/:id/mediciones`) y las dibuja con el mismo componente del dashboard.
- **Eliminar** (administrador), con un modal que explica que es un borrado lógico; **Ver eliminadas** y **Restaurar**, solo para el administrador.
- La lista se recarga sola con los eventos `sesion` del SSE.

### 3.5 Configuración

Secciones (para quien no es administrador, todo es de solo lectura):

| Sección | Contenido |
|---|---|
| General | Punto de inicio de la medición (X, Y, Z en mm de máquina), con un botón que rellena el origen (0, 0, 0) sin guardar y la ayuda de la mesa |
| Barrido | Límites de la base en X, Y y Z, *standoff* y paso predeterminado |
| Sensor | Selector de modelo (QMC5883P o HMC5883L, con el botón «Cambiar modelo») y, debajo, el rango del modelo vigente (con su fondo de escala), las lecturas por punto y el *offset* por eje |
| Simulación | Tiempo por punto en DC y AC, semilla, ruido σ, radio de la bobina, $\|B\|$ en el centro y probabilidades de hueco y de saturación |
| Dispositivo | Estado de la Pico W, generación del token (mostrado una sola vez, con botón para copiarlo), activación o desactivación, intervalo de latido y umbral de desconexión |
| Visualización | Lecturas en la gráfica de líneas, filas de la tabla, decimales, rotación automática del mapa 3D y reducir animaciones |
| Usuarios | Solo administrador: crear, cambiar el rol, activar o desactivar y restablecer la contraseña |

Cada campo tiene su etiqueta, su ayuda y su error al lado (los errores 422 del servidor se asignan al campo correspondiente); el foco va al primer error, se avisa de los cambios sin guardar y la confirmación del guardado se anuncia con `aria-live`. Con una sesión abierta, el selector de modelo del sensor queda desactivado con un aviso, y un intento de guardar General, Barrido o Sensor recibe el 409 del servidor, que el formulario muestra.

### 3.6 Matriz de permisos en la interfaz

| Acción | Administrador | Operador | Observador |
|---|---|---|---|
| Ver el dashboard, el historial y la configuración | Sí | Sí | Sí |
| Iniciar y detener barridos | Sí | Sí | No |
| Editar notas | Todas | Las de sus sesiones | No |
| Exportar CSV y ver la sábana de sesiones pasadas | Sí | Sí | Sí |
| Eliminar, ver eliminadas y restaurar | Sí | No | No |
| Cambiar la configuración y el modo de operación | Sí | No | No |
| Generar o revocar el token de la Pico | Sí | No | No |
| Administrar usuarios | Sí | No | No |
| Cambiar su propio tema y su contraseña | Sí | Sí | Sí |

---

## 4. Vistas de datos

El dashboard muestra las cinco vistas: indicadores, gráfica de líneas, mapa 3D de puntos medidos, sábana 3D y tabla de lecturas.

### 4.1 Tarjetas de indicadores (KPI)

| Tarjeta | Dato |
|---|---|
| Estado | Adquiriendo, terminada, detenida o inactiva, con la duración de la sesión |
| Plano Z de la última lectura | Altura en mm y la lista de planos de la sesión, con el actual resaltado |
| $\|B\|$ de la última lectura | Valor en µT (o «Saturada») |
| Posición de la última lectura | $(x, y)$ en mm dentro de la zona, con el número de lectura |

Muestran siempre la **última lectura recibida**, no la siguiente, para no adelantarse a los datos.

### 4.2 Gráfica de líneas $B_x$, $B_y$, $B_z$

- **Datos:** las tres componentes de las últimas `ventana_grafica` lecturas (80 por defecto).
- **Eje X:** «Posición en el barrido (número de punto de la malla)», es decir, el índice $k$ del punto en la serpentina, no la hora: cada punto es otra posición.
- **Eje Y:** «Campo (µT)».
- Un punto de la malla sin lectura (hueco) o un eje saturado se dibuja como valor nulo y la línea se corta ahí: los huecos se ven.
- Sin suavizado y con puntos pequeños visibles; colores de la paleta de los datos ($B_x$ azul, $B_y$ bermellón, $B_z$ verde azulado).
- Alternativa accesible: un resumen en la etiqueta ARIA y una tabla oculta con las últimas lecturas.
- **Por qué así:** usar el índice de la malla en vez del tiempo hace visibles los huecos y evita que el ritmo variable de la mesa deforme la gráfica.

### 4.3 Mapa 3D de puntos medidos (Three.js)

- **Datos:** un punto (esfera) en cada posición de la malla donde ya hay al menos una lectura, incluidas las saturadas. El color indica el plano Z (tonos azul pizarra, del más oscuro al más claro). No representa la magnitud ni la dirección del campo: su función es mostrar **qué zonas ya se sondearon**.
- **Orientación diestra**, como en el laboratorio: la posición $(x, y, z)$ se transforma en coordenadas de Three.js como $(x - c_x,\ z,\ -(y - c_y))$, donde $c$ es el centro de la zona; así X queda a la derecha, Y hacia el fondo y Z hacia arriba, con determinante +1 (la versión inicial usaba $(x, z, y)$, que es una imagen especular).
- Los ejes de referencia usan los colores de $B_x$, $B_y$ y $B_z$; la cámara se aleja según el tamaño de la zona.
- **Interacción:** arrastrar con el ratón o el dedo rota; la rueda o el pellizco hacen zoom sin desplazar la página; hay botones y, con el foco en el lienzo, las flechas rotan y + y − hacen zoom.
- Rotación automática según la configuración, nunca con movimiento reducido. Sin rotación ni interacción, el bucle de dibujo se detiene y solo se redibuja cuando algo cambia.
- Una sola geometría de esfera compartida por todos los puntos; materiales compartidos por plano; liberación de recursos y del contexto WebGL al desmontar.
- **Por qué así:** la versión anterior dibujaba flechas proporcionales a $|B|$; a pedido del tesista (13 de noviembre de 2026) se cambió por puntos, porque la información cuantitativa del campo ya la dan la sábana 3D y la gráfica de líneas, y lo útil durante un barrido real es ver la cobertura.

### 4.4 Sábana 3D (Plotly)

- **Datos:** una superficie sobre el plano $(x, y)$ construida con las lecturas válidas (no saturadas), como una matriz $z[i_y][i_x]$ con valores nulos donde no hay lectura y sin interpolar: la sábana se va construyendo conforme llegan los puntos.
- **Selector de magnitud:** $|B|$ (módulo) o una componente $B_z$, $B_x$ o $B_y$.
- **Selector de vista:**
  - **«Huella máxima total»** (por defecto): en cada $(x, y)$, el valor de mayor valor absoluto entre todas las alturas medidas (para $|B|$, el máximo).
  - **Un plano Z concreto.** Si se elige un plano durante un barrido, la vista sigue al plano en que está el sensor.
- **Escalas de color** continuas y perceptualmente uniformes: **Viridis** para $|B|$ (siempre positivo) y **RdBu** de ColorBrewer, simétrica alrededor de 0, para las componentes con signo (azul negativo, blanco cero, rojo positivo).
- **Rango de color fijo para toda la sesión** (todas sus lecturas válidas), para poder comparar planos.
- **Ejes:** «Posición X [mm]», «Posición Y [mm]» y la magnitud con su unidad (por ejemplo, «|B| [µT]»); proporción real de la zona en X e Y y 0,7 en el eje vertical.
- **Estilo de figura científica:** en el tema claro, fondo blanco, planos #F8F9FA, rejilla #CCCCCC y texto Arial de 11–12 px en #111111; en el tema oscuro, la misma figura sobre negro (planos #0E1014, rejilla #3A3F47, texto #E6E8EC). Sin líneas de contorno sobre la superficie; barra de color con la magnitud y su unidad.
- **Exportación:** PNG con escala 3 (botón de la cámara de Plotly) y SVG con un botón propio. La escena 3D es WebGL, así que en el SVG va como imagen dentro del vector, mientras que los textos, los ejes y la barra de color sí son vectoriales. El nombre del archivo incluye la sesión, la magnitud y la vista.
- **Actualización en vivo:** se redibuja como máximo unas tres veces por segundo; los datos y la composición se memorizan sobre valores numéricos; **no se actualiza mientras el usuario arrastra o gira la figura** (al soltar se pone al día) y la cámara elegida por el usuario se conserva entre actualizaciones.
- **Carga diferida:** Plotly se descarga aparte, solo cuando se necesita.
- **Por qué así:** una escala de color perceptualmente uniforme no crea bordes falsos como la antigua escala «Jet»; la escala simétrica de las componentes hace visible el signo; el rango fijo permite comparar planos; y el estilo sobrio permite usar las figuras directamente en la tesis.

### 4.5 Tabla de lecturas

- Las últimas `filas_tabla` lecturas (60 por defecto), la más nueva arriba.
- Columnas: Seq, Hora (con milisegundos, en la zona horaria configurada), X, Y y Z (mm, un decimal), $B_x$, $B_y$, $B_z$ y $|B|$ (µT, con los decimales configurados) y Estado (OK o «Saturada»; los ejes saturados aparecen como «SAT»).
- La fila nueva destella brevemente (el único movimiento con significado de la interfaz, que se apaga con movimiento reducido).
- Contador «N de M» y región desplazable con su etiqueta accesible.

---

## 5. Temas, paleta de los datos y accesibilidad

### 5.1 Temas

- **Oscuro** (el original, cuyos colores base no se modificaron), **claro** (añadido en la Fase 6) y **sistema** (sigue al sistema operativo en vivo).
- Se aplica con los atributos `data-theme` y `data-bs-theme` en la etiqueta `<html>`, más `color-scheme`. Se guarda en las preferencias del usuario en el servidor y en `localStorage`; `index.html` lo aplica antes de pintar para evitar el parpadeo.
- Chart.js, Three.js y Plotly leen los colores de los tokens CSS del tema vigente (`useTokensTema`).

| Token | Oscuro | Claro |
|---|---|---|
| Fondo | #0D0D0F | #F4F5F7 |
| Tarjeta | #1A1A20 | #FFFFFF |
| Texto principal | #EEF0F5 | #1B1D23 |
| Texto secundario | #8A8FA8 | #5C6273 |
| Guinda (identidad IPN) | #8B1A2F / #C0233F | #6E1525 / #8B1A2F |
| Planos Z (`--z0` … `--z4`) | #56708F a #C6D5E6 | #1F3550 a #6A88B2 |

### 5.2 Paleta de los datos (Okabe–Ito)

Desde el 13 de noviembre de 2026 los colores de los datos son sobrios y aptos para personas con daltonismo, iguales en los dos temas:

| Dato | Color |
|---|---|
| $B_x$ | #0072B2 (azul) |
| $B_y$ | #D55E00 (bermellón) |
| $B_z$ | #009E73 (verde azulado) |
| $\|B\|$ | Color del texto |
| Planos Z | Azul pizarra, del más oscuro al más claro |
| Rayas de los indicadores | Gris azulado (`--acento-dato`), salvo la guinda |

Los colores neón originales del tema oscuro (cian, magenta, esmeralda, amarillo) se conservan para los **estados** (en línea, simulación, real).

### 5.3 Accesibilidad

La interfaz se revisó con las pautas de interfaces web en la Fase 7, con un informe archivo por archivo, un plan de diseño y una tabla de contraste:

- **Contraste WCAG 2.1 AA** (al menos 4,5:1 para texto normal) calculado con la fórmula de luminancia relativa para cada par texto/fondo de los dos temas. Los tokens que no alcanzan AA como texto (`--text-dim` y la guinda brillante del tema oscuro) solo se usan para bordes, iconos y fondos de botón con texto blanco.
- Foco visible, enlace «Saltar al contenido», menú lateral con foco atrapado, modales accesibles, foco al primer error, etiquetas en todos los campos y estados con texto además de color.
- **Movimiento reducido:** con la preferencia del sistema o con la opción de la configuración se apagan la rotación del mapa 3D y las animaciones.
- Tipografía: Rajdhani 700 para títulos, Inter 400/500 para la interfaz (13–14 px, sin mayúsculas espaciadas), Share Tech Mono solo en cifras con dígitos tabulares; mínimo 12 px. Títulos en mayúscula inicial, según la norma del español.
- Áreas seguras de los teléfonos, `scroll-padding-top`, espacios de no separación entre número y unidad y `translate="no"` en los términos técnicos.

---

## 6. Rendimiento

Compilación de producción del 14 de noviembre de 2026 (realizada en una carpeta temporal):

| Recurso | Tamaño | Comprimido (gzip) |
|---|---|---|
| JavaScript inicial | 878,6 kB | 253,2 kB |
| CSS | 348,7 kB | 53,1 kB |
| Sábana 3D con Plotly (carga diferida) | 1 710,7 kB | 549,3 kB |

En la versión anterior a la Fase 6, el paquete inicial pesaba 5 746 kB (1 731 kB comprimido), porque incluía el Plotly completo; el cambio a la variante `gl3d-dist-min` cargada aparte lo redujo a menos de una sexta parte.

Otras medidas:

- Un renderizado por cuadro de pantalla, aunque llegue un lote de 200 lecturas.
- Sábana 3D limitada a unas tres actualizaciones por segundo y congelada mientras se manipula.
- Mapa 3D sin bucle de dibujo cuando no hay rotación ni interacción.
- Durante un barrido de 845 puntos a 20 ms por punto no hubo ninguna tarea larga (de más de 50 ms) en el hilo principal (medición de la Fase 6).

---

## Fuentes en el proyecto

- `frontend/package.json`, `frontend/vite.config.js`, `frontend/index.html`, `frontend/.npmrc`
- `frontend/src/App.jsx`, `frontend/src/main.jsx`, `frontend/src/pages/*.jsx`, `frontend/src/context/*.jsx`, `frontend/src/hooks/*.js`
- `frontend/src/components/**/*.jsx`, `frontend/src/utils/*.js`, `frontend/src/api/cliente.js`, `frontend/src/styles/global.css`
- `docs/fase7-revision-diseno.md`
- Versiones instaladas leídas de `frontend/node_modules/*/package.json`
- Compilación de producción (`vite build`) del 14 de noviembre de 2026
