# 00 — Índice y guía para el revisor

Este conjunto de documentos es el informe técnico completo del Sistema de Adquisición y Visualización de Datos (SAVD) para la caracterización del campo magnético en un montaje de estimulación magnética transcraneal (TMS) sobre un *phantom* de solución salina, desarrollado como trabajo de tesis de ingeniería en el IPN, ESIME Zacatenco. Describe el sistema tal como se encuentra el 14 de noviembre de 2026 y está pensado para que una persona sin acceso al código pueda contrastarlo con un avance de tesis anterior.

---

## 1. Índice de archivos

| Archivo | Contenido |
|---|---|
| `00-indice-y-guia-para-el-revisor.md` | Este índice, los criterios del informe y la forma de usarlo para comparar con el avance de tesis. |
| `01-resumen-y-alcance.md` | Qué es el sistema, qué problema resuelve, objetivos, alcance, límites, qué es simulado y qué es real, y un resumen del estado actual. |
| `02-arquitectura-general.md` | Diagrama de bloques completo, patrones de arquitectura, recorrido de una medición de punta a punta y doble montaje de rutas en el servidor. |
| `03-hardware.md` | Componentes físicos, cableado con pines, mecánica de la mesa, cálculo de resolución y velocidad, y red. |
| `04-sensores-y-medicion.md` | Magnetómetro QMC5883P, sensor Hall 49E, conversión de cuentas a unidades físicas y la historia del sensor. |
| `05-firmware-pico-w.md` | Firmware en MicroPython de la Raspberry Pi Pico W: módulos, bucle cooperativo, PIO y DMA, máquina de estados, serpentina, búfer, reanudación y programas de prueba. |
| `06-protocolo-de-comunicacion.md` | Token del dispositivo, latido, envío por lotes, eventos SSE y diagramas de secuencia. |
| `07-backend.md` | Servidor Node.js/Express: tecnologías, capas, servicios, API completa, reglas de negocio, configuración y modos de operación. |
| `08-base-de-datos.md` | Esquema de MariaDB, diagrama entidad-relación, decisiones de diseño y migraciones 001 a 009. |
| `09-modelo-fisico-y-simulacion.md` | Modelo de la espira circular con integrales elípticas, generador pseudoaleatorio, ruido y verificación del simulador. |
| `10-geometria-de-la-malla.md` | Zona de muestreo, paso libre, número de puntos, límites y recorrido en serpentina. |
| `11-frontend.md` | Interfaz web en React: pantallas, roles, cada gráfica en detalle, temas, accesibilidad y rendimiento. |
| `12-seguridad-usuarios-y-roles.md` | Roles y permisos, contraseñas, cookie de sesión, límite de intentos, token de la Pico, CORS y HTTPS. |
| `13-despliegue-e-infraestructura.md` | Instalación en la Raspberry Pi 5, Nginx, systemd, compilación, acceso por IP o por nombre, desarrollo frente a producción y respaldos. |
| `14-pruebas-y-verificacion.md` | Estrategia de pruebas, cifras reales, pruebas con hardware y estadísticas de las sesiones guardadas. |
| `15-metodologia.md` | Desarrollo incremental por fases, control de versiones y criterios de diseño. |
| `16-evolucion-y-cambios.md` | **El más importante para la revisión.** Cronología, tabla «antes → ahora → motivo», términos obsoletos y contradicciones encontradas. |
| `17-limitaciones-pendientes-y-trabajo-futuro.md` | Lo que falta, cuestiones abiertas y mejoras posibles. |
| `18-tecnologias-y-glosario.md` | Tecnologías con versión y licencia, y glosario de términos y siglas. |

Cada archivo puede leerse por separado: todos empiezan con un párrafo de contexto y terminan con una sección «Fuentes en el proyecto» que solo sirve para trazabilidad.

---

## 2. Criterios del informe

### 2.1 Separador decimal y formato numérico

