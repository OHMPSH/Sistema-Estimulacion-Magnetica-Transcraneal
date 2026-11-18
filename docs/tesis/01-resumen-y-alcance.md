# 01 — Resumen y alcance del sistema

Este documento presenta el Sistema de Adquisición y Visualización de Datos (SAVD) del proyecto de tesis sobre la caracterización del campo magnético en un montaje de estimulación magnética transcraneal (TMS) sobre un *phantom* de solución salina (IPN, ESIME Zacatenco). Resume qué hace el sistema, qué problema resuelve, cuáles son sus objetivos y límites, qué partes son simuladas y cuáles reales, y en qué estado se encuentra cada una al 14 de noviembre de 2026.

---

## 1. Qué es el sistema

El SAVD es una plataforma de instrumentación distribuida que automatiza el mapeo tridimensional de un campo magnético. Un sensor montado en una **mesa cartesiana de tres ejes** recorre una malla de puntos dentro de una **zona de muestreo** que el operador elige en cada sesión; en cada punto se miden las tres componentes del campo $B_x$, $B_y$ y $B_z$ (en µT) y se calcula su módulo $|B|$. Las lecturas viajan por Wi-Fi hasta un servidor, que las valida, las convierte a unidades físicas, las guarda en una base de datos con todos sus metadatos y las difunde en tiempo real a los navegadores de varias personas a la vez.

El sistema tiene cuatro partes:

| Parte | Componente | Función |
|---|---|---|
| Adquisición | Raspberry Pi Pico W (RP2040) con firmware en MicroPython, un magnetómetro triaxial QMC5883P (o un sensor Hall 49E de un eje) y una mesa XYZ con motores NEMA 17 y drivers TB6600 | Mueve el sensor punto por punto en serpentina, mide y envía lotes de lecturas crudas al servidor. |
| Servidor | Raspberry Pi 5 con Nginx (proxy inverso con HTTPS), Node.js + Express (arquitectura MVC) y MariaDB | Autentica a usuarios y al dispositivo, administra las sesiones de medición, convierte y guarda las lecturas, difunde los eventos en vivo y exporta CSV. Incluye un simulador físico del barrido. |
| Base de datos | MariaDB | Guarda sesiones, mediciones (con cuentas crudas), usuarios, configuración y el estado del dispositivo, todo en UTC. |
| Interfaz | Aplicación web en React 18 con Vite 5, Bootstrap 5, Chart.js, Three.js y Plotly | Dashboard en vivo con cinco vistas de datos, historial de mediciones, configuración por secciones y administración de usuarios, con tema oscuro, claro o del sistema. |

---

## 2. Problema que resuelve

Caracterizar el campo de una bobina de TMS sobre un *phantom* exige medir el campo en cientos de posiciones con una separación regular y registrar con precisión dónde y cuándo se tomó cada lectura. Hacerlo a mano es lento, propenso a errores de posicionamiento y de transcripción, y no permite ver el resultado mientras se mide. El sistema resuelve estos problemas:

1. **Automatiza el posicionamiento**: la mesa recorre la malla sin intervención, con límites de software que impiden salir del recorrido físico.
2. **Automatiza el registro**: cada lectura llega al servidor con su posición, su número de secuencia y su hora, y se guarda sin redondear, junto con sus cuentas crudas.
3. **Da retroalimentación inmediata**: todos los observadores ven el barrido en vivo, desde laptops o teléfonos conectados a la misma red, sin que nadie tenga que estar frente a la computadora de control.
4. **Garantiza trazabilidad y reproducibilidad**: cada sesión guarda una copia de la configuración con la que se midió, la versión del software y del firmware, quién la inició, los puntos esperados y recibidos y la lista de posiciones sin lectura válida.
5. **Permite trabajar sin hardware**: un simulador físico en el servidor genera barridos realistas para probar todo el sistema y la interfaz.

---

## 3. Objetivos

### 3.1 Objetivo general

Desarrollar un sistema de adquisición y visualización de datos, distribuido y con acceso multiusuario, que automatice el mapeo tridimensional del campo magnético en un montaje de TMS sobre un *phantom* de solución salina, con trazabilidad completa de cada medición.

