# SAVD / TMS — Sistema de adquisición y visualización de datos

Sistema para la tesis de ingeniería (IPN, ESIME Zacatenco) sobre la **caracterización del campo magnético** en un montaje de estimulación magnética transcraneal (TMS) sobre un phantom de solución salina.

Un sensor recorre una malla sobre una placa de 60 × 60 mm, en planos Z de 0 a 20 mm, con un paso de 0,5, 1 o 2 cm (845, 147 o 32 puntos). En cada punto se guardan Bx, By y Bz en µT y |B|. Varias personas miran el barrido en vivo desde laptops y teléfonos conectados al mismo hotspot.

## Cómo funciona

```
 Pico W + HMC5883L ──HTTPS (token)──┐
                                    ▼
 Navegadores ──HTTPS──► Nginx (Raspberry Pi 5) ──► Node.js + Express (MVC) ──► MariaDB
                         │  /      → dashboard React (dist/)        │
                         │  /api/  → backend, SSE en vivo ◄──────────┘
```

| Parte | Tecnología | Qué hace |
|---|---|---|
| Servidor | Raspberry Pi 5, Nginx (HTTPS con certificado autofirmado) | Sirve el dashboard y reenvía `/api/` al backend. |
| Backend | Node.js 20 + Express 4 + mysql2, MVC (rutas → middleware → controladores → modelos, más `services/`) | Login con roles, sesiones de medición, simulador, ingesta de la Pico W, eventos en vivo por SSE, CSV con metadatos. |
| Base de datos | MariaDB | Sesiones con sus parámetros y metadatos de reproducibilidad, mediciones en DOUBLE con sus cuentas crudas, usuarios, configuración y el dispositivo. Todo en UTC. |
| Dashboard | React 18 + Vite 5, Bootstrap 5, Chart.js, Three.js y Plotly | Gráfica Bx/By/Bz, mapa 3D de flechas, superficie de \|B\| por plano, tabla, indicadores, historial y configuración. Tema oscuro, claro o del sistema. |
| Adquisición | Raspberry Pi Pico W (RP2040) con un magnetómetro **HMC5883L** por I2C | Manda latidos y lotes de lecturas crudas al servidor. El HMC5883L se usa como **sensor de prueba** del sistema. |

### Dos modos de operación

- **Simulación:** el servidor genera el barrido con la física de una espira (integrales elípticas), ruido gaussiano con semilla y, si se configuran, huecos y saturaciones. Sirve para probar todo sin hardware.
- **Real:** la Pico W pregunta en cada latido si hay una sesión abierta y envía lotes de cuentas crudas; el servidor las convierte a µT con la ganancia y el offset configurados, marca las saturadas (−4096) y descarta los duplicados por número de secuencia.

En los dos modos, todos los navegadores ven el mismo barrido en vivo; quien entra tarde o recarga la página ve todo lo ya medido.

### Usuarios

Entrar exige usuario y contraseña. Roles: **admin** (todo), **operador** (inicia y detiene barridos, edita las notas de sus sesiones, exporta) y **observador** (mira y exporta).

## Estructura

```
server/      backend (server.js, app.js, config/, routes/, middleware/, controllers/, models/, services/,
             migrations/, scripts/crear-admin.js, scripts/emular-pico.js, tests/, setup_db.sql)
frontend/    dashboard (src/pages, src/components, src/context, src/hooks, src/styles)
nginx/       tms.conf (proxy inverso y HTTPS)
deploy/      tms-server.service (systemd)
docs/        firmware-pico-w.md (protocolo de la Pico), fase7-revision-diseno.md, prompts-sesiones.md
firmware/    pico_w_cliente_ejemplo.py (ejemplo en MicroPython, sin probar en hardware)
```

## Instalación

La guía completa para la Raspberry Pi 5 (MariaDB, Node, Nginx, systemd, acceso desde el hotspot, Pico W, respaldos y solución de problemas) está en **[COMANDOS.md](COMANDOS.md)**.

Desarrollo local, en resumen:

```bash
cd server && cp .env.example .env && npm install && npm run dev      # API en 127.0.0.1:4000
cd frontend && npm install && npm run dev                            # http://localhost:5173
cd server && npm test                                                # tests unitarios (sin base de datos)
```

## Estado

Las fases 1 a 8 del plan de trabajo están hechas; el detalle, las decisiones y lo pendiente están en [CLAUDE.md](CLAUDE.md). Falta probar el firmware con la Pico W y el sensor reales, y confirmar quién controla los motores y cómo se mueve el eje Z.
