/*
  PLANTILLA UNIVERSAL DE PORTALES · ANA ALVARADO · v3
  Un solo archivo para dos usos:
  1. En index.html: biblioteca (búsqueda, módulos, tema) + VISOR de guías.
     Cada guía se abre dentro del portal con una barra fija:
     Todas las guías · módulo y clase · anterior / siguiente · abrir sola.
  2. Dentro de una guía abierta SOLA (opcional): agrega el botón "Todas las guías".
     <script src="../portal.js" defer></script>  (ajusta ../ según la carpeta)
     El inicio se calcula a partir de la ruta de este archivo; data-home ya no hace falta
     (si una guía vieja lo trae, se respeta). Dentro del visor no se agrega, para no duplicar.
*/
(function () {
  'use strict';

  var loader = document.currentScript;
  var root = document.documentElement;
  var company = (loader && loader.dataset.empresa) || root.dataset.empresa || 'generation';
  var isPortal = !!document.getElementById('lista-guias');
  var framed = false;
  try { framed = window.self !== window.top; } catch (error) { framed = true; }

  if (isPortal) initPortal(company);
  else if (!framed) mountHomeButton(homeFromLoader(), company);

  function isGuideLink(link) {
    var href = (link.getAttribute('href') || '').trim();
    return href !== '' && href.charAt(0) !== '#';
  }

  function homeFromLoader() {
    if (loader && loader.dataset.home) return loader.dataset.home;
    try { return new URL('index.html', loader.src).href; } catch (error) { return '../index.html'; }
  }

  /* ==================================================================
     BIBLIOTECA
     ================================================================== */
  function initPortal(activeCompany) {
    var themeButton = document.getElementById('temaBtn');
    var searchToggle = document.getElementById('mostrarBusqueda');
    var searchPanel = document.getElementById('panelBusqueda');
    var searchInput = document.getElementById('buscarGuia');
    var clearButton = document.getElementById('limpiarBusqueda');
    var expandButton = document.getElementById('expandirModulos');
    var emptyState = document.getElementById('sinResultados');
    var resultStatus = document.getElementById('estadoResultados');
    var modules = Array.prototype.slice.call(document.querySelectorAll('.modulo'));
    var moduleCount = document.querySelector('[data-module-count]');
    var resourceCount = document.querySelector('[data-resource-count]');
    var themeKey = 'ana-portal-tema-' + activeCompany;
    var allowMultipleModules = false;
    var bulkUntil = 0;

    root.dataset.empresa = activeCompany;

    function normalize(value) {
      return String(value || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim();
    }

    function setTheme(theme) {
      var dark = theme === 'oscuro';
      root.dataset.tema = dark ? 'oscuro' : 'claro';
      if (themeButton) {
        themeButton.textContent = dark ? '☀' : '☾';
        themeButton.setAttribute('aria-label', dark ? 'Activar tema claro' : 'Activar tema oscuro');
        themeButton.setAttribute('title', dark ? 'Activar tema claro' : 'Activar tema oscuro');
      }
      try { localStorage.setItem(themeKey, dark ? 'oscuro' : 'claro'); } catch (error) {}
    }

    var storedTheme;
    try { storedTheme = localStorage.getItem(themeKey); } catch (error) {}
    setTheme(storedTheme || 'oscuro');

    if (themeButton) {
      themeButton.addEventListener('click', function () {
        setTheme(root.dataset.tema === 'oscuro' ? 'claro' : 'oscuro');
      });
    }

    var availableResources = Array.prototype.filter.call(document.querySelectorAll('a.clase[href]'), isGuideLink).length;
    if (moduleCount) moduleCount.textContent = modules.length;
    if (resourceCount) resourceCount.textContent = availableResources;

    /* ---------- v3 · identidad visual de la biblioteca ---------- */
    var storeKey = 'ana-portal:' + window.location.pathname.replace(/index\.html$/, '');
    function readStore(key, fallback) {
      try { var value = JSON.parse(localStorage.getItem(storeKey + ':' + key)); return value == null ? fallback : value; } catch (error) { return fallback; }
    }
    function writeStore(key, value) {
      try { localStorage.setItem(storeKey + ':' + key, JSON.stringify(value)); } catch (error) {}
    }
    function textOf(scope, selector) {
      var node = scope && scope.querySelector(selector);
      return node ? node.textContent.replace(/\s+/g, ' ').trim() : '';
    }

    var guideLinks = Array.prototype.filter.call(document.querySelectorAll('a.clase[href]'), isGuideLink);
    var seen = readStore('vistas', []);
    if (!Array.isArray(seen)) seen = [];

    function markSeen(link) {
      if (link) link.classList.add('is-vista');
    }
    guideLinks.forEach(function (link) {
      if (seen.indexOf(link.getAttribute('href')) !== -1) markSeen(link);
    });

    /* La clase más reciente: la última guía publicada en un módulo que no es "próximo" */
    var published = guideLinks.filter(function (link) {
      var module = link.closest('.modulo');
      return !module || !module.classList.contains('proximo');
    });
    var latest = published[published.length - 1] || null;
    if (latest) {
      latest.dataset.ultima = '';
      var chip = document.createElement('span');
      chip.className = 'clase-chip clase-chip--nueva';
      chip.textContent = 'Más reciente';
      latest.appendChild(chip);
    }

    /* Número de cada módulo y cuántas guías tiene */
    modules.forEach(function (module) {
      var dot = module.querySelector('.mod-punto');
      var match = textOf(module, '.mod-titulo').match(/\d+/);
      if (dot && match && !dot.textContent.trim()) dot.textContent = match[0];
      var summary = module.querySelector('summary');
      var total = Array.prototype.filter.call(module.querySelectorAll('a.clase[href]'), isGuideLink).length;
      if (summary && total && !summary.querySelector('.mod-count')) {
        var count = document.createElement('span');
        count.className = 'mod-count';
        count.innerHTML = '<b>' + total + '</b> ' + (total === 1 ? 'guía' : 'guías');
        var anchor = summary.querySelector('.mod-badge') || summary.querySelector('.mod-chevron');
        summary.insertBefore(count, anchor);
      }
    });

    /* Portada: texto + estadísticas + tarjeta para seguir */
    (function buildHero() {
      var wrap = document.querySelector('.wrap');
      var title = wrap && wrap.querySelector(':scope > h1');
      if (!title || wrap.querySelector('.portal-hero')) return;
      var hero = document.createElement('header');
      hero.className = 'portal-hero';
      var copy = document.createElement('div');
      copy.className = 'hero-copy';
      wrap.insertBefore(hero, wrap.querySelector(':scope > .eyebrow') || title);
      hero.appendChild(copy);
      ['.eyebrow', 'h1', '.lead'].forEach(function (selector) {
        var node = wrap.querySelector(':scope > ' + selector);
        if (node) copy.appendChild(node);
      });

      var stats = document.createElement('div');
      stats.className = 'hero-stats';
      var activeModules = modules.filter(function (module) { return !module.classList.contains('proximo'); }).length;
      stats.innerHTML =
        '<span class="hero-stat"><b>' + activeModules + '</b> ' + (activeModules === 1 ? 'módulo' : 'módulos') + '</span>' +
        '<span class="hero-stat"><b>' + guideLinks.length + '</b> ' + (guideLinks.length === 1 ? 'guía' : 'guías') + '</span>' +
        (seen.length ? '<span class="hero-stat"><b>' + Math.min(seen.length, guideLinks.length) + '</b> abiertas por ti</span>' : '');
      copy.appendChild(stats);

      var lastHref = readStore('ultima', null);
      var resume = guideLinks.filter(function (link) { return link.getAttribute('href') === lastHref; })[0];
      var target = resume || latest;
      if (!target) return;
      var module = target.closest('.modulo');
      var moduleText = [textOf(module, '.mod-titulo'), textOf(module, '.mod-meta')].filter(Boolean).join(' · ');
      var card = document.createElement('aside');
      card.className = 'hero-continuar';
      card.setAttribute('aria-label', resume ? 'Continúa donde quedaste' : 'Clase más reciente');
      card.innerHTML =
        '<span class="hc-label">' + (resume ? 'Continúa donde quedaste' : 'Clase más reciente') + '</span>' +
        '<p class="hc-modulo"></p><p class="hc-clase"></p>' +
        '<a class="hc-boton" href="">Abrir guía <span aria-hidden="true">→</span></a>';
      card.querySelector('.hc-modulo').textContent = moduleText;
      card.querySelector('.hc-clase').textContent = [textOf(target, '.clase-titulo'), textOf(target, '.clase-temas')].filter(Boolean).join(' · ');
      var button = card.querySelector('.hc-boton');
      button.href = target.getAttribute('href');
      button.addEventListener('click', function (event) {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        target.click();
      });
      hero.appendChild(card);
    })();

    function rememberGuide(link) {
      var href = link.getAttribute('href');
      if (seen.indexOf(href) === -1) { seen.push(href); writeStore('vistas', seen); }
      writeStore('ultima', href);
      markSeen(link);
    }

    var openIndex = latest ? Math.max(0, modules.indexOf(latest.closest('.modulo'))) : 0;

    modules.forEach(function (module, index) {
      module.open = index === openIndex;
      module.addEventListener('toggle', function () {
        if (!module.open || allowMultipleModules || Date.now() < bulkUntil || normalize(searchInput && searchInput.value)) return;
        modules.forEach(function (other) {
          if (other !== module) other.open = false;
        });
        updateExpandLabel();
      });
    });

    function visibleItems() {
      return Array.prototype.slice.call(document.querySelectorAll('.clase')).filter(function (item) {
        return !item.hidden && !item.closest('.modulo').hidden;
      }).length;
    }

    function updateStatus(query) {
      var count = visibleItems();
      if (emptyState) emptyState.hidden = count !== 0;
      if (resultStatus) {
        resultStatus.textContent = query
          ? count + (count === 1 ? ' resultado' : ' resultados')
          : availableResources + ' guías disponibles';
      }
    }

    function filterGuides() {
      var query = normalize(searchInput && searchInput.value);
      modules.forEach(function (module) {
        var items = Array.prototype.slice.call(module.querySelectorAll('.clase'));
        var visible = 0;
        items.forEach(function (item) {
          var matches = !query || normalize(item.textContent).indexOf(query) !== -1;
          item.hidden = !matches;
          if (matches) visible += 1;
        });
        module.hidden = query ? visible === 0 : false;
        if (query && visible) module.open = true;
      });
      if (clearButton) clearButton.hidden = !query;
      if (expandButton) expandButton.hidden = !!query;
      updateStatus(query);
      updateExpandLabel();
    }

    function showSearch(show) {
      if (!searchPanel || !searchToggle) return;
      searchPanel.hidden = !show;
      searchToggle.setAttribute('aria-expanded', show ? 'true' : 'false');
      searchToggle.setAttribute('aria-label', show ? 'Cerrar búsqueda' : 'Buscar una guía');
      var label = searchToggle.querySelector('[data-search-label]');
      if (label) label.textContent = show ? 'Cerrar' : 'Buscar';
      if (show && searchInput) searchInput.focus();
    }

    function updateExpandLabel() {
      if (!expandButton) return;
      var visibleModules = modules.filter(function (module) { return !module.hidden; });
      var shouldExpand = visibleModules.some(function (module) { return !module.open; });
      expandButton.dataset.action = shouldExpand ? 'expandir' : 'contraer';
      expandButton.textContent = shouldExpand ? 'Expandir' : 'Contraer';
      expandButton.setAttribute('aria-expanded', shouldExpand ? 'false' : 'true');
    }

    if (searchToggle) {
      searchToggle.addEventListener('click', function () { showSearch(searchPanel.hidden); });
    }
    if (searchInput) {
      searchInput.addEventListener('input', filterGuides);
      searchInput.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') return;
        searchInput.value = '';
        filterGuides();
        showSearch(false);
        searchToggle.focus();
      });
    }
    if (clearButton) {
      clearButton.addEventListener('click', function () {
        searchInput.value = '';
        filterGuides();
        searchInput.focus();
      });
    }
    if (expandButton) {
      expandButton.addEventListener('click', function () {
        var expand = expandButton.dataset.action === 'expandir';
        allowMultipleModules = expand;
        bulkUntil = Date.now() + 400;
        modules.forEach(function (module) {
          if (!module.hidden) module.open = expand;
        });
        allowMultipleModules = false;
        updateExpandLabel();
      });
    }

    updateStatus('');
    updateExpandLabel();
    initViewer(modules, rememberGuide);
  }

  /* ==================================================================
     VISOR · la guía se abre dentro del portal, bajo la barra fija
     ================================================================== */
  function initViewer(modules, onOpen) {
    var viewer = document.getElementById('visor');
    var frame = document.getElementById('visorFrame');
    var nav = document.getElementById('visorNav');
    if (!viewer || !frame || !nav) return;

    var moduleLabel = document.getElementById('visorModulo');
    var classLabel = document.getElementById('visorClase');
    var prevButton = document.getElementById('guiaAnterior');
    var nextButton = document.getElementById('guiaSiguiente');
    var openAlone = document.getElementById('abrirSola');
    var homeLinks = [document.getElementById('irInicio'), document.getElementById('volverBiblioteca')];
    var baseTitle = document.title;
    var current = null;

    function text(scope, selector) {
      var node = scope && scope.querySelector(selector);
      return node ? node.textContent.replace(/\s+/g, ' ').trim() : '';
    }

    /* Una clase con href vacío o "#" todavía no tiene guía: no se abre ni cuenta. */
    Array.prototype.forEach.call(document.querySelectorAll('a.clase'), function (link) {
      if (isGuideLink(link)) return;
      link.setAttribute('aria-disabled', 'true');
      link.classList.add('clase--sin-guia');
      link.addEventListener('click', function (event) { event.preventDefault(); });
    });

    var guides = Array.prototype.filter.call(document.querySelectorAll('a.clase[href]'), isGuideLink).map(function (link, index) {
      var module = link.closest('.modulo');
      var summary = module && module.querySelector('summary');
      var unit = link.closest('.unidad-grupo');
      var unitName = unit ? [text(unit, '.unidad-num'), text(unit, '.unidad-head h3')].filter(Boolean).join(' · ') : '';
      return {
        index: index,
        link: link,
        module: module,
        href: link.getAttribute('href'),
        url: link.href,
        title: text(link, '.clase-titulo'),
        topic: text(link, '.clase-temas'),
        moduleTitle: text(summary, '.mod-titulo'),
        moduleMeta: text(summary, '.mod-meta'),
        unit: unitName
      };
    });
    if (!guides.length) return;

    function byHref(href) {
      return guides.filter(function (guide) { return guide.href === href; })[0] || null;
    }

    function byUrl(url) {
      var clean = String(url || '').split('#')[0];
      return guides.filter(function (guide) { return guide.url.split('#')[0] === clean; })[0] || null;
    }

    function guideParam() {
      try { return new URLSearchParams(window.location.search).get('guia'); } catch (error) { return null; }
    }

    function urlFor(guide) {
      var base = window.location.pathname.split('/').pop() || 'index.html';
      if (!guide) return base;
      return base + '?guia=' + encodeURI(guide.href).replace(/[?#&]/g, encodeURIComponent);
    }

    function remember(guide, replace) {
      try {
        var method = replace ? 'replaceState' : 'pushState';
        history[method]({ guia: guide ? guide.href : null }, '', urlFor(guide));
      } catch (error) {}
    }

    function paintBar(guide) {
      var module = [guide.moduleTitle, guide.unit || guide.moduleMeta].filter(Boolean).join(' · ');
      var lesson = [guide.title, guide.topic].filter(Boolean).join(' · ');
      moduleLabel.textContent = module;
      classLabel.textContent = lesson;
      classLabel.title = lesson;
      prevButton.disabled = guide.index === 0;
      nextButton.disabled = guide.index === guides.length - 1;
      var prev = guides[guide.index - 1];
      var next = guides[guide.index + 1];
      prevButton.title = prev ? 'Anterior: ' + prev.title + (prev.topic ? ' · ' + prev.topic : '') : 'Es la primera guía';
      nextButton.title = next ? 'Siguiente: ' + next.title + (next.topic ? ' · ' + next.topic : '') : 'Es la última guía';
      openAlone.href = guide.url;
      document.title = (guide.title ? guide.title + ' · ' : '') + baseTitle;
    }

    function open(guide, options) {
      options = options || {};
      if (!guide) return;
      current = guide;
      document.body.classList.add('en-visor');
      viewer.hidden = false;
      nav.hidden = false;
      paintBar(guide);
      if (byUrl(frameUrl()) !== guide) {
        viewer.classList.add('cargando');
        frame.src = guide.href;
      }
      if (!options.fromHistory) remember(guide, options.replace);
      if (onOpen) onOpen(guide.link);
      window.scrollTo(0, 0);
    }

    function close(options) {
      options = options || {};
      var last = current;
      current = null;
      document.body.classList.remove('en-visor');
      viewer.hidden = true;
      nav.hidden = true;
      viewer.classList.remove('cargando');
      frame.removeAttribute('src');
      document.title = baseTitle;
      if (!options.fromHistory) remember(null, options.replace);
      if (last) {
        if (last.module && !last.module.open) last.module.open = true;
        window.requestAnimationFrame(function () {
          last.link.scrollIntoView({ block: 'center' });
          last.link.focus({ preventScroll: true });
        });
      }
    }

    function frameUrl() {
      try { return frame.contentWindow.location.href; } catch (error) { return ''; }
    }

    frame.addEventListener('load', function () {
      if (!current) return;
      viewer.classList.remove('cargando');
      var shown = byUrl(frameUrl());
      if (shown && shown !== current) {
        current = shown;
        paintBar(shown);
        remember(shown, true);
      }
      try { frame.contentWindow.focus(); } catch (error) {}
    });

    guides.forEach(function (guide) {
      guide.link.addEventListener('click', function (event) {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        open(guide);
      });
    });

    homeLinks.forEach(function (link) {
      if (!link) return;
      link.addEventListener('click', function (event) {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (!current) return;
        event.preventDefault();
        close();
      });
    });

    prevButton.addEventListener('click', function () { if (current) open(guides[current.index - 1]); });
    nextButton.addEventListener('click', function () { if (current) open(guides[current.index + 1]); });

    window.addEventListener('popstate', function () {
      var guide = byHref(guideParam());
      if (guide) open(guide, { fromHistory: true });
      else if (current) close({ fromHistory: true });
    });

    var initial = byHref(guideParam());
    if (initial) open(initial, { replace: true });
  }

  /* ==================================================================
     BOTÓN "TODAS LAS GUÍAS" · solo cuando la guía se abre sola
     ================================================================== */
  function mountHomeButton(homePath, activeCompany) {
    if (document.querySelector('.ana-portal-home')) return;

    var style = document.createElement('style');
    style.textContent = [
      '.ana-portal-home{--home-brand:#0879b8;position:fixed;top:16px;left:16px;z-index:10000;min-height:44px;display:inline-flex;align-items:center;gap:8px;padding:0 13px;border:1px solid #cfd3d0;border-radius:10px;background:#fff;color:#252a28;box-shadow:0 2px 8px rgba(18,24,21,.1);font:650 13px/1.1 system-ui,sans-serif;text-decoration:none;transition:border-color .18s ease,background .18s ease}',
      '.ana-portal-home:hover{border-color:var(--home-brand);background:#f7f8f7}',
      '.ana-portal-home:focus-visible{outline:3px solid color-mix(in srgb,var(--home-brand) 50%,white);outline-offset:3px}',
      '.ana-portal-home svg{width:18px;height:18px;flex:0 0 18px}',
      '.ana-portal-home[data-empresa="dev-senior"]{--home-brand:#6d3ff0}',
      ':root[data-tema="oscuro"] .ana-portal-home{background:#1d201f;color:#e7e9e7;border-color:#414643;box-shadow:0 2px 8px rgba(0,0,0,.24)}',
      '.controls .ana-portal-home{position:static;order:-1}',
      '@media(max-width:560px){.ana-portal-home{width:44px;padding:0;justify-content:center}.ana-portal-home span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}}',
      '@media print{.ana-portal-home{display:none!important}}',
      '@media(prefers-reduced-motion:reduce){.ana-portal-home{transition:none}}'
    ].join('');
    document.head.appendChild(style);

    var link = document.createElement('a');
    link.className = 'ana-portal-home';
    link.href = homePath;
    link.dataset.empresa = activeCompany;
    link.setAttribute('aria-label', 'Volver a todas las guías');
    link.setAttribute('title', 'Todas las guías');
    link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg><span>Todas las guías</span>';

    var controls = document.querySelector('.controls');
    if (controls) controls.insertBefore(link, controls.firstChild);
    else document.body.insertBefore(link, document.body.firstChild);
  }
})();