### 3.2 Objetivos específicos (tal como están implementados)

1. Controlar una mesa cartesiana XYZ con motores paso a paso para posicionar un sensor en una malla configurable, con un error posicional objetivo menor que ±1 mm.
2. Leer un magnetómetro triaxial por I²C (QMC5883P) y, como alternativa de prueba, un sensor Hall analógico (49E), y enviar las lecturas crudas por Wi-Fi con un protocolo robusto ante pérdidas de conexión.
3. Implementar un servidor con arquitectura MVC que valide, convierta, almacene y difunda las mediciones, con autenticación por roles y un único origen de datos.
4. Diseñar una base de datos relacional que conserve los datos crudos, los metadatos de reproducibilidad y la configuración de cada sesión.
5. Construir una interfaz web en tiempo real con gráficas de líneas, un mapa 3D de puntos medidos, una superficie 3D del campo («sábana 3D»), una tabla y tarjetas de indicadores, accesible desde varios dispositivos a la vez.
6. Incorporar un simulador físico del campo de una espira circular para validar el sistema sin hardware.
7. Documentar la instalación del sistema en una Raspberry Pi 5 y verificarlo con pruebas automatizadas.

---

## 4. Alcance y límites

### 4.1 Dentro del alcance

- Zona de muestreo elegida por sesión (X × Y × Z en mm), limitada por los límites de la base que configura un administrador.
- Paso de medición libre en mm (con un decimal, a partir de 1 mm), igual en X, Y y Z; hasta 25 000 puntos por sesión.
- Dos velocidades de barrido (DC, rápida; AC, normal), que en la simulación fijan el ritmo por punto, y dos medios como etiqueta de la sesión (campo magnético o solución salina con voltaje).
- Dos modos de operación del sistema: **simulación** (el servidor genera los datos) y **real** (la Pico W los mide).
- Dos modelos de sensor en el servidor: QMC5883P (el módulo real, por defecto) y HMC5883L (formato de cuentas que usa el firmware del sensor Hall).
- Tres roles de usuario (administrador, operador y observador).
- Historial con filtros, notas, borrado lógico y restauración, exportación CSV con metadatos y visualización 3D de sesiones pasadas.

### 4.2 Fuera del alcance o con límites explícitos

- **Sensores de prueba.** El QMC5883P y el Hall 49E son sensores de prueba que sirven para validar el funcionamiento completo del sistema (posicionamiento, adquisición, transmisión, almacenamiento y visualización). El sistema está diseñado para que el sensor se pueda cambiar: el servidor guarda las cuentas crudas y convierte con la configuración copiada en cada sesión.
- **Física del medio.** El simulador usa la misma física (espira circular en el vacío) para los dos medios; el medio es solo una etiqueta de la sesión.
- **Sin finales de carrera.** La mesa no tiene interruptores de límite instalados: la posición al arrancar se toma como referencia y los límites son de software.
- **Una sola mesa.** La base de datos admite varios dispositivos, pero el servidor y la interfaz trabajan con uno solo (el principal).
- **Un solo proceso de servidor.** El estado en memoria (configuración, sesión abierta, límite de intentos, búfer de eventos) supone un único proceso, que es lo adecuado para la Raspberry Pi 5 del laboratorio.

---

## 5. Qué es simulado y qué es real

| Elemento | Simulado | Real |
|---|---|---|
| Origen de los datos | Simulador del servidor: espira circular exacta (integrales elípticas), ruido gaussiano con semilla, huecos y saturaciones inyectables | Pico W con QMC5883P (o Hall 49E) sobre la mesa XYZ |
| Posicionamiento | No hay movimiento: las posiciones salen de la malla | Mesa con NEMA 17, TB6600 y husillos T8, controlada por PIO y DMA |
| Ritmo | `ms_por_punto` configurable (60 ms en DC y 120 ms en AC por defecto) | Lo marca la mesa: unos 0,73 a 1,05 s por punto según las sesiones guardadas |
| Ingesta | La misma (`services/ingesta.js`): validación, numeración, saturación, \|B\|, guardado y difusión | La misma, más la conversión de cuentas crudas a µT con la copia del sensor de la sesión |
| Interfaz | Idéntica; la barra superior muestra la etiqueta SIMULACIÓN | Idéntica; muestra REAL y el estado de la Pico W |
| Etiqueta en la base | `origen = 'sim'` | `origen = 'hw'` |

