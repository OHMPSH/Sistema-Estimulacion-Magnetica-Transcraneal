# Capturas del SAVD para la tesis

Las capturas se tomaron con **Playwright 1.56.1** (Chromium sin interfaz):

- Escritorio: ventana de **1440 × 900** con `deviceScaleFactor: 2`.
- Teléfono: vista emulada a **390 × 844**, también ×2.
- Tema **claro** en todas.

Hay dos tandas:

- **2026-11-15** (15:39–15:46): todo simulado, porque la Pico no estaba conectada.
- **2026-11-17** (19:03–19:05): con un **barrido real** con la Pico 2W y el QMC5883P, que iniciaste estando presente.

Todas las horas son del centro de México (UTC−6). Los scripts quedaron en el *scratchpad* de la sesión, fuera del proyecto. **No se modificó código.**

## Tanda real (2026-11-17)

- **Sistema:** tu servidor en `:4000` (modo real, tu base `tms_db`) y tu Vite en `:5173`.
- **Pico:** `pico-w-1`, firmware `pico-tms-2.2`, IP 192.168.0.136, en línea.
- **Sesión 93** (real, Pico W): DC — rápida, zona de 50 × 50 × 30 mm, paso de 10 mm, 6 × 6 × 4 = 144 puntos, campo magnético, QMC5883P a 30 G. La inicié desde el dashboard de escritorio a las 19:03:16. **Se cerró sola a las 19:05:41, completa: 144 de 144 puntos, 0 huecos y 0 saturadas.** Queda guardada en tu base como cualquier otra.
- **Navegadores:** tres abiertos a la vez, todos con `admin` / `admin`: escritorio, teléfono y la app móvil (esta en la otra carpeta).

## Tanda simulada (2026-11-15)

- Para no tocar tu base ni el token de la Pico, el backend apuntó a una **copia** de `tms_db` en una MariaDB temporal (ya detenida).
- Las sesiones 90, 91 y 92 de esa tanda solo existieron en la copia.
- Los archivos con `_sim` salen del simulador del servidor o del firmware corriendo en la PC (`firmware/pruebas_pc/ejecutar_pc.py`, con motores, Wi-Fi y QMC5883P simulados).

**Usuario:** el acceso de desarrollo documentado `admin` / `admin`. No se creó ningún usuario. Ninguna imagen muestra contraseñas, tokens ni `secretos.py`.

## Archivos

