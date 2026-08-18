/* Acceso universal al portal · Ana Alvarado */
(function () {
  'use strict';

  var script = document.currentScript;
  if (!script || document.querySelector('.ana-portal-home')) return;
  var home = script.getAttribute('data-home') || './index.html';
  var company = script.getAttribute('data-empresa') || 'generation';

  function mount() {
    if (document.querySelector('.ana-portal-home')) return;

    var style = document.createElement('style');
    style.textContent = [
      '.ana-portal-home{--ana-home:#356b61;position:fixed;top:16px;left:16px;z-index:10000;min-height:44px;display:inline-flex;align-items:center;gap:8px;padding:0 13px;border:1px solid #cfd3d0;border-radius:10px;background:#fff;color:#252a28;box-shadow:0 2px 8px rgba(18,24,21,.1);font:600 13px/1.1 system-ui,sans-serif;text-decoration:none;transition:border-color .18s ease,background .18s ease}',
      '.ana-portal-home:hover{border-color:var(--ana-home);background:#f7f8f7}',
      '.ana-portal-home:focus-visible{outline:3px solid color-mix(in srgb,var(--ana-home) 50%,white);outline-offset:3px}',
      '.ana-portal-home svg{width:18px;height:18px;flex:0 0 18px}',
      '.ana-portal-home[data-empresa="dev-senior"]{--ana-home:#675f91}',
      ':root:not([data-tema="claro"]) .ana-portal-home{background:#1d201f;color:#e7e9e7;border-color:#414643;box-shadow:0 2px 8px rgba(0,0,0,.24)}',
      '.controls .ana-portal-home{position:static;order:-1}',
      '@media(max-width:560px){.ana-portal-home{width:44px;padding:0;justify-content:center}.ana-portal-home span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}}',
      '@media(prefers-reduced-motion:reduce){.ana-portal-home{transition:none}}'
    ].join('');
    document.head.appendChild(style);

    var link = document.createElement('a');
    link.className = 'ana-portal-home';
    link.href = home;
    link.dataset.empresa = company;
    link.setAttribute('aria-label', 'Volver a todas las guías');
    link.setAttribute('title', 'Todas las guías');
    link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg><span>Todas las guías</span>';

    var controls = document.querySelector('.controls');
    if (controls) controls.insertBefore(link, controls.firstChild);
    else document.body.insertBefore(link, document.body.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
