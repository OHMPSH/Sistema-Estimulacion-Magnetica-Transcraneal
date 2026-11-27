# Instalar y usar la skill Anatomy

**Qué es.** Anatomy es una skill para Claude Code que convierte una idea en una **ilustración técnica isométrica e interactiva**: dibuja (o inventa) una máquina cuyo funcionamiento es esa idea y entrega el código fuente (página HTML independiente, un `.svg` suelto con estilos incrustados, o componentes de React/Next.js). Licencia **MIT** («© 2026 Ryan · @wheresryan22»), repositorio `wheresryan22/anatomy`, sin claves de API.

**Fuente de lo que sigue:** el README del repositorio, leído el 2026-11-25. Lo que el README no cubre (Windows) está marcado como **no verificado**.

> **Estado en esta laptop (2026-11-25): instalada**, con autorización del usuario, mediante `npx skills add wheresryan22/anatomy -g -a claude-code`.
> - Versión **1.1.0** (CHANGELOG del 2026-10-12), en `~/.claude/skills/anatomy` (173 archivos, 27 MB, con ejemplos y pruebas). Claude Code la detectó sin reiniciar (`/anatomy`).
> - Node.js 22.23.4. Para sus revisiones visuales usa el Chromium de Playwright que ya está en `~/.cache/ms-playwright` (no hay Chrome instalado).
> - Evaluación de riesgo que mostró la CLI: Gen «Med Risk», Socket 0 alertas, Snyk «Low Risk».
> - Revisión de lo que toca la red: solo `scripts/publish.mjs` (sube una figura a la galería pública de Anatomy en GitHub; **solo si se pide** y necesita `gh` con sesión iniciada; **no usarlo** con material de la tesis sin decidirlo) y los scripts que abren Chrome sin interfaz con un perfil desechable (`capture.mjs`, `drive.mjs`, `lines.mjs`, `turn-check.mjs`, `print.mjs`).

## 1. Requisitos

| Requisito | Detalle |
|---|---|
| Node.js | La CLI `skills` 1.7.1 pide **22.20 o más nuevo**. El README dice que las compilaciones de la skill corren desde Node 20.10 (con Node 20, los scripts del navegador se relanzan con `--experimental-websocket`). Usa **22.20+** y no hay dudas. Comprueba con `node -v` |
| Claude Code | Cualquier versión con skills (`/anatomy`). También funciona en Codex (`$anatomy`), Antigravity, OpenCode y MiniMax Code |
| Navegador Chrome o Chromium | Opcional: sus comprobaciones visuales (`capture.mjs`, `drive.mjs`…) buscan Chrome en las rutas habituales de macOS, Linux y **Windows** y en la caché de Playwright. Para otro binario: variable `CHROME_PATH` |
| WebGL | Solo para figuras con *shaders* o modo 3D (beta). Sin WebGL, el SVG se sigue leyendo |

No hay `npm install`: usa solo módulos integrados de Node.

## 2. Instalación en Linux (esta laptop)

```bash
node -v
```

```bash
npx skills add wheresryan22/anatomy -g -a claude-code
```

- `-g` la instala para tu usuario (en `~/.claude/skills/anatomy`); sin `-g`, solo en el proyecto actual (`.claude/skills/anatomy`).
- `-a claude-code` evita la pregunta de a qué agentes instalarla.
- Claude Code detecta skills nuevas en una sesión abierta. Si la carpeta `~/.claude/skills` no existía al empezar la sesión, escribe `/reload-skills`.

Alternativa con git (para actualizar después con `git pull` dentro de la carpeta):

```bash
git clone https://github.com/wheresryan22/anatomy.git ~/.claude/skills/anatomy
```

## 3. Instalación en Windows (no verificado: el README no tiene sección de Windows)

En **PowerShell**:

```powershell
node -v
```

```powershell
npx skills add wheresryan22/anatomy -g -a claude-code
```

Debería quedar en `%USERPROFILE%\.claude\skills\anatomy` (en PowerShell, `$env:USERPROFILE\.claude\skills\anatomy`). Compruébalo con:

```powershell
dir $env:USERPROFILE\.claude\skills\anatomy
```

Si `npx skills` falla, la alternativa con git:

```powershell
git clone https://github.com/wheresryan22/anatomy.git $env:USERPROFILE\.claude\skills\anatomy
```

o descarga el ZIP del repositorio, renombra la carpeta `anatomy-main` a `anatomy` y muévela a `%USERPROFILE%\.claude\skills\`. El comando de una línea con `curl … | tar -xz` del README es **solo para macOS y Linux**.

Después, en Claude Code: `/reload-skills` si no aparece `/anatomy`.

## 4. Uso

```
/anatomy explica cómo funciona <idea u objeto>, interactive
```

Ejemplo del README (en inglés): `/anatomy explain how a token bucket rate limiter works, interactive`. Claude también la carga sola cuando pides una ilustración isométrica, una figura explicativa o un *explainer* interactivo.

**Las tres costumbres que pide el README:**

1. **Nombrar la idea, no el dibujo, y dar los números reales** (tamaños, cantidades, ritmos, umbrales).
2. **O nombrar el objeto concreto y decir qué tiene que moverse.**
3. **Decir dónde va a vivir y con qué tema:** HTML independiente, SVG suelto o componente React; claro u oscuro. (El tema claro es el que se diseñó primero; aquí pedimos **oscuro**, para la presentación.)

**Lo que tarda:** es lenta a propósito, porque revisa cada unión. El ejemplo grande tarda «unos minutos»; una revisión 3D completa, 15–20 minutos para 30 piezas.

**Lo que no hace:**

- no dibuja personas ni mapas exactos;
- **no es para gráficas de datos** (ejes, series): para eso están Chart.js y Plotly en la web del proyecto; en Anatomy los números aparecen como lectura en vivo y como medidas reales de las piezas;
- las ideas sin un mecanismo que construir «salen más débiles»;
- *shaders* necesitan WebGL; el **modo 3D está en beta** (probado en su ejemplo y una figura de prueba).

## 5. Reglas para este proyecto

- Las figuras se guardan en `docs/presentacion/03-anatomy/figuras/` (una carpeta por figura), **autocontenidas y sin conexión**: nada de CDN ni fuentes remotas.
- Usar las cifras de [`../01-cifras-reales.md`](../01-cifras-reales.md), **en mm reales**.
- No ejecutar `/anatomy` hasta que el usuario lo pida, y no antes de ajustar los prompts con sus fotos (ver [prompts.md](prompts.md)).
- No se agrega nada al código del sistema (`server/`, `frontend/`, `firmware/`, `app/`, `nginx/`).
