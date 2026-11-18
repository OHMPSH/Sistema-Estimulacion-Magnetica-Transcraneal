# TMS Monitor (app Android)

App nativa (React Native + Expo SDK 57) con **las mismas vistas y funciones que la página web** (`frontend/`), adaptadas
al teléfono. Usa la misma API del servidor: **no requiere cambios en el servidor ni en la web**.

## Qué tiene (igual que la web)

| Web | App |
|---|---|
| Inicio de sesión, cambio obligatorio de contraseña, «Tu sesión terminó» | Igual (tarjeta centrada, mismos textos y validaciones) |
| Barra superior: SIMULACIÓN / real, servidor en línea, estado de la Pico W | Igual; aviso amarillo si la Pico informa un error |
| Menú lateral ☰: usuario y rol, modo de operación (admin), tema, navegación, cerrar sesión | Igual, más el origen de los datos de la app (servidor o simulación local), la IP del servidor y «Cambiar mi contraseña» |
| Dashboard: configuración de la medición (velocidad, zona X·Y·Z, paso libre, medio), progreso, tiempo estimado / restante | Igual, con los modales de inicio y de detención de la web |
| Indicadores (estado, plano Z, \|B\|, posición) | Igual (una columna, como la web en el teléfono) |
| Gráfica Bx · By · Bz por posición en el barrido (serpentina, cortes en huecos) | Igual; al tocarla aparece el globo con el punto y los tres valores |
| Mapa 3D de puntos medidos (Three.js) | Misma escena y orientación diestra, colores por plano, rejilla, ejes, leyenda, 7 botones de vista, giro con el dedo, pellizco y rotación automática |
| Sábana 3D (Plotly, figura científica) | Misma figura: Viridis / RdBu simétrica, huella máxima o plano Z, barra de color, fondo blanco (claro) o negro (oscuro); giro con el dedo, pellizco, toque para ver el valor y **exportación a SVG** |
| Tabla de las últimas lecturas | Igual (se desplaza a los lados y hacia abajo) |
| Mediciones pasadas: filtros, notas, CSV, sábana por sesión, eliminar, ver eliminadas, restaurar | Igual; el CSV y el SVG se guardan y se comparten (Drive, correo, WhatsApp, Archivos…) |
| Configuración: General, Barrido, Sensor (modelo QMC5883P/HMC5883L, rango, offsets), Simulación, Dispositivo (estado, token, latido), Visualización, Usuarios | Igual, con las mismas validaciones y mensajes 409/422 |
| Tema oscuro / claro / sistema | Igual (los mismos colores de `global.css`; las fuentes Inter, Rajdhani y Share Tech Mono, y los iconos de Bootstrap) |

Además, la app tiene una **simulación local**: el celular genera los datos (forma de campo de una bobina, con ruido,
huecos y saturadas), sin servidor ni red; las últimas 12 sesiones se guardan en el teléfono.

## 1. Servidor (Raspberry Pi o computadora de pruebas)

La app entra por HTTP directo al puerto de Node. En `server/.env` de ese equipo:

    HOST=0.0.0.0
    PORT=4000

y reinicia el servidor. Prueba desde el navegador del celular: `http://IP_DEL_EQUIPO:4000/api/status` debe mostrar
`{"ok":true,...}`. (No toques `nginx/tms.conf`: Android no acepta el certificado autofirmado del HTTPS.)

En la app basta con escribir la IP (por ejemplo `192.168.0.186`): se completa con `http://` y el puerto 4000.

## 2. Generar el APK

**Importante:** `npx expo run:android` (sin `--variant release`) instala una versión de *desarrollo* que busca el código
en la computadora y muestra «Unable to load script». Para usarla normalmente, compila la versión **release**.

### Ya compilado en esta computadora (2026-11-16)
El SDK quedó en `~/Android/Sdk` y un JDK 17 en `~/Android/jdk` (sin sudo). El APK listo está en
`dist/TMS-Monitor-3.0.0.apk` (ARM de 32 y 64 bits, firmado con la clave de depuración). Para recompilar:

    export JAVA_HOME=~/Android/jdk ANDROID_HOME=~/Android/Sdk
    npx expo prebuild --platform android --clean
    cd android && ./gradlew assembleRelease --max-workers=4

(`app.json` ya limita la compilación a ARM de 32 y 64 bits con `buildArchs`.)

### Opción A — en tu computadora (Linux)
Requisitos: JDK 17 o 21 y el Android SDK (Android Studio ▸ SDK Manager: Platform, Build-Tools, Platform-Tools, NDK y
CMake). Variables: `export ANDROID_HOME=$HOME/Android/Sdk` y `$ANDROID_HOME/platform-tools` en el PATH.

    npm install
    npx expo prebuild --platform android --clean
    cd android && ./gradlew assembleRelease

El APK queda en `android/app/build/outputs/apk/release/app-release.apk`. Instálalo con `adb install -r app-release.apk`
o cópialo al teléfono. Si Android dice que choca con la versión anterior, desinstala la vieja primero.
Atajo: `npx expo run:android --variant release` compila e instala.

### Opción B — en la nube (sin Android Studio)
    npm install -g eas-cli
    eas login
    eas build -p android --profile preview

## 3. Probar sin teléfono (vista web, solo para desarrollo)

    npm run web          # expo start --web → http://localhost:8081

En el navegador la cookie de sesión la maneja el propio navegador, así que la API debe estar en el **mismo origen**:
pon delante un proxy que mande `/api` al servidor y lo demás a Metro, y en la app escribe la dirección del proxy.
Para el teléfono no hace falta nada de esto.

## 4. Comprobaciones

    npm run typecheck        # TypeScript sin errores
    npx expo-doctor          # 21/21 comprobaciones
    npm run export:android   # compila el paquete de Android (Hermes) sin el SDK

## Estructura

    App.tsx                  raíz: carga de fuentes, barra superior, menú lateral, páginas y pie
    src/theme.tsx            tokens de color de global.css (oscuro y claro) y estilos base
    src/ui.tsx               botones, opciones, campos, selector, casilla, modal, etiquetas (las clases de la web)
    src/glifos.ts            códigos de los iconos de Bootstrap Icons
    src/store.tsx            sesión de usuario, configuración, SSE y medición en curso
    src/api.ts               cliente de la API (cookie tms_sesion)
    src/hooks.ts             estado de la Pico W y tiempo estimado (useTiempoEstimado de la web)
    src/util.ts              formatos y geometría (serpentina, malla, zona, paso)
    src/archivos.ts          guardar y compartir CSV y SVG
    src/charts/              LineChart, Mapa3D, Sabana3D y utilidades 3D (comun.ts)
    src/screens/             Acceso (login, contraseña), Conexion, Dashboard, Historial, Configuracion
    src/simulador.ts, src/sesionesLocales.ts   simulación local
    assets/fonts/            Inter, Rajdhani, Share Tech Mono y Bootstrap Icons (TTF, de los paquetes de la web)
    assets/images/           icono de la app
