/**
 * services/bufferEventos.js
 * ─────────────────────────────────────────────────────────────
 * Búfer circular de los últimos eventos del SSE (Fase 5). Puro, sin
 * red: lo usa services/tiempoReal.js y se prueba con node:test.
 *
 *   const b = new BuferEventos(2000);
 *   b.agregar({ id, texto })        — id numérico creciente
 *   b.desde(ultimoId)               — eventos con id > ultimoId, o null si
 *                                     ultimoId ya salió del búfer (o es de
 *                                     otro proceso) y no se puede reenviar
 * ─────────────────────────────────────────────────────────────
 */

export class BuferEventos {
  constructor(capacidad = 2000) {
    this.capacidad = capacidad;
    this.eventos = new Array(capacidad);
    this.inicio = 0;     // posición del más antiguo
    this.cantidad = 0;
  }

  agregar(evento) {
    const pos = (this.inicio + this.cantidad) % this.capacidad;
    this.eventos[pos] = evento;
    if (this.cantidad < this.capacidad) this.cantidad += 1;
    else this.inicio = (this.inicio + 1) % this.capacidad;
  }

  /** Eventos en orden, del más antiguo al más nuevo */
  todos() {
    return Array.from({ length: this.cantidad }, (_, i) => this.eventos[(this.inicio + i) % this.capacidad]);
  }

  get primerId() { return this.cantidad ? this.eventos[this.inicio].id : null; }
  get ultimoId() { return this.cantidad ? this.eventos[(this.inicio + this.cantidad - 1) % this.capacidad].id : null; }

  /**
   * Eventos posteriores a `ultimoId`.
   * @returns {Array|null} null si no se puede garantizar que no falte nada:
   *   el id es anterior al más antiguo del búfer (se perdieron eventos),
   *   o es mayor que el último emitido (viene de otro proceso).
   */
  desde(ultimoId, idActual = this.ultimoId) {
    if (!Number.isSafeInteger(ultimoId)) return null;
    if (this.cantidad === 0) return ultimoId === idActual ? [] : null;
    if (ultimoId > this.ultimoId) return null;
    // ultimoId puede ser el anterior al primero del búfer: no falta nada
    if (ultimoId < this.primerId - 1) return null;
    return this.todos().filter(e => e.id > ultimoId);
  }
}
