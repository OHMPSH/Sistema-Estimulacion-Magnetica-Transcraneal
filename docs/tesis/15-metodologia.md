# 15 — Metodología de desarrollo

Este documento describe cómo se desarrolló el SAVD: un proceso incremental por fases, cada una con un alcance cerrado y verificable, seguido de una etapa de cambios posteriores guiada por las pruebas con el hardware. Explica qué se entregó en cada fase y por qué en ese orden, cómo se usó el control de versiones con git y qué criterios de diseño se mantuvieron en todo el proceso.

---

## 1. Enfoque general

El sistema partió de una primera versión funcional (junio de 2026) con una interfaz React, un backend Express y una base MariaDB mínimos, en la que los datos se simulaban en el navegador. A partir de una **auditoría técnica** de esa versión, que identificó problemas de seguridad, de integridad de los datos, de unidades, de precisión, de concurrencia y de visualización (documento 16, sección 4), se planificó un **desarrollo incremental en ocho fases**. Cada fase:

1. tenía un alcance escrito y acotado, con los criterios de aceptación;
2. construía sobre las anteriores sin romperlas;
3. terminaba con una verificación (pruebas automatizadas, comprobaciones con `curl` contra el servidor real, pruebas en el navegador o con el emulador de la Pico);
4. actualizaba la documentación del proyecto (bitácora de desarrollo, guía de instalación, documentos técnicos) con el estado real, las decisiones tomadas y lo que quedaba pendiente.

Después de la Fase 8, el trabajo continuó con **cambios posteriores** motivados por las necesidades del experimento y por las pruebas con el hardware real: paso libre, zona de muestreo, firmware completo de la Pico, sensor Hall, descubrimiento del QMC5883P, recorrido en serpentina, cierre automático, punto de inicio de la medición, sábana 3D y ajustes de los ejes de la mesa.

---

## 2. Fases

| Fase | Fecha | Entregado | Por qué en ese orden |
|---|---|---|---|
| **1. Base del backend** | 9 nov 2026 | Router en `/api` y en `/` (compatible con Nginx sin tocarlo); CORS sin errores 500; conexión a la base en UTC; validación de entradas con 400/422; 404 y 409 para sesiones; errores siempre en JSON; credenciales solo en `.env`; migración 001; Bootstrap empaquetado; corrección de vulnerabilidades de dependencias | Sin un backend correcto y predecible no se podía construir nada encima: era la base de las demás fases |
| **2. Inicio de sesión y usuarios** | 9 nov 2026 | Tablas de usuarios y sesiones de login; contraseñas con scrypt; cookie `HttpOnly` con token hasheado; límite de intentos; roles en todas las rutas; cambio de contraseña obligatorio; protección del último administrador; script de creación del administrador; pantallas de inicio de sesión y de cambio de contraseña | La auditoría encontró que cualquiera podía insertar o borrar datos sin autenticarse; la seguridad tenía que estar antes de abrir el sistema a la red y al dispositivo |
| **3. Configuración, modos y simulador en el servidor** | 10 nov 2026 | Tabla de configuración en memoria con validación y difusión; modos simulación y real; una sola sesión abierta; cierre de huérfanas; simulador en el servidor con la espira exacta, semilla y ruido gaussiano; parámetros por sesión (velocidad, paso y medio); la interfaz deja de generar datos | Separar datos simulados y reales y centralizar la generación en el servidor era requisito para que la Pico y los navegadores compartieran un único origen de datos |
| **4. La Pico W como cliente** | 10 nov 2026 | Tabla de dispositivos; token de la Pico; latido; lotes idempotentes por `seq` en una transacción; conversión de cuentas a µT; saturación; estado en línea; retiro de la ruta antigua de mediciones (410); emulador de la Pico; documento del protocolo; ejemplo en MicroPython; un único `EventSource` en la interfaz | Con la seguridad y el simulador en su sitio, se definió el contrato con el hardware y se probó con un emulador antes de disponer del firmware |
| **5. Datos y trazabilidad** | 10 nov 2026 | Columnas DOUBLE; metadatos de reproducibilidad por sesión (quién, copias de configuración, versiones, puntos esperados y recibidos, huecos); borrado lógico; notas; sesión activa para quien llega tarde; SSE recuperable con identificadores; CSV generado en el servidor con metadatos | La tesis exige datos auditables y reproducibles; esta fase convirtió las mediciones en registros científicos |
| **6. Frontend funcional** | 10 nov 2026 | Reorganización en páginas, contextos y hooks; navegación en la URL; menú lateral accesible; configuración por secciones; tema oscuro, claro o del sistema; gráficas corregidas (eje por posición, escala fija, orientación diestra); carga diferida de Plotly | Con el backend estable, la interfaz se rehízo para consumirlo correctamente y para corregir las gráficas engañosas detectadas en la auditoría |
| **7. Accesibilidad y diseño** | 10 nov 2026 | Revisión con las pautas de interfaces web, plan de diseño, tokens finales, tabla de contraste AA, fuentes locales, foco, movimiento reducido, filtros en la URL, avisos de cambios sin guardar | Pulir la interfaz cuando su funcionalidad ya estaba fija evita rehacer el trabajo de diseño |
| **8. Pruebas y despliegue** | 10 nov 2026 | Separación de la aplicación y el arranque (para las pruebas de integración); pruebas unitarias y de integración; equivalencia entre la instalación limpia y la base migrada; guía de instalación en la Raspberry Pi 5; servicio de systemd; README; despliegue probado con Nginx | Cerrar con pruebas automatizadas y una guía reproducible deja el sistema listo para instalarse en el laboratorio |

