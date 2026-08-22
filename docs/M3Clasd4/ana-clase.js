/* ==========================================================================
   ANA LEARNING EXPERIENCE SYSTEM · CONTROLADOR v8.0 "AULA VIVA"
   © 2026 Ana Alvarado · Educadora Tech & Desarrolladora Full Stack

   Un solo formato: SPA (estudio + proyección). Se eliminó todo lo de Slides.

   Responsabilidades:
   - Tema claro/oscuro con memoria (abre en oscuro por defecto).
   - Pantalla completa.
   - Copiar código.
   - Sidebar colapsable + scrollspy + barra de progreso.
   - Animación de gráficos (barras, columnas, donut) al entrar en viewport.
   - Render de Mermaid con el tema actual y re-render al cambiar de tema.

   El "Ver respuesta" socrático NO necesita JS: usa <details> nativo.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var themeButton = document.getElementById('temaBtn');
  var fullscreenButton = document.getElementById('fullscreenBtn');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -----------------------------------------------------------------
     Contraste de acento: si el acento no contrasta con la superficie,
     el CSS activa un color de texto de reemplazo.
     ----------------------------------------------------------------- */
  function colorRgb(value) {
    var probe = document.createElement('span');
    probe.style.color = value;
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    document.body.appendChild(probe);
    var match = getComputedStyle(probe).color.match(/[\d.]+/g);
    probe.remove();
    return match ? match.slice(0, 3).map(Number) : [0, 0, 0];
  }
  function luminance(rgb) {
    var values = rgb.map(function (value) {
      value /= 255;
      return value <= .03928 ? value / 12.92 : Math.pow((value + .055) / 1.055, 2.4);
    });
    return .2126 * values[0] + .7152 * values[1] + .0722 * values[2];
  }
  function contrastRatio(foreground, background) {
    var a = luminance(colorRgb(foreground));
    var b = luminance(colorRgb(background));
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  }
  function guardAccentContrast() {
    root.removeAttribute('data-contraste-acento');
    var styles = getComputedStyle(root);
    var accent = styles.getPropertyValue('--a1-text').trim();
    var surface = styles.getPropertyValue('--surf-1').trim();
    if (accent && surface && contrastRatio(accent, surface) < 4.5) root.dataset.contrasteAcento = 'fallback';
  }

  /* -----------------------------------------------------------------
     MERMAID: render con el tema actual. Guardamos el código fuente para
     poder re-dibujar cuando se cambie de tema.
     ----------------------------------------------------------------- */
  var mermaidReady = false;
  function mermaidThemeVars() {
    var s = getComputedStyle(root);
    var g = function (n) { return s.getPropertyValue(n).trim(); };
    var dark = root.dataset.tema !== 'claro';
    return {
      theme: 'base',
      themeVariables: {
        darkMode: dark,
        background: g('--surf-2'),
        primaryColor: 'color-mix(in srgb, ' + g('--a1') + ' 18%, ' + g('--surf-1') + ')',
        primaryBorderColor: g('--a1'),
        primaryTextColor: g('--ink'),
        secondaryColor: 'color-mix(in srgb, ' + g('--a2') + ' 18%, ' + g('--surf-1') + ')',
        tertiaryColor: 'color-mix(in srgb, ' + g('--a3') + ' 18%, ' + g('--surf-1') + ')',
        lineColor: g('--ink-mute'),
        fontFamily: g('--font-mono') || 'monospace',
        fontSize: '15px'
      }
    };
  }
  function mermaidFallback(blocks) {
    /* red de seguridad: si Mermaid no cargó (sin conexión), nunca mostramos
       el código crudo. Ocultamos la fuente y dejamos una nota discreta. */
    blocks.forEach(function (el) {
      if (!el.dataset.src) el.dataset.src = (el.textContent || '').trim();
      el.innerHTML = '';
      el.classList.add('mermaid--fallback');
      var note = document.createElement('p');
      note.className = 'mermaid-note';
      note.textContent = 'Diagrama interactivo — requiere conexión para dibujarse.';
      el.appendChild(note);
    });
  }
  function renderMermaid() {
    var blocks = Array.prototype.slice.call(document.querySelectorAll('.mermaid'));
    if (!blocks.length) return;
    if (typeof window.mermaid === 'undefined') { mermaidFallback(blocks); return; }
    blocks.forEach(function (el) {
      if (!el.dataset.src) el.dataset.src = (el.textContent || '').trim();
      el.classList.remove('mermaid--fallback');
      el.removeAttribute('data-processed');
      el.innerHTML = el.dataset.src;
    });
    try {
      window.mermaid.initialize(Object.assign({ startOnLoad: false, securityLevel: 'strict' }, mermaidThemeVars()));
      window.mermaid.run({ nodes: blocks });
      mermaidReady = true;
    } catch (e) { mermaidFallback(blocks); }
  }

  /* -----------------------------------------------------------------
     TEMA claro/oscuro con memoria
     ----------------------------------------------------------------- */
  function setTheme(theme) {
    var normalized = theme === 'claro' ? 'claro' : 'oscuro';
    root.dataset.tema = normalized;
    guardAccentContrast();
    try { localStorage.setItem('ana-tema-v8', normalized); } catch (e) {}
    if (themeButton) {
      var dark = normalized === 'oscuro';
      themeButton.textContent = dark ? '☀' : '☾';
      themeButton.setAttribute('aria-label', dark ? 'Activar tema claro' : 'Activar tema oscuro');
    }
    if (mermaidReady) renderMermaid();
  }
  var savedTheme;
  try { savedTheme = localStorage.getItem('ana-tema-v8'); } catch (e) {}
  setTheme(savedTheme || (root.dataset.temaBase === 'claro' ? 'claro' : 'oscuro'));
  if (themeButton) {
    themeButton.addEventListener('click', function () {
      setTheme(root.dataset.tema === 'oscuro' ? 'claro' : 'oscuro');
    });
  }

  /* -----------------------------------------------------------------
     PANTALLA COMPLETA
     ----------------------------------------------------------------- */
  function toggleFullscreen() {
    try {
      var action;
      if (!document.fullscreenElement) {
        action = (document.documentElement.requestFullscreen || function () {}).call(document.documentElement);
      } else {
        action = (document.exitFullscreen || function () {}).call(document);
      }
      if (action && typeof action.catch === 'function') action.catch(function () {});
    } catch (e) {}
  }
  if (fullscreenButton) fullscreenButton.addEventListener('click', toggleFullscreen);
  document.addEventListener('keydown', function (e) {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === 'f' || e.key === 'F') toggleFullscreen();
  });

  /* -----------------------------------------------------------------
     COPIAR CÓDIGO
     ----------------------------------------------------------------- */
  Array.prototype.forEach.call(document.querySelectorAll('.copy-btn'), function (button) {
    button.setAttribute('aria-live', 'polite');
    button.addEventListener('click', function () {
      var block = button.closest('.code-block');
      var codeEl = block ? block.querySelector('code') : null;
      var code = codeEl ? codeEl.innerText : '';
      if (!code) return;
      var original = button.textContent;
      var done = function () {
        button.textContent = 'Copiado ✓';
        window.setTimeout(function () { button.textContent = original; }, 1500);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(code).then(done).catch(function () { button.textContent = 'No se pudo copiar'; });
      } else {
        var ta = document.createElement('textarea');
        ta.value = code; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { button.textContent = 'No se pudo copiar'; }
        ta.remove();
      }
    });
  });

  /* -----------------------------------------------------------------
     ANIMACIÓN DE GRÁFICOS al entrar en viewport
     .bar-fill[data-target]  ancho final en %
     .col-bar[data-target]   alto final en %
     .donut circle[data-dash] longitud de arco sobre 100
     ----------------------------------------------------------------- */
  function animateChart(scope) {
    Array.prototype.forEach.call(scope.querySelectorAll('.bar-fill[data-target]'), function (el) {
      el.style.width = Math.min(100, Math.max(0, parseFloat(el.dataset.target) || 0)) + '%';
    });
    Array.prototype.forEach.call(scope.querySelectorAll('.col-bar[data-target]'), function (el) {
      el.style.height = Math.min(100, Math.max(0, parseFloat(el.dataset.target) || 0)) + '%';
    });
    Array.prototype.forEach.call(scope.querySelectorAll('.donut circle[data-dash]'), function (el) {
      var dash = Math.min(100, Math.max(0, parseFloat(el.dataset.dash) || 0));
      el.style.strokeDasharray = dash + ' ' + (100 - dash);
    });
  }
  var chartScopes = document.querySelectorAll('.databox, .donut-panel, .visual-panel, .chart-panel, .columns');
  if (chartScopes.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(chartScopes, animateChart);
    } else {
      var chartObserver = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { animateChart(entry.target); obs.unobserve(entry.target); }
        });
      }, { threshold: 0.32 });
      Array.prototype.forEach.call(chartScopes, function (t) { chartObserver.observe(t); });
    }
  }

  /* -----------------------------------------------------------------
     SPA: sidebar colapsable + scrollspy + progreso
     ----------------------------------------------------------------- */
  var shell = document.getElementById('shell');
  var collapseBtn = document.getElementById('collapseBtn');
  var progFill = document.getElementById('progFill');
  var progPct = document.getElementById('progPct');
  var topline = document.getElementById('topline');
  var sections = Array.prototype.slice.call(document.querySelectorAll('.section[id]'));
  var navItems = Array.prototype.slice.call(document.querySelectorAll('.nav-item'));

  if (shell && collapseBtn) {
    collapseBtn.addEventListener('click', function () {
      var collapsed = shell.dataset.collapsed === 'true';
      shell.dataset.collapsed = collapsed ? 'false' : 'true';
      collapseBtn.textContent = collapsed ? '‹' : '›';
      collapseBtn.setAttribute('aria-label', collapsed ? 'Colapsar menú' : 'Expandir menú');
      try { localStorage.setItem('ana-sidebar-v8', shell.dataset.collapsed); } catch (e) {}
    });
    var savedSb;
    try { savedSb = localStorage.getItem('ana-sidebar-v8'); } catch (e) {}
    if (savedSb === 'true') { shell.dataset.collapsed = 'true'; collapseBtn.textContent = '›'; }
  }

  function updateProgress() {
    var scrollable = document.documentElement.scrollHeight - window.innerHeight;
    var pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    pct = Math.min(100, Math.max(0, pct));
    if (topline) topline.style.width = pct + '%';
    if (progFill) progFill.style.width = pct + '%';
    if (progPct) progPct.textContent = Math.round(pct) + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  function setActive(id) {
    navItems.forEach(function (item) {
      var active = item.getAttribute('href') === '#' + id;
      item.classList.toggle('active', active);
      if (active) item.setAttribute('aria-current', 'location');
      else item.removeAttribute('aria-current');
    });
  }
  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      var visible = entries
        .filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; })[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: '-28% 0px -60% 0px', threshold: [0.05, 0.2, 0.45] });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* -----------------------------------------------------------------
     Arranque de Mermaid (si está enlazado en la página)
     ----------------------------------------------------------------- */
  if (document.querySelector('.mermaid')) {
    if (typeof window.mermaid !== 'undefined') {
      renderMermaid();
    } else {
      window.addEventListener('load', function () {
        // se ejecute o no Mermaid, renderMermaid resuelve el caso (dibuja o aplica fallback)
        window.setTimeout(renderMermaid, 400);
      });
    }
  }

  /* firma en consola */
  var accent = getComputedStyle(root).getPropertyValue('--a1').trim() || '#2fd4cb';
  try {
    console.log('%c© 2026 Ana Alvarado', 'color:' + accent + ';font-weight:800;font-size:16px');
    console.log('Ana Learning Experience System v8.0 "Aula Viva" · Material de autoría exclusiva.');
  } catch (e) {}
})();
