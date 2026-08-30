(function () {
  window.NOVOLOV_DATA = [];
  window.NOVOLOV_LIVE_STATUS = 'loading';

  const normalizeCode = value => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .trim();

  let loading = false;
  let lastLoadedAt = 0;
  let searchRefreshTimer = null;

  function currentCode() {
    return sessionStorage.getItem('nvloc_code') || '';
  }

  function refreshVisibleSearch() {
    const q = document.querySelector('#q');
    if (q && q.value) q.dispatchEvent(new Event('input', { bubbles: true }));
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
    if (!event.target || event.target.id !== 'q') return;
    clearTimeout(searchRefreshTimer);
    searchRefreshTimer = setTimeout(() => loadLiveFeed(true), 300);
  }, true);

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