### 2.1 Cambios posteriores a la Fase 8

| Fecha | Cambio | Motivo |
|---|---|---|
| 10 nov 2026 | Paso libre en mm (migración 006); zona de muestreo por sesión y límites de la base (migración 007); inicio de sesión obligatorio en cada pestaña | Necesidades del experimento: medir con pasos y zonas distintas de los tres valores fijos |
| 10 nov 2026 | Firmware completo de la Pico W en MicroPython (PIO + DMA, homing, barrido, búfer, reanudación); programa de calibración; estado y error de la Pico en el latido | Pasar del ejemplo de cliente a un firmware que mueva la mesa |
| 11 nov 2026 | Firmware de prueba con el sensor Hall 49E (`firmware_hall_1d/`), sin finales de carrera y con límites de software medidos | El magnetómetro no respondía; hacía falta probar el sistema completo con algún sensor |
| 12 nov 2026 | Descubrimiento del QMC5883P; firmware cliente con el QMC5883P y serpentina; servidor con dos modelos de sensor (migración 008) y serpentina en todos los componentes | El módulo comprado no era un HMC5883L |
| 13 nov 2026 | Cierre automático de las sesiones reales; mapa 3D de puntos medidos; colores de los datos Okabe–Ito; sábana 3D con estilo de figura científica; tiempo estimado; punto de inicio de la medición (migración 009) | Observaciones durante las pruebas reales y necesidades de la redacción de la tesis |
| 14 nov 2026 | Nombres de los ejes unificados con el programa de calibración, orden de movimiento de los ejes y cambios de la posición de descanso | Pruebas en la mesa: un eje empujaba contra su tope |

---

## 3. Control de versiones

- El proyecto se gestiona con **git**, con un repositorio remoto en GitHub; los commits los hace el tesista.
- Historial principal: el primer commit (14 de junio de 2026) con la estructura del frontend, el servidor y Nginx; la configuración de despliegue y el README (junio); y, en noviembre, un commit por fase o grupo de fases (`Fase1`, `Fase 2`, `Fase3`, `Fase 4,5,6,7,8`) seguido de commits por cambio (`Zona del exp`, `Fimware`, `prueba rasp`, `Calibracion de velocidad`, `conexion micro`, `correcion modulo hmc`, `pico 2 w`). Una rama de trabajo (`chore/dev-script`) se integró mediante una *pull request*.
- Al 14 de noviembre de 2026, los cambios del 13 y el 14 de noviembre (punto de inicio y migración 009, tiempo estimado, sábana 3D con estilo científico y los cambios de ejes y de posición de descanso del firmware) están en la copia de trabajo y todavía **no** se han registrado en git.
- La versión del software que se guarda con cada sesión incluye el commit corto de git (por ejemplo, `3.0.0+9a1ab30`), lo que liga cada medición con el estado exacto del código que la produjo.
- Los secretos (`server/.env`, `secretos.py`) están excluidos del repositorio.

---

## 4. Criterios de diseño

| Criterio | Cómo se aplicó |
|---|---|
| **Arquitectura en capas** | MVC en el backend (rutas, middleware, controladores, modelos) más servicios; el SQL solo en los modelos; la lógica pura en módulos sin dependencias de infraestructura |
| **Validación en el servidor** | Toda entrada se valida en el servidor (400 para la forma, 422 para los valores), aunque la interfaz también valide para dar retroalimentación inmediata |
| **Una sola fuente de datos** | El navegador nunca genera mediciones; simulador y Pico pasan por el mismo servicio de ingesta |
| **Trazabilidad** | Cuentas crudas, `seq`, hora del servidor y del dispositivo, usuario, versiones de software y firmware, huecos y puntos recibidos con cada sesión |
| **Reproducibilidad** | Copia de la configuración con cada sesión; semilla del simulador guardada; CSV con metadatos completos |
| **Robustez ante fallos** | Idempotencia por `seq`, reintentos con espera creciente, búfer en la Pico, SSE recuperable, cierre de sesiones huérfanas, regreso al descanso ante cualquier error |
| **Unidades y tiempo coherentes** | mm, µT y UTC en toda la API; redondeo solo para mostrar |
| **Restricciones respetadas** | Configuración de Nginx sin cambios; tecnologías fijas (React 18, Vite 5, Node.js 20, Express 4, mysql2, MariaDB, Chart.js, Three.js, Plotly, Bootstrap 5); sin librerías nuevas no aprobadas; colores del tema oscuro sin cambios; ninguna gráfica ni dato eliminado del dashboard |
| **Seguridad por defecto** | Autenticación en todas las rutas salvo una, hashes para contraseñas y tokens, permisos mínimos en la base, backend aislado detrás del proxy |
| **Documentación viva** | Cada fase actualizó la bitácora, la guía de instalación y los documentos técnicos con el estado real |

---

## Fuentes en el proyecto

- Historial de git (`git log` con fechas) y estado de la copia de trabajo (`git status`)
- Bitácora de desarrollo del proyecto (estado de las fases y notas de cada una)
- `README.md`, `COMANDOS.md`, `docs/fase7-revision-diseno.md`, `docs/firmware-pico-w.md`, `docs/sensor-qmc5883p.md`
- `server/services/version.js`, `.gitignore`