La regla de diseño es que **los navegadores nunca generan datos**: solo dibujan lo que difunde el servidor. Así, simulación y realidad recorren el mismo camino desde la ingesta hasta la pantalla, y no se pueden mezclar.

Además existen dos herramientas de prueba sin hardware: un **emulador de la Pico W** en Node.js (habla el mismo protocolo, con pérdidas y duplicados configurables) y la ejecución del **firmware real en una computadora** con los módulos de hardware sustituidos por imitaciones (motores, Wi-Fi y un QMC5883P falso).

---

## 6. Resumen del estado actual (14 de noviembre de 2026)

| Componente o función | Estado | Evidencia |
|---|---|---|
| Servidor: login, roles, sesiones, ingesta, SSE, CSV, borrado lógico | **Verificado** | 66 pruebas unitarias aprobadas el 14 de noviembre de 2026; 10 pruebas de integración aprobadas según la documentación; uso real en todas las sesiones guardadas |
| Simulador del servidor | **Verificado** | 33 sesiones simuladas en la base (25 265 lecturas); comparación del CSV con el simulador con tolerancia de $10^{-9}$ |
| Interfaz web (dashboard, historial, configuración, temas) | **Verificado** | Uso en el navegador durante todas las fases; revisión de diseño y contraste AA documentada |
| Firmware del Hall 49E (`firmware_hall_1d/`) con la mesa | **Verificado** | Sesiones reales 59, 62, 64 y 65 completas; el tesista confirma resultados correctos |
| Firmware principal con QMC5883P y serpentina (versión `pico-tms-2.0`) con la mesa | **Verificado** | Sesiones reales 67, 69, 72, 73 y 74 completas; el tesista confirma que la mesa se movió bien |
| Calibración de pulsos por milímetro (50 pulsos/mm) | **Verificado** (cualitativo) | El tesista confirma que cada eje avanza lo correcto; no hay registro numérico del error |
| Cierre automático de sesiones reales al completar la malla | **Verificado** | Las sesiones reales completas se cerraron solas con todos sus puntos |
| Firmware `pico-tms-2.1`/`2.2` (punto de inicio configurable, nombres de ejes, descanso) | **Solo simulación/PC**, con pruebas cortas en la mesa | Sesiones 76 a 82: recorridos cortos interrumpidos a propósito por el tesista para comprobar el arranque; ningún barrido completo |
| Instalación en la Raspberry Pi 5 con Nginx y systemd | **Solo simulación/PC** | Probada en la computadora de desarrollo con una copia de la configuración de Nginx en puertos altos; falta la instalación en la Raspberry |
| Acceso simultáneo desde el hotspot del teléfono | **Pendiente** | Verificado con varias pestañas y navegadores en desarrollo; las pruebas con la mesa se hicieron en la red Wi-Fi del laboratorio |
| «Medir cero» del sensor desde la interfaz, promedio de varias lecturas por punto, física distinta para la solución salina | **Pendiente** | Ver el archivo 17 |

---

## Fuentes en el proyecto

- `README.md`, `COMANDOS.md`
- Bitácora de desarrollo del proyecto (archivo de contexto en la raíz del repositorio)
- `firmware/config.py`, `firmware/README.md`, `firmware_hall_1d/README.md`
- `server/services/*.js`, `server/setup_db.sql`, `server/package.json`
- `frontend/src/pages/*.jsx`, `frontend/package.json`
- Base de datos local `tms_db` (consultas `SELECT` del 14 de noviembre de 2026)
- Resultado de `npm test` en `server/` y de las pruebas de `firmware/pruebas_pc/` (14 de noviembre de 2026)
