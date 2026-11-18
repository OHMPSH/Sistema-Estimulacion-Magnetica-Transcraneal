# Capturas de la app móvil (TMS Monitor) para la tesis

Esta carpeta está separada de `capturas-tesis/`. Hay dos tandas:

- **Real (sin sufijo):** 2026-11-17, de 19:03 a 19:05.
- **Simulada (`_sim`):** 2026-11-16, de 20:37 a 20:39.

Todas las horas son del centro de México (UTC−6). No se modificó código.

## Cómo se tomaron (las dos tandas)

- **No es el APK en un teléfono.** En esta computadora no hay emulador de Android: el SDK no trae el emulador ni imágenes del sistema, y queda poco disco. Se usó la **vista web de la propia app** (`app/`, `npx expo start --web`, como dice `app/README.md` §3). Es el mismo código de React Native, dibujado con react-native-web, con las fuentes, los iconos y las gráficas SVG de la app.
  - Se abrió en Chromium (Playwright 1.56.1) con emulación de teléfono: 390 × 844, ×2, táctil.
  - En un Android real pueden cambiar detalles del sistema: barra de estado y forma de los selectores.
- Delante de la app iba un proxy del mismo origen (`/api` → servidor; lo demás → Metro). En la app se eligió «Conectar al servidor» con esa dirección y se entró como `admin` / `admin`, en tema **claro** (menú ☰).

### Tanda real (2026-11-17)

- **Sistema:** tu servidor en `:4000`, en modo real, con tu base `tms_db`.
- **Pico:** `pico-w-1` (firmware `pico-tms-2.2`) y el QMC5883P de verdad.
- **Sesión 93:** DC — rápida, zona de 50 × 50 × 30 mm, paso de 10 mm, 6 × 6 × 4 = 144 puntos, campo magnético.
  - La inicié desde el dashboard web de escritorio; la app la siguió en vivo por SSE.
  - Terminó completa a las 19:05:41: 144 de 144 puntos, 0 huecos y 0 saturadas.

### Tanda simulada (2026-11-16)

- Firmware corriendo en la PC (`ejecutar_pc.py`, sensor y motores simulados) contra una copia de tu base.
- Sesión 89 de la copia, con la misma malla.

## Archivos

| Archivo | Figura | Qué se ve |
|---|---|---|
| `cap4_app_movil.png` | `fig:app_movil` | **Real.** Composición lado a lado: «(a) Control del barrido» y «(b) Seguimiento de la sesión». Los rótulos se agregaron al componer. |
| `cap4_app_movil_control.png` | (a) | **Real**, 19:03:14, antes de iniciar.<br>Barra superior: «real», «en línea» y «Pico W en línea · en espera».<br>Velocidad DC — rápida, zona de 50 × 50 × 30 mm, paso de 10 mm (6 × 6 · 4 planos Z = 144 puntos) y campo magnético.<br>«Iniciar medición» activo y «Detener» deshabilitado.<br>«Duración estimada del barrido elegido: ≈ 2 min 20 s (0.97 s por punto, según 18 sesiones anteriores)». |
| `cap4_app_movil_seguimiento.png` | (b) | **Real**, sesión 93, 19:04:26, **67 de 144 puntos** (47 %).<br>«Pico W en línea · midiendo».<br>Progreso: «Midiendo el plano Z = 10 mm (86 % del plano)» y «Tiempo restante: ≈ 1 min 09 s, termina hacia las 19:05 (0.9 s por punto, según el ritmo actual)».<br>Indicadores: Estado «Adquiriendo» (Duración 01:09), Plano Z = 10 mm, \|B\| = 83.320 µT y, al pie, Posición (cortada).<br>Es el mismo instante que `../capturas-tesis/cap4_dashboard_vivo.png`. |
| `extra_app_lineas.png`, `extra_app_mapa3d.png`, `extra_app_sabana.png` | (extras) | **Reales**, sesión 93, tomados entre 19:04:30 y 19:04:32 (de 71 a 76 puntos): gráfica Bx · By · Bz, mapa 3D de puntos medidos y sábana 3D (\|B\|, huella máxima). |
| `cap4_app_movil_sim.png`, `cap4_app_movil_control_sim.png`, `cap4_app_movil_seguimiento_sim.png` | (versión anterior) | Las mismas pantallas con datos simulados (sesión 89 de la copia, 75 de 144 puntos). |
| `extra_app_modal_inicio_sim.png`, `extra_app_lineas_sim.png`, `extra_app_mapa3d_sim.png`, `extra_app_sabana_sim.png` | (extras, simulados) | Modal «Iniciar medición» con el resumen y botones «Cancelar» / «Sí, iniciar»; gráficas de la sesión simulada. El modal no se repitió en la tanda real porque la sesión se inició desde la web. |

## Diferencias y detalles

- La etiqueta de modo dice **«real»** (en minúsculas), no «REAL». El estado del servidor dice solo «en línea».
- La hora de fin sale en formato de 24 h («19:05»), mientras que la web usa «07:05 p.m.».
- En la sábana 3D de la app, los rótulos «Posición X [mm]» y «Posición Y [mm]» se enciman con algunas marcas del eje. Es cómo dibuja la app; no se corrigió.
- La captura de seguimiento corta la tarjeta «Posición de la última lectura» al pie: no cabe en una pantalla de 844 px junto con el progreso.
