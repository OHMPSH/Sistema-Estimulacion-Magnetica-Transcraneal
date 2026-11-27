# Guion de la exposición (base, sin el contenido de la tesis)

**Qué es:** la estructura de la exposición con el contenido técnico ya verificado (de [../00-dossier-proyecto.md](../00-dossier-proyecto.md) y [../01-cifras-reales.md](../01-cifras-reales.md)) y los huecos **[TESIS: …]** donde va la parte formal del trabajo escrito. El esqueleto HTML es [presentacion.html](presentacion.html) (se genera desde [plantilla.html](plantilla.html) con `node construir.mjs`).

**Duración, público y formato de la exposición: por confirmar.** El guion tiene 21 diapositivas (unos 20–25 minutos a ~1 minuto por diapositiva); se recorta fácil quitando la 8, la 12 o la 14.

**Convenciones:** mm reales (sistema ÷ 2); nombres de ejes de la web (X = eje largo, Y = eje corto). Las capturas del 2026-11-17 son de **antes** de la corrección de escala y del cambio de nombres: muestran mm del sistema y los nombres viejos. **Conviene volver a tomarlas con la versión actual** (o aclararlo en la diapositiva).

## Mapa de diapositivas y visuales

| # | Diapositiva | Diagrama (02-diagramas) | Figura Anatomy (03-anatomy) | Captura (img/) |
|---|---|---|---|---|
| 1 | Título | — | (a) como fondo, opcional | — |
| 2 | Problema | — | — | [TESIS: foto de la bobina TMS / montaje] |
| 3 | Objetivos | — | — | — |
| 4 | Metodología | — | — | — |
| 5 | Arquitectura general | 01-arquitectura (en la diapositiva va una versión en HTML, más legible) | (a) sistema completo | — |
| 6 | Hardware: la mesa | — | (a) sistema completo | [FOTO del montaje real] |
| 7 | Hardware: conexiones | 07-conexiones-hardware | — | — |
| 8 | El sensor QMC5883P | 09-viaje-de-una-lectura (primeras estaciones) | (c) viaje de una lectura | `cap3_config_sensor.png` |
| 9 | Firmware: bucle, PIO y DMA | 04-estados-pico | — | — |
| 10 | Firmware: serpentina y reanudación | 05-serpentina (aquí, dibujo propio en SVG) | (b) serpentina | — |
| 11 | Comunicación | 03-secuencia-medicion | (c) viaje de una lectura | — |
| 12 | Servidor y base de datos | 06-entidad-relacion, 02-despliegue | — | — |
| 13 | Interfaz web y app | — | — | `cap3_dashboard_control.png`, `cap3_lineas_vivo.png`, `cap3_mapa3d.png`, `cap4_dashboard_vivo_movil.png`, `cap4_app_movil.png`, `cap3_historial.png` |
| 14 | Previsualizador de la bobina | 08-previsualizador | (d) previsualizador | [captura nueva de «Previsualizar bobina»: no existe todavía] |
| 15 | Resultados: cifras | — | — | — |
| 16 | Resultados: el campo medido | — | — | `cap4_sabana74.png` + [TESIS: análisis] |
| 17 | Pruebas y problemas resueltos | — | — | — |
| 18 | Limitaciones | — | — | — |
| 19 | Conclusiones | — | — | — |
| 20 | Trabajo futuro | — | — | — |
| 21 | Cierre / preguntas | — | — | — |

## Guion por diapositiva

### 1. Título
- **[TESIS: título exacto de la tesis]**, **[TESIS: nombre del autor]**, **[TESIS: asesor(es)]**, IPN ESIME Zacatenco, **[TESIS: carrera y fecha de la exposición]**.
- Subtítulo propuesto: «SAVD: sistema de adquisición y visualización del campo magnético para un montaje de TMS».

### 2. Problema
- **[TESIS: contexto de la TMS, por qué importa conocer la distribución del campo, referencias]**.
- Lo que hace falta en la práctica: medir Bx, By, Bz en muchos puntos con la posición conocida, de forma repetible, sin perder lecturas y con varias personas mirando a la vez (dossier §1).
- *Nota del orador:* decir desde el principio que los sensores actuales son de prueba (no miden el pulso TMS): el sistema está hecho para cambiar de sensor.

### 3. Objetivos
- **[TESIS: objetivo general y objetivos específicos, tal como están en el trabajo escrito]**.
- Al lado de cada objetivo, la evidencia del sistema (completar cuando estén los objetivos): malla configurable, precisión posicional (pendiente de medir), tiempo real, trazabilidad, pruebas.

### 4. Metodología
- **[TESIS: metodología formal (enfoque, etapas, criterios, instrumentos)]**.
- Lo verificable del desarrollo: 8 fases incrementales del software (backend, login, configuración y simulador, Pico como cliente, trazabilidad, frontend, accesibilidad, pruebas y despliegue) y luego iteraciones con hardware: firmware 2.0 → 2.4 (dossier §8; CLAUDE.md §6).
- Verificación en capas: pruebas unitarias, firmware en el PC con *stubs*, integración contra una base de prueba, y 64 sesiones con la mesa real.

### 5. Arquitectura general
- Diagrama 01. Cuatro bloques: mesa (sensor, motores, drivers), Pico 2 W, servidor (MVC, ingesta, SSE, MariaDB), clientes (web y app).
- Idea clave: **nadie genera datos en el navegador**; el simulador y la Pico entran por la misma ingesta.

