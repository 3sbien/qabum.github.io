(function () {
  window.NOVOLOV_DATA = [];
  window.NOVOLOV_LIVE_STATUS = 'loading';

  const normalizeCode = value => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .trim();

  const normalizeField = value => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .trim();

  const queryTokens = value => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
    .split(/\s+/)
    .map(part => part.replace(/[^A-Z0-9]+/g, ''))
    .filter(Boolean);

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);

  const money = value => value == null || value === '' ? '—' : '$' + Number(value).toFixed(2);

  let loading = false;
  let lastLoadedAt = 0;
  let searchRefreshTimer = null;
  let programmaticRefresh = false;

  function currentCode() {
    return sessionStorage.getItem('nvloc_code') || '';
  }

  function renderPreciseSearch() {
    const q = document.querySelector('#q');
    const count = document.querySelector('#count');
    const results = document.querySelector('#results');
    if (!q || !count || !results) return;

    const tokens = queryTokens(q.value);
    if (!tokens.length) return;

    const rows = (window.NOVOLOV_DATA || []).filter(row => {
      const fields = row.map(normalizeField);
      return tokens.every(token => fields.some(field => field.includes(token)));
    });

    count.textContent = rows.length + (rows.length === 1 ? ' resultado' : ' resultados');
    const show = rows.slice(0, 120);

    results.innerHTML = show.length ? show.map(row =>
      `<article class="item"><h3>${escapeHtml(row[2])}</h3>` +
      `<span class="pill">${escapeHtml(row[0])}</span>` +
      `<span class="pill">Barras ${escapeHtml(row[1])}</span>` +
      `<span class="pill loc">📍 ${escapeHtml(row[4] || 'SIN UBICACIÓN')}</span>` +
      `<div class="details">` +
      `<div><div class="lab">Marca</div><div class="val">${escapeHtml(row[5] || '—')}</div></div>` +
      `<div><div class="lab">Talla</div><div class="val">${escapeHtml(row[6] || '—')}</div></div>` +
      `<div><div class="lab">Color</div><div class="val">${escapeHtml(row[7] || '—')}</div></div>` +
      `<div><div class="lab">PVP</div><div class="val">${money(row[3])}</div></div>` +
      `<div><div class="lab">Estado</div><div class="val">${escapeHtml(row[8] || '—')}</div></div>` +
      `<div><div class="lab">Ubicación</div><div class="val">${escapeHtml(row[4] || '—')}</div></div>` +
      `</div></article>`
    ).join('') : '<div class="empty">No encontré coincidencias. Prueba con menos palabras.</div>';

    if (rows.length > 120) {
      results.insertAdjacentHTML('beforeend', '<div class="empty">Hay más resultados. Agrega otro dato para acotar la búsqueda.</div>');
    }
  }

  function refreshVisibleSearch() {
    const q = document.querySelector('#q');
    if (q && q.value) {
      programmaticRefresh = true;
      q.dispatchEvent(new Event('input', { bubbles: true }));
      programmaticRefresh = false;
    }
  }

  function showLiveError() {
    const results = document.querySelector('#results');
    const count = document.querySelector('#count');
    if (count) count.textContent = 'Datos en vivo no disponibles';
    if (results) {
      results.innerHTML = '<div class="empty">No pude consultar el inventario en vivo. Intenta nuevamente en unos segundos.</div>';
    }
  }

  async function loadLiveFeed(force) {
    const code = currentCode();
    if (!code || loading) return;
    if (!force && Date.now() - lastLoadedAt < 1500) return;

    loading = true;
    window.NOVOLOV_LIVE_STATUS = 'loading';

    try {
      const response = await fetch('/api/novolov-feed', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ code })
      });

      if (!response.ok) throw new Error('LIVE_FEED_HTTP_' + response.status);
      const payload = await response.json();
      if (!payload || payload.ok !== true || !Array.isArray(payload.items)) {
        throw new Error('LIVE_FEED_INVALID');
      }

      window.NOVOLOV_DATA = payload.items.map(item => [
        item.codigo || '',
        item.barras || '',
        item.prenda || '',
        item.pvp === '' || item.pvp == null ? null : Number(String(item.pvp).replace(',', '.')),
        item.ubicacion || '',
        item.marca || '',
        item.talla || '',
        item.color || '',
        item.estado || ''
      ]);

      window.NOVOLOV_LIVE_STATUS = 'ready';
      lastLoadedAt = Date.now();
      refreshVisibleSearch();
    } catch (error) {
      window.NOVOLOV_DATA = [];
      window.NOVOLOV_LIVE_STATUS = 'error';
      showLiveError();
    } finally {
      loading = false;
    }
  }

  function rememberCodeAndLoad() {
    const input = document.querySelector('#code');
    if (!input) return;
    const code = normalizeCode(input.value);
    if (!code) return;
    sessionStorage.setItem('nvloc_code', code);
    setTimeout(() => loadLiveFeed(true), 250);
  }

  document.addEventListener('click', event => {
    if (event.target && event.target.closest && event.target.closest('#enter')) {
      rememberCodeAndLoad();
    }
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key === 'Enter' && event.target && event.target.id === 'code') {
      rememberCodeAndLoad();
    }
  }, true);

  document.addEventListener('input', event => {
    if (!event.target || event.target.id !== 'q' || programmaticRefresh) return;
    clearTimeout(searchRefreshTimer);
    searchRefreshTimer = setTimeout(() => loadLiveFeed(true), 300);
  }, true);

  window.addEventListener('DOMContentLoaded', () => {
    const q = document.querySelector('#q');
    if (q) q.addEventListener('input', renderPreciseSearch);
  });

  window.addEventListener('focus', () => loadLiveFeed(true));

  if (sessionStorage.getItem('nvloc') === '1') {
    if (!currentCode()) {
      sessionStorage.removeItem('nvloc');
      location.reload();
    } else {
      setTimeout(() => loadLiveFeed(true), 50);
    }
  }
})();
