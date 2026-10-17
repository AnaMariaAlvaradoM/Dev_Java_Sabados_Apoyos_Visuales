/* ========================================================================== 
   ANA LEARNING EXPERIENCE SYSTEM · CONTROLADOR v12.1 "PIZARRA"
   © 2026 Ana Alvarado · Educadora Tech & Desarrolladora Full Stack

   v12.1 (aditivo): panel flotante de glosario con búsqueda, términos
   clicables (.termino), atajo G, claves de almacenamiento sin versión
   (lee las anteriores para no perder preferencias).

   v12.3 (aditivo): lectura guiada del código. En cada .lectura, tocar o
   enfocar una .nota ilumina sus líneas (data-lineas="11-14,17") en el
   fragmento; tocar una línea del código activa la nota que la explica.
   Flechas ↑ ↓ recorren las notas sin cambiar de escena.

   Una SPA real: portada y una sola sección visible a la vez.
   El contenido, los bloques de código y los componentes pedagógicos se
   conservan; este controlador solo cambia navegación, estado y presentación.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var themeButton = document.getElementById('temaBtn');
  var fullscreenButton = document.getElementById('fullscreenBtn');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var activeView = null;

  /* -----------------------------------------------------------------
     Contraste del acento
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
    if (accent && surface && contrastRatio(accent, surface) < 4.5) {
      root.dataset.contrasteAcento = 'fallback';
    }
  }

  /* -----------------------------------------------------------------
     Mermaid: solo se dibuja la escena visible para evitar anchos de cero.
     ----------------------------------------------------------------- */
  var mermaidReady = false;

  /* v12: Mermaid no entiende color-mix(); se mezcla aquí y se entrega en hex. */
  function mixHex(colorA, colorB, percentA) {
    var a = colorRgb(colorA), b = colorRgb(colorB), p = percentA / 100;
    return '#' + [0, 1, 2].map(function (i) {
      var value = Math.round(a[i] * p + b[i] * (1 - p));
      return ('0' + value.toString(16)).slice(-2);
    }).join('');
  }

  function mermaidThemeVars() {
    var styles = getComputedStyle(root);
    var token = function (name) { return styles.getPropertyValue(name).trim(); };
    return {
      theme: 'base',
      themeVariables: {
        darkMode: root.dataset.tema !== 'claro',
        background: token('--surf-2'),
        primaryColor: mixHex(token('--scene-accent'), token('--surf-1'), 18),
        primaryBorderColor: token('--scene-accent'),
        primaryTextColor: token('--ink'),
        secondaryColor: mixHex(token('--scene-accent-2'), token('--surf-1'), 18),
        tertiaryColor: mixHex(token('--a3'), token('--surf-1'), 18),
        lineColor: token('--ink-mute'),
        fontFamily: token('--font-mono') || 'monospace',
        fontSize: '15px'
      }
    };
  }

  function mermaidBlocks(scope) {
    if (!scope) return [];
    var blocks = Array.prototype.slice.call(scope.querySelectorAll('.mermaid'));
    if (scope.matches && scope.matches('.mermaid')) blocks.unshift(scope);
    return blocks;
  }

  function mermaidFallback(blocks) {
    blocks.forEach(function (element) {
      if (!element.dataset.src) element.dataset.src = (element.textContent || '').trim();
      element.innerHTML = '';
      element.classList.add('mermaid--fallback');
      var note = document.createElement('p');
      note.className = 'mermaid-note';
      note.textContent = 'Diagrama interactivo — requiere conexión para dibujarse.';
      element.appendChild(note);
    });
  }

  function renderMermaid(scope) {
    var blocks = mermaidBlocks(scope || activeView || document);
    if (!blocks.length) return;
    if (typeof window.mermaid === 'undefined') {
      mermaidFallback(blocks);
      return;
    }

    blocks.forEach(function (element) {
      if (!element.dataset.src) element.dataset.src = (element.textContent || '').trim();
      element.classList.remove('mermaid--fallback');
      element.removeAttribute('data-processed');
      element.innerHTML = element.dataset.src;
    });

    try {
      window.mermaid.initialize(Object.assign({
        startOnLoad: false,
        securityLevel: 'strict'
      }, mermaidThemeVars()));
      Promise.resolve(window.mermaid.run({ nodes: blocks })).then(function () {
        mermaidReady = true;
      }).catch(function () {
        mermaidFallback(blocks);
      });
    } catch (error) {
      mermaidFallback(blocks);
    }
  }

  /* -----------------------------------------------------------------
     Tema claro/oscuro con memoria
     ----------------------------------------------------------------- */
  function setTheme(theme) {
    var normalized = theme === 'claro' ? 'claro' : 'oscuro';
    root.dataset.tema = normalized;
    guardAccentContrast();
    try { localStorage.setItem('ana-tema', normalized); } catch (error) {}

    if (themeButton) {
      var dark = normalized === 'oscuro';
      themeButton.textContent = dark ? '☀' : '☾';
      themeButton.setAttribute('aria-label', dark ? 'Activar tema claro' : 'Activar tema oscuro');
    }

    if (mermaidReady && activeView) renderMermaid(activeView);
  }

  var savedTheme;
  try {
    savedTheme = localStorage.getItem('ana-tema') || localStorage.getItem('ana-tema-v11') || localStorage.getItem('ana-tema-v9') || localStorage.getItem('ana-tema-v8');
  } catch (error) {}
  setTheme(savedTheme || (root.dataset.temaBase === 'claro' ? 'claro' : 'oscuro'));
  if (themeButton) {
    themeButton.addEventListener('click', function () {
      setTheme(root.dataset.tema === 'oscuro' ? 'claro' : 'oscuro');
    });
  }

  /* -----------------------------------------------------------------
     Pantalla completa
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
    } catch (error) {}
  }

  if (fullscreenButton) fullscreenButton.addEventListener('click', toggleFullscreen);

  /* -----------------------------------------------------------------
     Copiar código: no modifica ni reinterpreta el contenido.
     ----------------------------------------------------------------- */
  Array.prototype.forEach.call(document.querySelectorAll('.copy-btn'), function (button) {
    button.setAttribute('aria-live', 'polite');
    button.addEventListener('click', function () {
      var block = button.closest('.code-block');
      var codeElement = block ? block.querySelector('code') : null;
      var code = codeElement ? codeElement.innerText : '';
      if (!code) return;
      var original = button.textContent;
      var done = function () {
        button.textContent = 'Copiado ✓';
        window.setTimeout(function () { button.textContent = original; }, 1500);
      };

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(code).then(done).catch(function () {
          button.textContent = 'No se pudo copiar';
        });
      } else {
        var textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try { document.execCommand('copy'); done(); } catch (error) {
          button.textContent = 'No se pudo copiar';
        }
        textarea.remove();
      }
    });
  });

  /* -----------------------------------------------------------------
     Construcción activa: revelar soluciones sin romper el ritmo.
     - <details class="code-reveal"> mantiene el archivo completo disponible,
       pero fuera del camino visual principal hasta que el estudiante lo necesita.
     - Al abrir una solución se vuelve a aplicar Prism solo dentro de ese bloque.
     - Las microactividades usan <details> nativo: funcionan sin JavaScript.
     ----------------------------------------------------------------- */
  Array.prototype.forEach.call(document.querySelectorAll('details.code-reveal'), function (details) {
    var summary = details.querySelector(':scope > summary');
    if (summary) summary.setAttribute('aria-label', summary.getAttribute('aria-label') || 'Mostrar u ocultar archivo completo');

    details.addEventListener('toggle', function () {
      if (!details.open) return;
      if (typeof window.Prism !== 'undefined' && window.Prism.highlightAllUnder) {
        window.requestAnimationFrame(function () { window.Prism.highlightAllUnder(details); });
      }
    });
  });

  /* -----------------------------------------------------------------
     Gráficos: se animan al abrir su escena.
     ----------------------------------------------------------------- */
  function animateChart(scope) {
    Array.prototype.forEach.call(scope.querySelectorAll('.bar-fill[data-target]'), function (element) {
      element.style.width = Math.min(100, Math.max(0, parseFloat(element.dataset.target) || 0)) + '%';
    });
    Array.prototype.forEach.call(scope.querySelectorAll('.col-bar[data-target]'), function (element) {
      element.style.height = Math.min(100, Math.max(0, parseFloat(element.dataset.target) || 0)) + '%';
    });
    Array.prototype.forEach.call(scope.querySelectorAll('.donut circle[data-dash]'), function (element) {
      var dash = Math.min(100, Math.max(0, parseFloat(element.dataset.dash) || 0));
      element.style.strokeDasharray = dash + ' ' + (100 - dash);
    });
  }

  function animateChartsIn(view) {
    var scopes = view.querySelectorAll('.databox, .donut-panel, .visual-panel, .chart-panel, .columns');
    Array.prototype.forEach.call(scopes, function (scope) {
      if (reduceMotion) animateChart(scope);
      else window.requestAnimationFrame(function () { animateChart(scope); });
    });
  }

  /* -----------------------------------------------------------------
     SPA de escenas: portada + una sola sección visible.
     Compatible con guías v8 que todavía no marcan la portada como vista.
     ----------------------------------------------------------------- */
  var shell = document.getElementById('shell');
  var main = document.querySelector('.main');
  var content = document.querySelector('.content');
  var nav = document.getElementById('nav') || document.querySelector('.sb-nav');
  var collapseButton = document.getElementById('collapseBtn');
  var progressFill = document.getElementById('progFill');
  var progressPercent = document.getElementById('progPct');
  var topLine = document.getElementById('topline');
  var hero = document.querySelector('.hero');
  var sections = Array.prototype.slice.call(document.querySelectorAll('.section[id]'));

  if (hero) {
    if (!hero.id) hero.id = 'portada';
    hero.classList.add('view');
  }
  sections.forEach(function (section) { section.classList.add('view'); });

  var views = hero ? [hero].concat(sections) : sections.slice();

  function ensureCoverLink() {
    if (!hero || !nav || nav.querySelector('[href="#' + hero.id + '"]')) return;
    var link = document.createElement('a');
    link.className = 'nav-item nav-item--cover';
    link.href = '#' + hero.id;
    link.innerHTML = '<span class="nav-index">00</span><span class="nav-label">Portada</span>';
    nav.insertBefore(link, nav.firstChild);
  }
  ensureCoverLink();

  var navItems = Array.prototype.slice.call(document.querySelectorAll('.nav-item[href^="#"]'));

  if (shell && collapseButton) {
    collapseButton.addEventListener('click', function () {
      var collapsed = shell.dataset.collapsed === 'true';
      shell.dataset.collapsed = collapsed ? 'false' : 'true';
      collapseButton.textContent = collapsed ? '‹' : '›';
      collapseButton.setAttribute('aria-label', collapsed ? 'Colapsar menú' : 'Expandir menú');
      try { localStorage.setItem('ana-sidebar', shell.dataset.collapsed); } catch (error) {}
    });

    var savedSidebar;
    try {
      savedSidebar = localStorage.getItem('ana-sidebar') || localStorage.getItem('ana-sidebar-v11') || localStorage.getItem('ana-sidebar-v9') || localStorage.getItem('ana-sidebar-v8');
    } catch (error) {}
    if (savedSidebar === 'true') {
      shell.dataset.collapsed = 'true';
      collapseButton.textContent = '›';
    }
  }

  function ensureViewControls() {
    var controls = document.getElementById('viewControls');
    if (controls || !main || views.length < 2) return controls;
    controls = document.createElement('nav');
    controls.className = 'view-controls';
    controls.id = 'viewControls';
    controls.setAttribute('aria-label', 'Navegación entre secciones');
    controls.innerHTML = '<button class="view-btn" id="prevView" type="button" aria-label="Sección anterior">←</button>' +
      '<span class="view-position" id="viewPosition" aria-live="polite"></span>' +
      '<button class="view-btn" id="nextView" type="button" aria-label="Sección siguiente">→</button>';
    main.appendChild(controls);
    return controls;
  }

  ensureViewControls();
  var previousButton = document.getElementById('prevView');
  var nextButton = document.getElementById('nextView');
  var viewPosition = document.getElementById('viewPosition');

  function viewById(id) {
    return views.filter(function (view) { return view.id === id; })[0] || null;
  }

  function progressFor(index) {
    if (views.length < 2) return 100;
    return Math.round((index / (views.length - 1)) * 100);
  }

  function updateRouteUi(view, index) {
    navItems.forEach(function (item) {
      var current = item.getAttribute('href') === '#' + view.id;
      item.classList.toggle('active', current);
      if (current) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });

    var accent = view.dataset.accent || String(index === 0 ? 1 : ((index - 1) % 4) + 1);
    root.dataset.activeAccent = accent;

    var percent = progressFor(index);
    if (topLine) topLine.style.width = percent + '%';
    if (progressFill) progressFill.style.width = percent + '%';
    if (progressPercent) progressPercent.textContent = percent + '%';
    if (viewPosition) viewPosition.textContent = index === 0 ? 'Portada' : index + ' de ' + (views.length - 1);
    if (previousButton) previousButton.disabled = index === 0;
    if (nextButton) nextButton.disabled = index === views.length - 1;
  }

  function setActiveView(id, options) {
    if (!views.length) return;
    options = options || {};
    var view = viewById(id) || views[0];
    var index = views.indexOf(view);

    views.forEach(function (candidate) {
      var current = candidate === view;
      candidate.hidden = !current;
      candidate.classList.toggle('is-active', current);
      candidate.setAttribute('aria-hidden', current ? 'false' : 'true');
    });

    activeView = view;
    if (content) content.hidden = view === hero;
    updateRouteUi(view, index);
    root.classList.add('spa-ready');

    if (main) main.scrollTop = 0;
    window.scrollTo(0, 0);

    if (options.focus) {
      var heading = view.querySelector('h1, h2');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
    }

    window.requestAnimationFrame(function () {
      animateChartsIn(view);
      if (typeof window.Prism !== 'undefined' && window.Prism.highlightAllUnder) {
        window.Prism.highlightAllUnder(view);
      }
      renderMermaid(view);
      refreshReadings(view);
    });
  }

  function goToIndex(index, focus) {
    if (index < 0 || index >= views.length) return;
    var id = views[index].id;
    if (window.location.hash !== '#' + id) history.pushState(null, '', '#' + id);
    setActiveView(id, { focus: focus });
  }

  navItems.forEach(function (item) {
    item.addEventListener('click', function (event) {
      var id = decodeURIComponent(item.getAttribute('href').slice(1));
      if (!viewById(id)) return;
      event.preventDefault();
      if (window.location.hash !== '#' + id) history.pushState(null, '', '#' + id);
      setActiveView(id, { focus: true });
    });
  });

  if (previousButton) {
    previousButton.addEventListener('click', function () {
      goToIndex(Math.max(0, views.indexOf(activeView) - 1), true);
    });
  }
  if (nextButton) {
    nextButton.addEventListener('click', function () {
      goToIndex(Math.min(views.length - 1, views.indexOf(activeView) + 1), true);
    });
  }

  window.addEventListener('popstate', function () {
    setActiveView(decodeURIComponent(window.location.hash.slice(1)), { focus: true });
  });
  window.addEventListener('hashchange', function () {
    setActiveView(decodeURIComponent(window.location.hash.slice(1)), { focus: true });
  });

  /* -----------------------------------------------------------------
     v12.1 · Glosario como panel flotante
     - La fuente única es la escena que contiene .glosario (normalmente #glosario).
     - El panel clona ese contenido: no hay que escribir el glosario dos veces.
     - Abrirlo no cambia de escena: la clase sigue donde estaba.
     - <button class="termino" data-glosario="bean"> abre el panel en ese término
       (coincide con <div class="glos-item" data-termino="bean">).
     ----------------------------------------------------------------- */
  var glossarySource = document.querySelector('.section .glosario');
  var glossaryPanel = null;
  var glossaryButton = document.getElementById('glosarioBtn');

  function normalizeText(value) {
    return (value || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function buildGlossaryPanel() {
    if (glossaryPanel || !glossarySource) return glossaryPanel;
    glossaryPanel = document.createElement('dialog');
    glossaryPanel.className = 'glosario-panel';
    glossaryPanel.setAttribute('aria-label', 'Glosario de la clase');
    glossaryPanel.innerHTML =
      '<div class="glos-panel-head">' +
        '<div><h2>Glosario</h2><span>Términos de esta clase</span></div>' +
        '<button class="ctrl" type="button" data-cerrar aria-label="Cerrar glosario">✕</button>' +
        '<input class="glos-buscar" type="search" placeholder="Buscar un término…" aria-label="Buscar en el glosario">' +
      '</div>' +
      '<div class="glos-panel-body"></div>';

    var body = glossaryPanel.querySelector('.glos-panel-body');
    var copy = glossarySource.cloneNode(true);
    Array.prototype.forEach.call(copy.querySelectorAll('[id]'), function (node) { node.removeAttribute('id'); });
    body.appendChild(copy);
    var empty = document.createElement('p');
    empty.className = 'glos-vacio';
    empty.textContent = 'No hay términos que coincidan.';
    empty.hidden = true;
    body.appendChild(empty);

    var search = glossaryPanel.querySelector('.glos-buscar');
    search.addEventListener('input', function () {
      var query = normalizeText(search.value.trim());
      var visible = 0;
      Array.prototype.forEach.call(copy.querySelectorAll('.glos-item'), function (item) {
        var match = !query || normalizeText(item.textContent).indexOf(query) !== -1;
        item.hidden = !match;
        if (match) visible++;
      });
      empty.hidden = visible !== 0;
    });

    glossaryPanel.querySelector('[data-cerrar]').addEventListener('click', function () { glossaryPanel.close(); });
    glossaryPanel.addEventListener('click', function (event) {
      if (event.target === glossaryPanel) glossaryPanel.close();
    });
    glossaryPanel.addEventListener('close', function () {
      search.value = '';
      search.dispatchEvent(new Event('input'));
      if (glossaryButton) glossaryButton.setAttribute('aria-expanded', 'false');
    });
    document.body.appendChild(glossaryPanel);
    return glossaryPanel;
  }

  function flashItem(item) {
    item.classList.add('is-flash');
    item.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    window.setTimeout(function () { item.classList.remove('is-flash'); }, 1600);
  }

  function openGlossary(term) {
    if (!glossarySource) return;
    var panel = buildGlossaryPanel();
    if (!panel || typeof panel.showModal !== 'function') {
      var host = glossarySource.closest('.section');
      if (host) goToIndex(views.indexOf(host), true);
      return;
    }
    if (!panel.open) panel.showModal();
    if (glossaryButton) glossaryButton.setAttribute('aria-expanded', 'true');
    if (term) {
      var target = panel.querySelector('.glos-item[data-termino="' + term + '"]');
      if (target) window.requestAnimationFrame(function () { flashItem(target); });
    } else {
      panel.querySelector('.glos-buscar').focus();
    }
  }

  if (glossarySource) {
    var controlsBar = document.querySelector('.controls');
    if (!glossaryButton && controlsBar) {
      glossaryButton = document.createElement('button');
      glossaryButton.className = 'ctrl';
      glossaryButton.id = 'glosarioBtn';
      glossaryButton.type = 'button';
      glossaryButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16M9 8h7M9 12h5"/></svg>';
      controlsBar.insertBefore(glossaryButton, controlsBar.firstChild);
    }
    if (glossaryButton) {
      glossaryButton.hidden = false;
      glossaryButton.setAttribute('aria-label', 'Abrir glosario (G)');
      glossaryButton.setAttribute('title', 'Glosario (G)');
      glossaryButton.setAttribute('aria-expanded', 'false');
      glossaryButton.addEventListener('click', function () { openGlossary(); });
    }
  } else if (glossaryButton) {
    glossaryButton.hidden = true;
  }

  Array.prototype.forEach.call(document.querySelectorAll('.termino[data-glosario]'), function (term) {
    if (!term.getAttribute('type') && term.tagName === 'BUTTON') term.type = 'button';
    term.setAttribute('aria-haspopup', 'dialog');
    term.addEventListener('click', function (event) {
      event.preventDefault();
      openGlossary(term.dataset.glosario);
    });
  });

  document.addEventListener('keydown', function (event) {
    if (event.target && /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (document.querySelector('dialog[open]')) return;
    if ((event.key === 'g' || event.key === 'G') && glossarySource) {
      event.preventDefault();
      openGlossary();
      return;
    }
    if (event.key === 'f' || event.key === 'F') {
      toggleFullscreen();
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goToIndex(Math.max(0, views.indexOf(activeView) - 1), true);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goToIndex(Math.min(views.length - 1, views.indexOf(activeView) + 1), true);
    }
  });

  /* -----------------------------------------------------------------
     v12.3 · Lectura guiada
     <div class="lectura">
       … <div class="lectura-cuerpo">
           <div class="code-block" data-role="fragment"> <pre data-start="18">…</pre> </div>
           <ol class="notas"><li class="nota" data-lineas="18-19">…</li></ol>
         </div>
     </div>
     - Pasar el puntero por una nota muestra sus líneas; tocarla la fija.
     - Tab o ↑ ↓ recorren las notas: ideal para proyectar mientras se explica.
     - Tocar una línea del código activa la nota que la cubre.
     ----------------------------------------------------------------- */
  var readings = [];

  function parseLines(spec) {
    var lines = [];
    String(spec || '').split(',').forEach(function (part) {
      var bounds = part.trim().split(/\s*[-–]\s*/).map(function (n) { return parseInt(n, 10); });
      if (isNaN(bounds[0])) return;
      var from = bounds[0];
      var to = isNaN(bounds[1]) ? from : bounds[1];
      for (var n = Math.min(from, to); n <= Math.max(from, to); n++) lines.push(n);
    });
    return lines;
  }

  function runsOf(lines) {
    var sorted = lines.slice().sort(function (a, b) { return a - b; });
    var runs = [];
    sorted.forEach(function (n) {
      var last = runs[runs.length - 1];
      if (last && n === last[1] + 1) last[1] = n;
      else if (!last || n > last[1]) runs.push([n, n]);
    });
    return runs;
  }

  function lineBox(pre, line) {
    var start = parseInt(pre.getAttribute('data-start') || '1', 10);
    var index = line - start;
    var rows = pre.querySelector('.line-numbers-rows');
    var spans = rows ? rows.children : null;
    if (spans && spans[index]) {
      return { top: rows.offsetTop + spans[index].offsetTop, height: spans[index].offsetHeight, span: spans[index] };
    }
    var code = pre.querySelector('code');
    var lineHeight = parseFloat(getComputedStyle(code || pre).lineHeight) || 24;
    var padTop = parseFloat(getComputedStyle(pre).paddingTop) || 0;
    return { top: padTop + index * lineHeight, height: lineHeight, span: null };
  }

  function lightLines(pre, lines, reveal) {
    if (!pre) return;
    Array.prototype.forEach.call(pre.querySelectorAll(':scope > .linea-luz'), function (band) { band.remove(); });
    Array.prototype.forEach.call(pre.querySelectorAll('.line-numbers-rows > span.is-luz'), function (span) { span.classList.remove('is-luz'); });
    if (!lines || !lines.length) return;
    var firstBand = null;
    runsOf(lines).forEach(function (run) {
      var a = lineBox(pre, run[0]);
      var b = lineBox(pre, run[1]);
      var band = document.createElement('span');
      band.className = 'linea-luz';
      band.setAttribute('aria-hidden', 'true');
      band.style.top = a.top + 'px';
      band.style.height = Math.max(b.top + b.height - a.top, a.height) + 'px';
      band.style.width = pre.scrollWidth + 'px';
      pre.appendChild(band);
      if (!firstBand) firstBand = band;
      for (var n = run[0]; n <= run[1]; n++) {
        var box = lineBox(pre, n);
        if (box.span) box.span.classList.add('is-luz');
      }
    });
    if (reveal && firstBand) firstBand.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function lineAtPoint(pre, clientY) {
    var rows = pre.querySelector('.line-numbers-rows');
    var start = parseInt(pre.getAttribute('data-start') || '1', 10);
    if (rows && rows.children.length) {
      for (var i = 0; i < rows.children.length; i++) {
        var rect = rows.children[i].getBoundingClientRect();
        if (clientY >= rect.top && clientY < rect.bottom) return start + i;
      }
      return null;
    }
    var box = pre.getBoundingClientRect();
    var lineHeight = parseFloat(getComputedStyle(pre.querySelector('code') || pre).lineHeight) || 24;
    var padTop = parseFloat(getComputedStyle(pre).paddingTop) || 0;
    return start + Math.floor((clientY - box.top - padTop + pre.scrollTop) / lineHeight);
  }

  Array.prototype.forEach.call(document.querySelectorAll('.lectura'), function (lectura) {
    var pre = lectura.querySelector('.code-block pre');
    var notes = Array.prototype.slice.call(lectura.querySelectorAll('.nota[data-lineas]'));
    if (!pre || !notes.length) return;

    var state = { lectura: lectura, pre: pre, notes: notes, pinned: null, shown: null };
    readings.push(state);

    function show(note, reveal) {
      state.shown = note;
      notes.forEach(function (item) {
        var active = item === note;
        item.classList.toggle('is-activa', active);
        item.setAttribute('aria-pressed', item === state.pinned ? 'true' : 'false');
      });
      lightLines(pre, note ? parseLines(note.dataset.lineas) : [], reveal);
    }
    state.show = show;

    function pin(note, reveal) {
      state.pinned = note;
      show(note, reveal);
    }

    notes.forEach(function (note, index) {
      note.tabIndex = 0;
      note.setAttribute('role', 'button');
      note.setAttribute('aria-pressed', 'false');
      var label = note.querySelector('.nota-lineas');
      if (label && !note.getAttribute('aria-label')) note.setAttribute('aria-label', 'Explicación de ' + label.textContent.trim());

      note.addEventListener('mouseenter', function () { if (!state.teclado) show(note, false); });
      note.addEventListener('mouseleave', function () { if (!state.teclado) show(state.pinned, false); });
      note.addEventListener('mousemove', function () { state.teclado = false; });
      note.addEventListener('focus', function () { pin(note, true); });
      note.addEventListener('click', function () {
        if (state.pinned === note && document.activeElement === note && note.dataset.recienEnfocada !== 'true') pin(null, false);
        else pin(note, true);
        note.dataset.recienEnfocada = 'false';
      });
      note.addEventListener('mousedown', function () {
        note.dataset.recienEnfocada = document.activeElement === note ? 'false' : 'true';
      });
      note.addEventListener('keydown', function (event) {
        state.teclado = true;
        var target = null;
        if (event.key === 'ArrowDown') target = notes[index + 1];
        if (event.key === 'ArrowUp') target = notes[index - 1];
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          pin(state.pinned === note ? null : note, true);
          return;
        }
        if (event.key === 'Escape') { pin(null, false); note.blur(); return; }
        if (target) {
          event.preventDefault();
          event.stopPropagation();
          target.focus();
          target.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
        }
      });
    });

    pre.addEventListener('click', function (event) {
      var line = lineAtPoint(pre, event.clientY);
      if (line === null) return;
      var match = notes.filter(function (note) { return parseLines(note.dataset.lineas).indexOf(line) !== -1; })[0];
      if (!match) return;
      match.focus({ preventScroll: true });
      match.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  function refreshReadings(scope) {
    readings.forEach(function (state) {
      if (scope && !scope.contains(state.lectura)) return;
      var block = state.pre.closest('.code-block') || state.pre;
      var height = block.offsetHeight;
      if (height) state.lectura.dataset.fijo = height < window.innerHeight * 0.45 ? 'si' : 'no';
      if (state.shown) state.show(state.shown, false);
    });
  }

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () { refreshReadings(activeView); }, 120);
  });

  var initialId = decodeURIComponent(window.location.hash.slice(1));
  if (!viewById(initialId) && views.length) {
    initialId = views[0].id;
    history.replaceState(null, '', '#' + initialId);
  }
  setActiveView(initialId, { focus: false });

  if (document.querySelector('.mermaid') && typeof window.mermaid === 'undefined') {
    window.addEventListener('load', function () {
      window.setTimeout(function () { renderMermaid(activeView); }, 300);
    });
  }

  var accent = getComputedStyle(root).getPropertyValue('--scene-accent').trim() || '#2fd4cb';
  try {
    console.log('%c© 2026 Ana Alvarado', 'color:' + accent + ';font-weight:800;font-size:16px');
    console.log('Ana Learning Experience System v12.3 "Pizarra" · Material de autoría exclusiva.');
  } catch (error) {}
})();