| Archivo | Figura | Cómo se tomó | Qué se ve y en qué difiere de lo pedido |
|---|---|---|---|
| `cap3_login.png` | `fig:login` | Pantalla de login tras «Cerrar sesión», 2026-11-15 15:40. Recorte de 660 × 580 px CSS al centro. | Campos «Usuario» y «Contraseña» vacíos y botón **«Iniciar sesión»**. Se quitó el foco del campo de usuario: el navegador lo enfoca solo y dibuja un contorno guinda que parecía un error. |
| `cap3_dashboard_control.png` | `fig:InterfazControl` | **Real**, sesión 93, 2026-11-17 19:04:27, con unos 67–70 de 144 puntos. | Barra «Configuración de la medición»: Velocidad (**«DC — rápida» / «AC — normal»**), Zona de muestreo, Paso (X, Y y Z) y Medio.<br>Botones **«Iniciar medición»** (deshabilitado durante el barrido) y «Detener».<br>Progreso con **«Tiempo restante: …, termina hacia las 07:05 p.m.»**.<br>Las cuatro tarjetas: Estado, Plano Z de la última lectura, \|B\| de la última lectura y Posición de la última lectura. |
| `cap3_dashboard_control_sim.png` | (versión anterior) | Simulador del servidor, sesión 90 de la copia (AC, 60 × 60 × 20 mm, paso 5 mm, 845 puntos), 2026-11-15 15:39. | La misma vista con datos simulados. Se conserva por si la prefieres. |
| `cap3_config_sensor.png` | `fig:config-sensor` | Configuración › Sensor, 2026-11-15 15:40. | Modelo **«QMC5883P (módulo real)»**, rango **«±30 G (fondo 3,276.7 µT)»**, «Lecturas por punto» = 1 y offsets en 0.<br>**Texto distinto:** los campos se llaman «Offset X (µT)», «Offset Y (µT)» y «Offset Z (µT)», no $o_x$, $o_y$, $o_z$.<br>También aparecen el aviso del Hall 49E y la nota de que «Medir cero» está pendiente. |
| `cap3_lineas_vivo.png` | `fig:lineas` | **Real**, sesión 93, 2026-11-17 19:04:28. | Bx, By, Bz en µT (de −500 a 500 µT) contra «Posición en el barrido (número de punto de la malla)»; ventana de las **últimas 80 lecturas**.<br>No hay cortes porque no hubo huecos en ese tramo. |
| `cap3_lineas_vivo_sim.png` | (versión anterior) | Simulador, sesión 90 de la copia, 2026-11-15. | Datos simulados, sin cortes (`prob_hueco = 0`). |
| `cap3_mapa3d.png` | `fig:mapa3d` | **Real**, sesión 93, 2026-11-17 19:04:29, **71 de 144 puntos**. | Puntos medidos sobre la malla de 50 × 50 × 30 mm: planos Z = 0 y 10 mm casi completos y Z = 20 mm sin empezar, con la leyenda «71 puntos medidos». La vista gira sola (`rotacion_auto`). |
| `cap3_mapa3d_sim.png` | (versión anterior) | Simulador, sesión 90 de la copia, 451 de 845 puntos. | Datos simulados. |
| `cap3_historial.png` | `fig:historial` | Mediciones pasadas de la copia de tu base, 2026-11-15 15:40. | Filtros **Velocidad, Paso (mm), Medio, Origen y Día**, más «Ver eliminadas» y «Limpiar»; «55 sesiones».<br>Lista con las sesiones 88, 87 y 84 (**Simulada**) y 82, 81 y 80 (**Real (Pico W)**), cada una con «N / M puntos · %» y huecos.<br>Las tres reales que caben arriba son barridos incompletos; la 74 queda más abajo.<br>No incluye la sesión 93.<br>El texto «Simuladas y reales» se encima con la flecha del selector. |
| `cap4_dashboard_vivo.png` | `fig:dashboard_vivo` | **Real**, sesión 93, 2026-11-17 19:04:26, **67 de 144 puntos**. Escritorio y teléfono capturados en el mismo instante, cada uno con su propia sesión de usuario. | A la izquierda, la página completa de escritorio; a la derecha, el teléfono (los primeros 2086 px CSS de su página).<br>Se ven la etiqueta de modo, «Servidor en línea», **«Pico W en línea · midiendo»**, el panel (47 %, «Tiempo restante: ≈ 1 min 09 s»), las cuatro tarjetas, la gráfica de líneas, el mapa 3D, la sábana 3D y la tabla.<br>**Texto distinto:** la etiqueta dice **«Modo real»** (en el teléfono, solo «real»), no «REAL».<br>Los rótulos de las dos columnas se agregaron al componer. |
| `cap4_dashboard_vivo_escritorio.png`, `cap4_dashboard_vivo_movil.png` | (extras de `fig:dashboard_vivo`) | Las dos capturas reales por separado. | La de escritorio es la página completa; la del teléfono, solo la primera pantalla. |
| `cap4_dashboard_vivo_sim.png` y sus `_escritorio` / `_movil` | (versión anterior) | Firmware en la PC, sesión 91 de la copia, 2026-11-15. | La misma figura con datos simulados. |
| `cap4_sabana74.png`, `cap4_sabana74.svg` | `fig:sabana74` | Historial › sesión 74 › «Ver sábana 3D», exportada con los botones de la propia figura (cámara = PNG con escala 3; disquete = SVG), 2026-11-15 15:41, ventana de 1440 px. | \|B\| (módulo), vista «Huella máxima total», Viridis, tema claro.<br>**Datos de la sesión 74 comprobados** (coinciden con lo pedido): Pico W, DC, zona de 50 × 50 × 30 mm, paso de 10 mm, 144 de 144 puntos, 0 huecos, 0 saturadas, QMC5883P a 30 G, offset 0, firmware `pico-tms-2.0`, \|B\| de 126,0 a 236,4 µT.<br>**Diferencias:**<br>(1) En el historial la figura mide 1338 × 298 px, así que sale muy apaisada.<br>(2) La barra de color va de 126 a 236 µT (escala de toda la sesión), aunque la huella solo baja a unos 165 µT.<br>(3) El SVG trae la escena 3D como imagen incrustada; los ejes y la barra de color sí son vectoriales. |
| `cap4_sabana74_ventana800.png`, `cap4_sabana74_ventana800.svg` | (alternativa de `fig:sabana74`) | La misma exportación con la ventana a 800 px de ancho. | Figura de 698 × 298 px (≈ 2,3 : 1), más fácil de acomodar en la página. |
| `cap4_consola_caida_sim.png` | `fig:consola_caida` | **Firmware en la PC** con `--sin-wifi 10 24`, sesión 92 de la copia (32 puntos), 2026-11-15 15:45:44–15:46:08. | Arriba, las líneas 31–79 de la salida del firmware (recorte contiguo, sin editar): lotes confirmados, caída del Wi-Fi, reintentos con espera creciente de 250 a 8000 ms y reenvío del lote 16–32 («aceptadas 17, duplicadas 0»).<br>Abajo, el servidor: **«Sesión 92 finalizada (completa): 32 lecturas, 0 huecos.»**<br>El texto se dibujó en un marco tipo terminal; no es una captura de pantalla de una terminal.<br>**No se rehízo con la Pico real:** su consola está en Thonny, por USB, y no la leí para no interferir con el puerto. |
| `cap4_servicios_pi5.png` | `fig:servicios_pi5` | **No se hizo.** | No hay acceso a la Raspberry Pi 5. El sistema de hoy corría en la laptop, no en la Pi. |
| `cap4_app_movil.png` | `fig:app_movil` | En la carpeta `../capturas-tesis-app-movil/`. | Ahí están la versión real (sesión 93) y la simulada, con su propio `LEEME.md`. |

## Pies de figura que hay que revisar

Ahora son de un barrido real con la Pico 2W:

- `cap3_dashboard_control.png`
- `cap3_lineas_vivo.png`
- `cap3_mapa3d.png`
- `cap4_dashboard_vivo.png`
- `cap4_sabana74.*`
- la app en `../capturas-tesis-app-movil/cap4_app_movil.png`

Siguen siendo simuladas, con el sensor del firmware en la PC:

- `cap4_consola_caida_sim.png`
- todas las que llevan `_sim`

## Fotografías y capturas que te tocan

- `cap4_montaje_sensor.jpg` (`fig:montaje_sensor`).
- Foto de la Pi 5 con la terminal y de los dispositivos con el dashboard abierto (en lugar de `cap4_servicios_pi5.png`).
- Si quieres `fig:consola_caida` con la Pico real: una captura de Thonny durante una caída de red. Por ejemplo, apaga unos segundos el hotspot o el Wi-Fi a mitad de un barrido.
