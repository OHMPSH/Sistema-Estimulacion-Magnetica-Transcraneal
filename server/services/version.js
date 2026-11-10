/**
 * services/version.js
 * ─────────────────────────────────────────────────────────────
 * Versión del software que se guarda con cada sesión (Fase 5) y que
 * devuelve GET /status: la de server/package.json más el commit de git
 * actual, si existe ("3.0.0+febbe3b").
 *
 * Se calcula una sola vez al cargar el módulo. Si git no está instalado
 * o la carpeta no es un repositorio (por ejemplo, un .zip copiado a la
 * Raspberry), el commit queda como 'desconocido'.
 * ─────────────────────────────────────────────────────────────
 */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const carpetaServidor = join(dirname(fileURLToPath(import.meta.url)), '..');

function leerVersionPaquete() {
  try {
    return JSON.parse(readFileSync(join(carpetaServidor, 'package.json'), 'utf8')).version ?? 'desconocida';
  } catch {
    return 'desconocida';
  }
}

function leerCommit() {
  try {
    const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: carpetaServidor, timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
    return /^[0-9a-f]{4,40}$/.test(commit) ? commit : 'desconocido';
  } catch {
    return 'desconocido';
  }
}

export const VERSION_PAQUETE = leerVersionPaquete();
export const COMMIT = leerCommit();

/** "3.0.0+febbe3b" (o "3.0.0+desconocido") */
export const VERSION_SOFTWARE = `${VERSION_PAQUETE}+${COMMIT}`;
