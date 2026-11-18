# 18 — Tecnologías y glosario

Este documento reúne en una tabla todas las tecnologías, bibliotecas y herramientas del SAVD, con su versión, su licencia, su propósito y la alternativa descartada cuando la hubo, y un glosario de los términos técnicos y las siglas que aparecen en el informe. Las versiones son las instaladas el 14 de noviembre de 2026 (entre paréntesis, la versión declarada en `package.json` cuando difiere).

---

## 1. Tecnologías, bibliotecas y herramientas

### 1.1 Hardware y firmware

| Tecnología | Versión | Licencia | Propósito | Alternativa descartada |
|---|---|---|---|---|
| Raspberry Pi 5 | — | — | Servidor (Nginx, Node.js, MariaDB) | — |
| Raspberry Pi OS | 64 bits (basado en Debian) | Varias (software libre) | Sistema operativo del servidor | — |
| Raspberry Pi Pico W (RP2040) | — | — | Microcontrolador con Wi-Fi | Pico 2 W (RP2350), mencionada en textos tempranos |
| MicroPython | ≥ 1.22 (por `rp2.DMA`) | MIT | Lenguaje del firmware de la Pico | C++ (mencionado en el README original) |
| PIO y DMA del RP2040 | — | — | Generación de pulsos de paso en hardware | Pulsos por software (bloqueantes), usados solo en el programa de calibración |
| QMC5883P | — | — | Magnetómetro triaxial de prueba (I²C, 0x2C) | HMC5883L (era lo que se esperaba comprar) |
| Hall 49E (SS49E) | — | — | Sensor Hall lineal de un eje de prueba | — |
| TB6600 | — | — | Drivers de los motores paso a paso | — |
| NEMA 17 + husillo T8 | — | — | Motores y transmisión de la mesa XYZ | — |
| Thonny | — | MIT | Editor y consola para la Pico | — |
| mpremote | — | MIT | Copia de archivos a la Pico por línea de comandos | — |
| Python 3 (CPython) | — | PSF | Ejecución del firmware en la computadora para las pruebas (no se usa en el servidor) | — |

### 1.2 Servidor

| Tecnología | Versión | Licencia | Propósito | Alternativa descartada |
|---|---|---|---|---|
| Node.js | 20 LTS en la Raspberry; 22.23.4 en desarrollo (`>= 20.0.0`) | MIT | Entorno de ejecución del backend | — |
| Express | 4.22.3 (`^4.19.2`) | MIT | Marco HTTP con el patrón MVC | — |
| mysql2 | 3.24.6 (`^3.10.0`) | MIT | Cliente de MariaDB con promesas, *pool*, transacciones y *streaming* | — |
| cors | 2.8.6 (`^2.8.5`) | MIT | Política CORS | — |
| dotenv | 16.6.1 (`^16.4.5`) | BSD-2-Clause | Variables de entorno desde `.env` | — |
| nodemon | 3.1.14 (`^3.1.4`), solo desarrollo | MIT | Reinicio automático al editar | — |
| `node:crypto` (`scrypt`, `randomBytes`, `createHash`, `timingSafeEqual`) | Incluido en Node.js | MIT | Contraseñas, tokens y hashes | bcrypt, passport, express-session, cookie-parser |
| `node:test` y `node:assert` | Incluidos en Node.js | MIT | Pruebas unitarias y de integración | Vitest, Jest |
| Validadores escritos a mano | — | — | Validación de entradas (400/422) | zod, ajv |
| Server-Sent Events | Estándar web | — | Eventos en tiempo real hacia los navegadores | WebSocket (bidireccional, innecesario aquí) |
| MariaDB | 11.8.6 en desarrollo; paquete `mariadb-server` de Raspberry Pi OS | GPLv2 | Base de datos relacional | — |
| Nginx | 1.26.3 en desarrollo; paquete de Raspberry Pi OS | BSD-2-Clause | Proxy inverso, HTTPS y archivos estáticos | — |
| OpenSSL | Paquete del sistema | Apache-2.0 | Certificado autofirmado | — |
| Avahi (`avahi-daemon`) | Paquete del sistema | LGPL-2.1 | Anuncio del nombre `tms.local` por mDNS | — |
| systemd | Del sistema | LGPL-2.1 o posterior | Servicio del backend | — |
| git | — | GPLv2 | Control de versiones | — |

