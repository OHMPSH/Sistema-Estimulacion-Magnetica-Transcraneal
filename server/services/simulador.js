/**
 * services/simulador.js
 * ─────────────────────────────────────────────────────────────
 * Simulador del barrido, en el servidor (reemplaza al del navegador).
 *
 *   arrancar(sesion, alTerminar)  — empieza a generar puntos para la sesión
 *   detener(sesionId)             — lo detiene (al cerrar la sesión con PUT)
 *   simulando()                   — id de la sesión que se simula, o null
 *
 * Recorre la malla de la sesión (según su paso) en orden x → y → z,
 * con setTimeout encadenado: el siguiente punto se programa cuando
 * el anterior ya se guardó, así nunca se acumulan puntos si la base
 * va lenta. El ritmo es simulacion.ms_por_punto[modo].
 *
 * Cada punto pasa por services/ingesta.js, igual que una lectura real:
 * la ingesta numera seq desde 1 y guarda marcada como `saturado` la
 * lectura que pasa del fondo de escala (Fase 4).
 * La física y el ruido están en services/simulacionPura.js.
 *
 * Usa las copias de la configuración que se guardaron con la sesión al
 * crearla (Fase 5): un cambio de configuración durante el barrido no
 * altera la sesión en curso, y la sesión se puede reproducir.
 * ─────────────────────────────────────────────────────────────
 */

import { obtener } from './configuracion.js';
import { mallaDeBarrido } from './geometria.js';
import { crearGeneradorMuestras } from './simulacionPura.js';
import { registrarMedicion, ErrorIngesta } from './ingesta.js';

/** Estado del barrido en curso, o null */
let actual = null;

export const simulando = () => actual?.sesion.id ?? null;

/**
 * Empieza a simular una sesión recién creada.
 * @param {object} sesion  { id, modo, paso_mm, ... }
 * @param {(sesionId: number) => void} alTerminar  se llama al recorrer todos los puntos
 */
export function arrancar(sesion, alTerminar) {
  if (actual) detener(actual.sesion.id);

  // Las copias guardadas con la sesión (Fase 5); si no las hay, la configuración vigente
  const simulacion = sesion.config_simulacion ?? obtener('simulacion');
  const barrido = sesion.config_barrido ?? obtener('barrido');
  const sensor = sesion.config_sensor ?? obtener('sensor');
  const malla = mallaDeBarrido(barrido, sesion.paso_mm);
  const siguiente = crearGeneradorMuestras({ simulacion, barrido, sensor, malla });
  const msPorPunto = simulacion.ms_por_punto[sesion.modo];

  const estado = {
    sesion, malla, indice: 0, temporizador: null, detenido: false,
    huecos: 0, saturadas: 0, rechazadas: 0,
  };
  actual = estado;

  console.log(`[simulador] Sesión ${sesion.id}: ${malla.totalPuntos} puntos, paso ${sesion.paso_mm} mm, ` +
              `${sesion.modo} a ${msPorPunto} ms/punto, semilla ${simulacion.semilla}.`);

  const paso = async () => {
    if (estado.detenido) return;
    const muestra = siguiente(estado.indice);

    if (muestra.hueco) {
      estado.huecos += 1;
    } else {
      try {
        const m = await registrarMedicion(sesion, { ...muestra.punto, bx: muestra.bx, by: muestra.by, bz: muestra.bz });
        if (m.saturado) estado.saturadas += 1;   // se guarda marcada, como en el sensor real
      } catch (err) {
        if (err instanceof ErrorIngesta && err.status === 422) {
          estado.rechazadas += 1;   // no debería pasar: la malla siempre es válida
        } else if (err instanceof ErrorIngesta && (err.status === 409 || err.status === 404)) {
          estado.detenido = true;   // alguien cerró la sesión entre dos puntos
          return;
        } else {
          console.error(`[simulador] Error al guardar el punto ${estado.indice} de la sesión ${sesion.id}:`, err.message);
        }
      }
    }

    if (estado.detenido) return;
    estado.indice += 1;
    if (estado.indice >= malla.totalPuntos) {
      console.log(`[simulador] Sesión ${sesion.id} completa (${estado.huecos} huecos, ${estado.saturadas} saturadas, ${estado.rechazadas} rechazadas).`);
      estado.detenido = true;
      if (actual === estado) actual = null;
      alTerminar(sesion.id);
      return;
    }
    estado.temporizador = setTimeout(paso, msPorPunto);
  };

  estado.temporizador = setTimeout(paso, msPorPunto);
}

/** Detiene la simulación de esa sesión, si es la que corre */
export function detener(sesionId) {
  if (!actual || actual.sesion.id !== sesionId) return false;
  actual.detenido = true;
  clearTimeout(actual.temporizador);
  console.log(`[simulador] Sesión ${sesionId} detenida en el punto ${actual.indice} de ${actual.malla.totalPuntos}.`);
  actual = null;
  return true;
}
