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
 * Cada punto pasa por services/ingesta.js, igual que una lectura real.
 * La física y el ruido están en services/simulacionPura.js.
 *
 * La configuración se copia al arrancar: un cambio de configuración
 * durante el barrido no altera la sesión en curso.
 * ─────────────────────────────────────────────────────────────
 */

import { obtener } from './configuracion.js';
import { mallaParaPaso } from '../config/barrido.js';
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

  const simulacion = obtener('simulacion');
  const malla = mallaParaPaso(sesion.paso_mm);
  const siguiente = crearGeneradorMuestras({
    simulacion, barrido: obtener('barrido'), sensor: obtener('sensor'), malla,
  });
  const msPorPunto = simulacion.ms_por_punto[sesion.modo];

  const estado = {
    sesion, malla, indice: 0, temporizador: null, detenido: false,
    huecos: 0, rechazadas: 0,
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
        await registrarMedicion(sesion, { ...muestra.punto, bx: muestra.bx, by: muestra.by, bz: muestra.bz });
      } catch (err) {
        if (err instanceof ErrorIngesta && err.status === 422) {
          estado.rechazadas += 1;   // saturación inyectada: el punto queda sin lectura
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
      console.log(`[simulador] Sesión ${sesion.id} completa (${estado.huecos} huecos, ${estado.rechazadas} saturaciones rechazadas).`);
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