### 1.3 Interfaz

| Tecnología | Versión | Licencia | Propósito | Alternativa descartada |
|---|---|---|---|---|
| React y React DOM | 18.3.1 (`^18.3.1`) | MIT | Componentes de la interfaz | — |
| Vite | 5.4.21 (`^5.3.4`) | MIT | Servidor de desarrollo y compilación | Subir a una versión mayor (para corregir avisos de desarrollo), no se hizo |
| @vitejs/plugin-react | 4.7.0 (`^4.3.1`) | MIT | Soporte de React en Vite | — |
| Bootstrap | 5.3.8 | MIT | Rejilla, formularios, modales, tema | — |
| Bootstrap Icons | 1.13.2 | MIT | Iconos | — |
| Chart.js | 4.5.1 (`^4.4.3`) | MIT | Gráfica de líneas | — |
| react-chartjs-2 | 5.3.1 (`^5.2.0`) | MIT | Componente de React para Chart.js | — |
| Three.js | 0.165.0 | MIT | Mapa 3D de puntos medidos (WebGL) | — |
| plotly.js-gl3d-dist-min | 3.7.0 | MIT | Sábana 3D (trazo `surface` en WebGL) | `plotly.js` completo (paquete inicial de 5,7 MB y una dependencia con vulnerabilidades críticas) |
| react-plotly.js | 3.0.0 | MIT | Componente de React para Plotly (con su *factory*) | — |
| @fontsource/inter, /rajdhani, /share-tech-mono | 5.3.0 | OFL-1.1 | Fuentes empaquetadas localmente | Fuentes desde una CDN (no funciona sin internet) |
| History API del navegador | Estándar web | — | Navegación en la URL | react-router |
| Contextos de React | Incluidos en React | — | Estado compartido (autenticación y configuración) | Librerías de estado externas |

---

## 2. Glosario

