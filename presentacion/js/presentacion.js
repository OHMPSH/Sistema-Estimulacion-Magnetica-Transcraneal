/* Navegación de la presentación. Sin librerías ni conexión.
   Funciona abierta con doble clic (file://) y servida localmente. */
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  var MINIATURA = params.get('modo') === 'miniatura';
  var diapos = Array.prototype.slice.call(document.querySelectorAll('.diapo'));
  var total = diapos.length;
  var actual = 0;
  var escenario = document.getElementById('escenario');
  var progreso = document.getElementById('progreso');
  var contador = document.getElementById('contador');
  var negro = document.getElementById('negro');
  var ayuda = document.getElementById('ayuda');
  var orador = null;           // ventana del orador
  var tecleado = '';           // número escrito para saltar (p. ej. 12 + Intro)
  var tContador = null, tCursor = null, tTecleado = null;
  var paso = 0;                // pasos dentro de una diapositiva (data-pasos), p. ej. subir las sábanas

  if (MINIATURA) document.body.classList.add('miniatura');

  /* ---------- escala del lienzo 960 × 540 ---------- */
  function escalar() {
    var k = Math.min(window.innerWidth / 960, window.innerHeight / 540);
    document.documentElement.style.setProperty('--k', k);
  }
  window.addEventListener('resize', escalar);
  escalar();

  /* ---------- figuras interactivas: se cargan al llegar a su diapositiva ---------- */
  function prepararFiguras(d) {
    var figs = d.querySelectorAll('.figura3d');
    for (var i = 0; i < figs.length; i++) {
      var fig = figs[i];
      var ifr = fig.querySelector('iframe');
      if (!ifr || ifr.getAttribute('src') || MINIATURA) {
        if (MINIATURA) fig.classList.add('sin-interactiva');
        continue;
      }
      ifr.addEventListener('error', function () { this.parentNode.classList.add('sin-interactiva'); });
      /* al terminar de cargar, la figura recibe el paso en que va la diapositiva */
      ifr.addEventListener('load', function () { if (this.closest('.diapo') === diapos[actual]) enviarPaso(false); });
      ifr.setAttribute('src', ifr.getAttribute('data-src'));
    }
  }

  /* ---------- pasos dentro de una diapositiva ----------
     Una diapositiva con data-pasos="1" consume un avance antes de pasar a la
     siguiente (como una animación «al hacer clic» de PowerPoint). Se manda a sus
     figuras {tipo: 'paso', paso, animar}. Al volver desde la siguiente se llega
     con todos los pasos hechos. */
  function pasosDe(i) { return parseInt(diapos[i].getAttribute('data-pasos'), 10) || 0; }
  function enviarPaso(animar) {
    /* piezas que aparecen (data-desde="k") o desaparecen (data-hasta="k") según el paso */
    var d = diapos[actual];
    d.classList.toggle('sin-transicion', !animar);
    var piezas = d.querySelectorAll('[data-desde], [data-hasta]');
    for (var j = 0; j < piezas.length; j++) {
      var desde = piezas[j].getAttribute('data-desde'), hasta = piezas[j].getAttribute('data-hasta');
      var ver = (desde === null || paso >= +desde) && (hasta === null || paso <= +hasta);
      piezas[j].classList.toggle('oculto-paso', !ver);
    }
    if (!animar) { void d.offsetWidth; setTimeout(function () { d.classList.remove('sin-transicion'); }, 30); }
    if (MINIATURA) return;
    var ifrs = diapos[actual].querySelectorAll('.figura3d iframe[src]');
    for (var i = 0; i < ifrs.length; i++) {
      try { ifrs[i].contentWindow.postMessage({ tipo: 'paso', paso: paso, animar: animar }, '*'); } catch (e) { /* sin figura */ }
    }
  }
  function adelante() {
    if (paso < pasosDe(actual)) { paso++; enviarPaso(true); }
    else ir(actual + 1);
  }
  function atras() {
    if (paso > 0) { paso--; enviarPaso(true); }
    else if (actual > 0) ir(actual - 1, false, true);
  }

  /* ---------- ir a una diapositiva ---------- */
  function ir(n, sinAvisar, conPasosHechos) {
    n = Math.max(0, Math.min(total - 1, n));
    if (diapos[actual]) diapos[actual].classList.remove('activa');
    actual = n;
    paso = conPasosHechos ? pasosDe(actual) : 0;
    var d = diapos[actual];
    d.classList.add('activa');
    prepararFiguras(d);
    enviarPaso(false);
    document.body.classList.toggle('diapo-portada-activa', actual === 0);
    progreso.style.width = ((actual + 1) / total * 100) + '%';
    contador.textContent = (actual + 1) + ' / ' + total;
    document.title = (d.getAttribute('data-titulo') || 'Presentación') + ' · ' + (actual + 1) + '/' + total;
    if (!MINIATURA && location.hash !== '#' + (actual + 1)) {
      try { history.replaceState(null, '', '#' + (actual + 1)); } catch (e) { location.hash = '#' + (actual + 1); }
    }
    if (!sinAvisar) avisarOrador();
  }

  function leerHash() {
    var n = parseInt(location.hash.replace('#', ''), 10);
    return isNaN(n) ? 0 : n - 1;
  }

  function mostrarContador() {
    if (MINIATURA) return;
    contador.classList.add('visible');
    clearTimeout(tContador);
    tContador = setTimeout(function () { contador.classList.remove('visible'); }, 1800);
  }

  /* ---------- ventana del orador ---------- */
  function avisarOrador() {
    if (orador && !orador.closed) {
      orador.postMessage({ tipo: 'diapo', n: actual + 1, total: total }, '*');
    }
  }
  function abrirOrador() {
    if (orador && !orador.closed) { orador.focus(); return; }
    orador = window.open('orador.html#' + (actual + 1), 'tms-orador', 'width=1200,height=760');
  }

  window.addEventListener('message', function (ev) {
    var m = ev.data || {};
    if (m.tipo === 'ir' && typeof m.n === 'number') { ir(m.n - 1, MINIATURA); if (!MINIATURA && ev.source) orador = ev.source; avisarOrador(); }
    if (m.tipo === 'hola' && ev.source) { orador = ev.source; avisarOrador(); }
    /* teclas que reenvían una figura con el foco o la ventana del orador */
    if (m.tipo === 'tecla' && typeof m.key === 'string' && !MINIATURA) { if (manejarTecla(m.key)) mostrarContador(); }
  });

  /* ---------- teclado ---------- */
  function pantallaCompleta() {
    if (!document.fullscreenElement) {
      (document.documentElement.requestFullscreen || function () {}).call(document.documentElement);
    } else if (document.exitFullscreen) document.exitFullscreen();
  }

  /* Devuelve true si la tecla era de la presentación (para mostrar el contador) */
  function manejarTecla(k) {
    if (ayuda.classList.contains('visible') && k !== 'h' && k !== 'H' && k !== '?') {
      ayuda.classList.remove('visible'); return false;
    }
    if (negro.classList.contains('visible')) {
      negro.classList.remove('visible'); return false;
    }
    switch (k) {
      case 'Enter':
        if (tecleado) { ir(parseInt(tecleado, 10) - 1); tecleado = ''; }
        else adelante();
        break;
      case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': case 'Spacebar': adelante(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace': atras(); break;
      case 'Home': ir(0); break;
      case 'End': ir(total - 1, false, true); break;
      case 'f': case 'F': pantallaCompleta(); break;
      case 'n': case 'N': abrirOrador(); break;
      case 'b': case 'B': case '.': negro.classList.add('visible'); break;
      case 'h': case 'H': case '?': ayuda.classList.toggle('visible'); break;
      case 'Escape': tecleado = ''; break;
      default: return null;
    }
    return true;
  }

  document.addEventListener('keydown', function (e) {
    if (MINIATURA) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var k = e.key;
    if (/^[0-9]$/.test(k) && !ayuda.classList.contains('visible') && !negro.classList.contains('visible')) {
      tecleado += k; clearTimeout(tTecleado);
      tTecleado = setTimeout(function () { tecleado = ''; }, 2000);
      contador.textContent = 'Ir a ' + tecleado + '…'; contador.classList.add('visible');
      return;
    }
    var r = manejarTecla(k);
    if (r === null) return;
    e.preventDefault();
    if (r) mostrarContador();
  });

  /* Clic izquierdo en la diapositiva = avanzar, como en PowerPoint (en una figura
     interactiva lo decide la figura: la de las bobinas también avanza) */
  escenario.addEventListener('click', function (e) {
    if (MINIATURA || e.button !== 0) return;
    if (e.target.closest && e.target.closest('.figura3d, a, button')) return;
    adelante();
    mostrarContador();
  });

  /* Si el foco quedó dentro de una figura interactiva, un clic fuera de ella lo devuelve */
  document.addEventListener('mousedown', function (e) {
    if (!e.target.closest || !e.target.closest('.figura3d')) {
      if (document.activeElement && document.activeElement.tagName === 'IFRAME') document.activeElement.blur();
      window.focus();
    }
  });

  /* Cursor: se oculta tras 2 s sin moverse */
  document.addEventListener('mousemove', function () {
    document.body.classList.remove('sin-cursor');
    clearTimeout(tCursor);
    tCursor = setTimeout(function () { document.body.classList.add('sin-cursor'); }, 2000);
  });

  window.addEventListener('hashchange', function () {
    var n = leerHash();
    if (n !== actual) ir(n);
  });

  ir(leerHash(), true);
})();
