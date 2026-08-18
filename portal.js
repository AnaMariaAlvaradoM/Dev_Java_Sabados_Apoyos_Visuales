/* Portal de clases v8 · dirección sobria · Ana Alvarado */
(function () {
  'use strict';

  var root = document.documentElement;
  var themeButton = document.getElementById('temaBtn');
  var searchToggle = document.getElementById('mostrarBusqueda');
  var searchPanel = document.getElementById('panelBusqueda');
  var searchInput = document.getElementById('buscarGuia');
  var clearButton = document.getElementById('limpiarBusqueda');
  var expandButton = document.getElementById('expandirModulos');
  var emptyState = document.getElementById('sinResultados');
  var modules = Array.prototype.slice.call(document.querySelectorAll('.modulo'));
  var moduleCount = document.querySelector('[data-module-count]');
  var resourceCount = document.querySelector('[data-resource-count]');
  var resultStatus = document.getElementById('estadoResultados');
  var themeKey = 'ana-portal-tema-v8';
  var allowMultipleModules = false;

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
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
  setTheme(storedTheme || 'claro');

  if (themeButton) {
    themeButton.addEventListener('click', function () {
      setTheme(root.dataset.tema === 'oscuro' ? 'claro' : 'oscuro');
    });
  }

  if (moduleCount) moduleCount.textContent = modules.length;
  var availableResources = document.querySelectorAll('a.clase[href]').length;
  if (resourceCount) resourceCount.textContent = availableResources;

  modules.forEach(function (module, index) {
    module.open = index === 0;
    module.addEventListener('toggle', function () {
      if (!module.open || allowMultipleModules || normalizeText(searchInput && searchInput.value)) return;
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
    var query = normalizeText(searchInput && searchInput.value);
    modules.forEach(function (module) {
      var items = Array.prototype.slice.call(module.querySelectorAll('.clase'));
      var visible = 0;
      items.forEach(function (item) {
        var matches = !query || normalizeText(item.textContent).indexOf(query) !== -1;
        item.hidden = !matches;
        if (matches) visible += 1;
      });
      module.hidden = visible === 0;
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
    searchToggle.addEventListener('click', function () {
      showSearch(searchPanel.hidden);
    });
  }
  if (searchInput) {
    searchInput.addEventListener('input', filterGuides);
    searchInput.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        searchInput.value = '';
        filterGuides();
        showSearch(false);
        searchToggle.focus();
      }
    });
  }
  if (clearButton) {
    clearButton.addEventListener('click', function () {
      searchInput.value = '';
      searchInput.focus();
      filterGuides();
    });
  }
  if (expandButton) {
    expandButton.addEventListener('click', function () {
      var expand = expandButton.dataset.action === 'expandir';
      allowMultipleModules = expand;
      modules.forEach(function (module) {
        if (!module.hidden) module.open = expand;
      });
      updateExpandLabel();
    });
  }

  filterGuides();
})();
