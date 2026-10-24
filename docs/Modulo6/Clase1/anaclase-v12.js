/* ========================================================================== 
   ANA LEARNING EXPERIENCE SYSTEM · CONTROLADOR v12.6 "PIZARRA"
   © 2026 Ana Alvarado · Educadora Tech & Desarrolladora Full Stack

   v12.1 (aditivo): panel flotante de glosario con búsqueda, términos
   clicables (.termino), atajo G, claves de almacenamiento sin versión
   (lee las anteriores para no perder preferencias).

   v12.3 (aditivo): lectura guiada del código. En cada .lectura, tocar o
   enfocar una .nota ilumina sus líneas (data-lineas="11-14,17") en el
   fragmento; tocar una línea del código activa la nota que la explica.
   Flechas ↑ ↓ recorren las notas sin cambiar de escena.

   v12.5 (aditivo): orden y reparación automática. Partes plegables con
   índice "En esta escena", portada con imagen, ilustraciones arriba,
   notas y bloques de código normalizados (ver sección "ORDEN").

   v12.6 (aditivo): código anotado (la explicación va debajo de sus
   líneas; "Solo código" con tecla N), panel "Archivos del proyecto"
   (tecla A) con la versión completa de cada archivo hasta la escena
   actual y lo nuevo resaltado, partes de escena abiertas por defecto
   (data-partes="plegadas" en <html> vuelve al comportamiento v12.5) e
   imágenes que no cargan sin recuadro roto.

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
     v12.5 · ORDEN Y REPARACIÓN AUTOMÁTICA (aditivo)
     Corre una sola vez, antes de armar las escenas. No cambia el contenido:
     solo lo ordena y corrige patrones de marcado que se repiten al generar
     la SPA desde la guía.
       1. Notas: quita "L12 · <code>…</code> →" repetido y lo pasa a la cabeza.
       2. Archivo completo: arma título + nota cuando el <summary> trae texto suelto.
       3. Bloques de código: comandos = "Terminal" (sin nombre de archivo falso);
          "Código" genérico toma la acción de la ficha (Crear, Reemplazar…).
       4. Subsecciones numeradas (h3 "3.3 · …") que quedaron dentro de un
          .archivo salen a la escena.
       5. Portada sin imagen: usa la primera ilustración de la clase.
       6. Ilustración al final de una escena: sube al inicio de la escena.
       7. Escenas con 2 o más subsecciones numeradas: índice "En esta escena",
          partes plegables y botón "Siguiente parte".
     ----------------------------------------------------------------- */
  var SUB_RE = /^\s*(\d+(?:\.\d+)+)\s*(?:[·.:\-–—]\s*)?/;
  var LINE_LABEL_RE = /^\s*(L\d+(?:\s*[–-]\s*\d+)?)\s*·?\s*/;

  function eachNode(selector, scope, fn) {
    Array.prototype.forEach.call((scope || document).querySelectorAll(selector), fn);
  }

  function plainText(node) {
    return node ? node.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  function firstMeaningful(parent) {
    var node = parent.firstChild;
    while (node && node.nodeType === 3 && !node.textContent.trim()) node = node.nextSibling;
    return node;
  }

  /* 1 · Notas */
  function repairNotes() {
    eachNode('.nota', document, function (note) {
      var paragraph = note.querySelector(':scope > p');
      if (!paragraph) return;
      var strong = firstMeaningful(paragraph);
      if (!strong || strong.nodeType !== 1 || strong.tagName !== 'STRONG') return;
      var match = plainText(strong).match(LINE_LABEL_RE);
      if (!match) return;

      var lead = strong.firstChild;
      if (lead && lead.nodeType === 3) lead.textContent = lead.textContent.replace(LINE_LABEL_RE, '');
      var rest = strong.innerHTML.trim();
      var after = strong.nextSibling;
      strong.remove();
      if (after && after.nodeType === 3) after.textContent = after.textContent.replace(/^\s*(?:→|->|:)\s*/, '');
      var leading = paragraph.firstChild;
      if (leading && leading.nodeType === 3) leading.textContent = leading.textContent.replace(/^\s+/, '');

      var head = note.querySelector('.nota-cabeza');
      if (!head) {
        head = document.createElement('div');
        head.className = 'nota-cabeza';
        var label = document.createElement('span');
        label.className = 'nota-lineas';
        label.textContent = match[1].replace(/\s+/g, '');
        head.appendChild(label);
        note.insertBefore(head, note.firstChild);
      }
      if (rest && !head.querySelector('.nota-codigo')) {
        var code = document.createElement('span');
        code.className = 'nota-codigo';
        code.innerHTML = rest;
        head.appendChild(code);
      }
    });
  }

  /* 2 · Resumen del archivo completo */
  function repairCodeReveals() {
    eachNode('details.code-reveal > summary', document, function (summary) {
      if (summary.querySelector('.code-reveal-title')) return;
      var code = summary.querySelector('code');
      var file = plainText(code);
      var raw = plainText(summary);
      var note = raw
        .replace(/^Archivo completo\s*[—–\-:]?\s*/i, '')
        .replace(file, '')
        .replace(/^\s*[·—–\-:]\s*/, '')
        .trim();
      summary.innerHTML = '<span><span class="code-reveal-title"></span><span class="code-reveal-note"></span></span>';
      summary.querySelector('.code-reveal-title').textContent = file ? file + ' · archivo completo' : (raw || 'Archivo completo');
      summary.querySelector('.code-reveal-note').textContent = note;
    });
  }

  /* 3 · Cabeza de los bloques de código */
  var SHELL_LANG = /language-(bash|shell|sh|zsh|powershell|ps1|console|cmd|bat)\b/;
  function repairCodeHeads() {
    eachNode('.code-block', document, function (block) {
      var code = block.querySelector('code');
      var context = block.querySelector('.code-context');
      var file = block.querySelector('.code-file');
      var copy = block.querySelector('.copy-btn');
      var isShell = block.dataset.tipo === 'terminal' || (code && SHELL_LANG.test(code.className));
      if (isShell && block.dataset.tipo !== 'prompt') {
        block.dataset.tipo = 'terminal';
        if (context) context.textContent = 'Terminal';
        if (file && /^[^\s]*[.\\/][^\s]*$/.test(plainText(file))) file.remove();
        if (copy && /archivo/i.test(copy.textContent)) copy.textContent = 'Copiar';
        return;
      }
      if (context && /^c[oó]digo$/i.test(plainText(context))) {
        var archivo = block.closest('.archivo');
        var accion = archivo && plainText(archivo.querySelector('.archivo-accion'));
        context.textContent = accion || 'Archivo';
      }
    });
  }

  /* 4 · Subsecciones numeradas que quedaron dentro de un archivo */
  function isSubHeading(node) {
    return node && node.nodeType === 1 && node.tagName === 'H3' &&
      (node.classList.contains('sub-t') || (!node.className && SUB_RE.test(plainText(node))));
  }
  function hoistSubHeadings() {
    eachNode('.archivo > h3', document, function (heading) {
      if (!isSubHeading(heading) || !heading.parentElement.classList.contains('archivo')) return;
      var archivo = heading.parentElement;
      var anchor = archivo;
      var node = heading;
      while (node) {
        var next = node.nextSibling;
        anchor.parentNode.insertBefore(node, anchor.nextSibling);
        anchor = node;
        node = next;
      }
    });
  }

  /* 5 · Portada con imagen */
  function ensureHeroVisual() {
    var heroBlock = document.querySelector('.hero');
    var inner = heroBlock && heroBlock.querySelector('.hero-inner');
    if (!inner || inner.querySelector('.hero-visual') || heroBlock.dataset.variant === 'stat') return;
    var source = document.querySelector('.section .figura[data-portada] img') ||
                 document.querySelector('.section .figura img');
    if (!source) return;
    var origin = source.closest('.figura');
    var visual = document.createElement('figure');
    visual.className = 'hero-visual';
    visual.appendChild(source);
    var caption = origin.querySelector('figcaption');
    if (caption) {
      var note = document.createElement('figcaption');
      note.className = 'hero-note';
      var credit = caption.querySelector('.figura-credito');
      if (credit) credit.remove();
      note.textContent = plainText(caption);
      if (note.textContent) visual.appendChild(note);
    }
    if (!inner.querySelector('.hero-copy')) {
      var copyBox = document.createElement('div');
      copyBox.className = 'hero-copy';
      while (inner.firstChild) copyBox.appendChild(inner.firstChild);
      inner.appendChild(copyBox);
    }
    inner.appendChild(visual);
    origin.remove();
  }

  /* 6 · Ilustración que quedó al final de la escena */
  function liftTrailingFigures() {
    eachNode('.section .body', document, function (body) {
      var last = body.lastElementChild;
      if (!last || !last.classList.contains('figura') || body.children.length < 4) return;
      /* Si la escena abre con una frase de contexto (párrafo o callout), la imagen va justo después */
      var first = body.firstElementChild;
      var opensWithContext = first && (first.tagName === 'P' || first.tagName === 'BLOCKQUOTE' || first.classList.contains('callout'));
      last.dataset.lugar = 'inicio';
      body.insertBefore(last, opensWithContext ? first.nextSibling : first);
    });
  }

  /* 7 · Partes plegables con índice */
  var subCounter = 0;
  function buildSubsections() {
    eachNode('.section .body', document, function (body) {
      var headings = Array.prototype.filter.call(body.children, isSubHeading);
      if (headings.length < 2) return;
      var section = body.closest('.section');
      var parts = [];

      headings.forEach(function (heading, index) {
        subCounter += 1;
        var id = (section.id || 'escena') + '-parte-' + (index + 1);
        var bodyId = 'sub-cuerpo-' + subCounter;
        var number = (plainText(heading).match(SUB_RE) || [])[1] || String(index + 1);

        var lead = heading.firstChild;
        if (lead && lead.nodeType === 3) lead.textContent = lead.textContent.replace(SUB_RE, '');
        var titleHtml = heading.innerHTML.trim();

        var wrapper = document.createElement('section');
        wrapper.className = 'sub';
        wrapper.id = id;
        var title = document.createElement('h3');
        title.className = 'sub-t';
        title.innerHTML = '<button class="sub-toggle" type="button" aria-expanded="false" aria-controls="' + bodyId + '">' +
          '<span class="sub-num">' + number + '</span><span class="sub-titulo"></span><span class="sub-chev" aria-hidden="true"></span></button>';
        title.querySelector('.sub-titulo').innerHTML = titleHtml;
        var content = document.createElement('div');
        content.className = 'sub-cuerpo';
        content.id = bodyId;
        content.hidden = true;

        var node = heading.nextSibling;
        while (node && !(node.nodeType === 1 && headings.indexOf(node) !== -1)) {
          var next = node.nextSibling;
          content.appendChild(node);
          node = next;
        }
        body.insertBefore(wrapper, heading);
        heading.remove();
        wrapper.appendChild(title);
        wrapper.appendChild(content);
        parts.push({ wrapper: wrapper, button: title.querySelector('button'), content: content, number: number, title: plainText(title.querySelector('.sub-titulo')) });
      });

      var abiertas = root.dataset.partes !== 'plegadas';
      parts.forEach(function (part, index) {
        var next = parts[index + 1];
        if (!next) return;
        var advance = document.createElement('button');
        advance.className = 'sub-siguiente';
        advance.type = 'button';
        advance.innerHTML = '<span>Siguiente parte</span><b></b><span aria-hidden="true">→</span>';
        advance.querySelector('b').textContent = next.number + ' · ' + next.title;
        advance.addEventListener('click', function () {
          if (!abiertas) setPart(part, false);
          setPart(next, true);
          revealPart(next);
        });
        part.content.appendChild(advance);
      });

      var index = document.createElement('nav');
      index.className = 'sub-indice';
      index.setAttribute('aria-label', 'Partes de esta escena');
      index.innerHTML = '<div class="sub-indice-head"><span>En esta escena · ' + parts.length + ' partes</span>' +
        '<button class="sub-todo" type="button">Abrir todo</button></div><ol></ol>';
      var list = index.querySelector('ol');
      parts.forEach(function (part) {
        var item = document.createElement('li');
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'sub-chip';
        chip.innerHTML = '<span class="sub-chip-num"></span><span class="sub-chip-titulo"></span>';
        chip.querySelector('.sub-chip-num').textContent = part.number;
        chip.querySelector('.sub-chip-titulo').textContent = part.title;
        chip.addEventListener('click', function () {
          setPart(part, true);
          revealPart(part);
        });
        part.chip = chip;
        item.appendChild(chip);
        list.appendChild(item);
      });
      var allButton = index.querySelector('.sub-todo');
      allButton.addEventListener('click', function () {
        var openAll = parts.some(function (part) { return part.content.hidden; });
        parts.forEach(function (part) { setPart(part, openAll); });
      });
      body.insertBefore(index, parts[0].wrapper);

      function syncAll() {
        allButton.textContent = parts.some(function (part) { return part.content.hidden; }) ? 'Abrir todo' : 'Cerrar todo';
      }
      function setPart(part, open) {
        part.content.hidden = !open;
        part.wrapper.classList.toggle('is-open', open);
        part.button.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (part.chip) part.chip.classList.toggle('is-open', open);
        syncAll();
        if (open) window.requestAnimationFrame(function () { wakePart(part.content); });
      }
      function revealPart(part) {
        window.requestAnimationFrame(function () {
          part.wrapper.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
          part.button.focus({ preventScroll: true });
        });
      }
      parts.forEach(function (part) {
        part.button.addEventListener('click', function () { setPart(part, part.content.hidden); });
      });
      parts.forEach(function (part, index) { setPart(part, abiertas || index === 0); });
    });
  }

  /* Lo que estaba oculto necesita recalcularse al abrirse */
  function wakePart(scope) {
    if (typeof window.Prism !== 'undefined' && window.Prism.highlightAllUnder) window.Prism.highlightAllUnder(scope);
    if (scope.querySelector('.mermaid')) renderMermaid(scope);
    animateChartsIn(scope);
    if (typeof refreshReadings === 'function') refreshReadings(scope.closest('.view') || scope);
  }

  try {
    repairNotes();
    repairCodeReveals();
    repairCodeHeads();
    hoistSubHeadings();
    ensureHeroVisual();
    liftTrailingFigures();
    buildSubsections();
  } catch (error) {
    try { console.warn('Orden v12.5:', error); } catch (ignored) {}
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
     v12.6 · CÓDIGO ANOTADO
     Misma marca de v12.3 (.lectura > .code-block pre + ol.notas): la SPA
     no cambia su HTML. El controlador arma un solo bloque que se lee de
     arriba abajo: línea(s) de código → su explicación justo debajo → más
     código. Una barra en el margen dice qué líneas cubre cada nota.
     - Cualquier lenguaje que Prism conozca (html, css, js, ts, java, sql,
       python, bash…). Si el lenguaje todavía no cargó, se ve sin color y
       se pinta cuando llega.
     - Las líneas largas bajan con sangría: nunca se cortan.
     - "Solo código" (botón del bloque o tecla N): las explicaciones se
       esconden; pasar el puntero, tocar o enfocar una línea muestra su
       explicación al lado, sin tapar el código. La preferencia se recuerda.
     ----------------------------------------------------------------- */
  var CODE_MODE_KEY = 'ana-codigo-modo';
  var LANG_ALIAS = { html: 'markup', xml: 'markup', svg: 'markup', vue: 'markup', js: 'javascript', ts: 'typescript', py: 'python', sh: 'bash', shell: 'bash', zsh: 'bash', yml: 'yaml', ps1: 'powershell' };
  var anotados = [];
  var codeMode = 'leer';
  try { if (localStorage.getItem(CODE_MODE_KEY) === 'solo') codeMode = 'solo'; } catch (error) {}

  function escapeHtml(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function languageOf(node) {
    var element = node;
    for (var depth = 0; element && element.nodeType === 1 && depth < 4; depth++) {
      var match = String(element.className || '').match(/\blang(?:uage)?-([\w-]+)/);
      if (match) return match[1].toLowerCase();
      element = element.parentElement;
    }
    return 'none';
  }

  function grammarFor(lang) {
    if (typeof window.Prism === 'undefined' || !window.Prism.languages) return null;
    return window.Prism.languages[lang] || window.Prism.languages[LANG_ALIAS[lang]] || null;
  }

  var pendingLanguages = {};
  function requestGrammar(lang) {
    var prism = window.Prism;
    if (!lang || lang === 'none' || lang === 'plaintext' || lang === 'text' || pendingLanguages[lang]) return;
    if (!prism || !prism.plugins || !prism.plugins.autoloader) return;
    pendingLanguages[lang] = true;
    try {
      prism.plugins.autoloader.loadLanguages([LANG_ALIAS[lang] || lang], function () { repaintCode(); });
    } catch (error) {}
  }

  /* Prism devuelve <span> que pueden cruzar saltos de línea (comentarios,
     cadenas de varias líneas). Se cortan por línea cerrando y reabriendo. */
  function splitHtmlLines(html) {
    var holder = document.createElement('div');
    holder.innerHTML = html;
    var lines = [''];
    var stack = [];
    function openTag(element) {
      return '<span class="' + String(element.className || '').replace(/"/g, '&quot;') + '">';
    }
    function walk(node) {
      Array.prototype.forEach.call(node.childNodes, function (child) {
        if (child.nodeType === 3) {
          child.nodeValue.split('\n').forEach(function (part, index) {
            if (index > 0) {
              lines[lines.length - 1] += stack.map(function () { return '</span>'; }).join('');
              lines.push(stack.map(openTag).join(''));
            }
            lines[lines.length - 1] += escapeHtml(part);
          });
        } else if (child.nodeType === 1) {
          lines[lines.length - 1] += openTag(child);
          stack.push(child);
          walk(child);
          stack.pop();
          lines[lines.length - 1] += '</span>';
        }
      });
    }
    walk(holder);
    return lines;
  }

  function paintLines(raw, lang) {
    var grammar = grammarFor(lang);
    var html = escapeHtml(raw);
    if (grammar) {
      try { html = window.Prism.highlight(raw, grammar, LANG_ALIAS[lang] || lang); } catch (error) { grammar = null; }
    } else {
      requestGrammar(lang);
    }
    return { lines: splitHtmlLines(html), painted: !!grammar };
  }

  function rawCode(pre) {
    var code = pre.querySelector('code') || pre;
    var copy = code.cloneNode(true);
    Array.prototype.forEach.call(copy.querySelectorAll('.line-numbers-rows, .linea-luz'), function (node) { node.remove(); });
    return copy.textContent.replace(/\r\n?/g, '\n').replace(/\n$/, '');
  }

  function dedent(lines) {
    var min = Infinity;
    lines.forEach(function (line) { if (line.trim()) min = Math.min(min, line.match(/^ */)[0].length); });
    if (!isFinite(min) || !min) return lines;
    return lines.map(function (line) { return line.slice(Math.min(min, line.match(/^ */)[0].length)); });
  }

  function compact(text) { return String(text || '').replace(/\s+/g, ''); }

  function buildAnotado(lectura) {
    var pre = lectura.querySelector('.code-block pre');
    var notes = Array.prototype.slice.call(lectura.querySelectorAll('.nota[data-lineas]'));
    if (!pre || !notes.length || lectura.classList.contains('is-anotada')) return;

    var block = pre.closest('.code-block');
    var start = parseInt(pre.getAttribute('data-start') || '1', 10) || 1;
    var lang = languageOf(pre.querySelector('code') || pre);
    var rawLines = dedent(rawCode(pre).replace(/\t/g, '    ').split('\n'));
    var end = start + rawLines.length - 1;
    var archivo = lectura.closest('.archivo');
    var fileName = (archivo && plainText(archivo.querySelector('.archivo-nombre'))) || plainText(block && block.querySelector('.code-file')) || 'Código';

    var items = notes.map(function (note, index) {
      var lines = parseLines(note.dataset.lineas).filter(function (n) { return n >= start && n <= end; });
      return {
        note: note, k: index + 1, lines: lines,
        first: lines.length ? Math.min.apply(null, lines) : end,
        last: lines.length ? Math.max.apply(null, lines) : end
      };
    });
    var owner = {};
    items.forEach(function (item) { item.lines.forEach(function (n) { if (!owner[n]) owner[n] = item; }); });

    var box = document.createElement('div');
    box.className = 'anotado';
    box.dataset.modo = codeMode;
    box.innerHTML =
      '<div class="anotado-head">' +
        '<span class="anotado-archivo"></span><span class="anotado-lineas"></span>' +
        '<button class="anotado-modo" type="button" title="Mostrar u ocultar las explicaciones (N)"></button>' +
      '</div>' +
      '<div class="anotado-cuerpo"></div>';
    box.querySelector('.anotado-archivo').textContent = fileName;
    box.querySelector('.anotado-lineas').textContent = start === end ? 'línea ' + start : 'líneas ' + start + '–' + end;
    var body = box.querySelector('.anotado-cuerpo');
    var rows = [];

    function makeAnnotation(item) {
      var wrap = document.createElement('div');
      wrap.className = 'an';
      wrap.dataset.k = item.k;
      var firstText = rawLines[item.first - start] || '';
      wrap.style.setProperty('--sangria', Math.min(firstText.match(/^ */)[0].length, 12));
      var inner = document.createElement('div');
      inner.className = 'an-caja';
      while (item.note.firstChild) inner.appendChild(item.note.firstChild);
      var label = inner.querySelector('.nota-codigo');
      if (label) {
        var labelText = compact(plainText(label));
        var repeatsLine = item.lines.some(function (n) { return compact(rawLines[n - start]) === labelText; });
        if (repeatsLine || labelText.length > 56) label.classList.add('is-repetida');
      }
      wrap.appendChild(inner);
      item.box = wrap;
      return wrap;
    }

    rawLines.forEach(function (text, index) {
      var n = start + index;
      var row = document.createElement('div');
      row.className = 'af';
      row.dataset.n = n;
      var indent = text.match(/^ */)[0].length;
      row.style.setProperty('--sangria', indent);
      var item = owner[n];
      if (item) {
        row.classList.add('af-cubierta');
        row.dataset.k = item.k;
        if (n === item.first) row.classList.add('af-ini');
        if (n === item.last) row.classList.add('af-fin');
      }
      row.innerHTML = '<span class="af-num" aria-hidden="true">' + n + '</span><span class="af-marca"></span><code class="af-cod"></code>';
      if (item && n === item.first) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'af-punto';
        dot.dataset.k = item.k;
        dot.textContent = item.k;
        var labelLines = item.note.querySelector('.nota-lineas');
        dot.setAttribute('aria-label', 'Explicación de ' + (labelLines ? plainText(labelLines) : 'la línea ' + n));
        row.querySelector('.af-marca').appendChild(dot);
      }
      body.appendChild(row);
      rows.push(row);
      items.forEach(function (candidate) { if (candidate.last === n) body.appendChild(makeAnnotation(candidate)); });
    });

    var cuerpo = lectura.querySelector('.lectura-cuerpo') || (block && block.parentNode);
    if (block && block.parentNode === cuerpo) cuerpo.insertBefore(box, block);
    else if (cuerpo) cuerpo.insertBefore(box, cuerpo.firstChild);
    else lectura.appendChild(box);
    lectura.classList.add('is-anotada');

    var state = { lectura: lectura, box: box, body: body, rows: rows, items: items, rawLines: rawLines, lang: lang, painted: false, pinned: null, button: box.querySelector('.anotado-modo') };
    paintState(state);
    wireAnotado(state);
    anotados.push(state);
  }

  function paintState(state) {
    var result = paintLines(state.rawLines.join('\n'), state.lang);
    state.rows.forEach(function (row, index) {
      row.querySelector('.af-cod').innerHTML = result.lines[index] || '';
    });
    state.painted = result.painted;
  }

  function repaintCode() {
    anotados.forEach(function (state) { if (!state.painted && grammarFor(state.lang)) paintState(state); });
    if (filesPanel && filesPanel.open) renderFile();
  }

  /* Explicación flotante del modo "Solo código" */
  var codePop = null;
  var popOwner = null;
  function ensurePop() {
    if (codePop) return codePop;
    codePop = document.createElement('div');
    codePop.className = 'an-pop';
    codePop.setAttribute('role', 'tooltip');
    codePop.id = 'anPop';
    document.body.appendChild(codePop);
    return codePop;
  }

  function lightItem(state, item) {
    state.rows.forEach(function (row) { row.classList.toggle('is-luz', !!item && row.dataset.k === String(item.k)); });
    state.items.forEach(function (candidate) { if (candidate.box) candidate.box.classList.toggle('is-activa', candidate === item); });
  }

  function hidePop(force) {
    anotados.forEach(function (state) {
      if (force || !state.pinned) { state.pinned = null; lightItem(state, null); }
    });
    if (codePop && (force || !popOwner || !popOwner.pinned)) { codePop.classList.remove('is-visible'); popOwner = null; }
  }

  function showPop(state, item) {
    var pop = ensurePop();
    var source = item.box && item.box.querySelector('.an-caja');
    if (!source) return;
    pop.innerHTML = source.innerHTML;
    popOwner = state;
    lightItem(state, item);
    pop.classList.add('is-visible');
    var boxRect = state.box.getBoundingClientRect();
    var covered = state.rows.filter(function (row) { return row.dataset.k === String(item.k); });
    var firstRect = (covered[0] || state.rows[0]).getBoundingClientRect();
    var lastRect = (covered[covered.length - 1] || state.rows[0]).getBoundingClientRect();
    var wide = boxRect.width >= 760;
    pop.style.width = wide ? Math.min(440, boxRect.width * 0.46) + 'px' : Math.max(240, boxRect.width - 24) + 'px';
    var popWidth = pop.offsetWidth;
    var popHeight = pop.offsetHeight;
    var x, y;
    if (wide) {
      x = boxRect.right - popWidth - 14;
      y = Math.max(10, Math.min(firstRect.top - 6, window.innerHeight - popHeight - 10));
    } else {
      x = boxRect.left + 12;
      y = lastRect.bottom + 8;
      if (y + popHeight > window.innerHeight - 10) y = Math.max(10, firstRect.top - popHeight - 8);
    }
    pop.style.left = Math.max(8, x) + 'px';
    pop.style.top = y + 'px';
  }

  function itemFromEvent(state, event) {
    var target = event.target.closest('.af-cubierta, .af-punto, .an');
    if (!target || !state.box.contains(target)) return null;
    var k = target.dataset.k;
    return state.items.filter(function (item) { return String(item.k) === k; })[0] || null;
  }

  function wireAnotado(state) {
    state.button.addEventListener('click', function () {
      setCodeMode(codeMode === 'solo' ? 'leer' : 'solo', true);
      state.button.focus({ preventScroll: true });
    });

    state.body.addEventListener('mouseover', function (event) {
      if (state.pinned) return;
      var item = itemFromEvent(state, event);
      if (codeMode === 'solo') { if (item) showPop(state, item); else hidePop(false); }
      else lightItem(state, item);
    });
    state.body.addEventListener('mouseleave', function () {
      if (state.pinned) return;
      if (codeMode === 'solo') hidePop(false); else lightItem(state, null);
    });
    state.body.addEventListener('click', function (event) {
      if (codeMode !== 'solo') return;
      var item = itemFromEvent(state, event);
      if (!item) return;
      if (state.pinned === item) { hidePop(true); return; }
      hidePop(true);
      state.pinned = item;
      showPop(state, item);
    });
    state.body.addEventListener('focusin', function (event) {
      if (codeMode !== 'solo' || !event.target.classList.contains('af-punto')) return;
      var item = itemFromEvent(state, event);
      if (item) { state.pinned = item; showPop(state, item); }
    });
    state.body.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { hidePop(true); if (document.activeElement) document.activeElement.blur(); }
    });
  }

  function setCodeMode(mode, persist) {
    codeMode = mode === 'solo' ? 'solo' : 'leer';
    anotados.forEach(function (state) {
      state.box.dataset.modo = codeMode;
      state.button.textContent = codeMode === 'solo' ? 'Ver explicaciones' : 'Solo código';
      state.button.setAttribute('aria-pressed', codeMode === 'solo' ? 'true' : 'false');
    });
    hidePop(true);
    if (persist) { try { localStorage.setItem(CODE_MODE_KEY, codeMode); } catch (error) {} }
  }

  try {
    eachNode('.lectura', document, buildAnotado);
    setCodeMode(codeMode, false);
    if (main) main.addEventListener('scroll', function () { if (codePop && codePop.classList.contains('is-visible')) hidePop(true); }, { passive: true });
    window.addEventListener('resize', function () { hidePop(true); });
    document.addEventListener('click', function (event) {
      if (codePop && codePop.classList.contains('is-visible') && !event.target.closest('.anotado, .an-pop')) hidePop(true);
    });
  } catch (error) {
    try { console.warn('Código anotado v12.6:', error); } catch (ignored) {}
  }

  /* -----------------------------------------------------------------
     v12.6 · ARCHIVOS DEL PROYECTO
     Cada <details class="code-reveal"> con un archivo completo es una
     "foto" del archivo en esa escena. El panel (botón de los controles o
     tecla A) muestra, para la escena actual, la última foto de cada
     archivo, con Copiar y con lo nuevo resaltado frente a la foto anterior.
     Quien se perdió copia el archivo como debe ir y sigue con la clase.
     - Nombre: data-archivo="index.html" en el <details> o, si falta, el
       primer nombre de archivo del resumen.
     - No cuenta soluciones de retos, respuestas ni prompts.
     ----------------------------------------------------------------- */
  var snapshots = [];
  var filesPanel = null;
  var filesButton = null;
  var currentFile = null;

  function fileNameOf(details) {
    if (details.dataset.archivo) return details.dataset.archivo.trim();
    var candidates = [details.querySelector('.code-file'), details.querySelector('summary code'), details.querySelector('.code-reveal-title'), details.querySelector('summary')];
    for (var i = 0; i < candidates.length; i++) {
      var match = plainText(candidates[i]).match(/[\w@\-]+(?:\.[\w\-]+)*\.[A-Za-z0-9]{1,10}\b/);
      if (match) return match[0];
    }
    return '';
  }

  function collectSnapshots() {
    eachNode('details.code-reveal', document, function (details) {
      if (details.dataset.reference === 'true' || details.dataset.archivo === 'no') return;
      if (details.closest('.reto, #repaso, .momento-ia, .micro-task, .socratica, .reveal-body, .micro-answer')) return;
      var section = details.closest('.section');
      var pre = details.querySelector('pre');
      if (!section || !pre) return;
      var name = fileNameOf(details);
      if (!name) return;
      var previous = snapshots.filter(function (shot) { return shot.name === name; }).pop() || null;
      snapshots.push({ name: name, section: section, raw: rawCode(pre).replace(/\t/g, '    '), lang: languageOf(pre.querySelector('code') || pre), previous: previous });
    });
  }

  function changedLines(before, after) {
    var a = before.split('\n');
    var b = after.split('\n');
    var marks = [];
    if (a.length * b.length > 2000000) return marks;
    var cols = b.length + 1;
    var table = new Uint32Array((a.length + 1) * cols);
    for (var i = a.length - 1; i >= 0; i--) {
      for (var j = b.length - 1; j >= 0; j--) {
        table[i * cols + j] = a[i] === b[j] ? table[(i + 1) * cols + j + 1] + 1 : Math.max(table[(i + 1) * cols + j], table[i * cols + j + 1]);
      }
    }
    var x = 0, y = 0;
    while (x < a.length && y < b.length) {
      if (a[x] === b[y]) { x++; y++; }
      else if (table[(x + 1) * cols + y] >= table[x * cols + y + 1]) x++;
      else { if (b[y].trim()) marks.push(y); y++; }
    }
    while (y < b.length) { if (b[y].trim()) marks.push(y); y++; }
    return marks;
  }

  function snapshotsForView() {
    var index = views.indexOf(activeView);
    var latest = {};
    var order = [];
    snapshots.forEach(function (shot) {
      if (views.indexOf(shot.section) > index) return;
      if (!latest[shot.name]) order.push(shot.name);
      latest[shot.name] = shot;
    });
    return order.map(function (name) { return latest[name]; });
  }

  function copyText(text, button) {
    var original = button.textContent;
    var done = function () { button.textContent = 'Copiado ✓'; window.setTimeout(function () { button.textContent = original; }, 1500); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(function () { button.textContent = 'No se pudo copiar'; });
      return;
    }
    var area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); done(); } catch (error) { button.textContent = 'No se pudo copiar'; }
    area.remove();
  }

  function sceneTitle(section) {
    return plainText(section.querySelector('.sec-t')) || plainText(section.querySelector('h2')) || section.id;
  }

  function renderFile() {
    if (!filesPanel) return;
    var list = snapshotsForView();
    var tabs = filesPanel.querySelector('.ar-tabs');
    var body = filesPanel.querySelector('.ar-cuerpo');
    var meta = filesPanel.querySelector('.ar-meta');
    var copy = filesPanel.querySelector('.ar-copiar');
    tabs.innerHTML = '';
    body.innerHTML = '';
    if (!list.length) {
      meta.textContent = 'Todavía no hay archivos completos en la clase hasta esta escena.';
      copy.hidden = true;
      return;
    }
    copy.hidden = false;
    var shot = list.filter(function (candidate) { return candidate.name === currentFile; })[0] || list[list.length - 1];
    currentFile = shot.name;
    list.forEach(function (candidate) {
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'ar-tab';
      tab.textContent = candidate.name;
      tab.setAttribute('aria-pressed', candidate === shot ? 'true' : 'false');
      if (candidate.section === activeView) {
        tab.classList.add('is-de-escena');
        tab.title = 'Cambió en esta escena';
      }
      tab.addEventListener('click', function () { currentFile = candidate.name; renderFile(); });
      tabs.appendChild(tab);
    });

    var marks = shot.previous ? changedLines(shot.previous.raw, shot.raw) : [];
    var lines = shot.raw.split('\n');
    var painted = paintLines(shot.raw, shot.lang).lines;
    var html = '';
    lines.forEach(function (line, index) {
      var indent = line.match(/^ */)[0].length;
      html += '<div class="ar-fila' + (marks.indexOf(index) !== -1 ? ' is-nueva' : '') + '" style="--sangria:' + indent + '">' +
        '<span class="ar-num" aria-hidden="true">' + (index + 1) + '</span><code class="ar-cod">' + (painted[index] || '') + '</code></div>';
    });
    body.innerHTML = html;

    var where = shot.section === activeView ? 'como queda al terminar esta escena' : 'última versión completa: «' + sceneTitle(shot.section) + '»';
    var news = shot.previous ? (marks.length ? ' · ' + marks.length + (marks.length === 1 ? ' línea nueva o cambiada, resaltada' : ' líneas nuevas o cambiadas, resaltadas') : ' · sin cambios') : ' · primera versión';
    meta.textContent = lines.length + ' líneas · ' + where + news;
    copy.onclick = function () { copyText(shot.raw, copy); };

    var firstNew = body.querySelector('.is-nueva');
    if (firstNew) window.requestAnimationFrame(function () { firstNew.scrollIntoView({ block: 'center' }); });
    else body.scrollTop = 0;
  }

  function buildFilesPanel() {
    if (filesPanel) return filesPanel;
    filesPanel = document.createElement('dialog');
    filesPanel.className = 'archivos-panel';
    filesPanel.setAttribute('aria-label', 'Archivos del proyecto');
    filesPanel.innerHTML =
      '<div class="ar-head">' +
        '<div class="ar-titulo"><h2>Archivos del proyecto</h2><p class="ar-meta"></p></div>' +
        '<button class="ar-copiar" type="button">Copiar archivo</button>' +
        '<button class="ctrl" type="button" data-cerrar aria-label="Cerrar archivos">✕</button>' +
        '<div class="ar-tabs" role="group" aria-label="Archivo"></div>' +
      '</div>' +
      '<div class="ar-cuerpo"></div>';
    filesPanel.querySelector('[data-cerrar]').addEventListener('click', function () { filesPanel.close(); });
    filesPanel.addEventListener('click', function (event) { if (event.target === filesPanel) filesPanel.close(); });
    filesPanel.addEventListener('close', function () { if (filesButton) filesButton.setAttribute('aria-expanded', 'false'); });
    document.body.appendChild(filesPanel);
    return filesPanel;
  }

  function openFiles() {
    var panel = buildFilesPanel();
    if (typeof panel.showModal !== 'function') return;
    var changedHere = snapshotsForView().filter(function (shot) { return shot.section === activeView; });
    if (changedHere.length) currentFile = changedHere[changedHere.length - 1].name;
    renderFile();
    if (!panel.open) panel.showModal();
    if (filesButton) filesButton.setAttribute('aria-expanded', 'true');
  }

  try {
    collectSnapshots();
    if (snapshots.length) {
      var filesBar = document.querySelector('.controls');
      filesButton = document.getElementById('archivosBtn');
      if (!filesButton && filesBar) {
        filesButton = document.createElement('button');
        filesButton.className = 'ctrl';
        filesButton.id = 'archivosBtn';
        filesButton.type = 'button';
        filesButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9.5 13l-2 2 2 2M14.5 13l2 2-2 2"/></svg>';
        filesBar.insertBefore(filesButton, filesBar.firstChild);
      }
      if (filesButton) {
        filesButton.hidden = false;
        filesButton.setAttribute('aria-label', 'Archivos del proyecto (A)');
        filesButton.setAttribute('title', 'Archivos del proyecto (A)');
        filesButton.setAttribute('aria-expanded', 'false');
        filesButton.addEventListener('click', openFiles);
      }
    }
  } catch (error) {
    try { console.warn('Archivos del proyecto v12.6:', error); } catch (ignored) {}
  }

  /* Imagen que no cargó: no se muestra un recuadro roto */
  eachNode('.hero-visual img, .figura img', document, function (image) {
    function broken() {
      var holder = image.closest('.hero-visual, .figura');
      if (!holder) return;
      holder.classList.add('sin-imagen');
      if (holder.classList.contains('hero-visual')) {
        var heroHost = holder.closest('.hero');
        if (heroHost) heroHost.dataset.sinImagen = 'si';
        holder.remove();
      }
    }
    if (image.complete && image.getAttribute('src') && image.naturalWidth === 0) broken();
    image.addEventListener('error', broken);
  });

  document.addEventListener('keydown', function (event) {
    if (event.target && /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (document.querySelector('dialog[open]')) return;
    if ((event.key === 'n' || event.key === 'N') && anotados.length) {
      event.preventDefault();
      setCodeMode(codeMode === 'solo' ? 'leer' : 'solo', true);
    }
    if ((event.key === 'a' || event.key === 'A') && snapshots.length) {
      event.preventDefault();
      openFiles();
    }
    if (event.key === 'Escape') hidePop(true);
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

  Array.prototype.forEach.call(document.querySelectorAll('.lectura:not(.is-anotada)'), function (lectura) {
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
    console.log('Ana Learning Experience System v12.6 "Pizarra" · Material de autoría exclusiva.');
  } catch (error) {}
})();