### 6. Hardware: la mesa
- Mesa XYZ con NEMA 17, husillos T8 y TB6600; recorridos **205 × 281 × 44 mm reales** (*por confirmar con la medición física*); 100 pulsos por mm real; crucero 30 mm/s; aceleración 150 mm/s²; holgura compensada 0,25 mm; sin finales de carrera; descanso (0, 0, 0) con Z abajo, junto a la bobina.
- **[FOTO del montaje real]** y figura Anatomy (a).
- *Nota:* explicar la corrección de escala ×2 (dossier §2.4) con honestidad.

### 7. Hardware: conexiones
- Diagrama 07: I2C en GP0/GP1, PUL/DIR en GP10–GP15, ENA común en GP16; Hall 49E en GP26 (firmware de prueba).
- Mencionar el problema de tierras del *shield* resuelto (2026-11-18).

### 8. El sensor QMC5883P
- Registros (0x00 Chip ID, 0x01–0x06 datos, 0x09 DRDY/OVFL, 0x0A modo, 0x0B rango), 200 Hz, rango ±30 G (1000 cuentas/G; 1 cuenta = 0,1 µT), promedio de 10 lecturas.
- Conversión en el servidor: µT = cuentas ÷ cuentas por G × 100 − offset.
- Anécdota útil: se vendía como HMC5883L y no lo era (dirección 0x2C).

### 9. Firmware: bucle, PIO y DMA
- Bucle cooperativo con generadores; PIO a 1 MHz y DMA: la mesa se mueve en hardware mientras sale un lote por Wi-Fi.
- Diagrama 04 (estados espera, homing, midiendo, calibrando, error).

### 10. Firmware: serpentina y reanudación
- Dibujo de la serpentina 3 × 2 × 2; entre puntos solo cambia un índice en ±1; Z sube por plano.
- Reanudación: `UNIQUE(sesión, seq)` + `ultimo_seq` en el latido → tras un reinicio sigue en `ultimo_seq + 1` sin duplicar.

### 11. Comunicación
- Diagrama 03: latido cada 5 s (la Pico se entera de la sesión), lotes de 25 lecturas o 3 s, reintento del mismo lote (0,25 → 8 s), cierre automático al llegar todos los seq.
- SSE con id y búfer de 2000 eventos: un navegador que se desconecta recupera lo perdido.

### 12. Servidor y base de datos
- Node.js + Express (MVC), MariaDB (6 tablas), Nginx con HTTPS; roles admin/operador/observador, contraseñas con scrypt, token de la Pico guardado como SHA-256.
- Trazabilidad: cada sesión guarda copias de la configuración, versiones de software y firmware, puntos esperados y recibidos, huecos.

### 13. Interfaz web y app
- Capturas: dashboard (control, líneas, mapa 3D), teléfono, app Android, historial.
- *Nota:* las capturas son anteriores a la escala ×2 y al cambio X ↔ Y.

### 14. Previsualizador de la bobina
- Diagrama 08 o figura (d): sliders → objetivo → la mesa va al punto → medidor del rango con avisos (saturado, ≥ 80 %, < 2 %).
- Problema resuelto: con 150 ms entre peticiones la Pico se apagaba; ahora 1 petición por segundo. **Prueba en la mesa: por confirmar.**

### 15. Resultados: cifras
- 97 sesiones (33 simuladas, 64 reales); 30 667 lecturas (5 402 reales).
- 26 barridos reales completos; el más grande, **777 puntos en 9 min 26 s** (sesión 113).
- **0,97 s por punto** (mediana; 0,72–1,53 s).
- **0 huecos desde la sesión 70**: ninguna lectura perdida por la red, aun con pausas de Wi-Fi; los 92 huecos de antes fueron saturaciones con el firmware 2.0.

### 16. Resultados: el campo medido
- Sábana 3D de una sesión real (`cap4_sabana74.png`).
- **[TESIS: análisis físico del campo medido: forma, máximos, comparación con el modelo de espira, incertidumbre]**.

### 17. Pruebas y problemas resueltos
- 71/71 unitarias del servidor, 32/32 del firmware en el PC, 11/11 de integración, firmware del Hall «TODO BIEN».
- Tres problemas: cuelgue del DMA en el RP2350 (dirección de CHAN_ABORT), tierras del *shield*, ritmo del previsualizador.

### 18. Limitaciones
- **Apagones esporádicos de la Pico 2 W, sin diagnóstico** (alimentación, contacto del *shield*, radio Wi-Fi o ruido de los TB6600: sospechas).
- Escala ×2 corregida solo en la web; sin finales de carrera; error posicional (±1 mm) sin medir; sensores de prueba; servidor todavía en la laptop; app sin los cambios del 2026-11-24.

### 19. Conclusiones
- **[TESIS: conclusiones formales, una por objetivo]**.
- Borrador apoyado en los datos: el sistema mide, guarda y muestra en vivo sin perder lecturas; funciona con la mesa real desde la 2.0; simulación y realidad comparten el mismo camino de datos.

### 20. Trabajo futuro
- **[TESIS: trabajo futuro que proponga el escrito]**.
- Diagnosticar los apagones; corregir la escala en el firmware o en la mecánica; finales de carrera; medir el error posicional; sensor adecuado al pulso TMS; Raspberry Pi 5; actualizar la app.

### 21. Cierre
- «Gracias» y preguntas; **[TESIS: agradecimientos, contacto]**. Opcional: demo en vivo (simulación, o la mesa si está disponible).
