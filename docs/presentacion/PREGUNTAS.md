# Preguntas pendientes (lo que no se pudo comprobar)

Todo lo marcado **«por confirmar»** en esta carpeta sale de aquí. Al responderlas, hay que actualizar [01-cifras-reales.md](01-cifras-reales.md) primero (es la fuente de las cifras) y después el dossier, los prompts de Anatomy y la presentación.

| # | Pregunta | Dónde se usa | Qué dice hoy el sistema |
|---|---|---|---|
| 1 | **Medidas físicas reales de la mesa**: recorrido útil de cada eje medido con flexómetro o vernier | Cifras §1, dossier §2.4, diapositiva 6, prompts (a) y (b) | 410 × 562 × 88 mm del sistema → ~205 × 281 × 44 mm reales |
| 2 | ¿El factor ×2 vale **también en Z**? ¿Y para **todas** las sesiones (desde el 12 de noviembre) o cambió algo en la mecánica o los drivers? | Cifras §6.3 (zonas reales) | La web lo aplica a los tres ejes |
| 3 | **Causa del ×2**: DIP en **400 pulsos/vuelta (respondido, 2026-11-25)**. Falta: avance del husillo T8 (2, 4 u 8 mm por vuelta) y ángulo de paso de los motores (0,9° o 1,8°; son más cortos que un NEMA 17 estándar) | Dossier §2.4 | El firmware supone 50 pulsos/mm (400 pulsos/vuelta con 8 mm); el instructivo recomienda 1/8 |
| 4 | **La bobina**: doble D, ~200 × 125 mm por fuera (**respondido, 2026-11-25**). Falta: número de vueltas, medidas interiores; **el phantom**: recipiente, medidas, concentración de la solución | Dossier §1–2, diapositiva 2, prompts (a) y (d) | El simulador usa una espira de 25 mm de radio solo como modelo |
| 5 | **La corriente**: constante, 0,5–1 A (**respondido, 2026-11-25**). Falta: qué fuente y con qué corriente exacta se midió cada sesión (la 124 y la 126 llegaron a ~175 µT; la 93, a ~1 696 µT) | Diapositiva 16, prompt (d) | No está en la base ni en el código |
| 6 | **Datos formales**: título exacto de la tesis, tu nombre como debe aparecer, carrera, asesor(es), fecha, lugar y **duración** de la exposición, y quién la evalúa | Diapositiva 1, guion | — |
| 7 | **Electrónica**: fuente de motores de 12 V (**respondido, 2026-11-25**). Falta: su corriente, cómo se alimenta la Pico (USB de la laptop o 5 V del *shield*) y cómo quedó el recableado de tierras del 18 de noviembre | Diagrama 07, dossier §2.2 y §10 | El instructivo pide 12–24 V y no unir el GND de la Pico con el de la fuente |
| 8 | ¿Ya probaste en la mesa el **ritmo corregido del previsualizador** (1 petición/s) y **Detener a mitad de un movimiento** con la Pico 2 W? | Dossier §9, diapositivas 14 y 17 | Sin registro |
| 9 | ¿Quieres **volver a tomar las capturas** con la versión actual (escala ×2, nombres X ↔ Y, previsualizador)? | Diapositivas 13 y 14 | Las capturas son del 15 y 17 de noviembre |
| 10 | ¿Qué sesión real quieres para la diapositiva del **campo medido** (hoy, la sábana de la 74)? | Diapositiva 16 | Candidatas con la 2.4: 124 (231 puntos) y 126 (252) |
| 12 | **Eje corto** (205 mm reales): lo mueve la cama de metal de la base 3018 oculta en la caja, que lleva el arco completo; la tabla con la bobina es fija (**respondido, 2026-11-25**). Falta solo la separación sensor–bobina en Z = 0 en mm | Anatomy, dossier §2.1 | Resuelto |
| 11 | ~~Permiso para instalar Anatomy~~ **Resuelto el 2026-11-25:** instalada la versión 1.1.0 en `~/.claude/skills/anatomy` | 03-anatomy | Instalada |
