/* Ventana del orador: diapositiva actual, siguiente, notas, reloj y cronómetro.
   Se comunica con la ventana principal por postMessage (funciona con file://). */
(function () {
  'use strict';
  var principal = window.opener;
  var ifrActual = document.getElementById('actual');
  var ifrSig = document.getElementById('siguiente');
  var notas = document.getElementById('notas');
  var num = document.getElementById('num');
  var n = parseInt(location.hash.replace('#', ''), 10) || 1;
  var total = 0;
  var listos = 0;

  ifrActual.src = 'index.html?modo=miniatura#' + n;
  ifrSig.src = 'index.html?modo=miniatura#' + (n + 1);
  ifrActual.onload = ifrSig.onload = function () { listos++; mostrar(); };

  function mostrar() {
    num.textContent = n + ' / ' + (total || '–');
    if (listos >= 2) {
      ifrActual.contentWindow.postMessage({ tipo: 'ir', n: n }, '*');
      ifrSig.contentWindow.postMessage({ tipo: 'ir', n: total && n >= total ? n : n + 1 }, '*');
    }
    ifrSig.style.visibility = total && n >= total ? 'hidden' : 'visible';
    var texto = (window.NOTAS && window.NOTAS[n]) || '';
    notas.textContent = texto || 'Sin notas para esta diapositiva.';
    notas.classList.toggle('vacias', !texto);
  }

  window.addEventListener('message', function (ev) {
    var m = ev.data || {};
    if (m.tipo === 'diapo') { n = m.n; total = m.total; mostrar(); arrancar(); }
  });

  function tecla(k) {
    if (principal && !principal.closed) principal.postMessage({ tipo: 'tecla', key: k }, '*');
  }
  function pedir(nuevo) {
    if (total) nuevo = Math.max(1, Math.min(total, nuevo));
    if (principal && !principal.closed) principal.postMessage({ tipo: 'ir', n: nuevo }, '*');
  }

  document.addEventListener('keydown', function (e) {
    switch (e.key) {
      /* avanzar y retroceder pasan por la ventana principal, que conoce los pasos de cada diapositiva */
      case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': case 'Enter':
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace': tecla(e.key); break;
      case 'Home': pedir(1); break;
      case 'End': pedir(total || 999); break;
      default: return;
    }
    e.preventDefault();
  });

  /* Saludo para que la ventana principal (aunque se haya recargado) sepa a quién avisar */
  function saludar() { if (principal && !principal.closed) principal.postMessage({ tipo: 'hola' }, '*'); }
  saludar();
  setInterval(saludar, 3000);

  /* Reloj y cronómetro (empieza al primer cambio de diapositiva o con «Reiniciar») */
  var inicio = null, pausado = 0, enPausa = false;
  function arrancar() { if (inicio === null) inicio = Date.now(); }
  function dos(x) { return (x < 10 ? '0' : '') + x; }
  setInterval(function () {
    var d = new Date();
    document.getElementById('reloj').textContent = dos(d.getHours()) + ':' + dos(d.getMinutes());
    var ms = inicio === null ? 0 : (enPausa ? pausado : Date.now() - inicio);
    var s = Math.floor(ms / 1000);
    document.getElementById('crono').textContent = (s >= 3600 ? Math.floor(s / 3600) + ':' : '') + dos(Math.floor(s / 60) % 60) + ':' + dos(s % 60);
  }, 250);
  document.getElementById('btn-crono').onclick = function () {
    if (inicio === null) { inicio = Date.now(); return; }
    if (!enPausa) { pausado = Date.now() - inicio; enPausa = true; this.textContent = 'Seguir'; }
    else { inicio = Date.now() - pausado; enPausa = false; this.textContent = 'Pausar'; }
  };
  document.getElementById('btn-reiniciar').onclick = function () {
    inicio = Date.now(); pausado = 0; enPausa = false; document.getElementById('btn-crono').textContent = 'Pausar';
  };

  if (!principal) notas.textContent = 'Abre esta vista desde la presentación con la tecla N.';
  mostrar();
})();
