# 17 — Limitaciones, pendientes y trabajo futuro

Este documento reúne lo que le falta al SAVD al 14 de noviembre de 2026: las pruebas pendientes con el hardware, las funciones que no se implementaron o quedaron a medias, las cuestiones de diseño que siguen abiertas, las limitaciones conocidas del sistema actual y las mejoras posibles. Sirve para la sección de trabajo futuro de la tesis y para no presentar como terminado algo que no lo está.

---

## 1. Pruebas pendientes con el hardware

| Pendiente | Detalle |
|---|---|
| Barrido completo con el firmware vigente | La versión `pico-tms-2.2` (punto de inicio enviado por el servidor, ejes X corto e Y largo, sentidos X+, Y+, Z+ y posición de descanso del código) solo se probó en la mesa con recorridos cortos interrumpidos a propósito (sesiones 76 a 82). |
| Posición de descanso y orden de los ejes | Confirmar en la mesa que la posición de descanso del código, (0, 0, 0), es la posición física correcta, y que el regreso al descanso (que mueve Z primero) no cruza la mesa con el sensor abajo. Unificar después la documentación y el texto de la página, que todavía indican (0, 562, 88). |
| Error posicional | Medir numéricamente el error de cada eje con un calibrador o reloj comparador (requisito de ±1 mm), la repetibilidad ida y vuelta y el juego del husillo, y ajustar la holgura de 0,5 mm si hace falta. Hoy la calibración de 50 pulsos/mm está confirmada solo cualitativamente. |
| Barrido de 845 puntos | No hay ningún barrido real completo de la malla estándar de 60 × 60 × 20 mm con paso de 5 mm; su duración (unos 10 a 11 min) es una estimación. |
| Servidor en la Raspberry Pi 5 | Instalar con la guía y operar con Nginx, HTTPS, el certificado autofirmado y el servicio de systemd. Hasta ahora, las pruebas reales usaron el backend en la laptop de desarrollo. |
| Hotspot del iPhone | Probar la red prevista: la Pico en 2,4 GHz con «Maximizar compatibilidad», varios usuarios a la vez desde laptops y teléfonos, y un posible cambio de IP. |
| `tms.local` desde la Pico | Comprobar si la versión de MicroPython instalada resuelve nombres mDNS; si no, usar la IP. |
| Corte de luz y reanudación en la mesa | La reanudación en `ultimo_seq + 1` se verificó en la computadora; en la mesa exige que el operador devuelva la mesa a la posición de descanso antes de reiniciar. |
| Búfer de 74HCT245 | Si algún motor pierde pasos con los 3,3 V de la Pico, instalar el búfer recomendado (sobre todo para la línea ENA común de los tres drivers). |

---

## 2. Funciones no implementadas o a medias

| Función | Situación |
|---|---|
| «Medir cero» del sensor desde la interfaz | Pendiente: el servidor no tiene un endpoint para pedir a la Pico que mida el fondo. Hoy el fondo se mide al arrancar la Pico (o con BOOTSEL), se lee en la consola y se copia a mano en el *offset* de Configuración › Sensor. |
| Varias lecturas por punto | El servidor y el firmware admiten `lecturas_por_punto` de 1 a 100 (varias lecturas con la misma posición y `seq` distintos), pero falta decidir si se promedian en la Pico o en el servidor, y las gráficas muestran la última lectura de cada punto. Ninguna sesión real ha usado más de una. |
| Física de la solución salina | El simulador usa la misma espira en el vacío para los dos medios; el medio es solo una etiqueta. Simular la solución salina con voltaje con otra física es una cuestión abierta. |
| Valor del voltaje de la solución salina | Solo se guarda el medio, no el voltaje aplicado. |
| Finales de carrera | Previstos en el código (homing con aproximación rápida, retroceso y aproximación lenta) y en los pines GP18–GP20, pero no instalados. Sin ellos, un paso perdido desplaza la referencia de forma permanente. |
| Varios dispositivos | La base de datos admite varias Picos, pero el servidor y la interfaz trabajan solo con el dispositivo principal. |
| Borrado definitivo de sesiones | No está en la API; se hace con una consulta SQL documentada en la guía de instalación. |
| Migración 001 en la base local | La conversión a UTC de las sesiones antiguas (anteriores a la Fase 1) no se ha ejecutado; su ejecución es decisión del tesista. Esas sesiones siguen con las fechas en hora local. |

---

## 3. Cuestiones abiertas

- **Quién controla los motores y quién informa la posición.** El supuesto vigente, que es como está implementado, es que la Pico W mueve la mesa y envía la posición nominal ($x$, $y$, $z$ de la zona) con cada lectura. No hay realimentación de posición (codificadores).
- **Cómo se mueve el eje Z** en el montaje definitivo con la bobina y el *phantom*.
- **Simulación de la solución salina** (sección 2).
- **Promediado con varias lecturas por punto** (sección 2).
- **Orientación del sensor respecto a la mesa:** fijar y documentar la correspondencia entre los ejes serigrafiados del QMC5883P y los de la mesa, y repetir el fondo si cambia.