- **Separador decimal: coma** (por ejemplo, 0,04 mm; 249,6 µT). En las ecuaciones en LaTeX se escribe como `{,}`, por ejemplo $0{,}04$.
- **Separador de miles: espacio fino** (por ejemplo, 25 000 puntos; 1 710,7 kB).
- Los rangos se escriben con guion largo o con «a» (de 0 a 410 mm; 0–410 mm).
- Los identificadores del código (nombres de archivos, de funciones, de campos JSON y de columnas) se escriben en `letra monoespaciada` y conservan el punto decimal cuando aparecen en valores literales del protocolo, porque así los envía el sistema (por ejemplo, `"paso_mm": 7.5`).

### 2.2 Unidades

Se usan las unidades del Sistema Internacional con su símbolo: mm, µT, mT, T, Hz, kHz, ms, µs, s, V, mV, A, kB. Se usa además el gauss (G), porque es la unidad que emplean las hojas de datos de los magnetómetros:

$$1\ \text{G} = 100\ \mu\text{T} = 0{,}1\ \text{mT} = 10^{-4}\ \text{T}$$

En todo el sistema, las posiciones están en milímetros, el campo magnético en microtesla y los tiempos en UTC (tiempo universal coordinado).

### 2.3 Convención de estados

Cada función, prueba o componente se clasifica con una de estas tres etiquetas:

| Etiqueta | Significado |
|---|---|
| **Verificado** | Implementado y comprobado en funcionamiento real: con el hardware (Pico W, mesa, sensor) o con el servidor y la interfaz reales en un navegador. |
| **Solo simulación/PC** | Implementado y comprobado únicamente con el simulador del servidor, con el emulador de la Pico W o con el firmware ejecutado en una computadora con el hardware simulado. |
| **Pendiente** | No implementado, implementado pero sin ninguna verificación, o decisión todavía abierta. |

Las afirmaciones sobre pruebas con hardware se basan en tres fuentes: las sesiones reales guardadas en la base de datos local (consultadas solo con `SELECT`), la confirmación del tesista sobre el resultado de esas pruebas y la documentación del proyecto. Cuando las fuentes discrepan, el informe lo indica.

### 2.4 Fecha de corte

El informe describe el estado del repositorio el **14 de noviembre de 2026**, incluidos los cambios todavía no registrados en git (el archivo 16 distingue lo registrado de lo pendiente de registrar). Si el código y la documentación se contradicen, **manda el código**, y la contradicción se anota en el archivo 16.

---

## 3. Cómo usar el archivo de evolución para comparar con el avance de tesis

El archivo `16-evolucion-y-cambios.md` está organizado para contrastarlo con un texto anterior:

1. **Cronología con fechas y commits.** Sitúa cada cambio en el tiempo. La primera versión del sistema data de junio de 2026; casi todo lo que hoy existe se construyó entre el 9 y el 14 de noviembre de 2026. Si el avance de tesis es anterior a noviembre, describe un sistema muy distinto del actual.
2. **Tabla «antes → ahora → motivo».** Para cada afirmación del avance (componente, tecnología, procedimiento, cifra), conviene buscarla en la columna «antes». Si aparece, la columna «ahora» da la descripción vigente y la columna «motivo», la justificación que puede citarse en la tesis.
3. **Términos obsoletos.** Lista de nombres que un texto anterior pudo usar (por ejemplo, «Raspberry Pi Pico 2 W», «HMC5883L», «superficie de |B|», «mapa de flechas», «paso de 0,5 cm») con su equivalente actual.
4. **Contradicciones entre documentación y código.** Ayudan a no copiar en la tesis un dato desactualizado de algún documento del proyecto.

Para plasmar cada función en la tesis, los archivos 03 a 13 dan la descripción técnica completa, y el 14 indica con qué evidencia está verificada cada una.

---

## Fuentes en el proyecto

- Estructura del repositorio y estado de git (`git status`, `git log`).
- Bitácora de desarrollo del proyecto (archivo de contexto en la raíz del repositorio).
- Todos los archivos citados en las secciones «Fuentes en el proyecto» de los documentos 01 a 18.