| Término | Definición |
|---|---|
| **ADC** | *Analog-to-Digital Converter*, convertidor analógico-digital. El del RP2040 es de 12 bits; lee la salida del Hall 49E en GP26. |
| **AGM** | *Arithmetic-Geometric Mean*, media aritmético-geométrica. Algoritmo de convergencia cuadrática con el que se calculan las integrales elípticas $K(m)$ y $E(m)$. |
| **API REST** | Interfaz de programación sobre HTTP en la que cada recurso (sesiones, usuarios, configuración) tiene una ruta y se manipula con los métodos GET, POST, PUT, PATCH y DELETE. |
| **Asentamiento** | Espera de 300 ms tras cada movimiento antes de leer el sensor, para que la mesa deje de vibrar. |
| **Bearer token** | Esquema de autenticación HTTP en el que el cliente envía `Authorization: Bearer <token>`; lo usa la Pico W. |
| **Borrado lógico** | Marcar un registro como eliminado (`eliminada_en`) sin borrarlo, de modo que pueda restaurarse. |
| **Búfer circular** | Estructura de tamaño fijo en la que, al llenarse, los datos nuevos se escriben a continuación de los más antiguos. Lo usan la Pico (lecturas sin enviar) y el servidor (últimos 2 000 eventos SSE). |
| **Cátodo común** | Cableado de los TB6600 en el que los bornes negativos de señal van a tierra y los positivos a los GPIO. |
| **CORS** | *Cross-Origin Resource Sharing*: mecanismo del navegador que controla qué orígenes pueden leer las respuestas de una API. |
| **CSRF** | *Cross-Site Request Forgery*: ataque que aprovecha la cookie de un usuario desde otro sitio; se mitiga con `SameSite=Strict`. |
| **Cuentas** | Valor entero crudo que entrega el sensor (o el ADC) antes de convertirse a unidades físicas. |
| **DC / AC** | Velocidades de barrido de una sesión: DC, rápida; AC, normal. En la simulación fijan el tiempo por punto (60 y 120 ms). |
| **Descanso (posición de)** | Posición de la mesa en la que debe estar al arrancar el firmware y a la que vuelve al terminar; sin finales de carrera, es la referencia de todas las coordenadas. |
| **DMA** | *Direct Memory Access*: controlador del RP2040 que copia datos de la memoria a un periférico sin intervención de la CPU; alimenta al PIO con los segmentos del movimiento. |
| **DOUBLE** | Tipo numérico de coma flotante de 64 bits; se usa para posiciones y campo en la base de datos. |
| **DRDY** | *Data Ready*: bit 0 del registro de estado (0x09) del QMC5883P, que indica que hay un dato nuevo. |
| **Fondo** | Campo que mide el sensor con la bobina apagada (campo terrestre más el del entorno); se resta como *offset*. |
| **Fondo de escala** | Valor máximo que puede reportar el sensor en un rango; por encima, satura. |
| **G (gauss)** | Unidad CGS de densidad de flujo magnético: 1 G = 100 µT = $10^{-4}$ T. |
| **GPIO** | *General Purpose Input/Output*: pin de propósito general del microcontrolador (GP0 a GP28 en la Pico). |
| **Holgura** | Juego mecánico de la tuerca del husillo al cambiar de sentido; se compensa con una aproximación unidireccional de 0,5 mm. |
| **Homing** | Procedimiento de referencia de los ejes. Con finales de carrera, busca los interruptores; sin ellos (el caso actual), lleva la mesa a la posición de descanso. |
| **Hueco** | Punto de la malla sin ninguna lectura válida (no saturada) a menos de 1 mm; se calcula al cerrar la sesión. |
| **Huella máxima total** | Vista de la sábana 3D en la que, en cada $(x, y)$, se muestra el valor de mayor valor absoluto entre todas las alturas medidas. |
| **I²C** | *Inter-Integrated Circuit*: bus serie de dos hilos (SDA, datos; SCL, reloj) con el que la Pico lee el QMC5883P a 100 kHz. |
| **Idempotencia** | Propiedad de una operación que produce el mismo resultado aunque se repita; la ingesta de lotes es idempotente por `(sesion_id, seq)`. |
| **Ingesta** | Proceso de validar, convertir, guardar y difundir una medición (`services/ingesta.js`). |
| **KPI** | *Key Performance Indicator*: aquí, las tarjetas de indicadores del dashboard (estado, plano, $\|B\|$ y posición de la última lectura). |
| **Latido** | Petición periódica (cada 5 s) de la Pico al servidor para avisar que está viva y preguntar si hay una sesión que medir. |
| **Límites de la base** | Tamaño máximo de la zona de muestreo en X, Y y Z, configurado por un administrador. |
| **Malla** | Conjunto de puntos de medición de una sesión: $n_x \times n_y$ por plano en $n_z$ planos. |
| **mDNS** | *Multicast DNS*: resolución de nombres `.local` en una red local sin servidor DNS (la anuncia Avahi). |
| **MFB** | *Multiple Feedback*: topología de filtro activo mencionada en el texto original (filtro de Bessel); no existe en el sistema actual. |
| **Modo de operación** | Configuración global del sistema: simulación (el servidor genera los datos) o real (la Pico los mide). |
| **mulberry32** | Generador de números pseudoaleatorios de 32 bits con semilla, usado por el simulador. |
| **MVC** | Modelo-Vista-Controlador: patrón de arquitectura que separa los datos (modelos), la presentación y la lógica de control; en el backend se implementa como rutas → middleware → controladores → modelos, más servicios. |
| **NTP** | *Network Time Protocol*: protocolo con el que la Pico sincroniza su reloj en UTC. |
| ***Offset*** | Valor que se resta a cada componente convertida (el fondo), configurado en µT por eje. |
| **Origen de la sesión (`origen`)** | `sim` si la generó el simulador del servidor o `hw` si la midió la Pico W. |
| **OVFL** | *Overflow*: bit 1 del registro de estado (0x09) del QMC5883P, que indica saturación. |
| **Paso** | Separación entre puntos de la malla, igual en X, Y y Z, en mm (libre desde 1 mm, con un decimal). |
| ***Phantom*** | Modelo físico que imita las propiedades de un tejido; aquí, un recipiente con solución salina. |
| **PIO** | *Programmable Input/Output*: bloque del RP2040 con máquinas de estados programables que generan señales con temporización exacta; genera los pulsos de paso con resolución de 1 µs. |
| **Proxy inverso** | Servidor (Nginx) que recibe las peticiones de los clientes y las reenvía al backend, añadiendo HTTPS, archivos estáticos y cabeceras de seguridad. |
| **Pulsos por milímetro** | Factor de conversión de cada eje (50 en el sistema actual): pulsos de paso necesarios para avanzar 1 mm. |
| **Punto de inicio de la medición** | Posición, en coordenadas de máquina, en la que se coloca el punto (0, 0, 0) de la zona de cada sesión real; se configura en Configuración › General. |
| **Rampa trapezoidal** | Perfil de velocidad que acelera, mantiene una velocidad de crucero y frena con la misma aceleración. |
| **RSSI** | *Received Signal Strength Indicator*: intensidad de la señal Wi-Fi en dBm, informada en el latido. |
| **Sábana 3D** | Superficie 3D del campo ($\|B\|$ o una componente) sobre el plano $(x, y)$, dibujada con Plotly. |
| **Saturación** | Lectura en la que el campo superó el fondo de escala del sensor; se guarda marcada, con las componentes nulas. |
| **scrypt** | Función de derivación de claves costosa en memoria, usada para guardar las contraseñas. |
| **Semilla** | Valor inicial del generador pseudoaleatorio; con la misma semilla, el simulador reproduce exactamente la misma secuencia. |
| **seq** | Número de secuencia de una lectura dentro de su sesión, consecutivo desde 1; hace idempotente la ingesta y permite reanudar. |
| **Serpentina** | Orden de recorrido de la malla en el que cada fila (y cada plano) se recorre en sentido contrario a la anterior, de modo que entre puntos consecutivos solo cambia un índice en ±1. |
| **Sesión de login** | Sesión de un usuario en un navegador (cookie `tms_sesion`, tabla `sesiones_login`). |
| **Sesión de medición** | Un barrido completo con sus parámetros, su malla, sus lecturas y sus metadatos (tabla `sesiones`). |
| **SHA-256** | Función hash criptográfica de 256 bits; se usa para guardar los tokens de sesión y del dispositivo. |
| **SSE** | *Server-Sent Events*: estándar web para que el servidor envíe eventos al navegador por una conexión HTTP persistente. |
| ***Standoff*** | Separación física entre la bobina y el elemento sensor (5 mm por defecto); el plano $z = 0$ del barrido está a esa altura sobre la bobina. |
| ***Stub*** | Módulo de imitación que sustituye a un componente de hardware en las pruebas (por ejemplo, un QMC5883P falso). |
| **TMS** | *Transcranial Magnetic Stimulation*, estimulación magnética transcraneal: técnica que induce corrientes en el tejido nervioso mediante pulsos de campo magnético producidos por una bobina. |
| **UTC** | Tiempo universal coordinado; todas las horas del sistema se guardan en UTC. |
| **Watchdog** | Temporizador que reinicia el microcontrolador si el programa se bloquea; está desactivado para no perder la referencia de la mesa. |
| **WCAG** | *Web Content Accessibility Guidelines*; el nivel AA exige un contraste de al menos 4,5:1 para el texto normal. |
| **XSS** | *Cross-Site Scripting*: inyección de código en una página; la cookie `HttpOnly` impide que ese código la lea. |
| **Zona de muestreo** | Prisma de $L_x \times L_y \times L_z$ mm que el operador elige en cada sesión, dentro de los límites de la base. |
| **\|B\|** | Módulo del campo magnético, $\sqrt{B_x^2 + B_y^2 + B_z^2}$, en µT. |

---

## Fuentes en el proyecto

- `server/package.json`, `frontend/package.json` y los `package.json` de cada dependencia en `node_modules/` (versiones y licencias)
- `mariadb --version` y `nginx -v` en la computadora de desarrollo
- `firmware/README.md` (sección 8), `COMANDOS.md` (sección 1)
- Bitácora de desarrollo del proyecto (restricciones de tecnologías y librerías)
- Todos los documentos 01 a 17 de este informe (para el glosario)