---

## 4. Limitaciones conocidas del sistema actual

| Limitación | Consecuencia o mitigación |
|---|---|
| Sensores de prueba | El QMC5883P (200 Hz, hasta 30 G) y el Hall 49E (un eje, resolución de unos 0,09 mT) sirven para validar el sistema; el diseño permite cambiar el sensor (crudos guardados y conversión por modelo en el servidor). |
| Aliasing con corriente alterna | A 200 Hz de muestreo, una bobina alimentada a 50/60 Hz produce lecturas falsas; con el QMC5883P conviene usar corriente continua o variaciones lentas. |
| Unidades de las sesiones del Hall | El número guardado y mostrado como µT corresponde a mT; conviene anotarlo en las notas de cada sesión. Además, exige poner el modelo HMC5883L antes de medir. |
| Sin finales de carrera | La referencia depende de que el operador deje la mesa en la posición de descanso antes de arrancar; la parada brusca estima por tiempo los pasos dados. |
| Hora de la Pico | NTP con resolución efectiva de 1 s; el servidor guarda además su propia hora de recepción. |
| Parada desde el dashboard | Llega a la Pico con el siguiente latido (hasta 5 s después). |
| Lecturas pendientes al detener | Si el operador detiene la sesión, la Pico descarta las lecturas que aún no había enviado. |
| Estado en memoria | La configuración en caché, la sesión abierta, el límite de intentos y el búfer de eventos SSE suponen un solo proceso; reiniciar el servidor reinicia el límite de intentos y obliga a los navegadores a resincronizarse. |
| Datos anteriores a la Fase 5 | Las mediciones guardadas antes de la migración 005 conservan el error de float32; sus huecos no se calcularon. |
| Encabezado del CSV | La línea `unidades` menciona siempre las cuentas del HMC5883L, aunque la sesión sea del QMC5883P (el modelo correcto está en la línea `sensor_modelo`). |
| Opción sin efecto | `visualizacion.escala_superficie` se guarda y valida, pero la interfaz ya no la usa. |
| Cuenta de administrador predeterminada | Cualquiera en la red que conozca esas credenciales puede entrar como administrador (decisión consciente del proyecto). |
| Certificado autofirmado | Cada equipo debe aceptar el aviso del navegador la primera vez. |
| Vulnerabilidades solo de desarrollo | Dos moderadas en una dependencia de nodemon y otras en esbuild/Vite; no llegan a la Raspberry (se instala sin dependencias de desarrollo) y corregirlas exigiría subir Vite de versión mayor. En producción, `npm audit` reportaba 0 en el servidor y en el frontend (10 nov 2026). |

---

## 5. Mejoras posibles

- Endpoint y botón «Medir cero» que pidan a la Pico, en el siguiente latido, medir el fondo y lo guarden como *offset*.
- Decidir y aplicar el promediado de varias lecturas por punto, y mostrar su dispersión.
- Finales de carrera para un homing real y la recuperación de la referencia tras un paso perdido.
- Corregir el texto fijo del encabezado del CSV para que dependa del modelo del sensor de la sesión.
- Actualizar el README, la guía de instalación (sección de la Pico), los documentos del firmware y el texto de ayuda de Configuración › General con la posición de descanso real.
- Comparar en las pruebas del firmware la secuencia de puntos con la del servidor uno a uno (hoy se compara el conjunto y, aparte, el vector del contrato).
- Mostrar en el historial la superficie de una sesión pasada junto a otra para compararlas.
- Paginar `GET /api/sesiones` si el historial crece mucho.
- Traducir a lenguaje llano los mensajes 422 del servidor, que hoy nombran el campo técnico.
- Pasar Lighthouse o axe cuando puedan instalarse, y añadir los colores actuales de los datos a la tabla de contraste.
- Simulación específica de la solución salina, si se define la física.
- Quitar del servidor la opción `escala_superficie` o volver a usarla.

---

## Fuentes en el proyecto

- Bitácora de desarrollo del proyecto (notas de las Fases 2 a 8, cuestiones abiertas y vulnerabilidades)
- `firmware/README.md` (secciones 10 y 12), `firmware/config.py`, `firmware/main.py`, `firmware/motores.py`
- `docs/sensor-qmc5883p.md` (sección 5), `docs/firmware-pico-w.md` (secciones 5 a 7)
- `server/controllers/mediciones.controller.js`, `server/services/validacionConfiguracion.js`, `server/services/dispositivo.js`
- `frontend/src/pages/ConfiguracionPage.jsx`
- `COMANDOS.md` (secciones 3 y 13)
- Base de datos local `tms_db` (sesiones reales 59 a 82)
