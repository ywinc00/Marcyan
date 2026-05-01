/* ════════════════════════════════════════════════════════════════
   Admin · Lista de Briefs
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── Helpers compartidos ──────────────────────────────────────
  async function adminFetch(url, opts = {}) {
    const res = await fetch(url, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    if (res.status === 401) {
      location.replace('/admin?error=session');
      throw new Error('Unauthorized');
    }
    return res;
  }

  function fmtRelative(d) {
    const now = Date.now();
    const t = new Date(d).getTime();
    const diff = (now - t) / 1000;
    if (diff < 60) return 'ahora';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`;
    return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function badge(status) {
    const labels = {
      pending: 'Pendiente', contacted: 'Contactado',
      in_progress: 'En curso', completed: 'Completado', archived: 'Archivado',
    };
    return `<span class="admin-badge is-${status}">${labels[status] || status}</span>`;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── State ────────────────────────────────────────────────────
  const state = {
    status: '',
    search: '',
    limit: 30,
    offset: 0,
    total: 0,
  };

  // ── Elements ─────────────────────────────────────────────────
  const $body     = document.getElementById('briefs-body');
  const $filters  = document.getElementById('filters');
  const $search   = document.getElementById('search-input');
  const $exportBtn= document.getElementById('export-btn');
  const $userEmail= document.getElementById('user-email');
  const $logout   = document.getElementById('logout-btn');
  const $pagination = document.getElementById('pagination');
  const $pagInfo  = document.getElementById('pag-info');
  const $pagPrev  = document.getElementById('pag-prev');
  const $pagNext  = document.getElementById('pag-next');

  // ── Auth init ────────────────────────────────────────────────
  async function loadMe() {
    try {
      const res = await adminFetch('/api/admin/me');
      const json = await res.json();
      if (json && json.email) $userEmail.textContent = json.email;
    } catch (_) {}
  }

  $logout.addEventListener('click', async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
    } catch (_) {}
    location.replace('/admin');
  });

  // ── Stats ────────────────────────────────────────────────────
  async function loadStats() {
    try {
      const res = await adminFetch('/api/admin/stats');
      const json = await res.json();
      if (!json.ok) return;
      const s = json.stats;
      document.getElementById('st-total').textContent     = s.total;
      document.getElementById('st-pending').textContent   = s.pending;
      document.getElementById('st-progress').textContent  = s.in_progress;
      document.getElementById('st-completed').textContent = s.completed_this_month;

      document.getElementById('f-all').textContent       = s.total;
      document.getElementById('f-pending').textContent   = s.pending;
      document.getElementById('f-contacted').textContent = s.contacted;
      document.getElementById('f-progress').textContent  = s.in_progress;
      document.getElementById('f-completed').textContent = s.completed;
      document.getElementById('f-archived').textContent  = s.archived;
    } catch (err) {
      console.error('stats', err);
    }
  }

  // ── List ─────────────────────────────────────────────────────
  async function loadList() {
    const params = new URLSearchParams();
    if (state.status) params.set('status', state.status);
    if (state.search) params.set('search', state.search);
    params.set('limit', state.limit);
    params.set('offset', state.offset);

    $body.innerHTML = `<tr><td colspan="5" class="admin-empty">
      <div class="admin-empty-title">Cargando…</div></td></tr>`;

    try {
      const res = await adminFetch('/api/admin/briefs?' + params.toString());
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Error');
      state.total = json.total;
      renderList(json.rows);
      renderPagination();
    } catch (err) {
      $body.innerHTML = `<tr><td colspan="5" class="admin-empty">
        <div class="admin-empty-title">Error al cargar</div>
        <div class="admin-empty-sub">${escapeHtml(err.message || 'Intenta refrescar')}</div>
      </td></tr>`;
    }
  }

  function renderList(rows) {
    if (!rows.length) {
      $body.innerHTML = `<tr><td colspan="5" class="admin-empty">
        <div class="admin-empty-title">Sin briefs</div>
        <div class="admin-empty-sub">No hay registros que coincidan con el filtro.</div>
      </td></tr>`;
      return;
    }
    $body.innerHTML = rows.map(r => {
      const url = `/admin/briefs/detail?id=${encodeURIComponent(r.project_id)}`;
      const contact = r.email
        ? escapeHtml(r.email)
        : r.phone ? escapeHtml(r.phone) : '<span style="color:var(--ad-mute)">—</span>';
      return `<tr data-href="${url}">
        <td class="col-id">${escapeHtml(r.project_id)}</td>
        <td class="col-name">${escapeHtml(r.business_name || '—')}</td>
        <td class="col-email">${contact}</td>
        <td>${badge(r.status)}</td>
        <td class="col-date">${fmtRelative(r.created_at)}</td>
      </tr>`;
    }).join('');
    $body.querySelectorAll('tr[data-href]').forEach(tr => {
      tr.addEventListener('click', () => location.href = tr.dataset.href);
    });
  }

  function renderPagination() {
    if (state.total <= state.limit) {
      $pagination.hidden = true;
      return;
    }
    $pagination.hidden = false;
    const from = state.offset + 1;
    const to   = Math.min(state.offset + state.limit, state.total);
    $pagInfo.textContent = `Mostrando ${from}–${to} de ${state.total}`;
    $pagPrev.disabled = state.offset === 0;
    $pagNext.disabled = state.offset + state.limit >= state.total;
  }

  $pagPrev.addEventListener('click', () => {
    state.offset = Math.max(0, state.offset - state.limit);
    loadList();
  });
  $pagNext.addEventListener('click', () => {
    state.offset += state.limit;
    loadList();
  });

  // ── Filters ──────────────────────────────────────────────────
  $filters.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.admin-filter-chip');
    if (!btn) return;
    $filters.querySelectorAll('.admin-filter-chip').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    state.status = btn.dataset.status || '';
    state.offset = 0;
    loadList();
  });

  // ── Search (debounced) ───────────────────────────────────────
  let searchTimer = null;
  $search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.search = $search.value.trim();
      state.offset = 0;
      loadList();
    }, 300);
  });

  // ── Export ───────────────────────────────────────────────────
  $exportBtn.addEventListener('click', (ev) => {
    ev.preventDefault();
    const params = new URLSearchParams();
    if (state.status) params.set('status', state.status);
    if (state.search) params.set('search', state.search);
    location.href = '/api/admin/export?' + params.toString();
  });

  // ── Init ─────────────────────────────────────────────────────
  loadMe();
  loadStats();
  loadList();
})();
