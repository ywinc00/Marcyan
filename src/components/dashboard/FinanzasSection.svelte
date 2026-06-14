<script>
  import { onMount } from 'svelte';

  // ── Helpers ──────────────────────────────────────────────────
  async function api(url, opts = {}) {
    return fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opts });
  }
  function fmtDate(d) { return d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : ''; }
  // Centavos (BIGINT) → USD para mostrar. Toda la matemática de dinero
  // vive en centavos; aquí SOLO formateamos.
  function fmtUsd(cents) {
    const n = Number(cents || 0) / 100;
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
  }
  // Dólares de un input de texto → centavos enteros.
  const MAX_CENTS = 9999999999; // tope 99,999,999.99 USD (evita overflow BIGINT)
  function dollarsToCents(v) {
    const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(Math.round(n * 100), MAX_CENTS);
  }
  const todayISO = () => new Date().toISOString().slice(0, 10);

  const MONTH_LABELS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function monthLabel(m) { return MONTH_LABELS[parseInt(m.slice(5, 7), 10) - 1] || m; }

  const INVOICE_STATUSES = [
    { id: 'draft', label: 'Borrador' }, { id: 'sent', label: 'Enviada' },
    { id: 'partial', label: 'Parcial' }, { id: 'paid', label: 'Pagada' },
    { id: 'overdue', label: 'Vencida' }, { id: 'void', label: 'Anulada' },
  ];
  function invStatusLabel(s) { return (INVOICE_STATUSES.find((x) => x.id === s) || {}).label || s; }
  const INV_FILTERS = [{ id: '', label: 'Todas' }, ...INVOICE_STATUSES];

  const PAYMENT_METHODS = [
    { id: 'zelle', label: 'Zelle' }, { id: 'cash', label: 'Efectivo' },
    { id: 'transfer', label: 'Transferencia' }, { id: 'paypal', label: 'PayPal' },
    { id: 'card', label: 'Tarjeta' }, { id: 'other', label: 'Otro' },
  ];

  // ── Estado: resumen / KPIs ───────────────────────────────────
  let summary = $state(null);
  const revenue = $derived(summary ? summary.revenue_by_month : []);
  const chartMax = $derived(Math.max(1, ...revenue.map((r) => Math.max(0, +r.total_cents || 0))));

  // ── Estado: facturas ─────────────────────────────────────────
  let invoices = $state([]);
  let invTotal = $state(0);
  let invFilter = $state('');
  let invSearch = $state('');
  let invOffset = $state(0);
  const LIMIT = 30;
  let loading = $state(false);
  let error = $state('');
  let searchTimer;

  // ── Estado: clientes (para selects de alta) ──────────────────
  let clients = $state([]);

  // ── Estado: formularios ──────────────────────────────────────
  let showInvoiceForm = $state(false);
  let invForm = $state({ client_id: '', amount: '', description: '', issued_at: todayISO(), due_date: '', status: 'sent' });
  let invFormMsg = $state(''); let invFormOk = $state(false);

  let showClientForm = $state(false);
  let cliForm = $state({ business_name: '', owner_name: '', email: '', phone: '', city_state: '', notes: '' });
  let cliFormMsg = $state(''); let cliFormOk = $state(false);

  let showConvertForm = $state(false);
  let convBrief = $state('');
  let convMsg = $state(''); let convOk = $state(false);

  // ── Estado: pago (modal) ─────────────────────────────────────
  let payInvoice = $state(null);    // factura objetivo del pago
  let payForm = $state({ amount: '', method: 'zelle', paid_at: todayISO(), reference: '' });
  let payMsg = $state(''); let payOk = $state(false); let paying = $state(false);

  // ── Carga ────────────────────────────────────────────────────
  async function loadSummary() {
    try { const r = await api('/api/admin/finance/summary'); const j = await r.json(); if (j.ok) summary = j.summary; } catch (_) {}
  }
  async function loadClients() {
    try { const r = await api('/api/admin/clients?limit=200'); const j = await r.json(); if (j.ok) clients = j.rows || []; } catch (_) {}
  }
  async function loadInvoices() {
    loading = true; error = '';
    const p = new URLSearchParams();
    if (invFilter) p.set('status', invFilter);
    if (invSearch) p.set('search', invSearch);
    p.set('limit', LIMIT); p.set('offset', invOffset);
    try {
      const r = await api('/api/admin/invoices?' + p.toString());
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Error');
      invoices = j.rows || []; invTotal = j.total || 0;
    } catch (e) { error = e.message || 'Error al cargar'; }
    finally { loading = false; }
  }
  function setInvFilter(s) { invFilter = s; invOffset = 0; loadInvoices(); }
  function onSearchInput(e) {
    invSearch = e.currentTarget.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { invOffset = 0; loadInvoices(); }, 300);
  }
  function nextPage() { if (invOffset + LIMIT < invTotal) { invOffset += LIMIT; loadInvoices(); } }
  function prevPage() { if (invOffset > 0) { invOffset = Math.max(0, invOffset - LIMIT); loadInvoices(); } }

  function refreshAll() { loadSummary(); loadInvoices(); loadClients(); }

  // ── Alta de cliente ──────────────────────────────────────────
  async function submitClient() {
    if (!cliForm.business_name.trim() && !cliForm.owner_name.trim()) {
      cliFormOk = false; cliFormMsg = 'Indica al menos el negocio o el propietario'; return;
    }
    cliFormMsg = 'Guardando…'; cliFormOk = false;
    try {
      const r = await api('/api/admin/clients', { method: 'POST', body: JSON.stringify({ ...cliForm }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Error');
      cliFormOk = true; cliFormMsg = `✓ ${j.client.client_code} creado`;
      cliForm = { business_name: '', owner_name: '', email: '', phone: '', city_state: '', notes: '' };
      await loadClients();
      setTimeout(() => { showClientForm = false; cliFormMsg = ''; }, 900);
    } catch (e) { cliFormOk = false; cliFormMsg = e.message || 'Error al crear'; }
  }

  // ── Convertir brief → cliente ────────────────────────────────
  async function submitConvert() {
    const pid = convBrief.trim();
    if (!pid) { convOk = false; convMsg = 'Escribe un ID de brief (MRC-XXX)'; return; }
    convMsg = 'Convirtiendo…'; convOk = false;
    try {
      const r = await api('/api/admin/clients', { method: 'POST', body: JSON.stringify({ from_brief: pid }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Error');
      convOk = true; convMsg = `✓ ${j.client.client_code} — ${j.client.business_name || 'cliente'}`;
      convBrief = '';
      await loadClients();
      setTimeout(() => { showConvertForm = false; convMsg = ''; }, 1200);
    } catch (e) { convOk = false; convMsg = e.message || 'Error al convertir'; }
  }

  // ── Alta de factura ──────────────────────────────────────────
  async function submitInvoice() {
    if (!invForm.client_id) { invFormOk = false; invFormMsg = 'Selecciona un cliente'; return; }
    const cents = dollarsToCents(invForm.amount);
    if (cents < 0) { invFormOk = false; invFormMsg = 'Monto inválido'; return; }
    invFormMsg = 'Guardando…'; invFormOk = false;
    try {
      const r = await api('/api/admin/invoices', { method: 'POST', body: JSON.stringify({
        client_id: parseInt(invForm.client_id, 10),
        amount_cents: cents,
        description: invForm.description || null,
        issued_at: invForm.issued_at || null,
        due_date: invForm.due_date || null,
        status: invForm.status,
      }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Error');
      invFormOk = true; invFormMsg = `✓ ${j.invoice.invoice_number} creada`;
      invForm = { client_id: '', amount: '', description: '', issued_at: todayISO(), due_date: '', status: 'sent' };
      invOffset = 0;
      await loadInvoices(); await loadSummary();
      setTimeout(() => { showInvoiceForm = false; invFormMsg = ''; }, 900);
    } catch (e) { invFormOk = false; invFormMsg = e.message || 'Error al crear'; }
  }

  // ── Cambiar estado de factura ────────────────────────────────
  async function setInvoiceStatus(inv, status) {
    const prev = inv.status;
    inv.status = status; invoices = [...invoices];
    try {
      const r = await api('/api/admin/invoices/' + inv.id, { method: 'PATCH', body: JSON.stringify({ status }) });
      const j = await r.json();
      if (!j.ok) throw new Error();
      await loadInvoices(); await loadSummary();
    } catch (_) { inv.status = prev; invoices = [...invoices]; }
  }

  // ── Registrar pago ───────────────────────────────────────────
  function openPay(inv) {
    payInvoice = inv;
    const bal = Number(inv.balance_cents || 0) / 100;
    payForm = { amount: bal > 0 ? bal.toFixed(2) : '', method: 'zelle', paid_at: todayISO(), reference: '' };
    payMsg = ''; payOk = false;
  }
  function closePay() { payInvoice = null; payMsg = ''; }
  async function submitPayment() {
    const cents = dollarsToCents(payForm.amount);
    if (cents <= 0) { payOk = false; payMsg = 'El monto debe ser mayor a 0'; return; }
    paying = true; payMsg = 'Registrando…'; payOk = false;
    try {
      const r = await api('/api/admin/payments', { method: 'POST', body: JSON.stringify({
        invoice_id: payInvoice.id,
        amount_cents: cents,
        method: payForm.method,
        paid_at: payForm.paid_at || null,
        reference: payForm.reference || null,
      }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Error');
      payOk = true; payMsg = '✓ Pago registrado';
      await loadInvoices(); await loadSummary();
      setTimeout(() => { payInvoice = null; payMsg = ''; }, 900);
    } catch (e) { payOk = false; payMsg = e.message || 'Error al registrar'; }
    finally { paying = false; }
  }

  onMount(() => { refreshAll(); });
</script>

<!-- ═══ KPIs ═══ -->
<div class="sec-head">
  <h1 class="greet">Finanzas</h1>
  <button class="b b--ghost" onclick={refreshAll}>↻ Actualizar</button>
</div>

<div class="kpis">
  <div class="kpi">
    <span class="kpi__lbl">Cobrado (mes)</span>
    <span class="kpi__num teal">{summary ? fmtUsd(summary.collected_this_month_cents) : '—'}</span>
  </div>
  <div class="kpi">
    <span class="kpi__lbl">Por cobrar</span>
    <span class="kpi__num gold">{summary ? fmtUsd(summary.ar_total_cents) : '—'}</span>
  </div>
  <div class="kpi">
    <span class="kpi__lbl">Vencido</span>
    <span class="kpi__num" class:danger={summary && summary.overdue_cents > 0}>{summary ? fmtUsd(summary.overdue_cents) : '—'}</span>
    {#if summary && summary.overdue_count > 0}<span class="kpi__hint">{summary.overdue_count} factura{summary.overdue_count === 1 ? '' : 's'}</span>{/if}
  </div>
  <div class="kpi">
    <span class="kpi__lbl">Facturas abiertas</span>
    <span class="kpi__num">{summary ? summary.counts.open_invoices : '—'}</span>
    {#if summary}<span class="kpi__hint">{summary.counts.clients} cliente{summary.counts.clients === 1 ? '' : 's'}</span>{/if}
  </div>
</div>

<!-- ═══ Gráfico de ingresos por mes (SVG a mano) ═══ -->
<div class="panel">
  <div class="panel__lbl">Ingresos por mes <span class="panel__sub">últimos 6 · por fecha de pago</span></div>
  {#if summary}
    <svg class="chart" viewBox="0 0 560 180" role="img" aria-label="Ingresos por mes">
      {#each revenue as a, i}
        <rect
          x={i * (560 / revenue.length) + (560 / revenue.length) * 0.22}
          y={150 - (a.total_cents / chartMax) * 132}
          width={(560 / revenue.length) * 0.56}
          height={Math.max(0, (a.total_cents / chartMax) * 132)}
          rx="3"
          fill={i === revenue.length - 1 ? 'var(--accent-teal)' : 'var(--accent-gold)'}
          opacity={i === revenue.length - 1 ? 1 : 0.5} />
        <text x={i * (560 / revenue.length) + (560 / revenue.length) / 2} y="170" text-anchor="middle" class="chart__lbl">{monthLabel(a.month)}</text>
        {#if a.total_cents > 0}
          <text x={i * (560 / revenue.length) + (560 / revenue.length) / 2} y={150 - (a.total_cents / chartMax) * 132 - 5} text-anchor="middle" class="chart__val">{fmtUsd(a.total_cents)}</text>
        {/if}
      {/each}
    </svg>
  {:else}<div class="muted">Cargando…</div>{/if}
</div>

<!-- ═══ Acciones de alta ═══ -->
<div class="actions">
  <button class="b b--primary" onclick={() => { showInvoiceForm = !showInvoiceForm; showClientForm = false; showConvertForm = false; }}>+ Factura</button>
  <button class="b" onclick={() => { showClientForm = !showClientForm; showInvoiceForm = false; showConvertForm = false; }}>+ Cliente</button>
  <button class="b" onclick={() => { showConvertForm = !showConvertForm; showInvoiceForm = false; showClientForm = false; }}>⇄ Brief → Cliente</button>
</div>

{#if showInvoiceForm}
  <div class="form-card">
    <h3 class="form-card__t">Nueva factura</h3>
    <div class="fgrid">
      <label class="f">
        <span class="f__lbl">Cliente</span>
        <select class="inp" bind:value={invForm.client_id}>
          <option value="">— selecciona —</option>
          {#each clients as c}<option value={String(c.id)}>{c.client_code} · {c.business_name || c.owner_name || 'sin nombre'}</option>{/each}
        </select>
      </label>
      <label class="f">
        <span class="f__lbl">Monto (USD)</span>
        <input class="inp" type="text" inputmode="decimal" placeholder="1500.00" bind:value={invForm.amount} />
      </label>
      <label class="f">
        <span class="f__lbl">Estado inicial</span>
        <select class="inp" bind:value={invForm.status}>
          {#each INVOICE_STATUSES as s}<option value={s.id}>{s.label}</option>{/each}
        </select>
      </label>
      <label class="f">
        <span class="f__lbl">Emitida</span>
        <input class="inp" type="date" bind:value={invForm.issued_at} />
      </label>
      <label class="f">
        <span class="f__lbl">Vence</span>
        <input class="inp" type="date" bind:value={invForm.due_date} />
      </label>
      <label class="f f--wide">
        <span class="f__lbl">Descripción</span>
        <input class="inp" type="text" placeholder="Landing page, SEO mensual…" bind:value={invForm.description} />
      </label>
    </div>
    <div class="form-card__foot">
      {#if invFormMsg}<span class="msg" class:ok={invFormOk}>{invFormMsg}</span>{/if}
      <span class="spacer"></span>
      <button class="b b--ghost" onclick={() => { showInvoiceForm = false; invFormMsg = ''; }}>Cancelar</button>
      <button class="b b--primary" onclick={submitInvoice}>Crear factura</button>
    </div>
  </div>
{/if}

{#if showClientForm}
  <div class="form-card">
    <h3 class="form-card__t">Nuevo cliente</h3>
    <div class="fgrid">
      <label class="f"><span class="f__lbl">Negocio</span><input class="inp" type="text" bind:value={cliForm.business_name} /></label>
      <label class="f"><span class="f__lbl">Propietario</span><input class="inp" type="text" bind:value={cliForm.owner_name} /></label>
      <label class="f"><span class="f__lbl">Email</span><input class="inp" type="email" bind:value={cliForm.email} /></label>
      <label class="f"><span class="f__lbl">Teléfono</span><input class="inp" type="text" bind:value={cliForm.phone} /></label>
      <label class="f"><span class="f__lbl">Ciudad / Estado</span><input class="inp" type="text" bind:value={cliForm.city_state} /></label>
      <label class="f f--wide"><span class="f__lbl">Notas</span><input class="inp" type="text" bind:value={cliForm.notes} /></label>
    </div>
    <div class="form-card__foot">
      {#if cliFormMsg}<span class="msg" class:ok={cliFormOk}>{cliFormMsg}</span>{/if}
      <span class="spacer"></span>
      <button class="b b--ghost" onclick={() => { showClientForm = false; cliFormMsg = ''; }}>Cancelar</button>
      <button class="b b--primary" onclick={submitClient}>Crear cliente</button>
    </div>
  </div>
{/if}

{#if showConvertForm}
  <div class="form-card">
    <h3 class="form-card__t">Convertir brief en cliente</h3>
    <p class="form-card__hint">Escribe el ID de un brief existente (MRC-XXX). Copiamos negocio, contacto y ciudad a un nuevo cliente.</p>
    <div class="fgrid">
      <label class="f"><span class="f__lbl">ID del brief</span><input class="inp" type="text" placeholder="MRC-001" bind:value={convBrief} /></label>
    </div>
    <div class="form-card__foot">
      {#if convMsg}<span class="msg" class:ok={convOk}>{convMsg}</span>{/if}
      <span class="spacer"></span>
      <button class="b b--ghost" onclick={() => { showConvertForm = false; convMsg = ''; }}>Cancelar</button>
      <button class="b b--primary" onclick={submitConvert}>Convertir</button>
    </div>
  </div>
{/if}

<!-- ═══ Filtros + búsqueda ═══ -->
<div class="chips">
  {#each INV_FILTERS as f}
    <button class="chip" class:on={invFilter === f.id} onclick={() => setInvFilter(f.id)}>{f.label}</button>
  {/each}
</div>

<input class="search" type="search" placeholder="Buscar por factura, cliente, código…" oninput={onSearchInput} />

<!-- ═══ Tabla de facturas ═══ -->
{#if loading}
  <div class="empty">Cargando…</div>
{:else if error}
  <div class="empty err">{error}</div>
{:else if invoices.length === 0}
  <div class="empty">Sin facturas que coincidan. Crea una con “+ Factura”.</div>
{:else}
  <div class="table-wrap">
    <table class="table">
      <thead><tr><th>Factura</th><th>Cliente</th><th>Monto</th><th>Saldo</th><th>Vence</th><th>Estado</th><th></th></tr></thead>
      <tbody>
        {#each invoices as inv (inv.id)}
          <tr>
            <td class="mono gold">{inv.invoice_number}</td>
            <td class="t-name">{inv.client_name || inv.client_code || '—'}</td>
            <td class="mono">{fmtUsd(inv.amount_cents)}</td>
            <td class="mono" class:teal={Number(inv.balance_cents) <= 0} class:gold={Number(inv.balance_cents) > 0}>{fmtUsd(inv.balance_cents)}</td>
            <td class="mono dim">{inv.due_date ? fmtDate(inv.due_date) : '—'}</td>
            <td>
              <select class="status status--{inv.status}" value={inv.status} onchange={(e) => setInvoiceStatus(inv, e.currentTarget.value)}>
                {#each INVOICE_STATUSES as s}<option value={s.id}>{s.label}</option>{/each}
              </select>
            </td>
            <td class="t-act">
              {#if inv.status !== 'paid' && inv.status !== 'void' && Number(inv.balance_cents) > 0}
                <button class="b b--mini b--primary" onclick={() => openPay(inv)}>+ Pago</button>
              {:else if inv.status === 'paid'}
                <span class="paid-tick">✓ pagada</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  {#if invTotal > LIMIT}
    <div class="pager">
      <span class="dim mono">{invOffset + 1}–{Math.min(invOffset + LIMIT, invTotal)} de {invTotal}</span>
      <span>
        <button class="b b--ghost" disabled={invOffset === 0} onclick={prevPage}>‹ Anterior</button>
        <button class="b b--ghost" disabled={invOffset + LIMIT >= invTotal} onclick={nextPage}>Siguiente ›</button>
      </span>
    </div>
  {/if}
{/if}

<!-- ═══ Modal: registrar pago ═══ -->
{#if payInvoice}
  <div class="backdrop" onclick={(e) => { if (e.target === e.currentTarget) closePay(); }}>
    <div class="modal">
      <h3 class="modal__t">Registrar pago</h3>
      <p class="modal__b">
        Factura <strong>{payInvoice.invoice_number}</strong> · {payInvoice.client_name || ''}<br />
        Total {fmtUsd(payInvoice.amount_cents)} · Saldo <strong>{fmtUsd(payInvoice.balance_cents)}</strong>
      </p>
      <div class="fgrid">
        <label class="f"><span class="f__lbl">Monto (USD)</span><input class="inp" type="text" inputmode="decimal" bind:value={payForm.amount} /></label>
        <label class="f">
          <span class="f__lbl">Método</span>
          <select class="inp" bind:value={payForm.method}>{#each PAYMENT_METHODS as m}<option value={m.id}>{m.label}</option>{/each}</select>
        </label>
        <label class="f"><span class="f__lbl">Fecha</span><input class="inp" type="date" bind:value={payForm.paid_at} /></label>
        <label class="f"><span class="f__lbl">Referencia</span><input class="inp" type="text" placeholder="# de confirmación" bind:value={payForm.reference} /></label>
      </div>
      {#if payMsg}<div class="msg" class:ok={payOk}>{payMsg}</div>{/if}
      <div class="modal__act">
        <button class="b b--ghost" onclick={closePay}>Cancelar</button>
        <button class="b b--primary" disabled={paying} onclick={submitPayment}>{paying ? 'Registrando…' : 'Registrar pago'}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .sec-head { display: flex; align-items: center; justify-content: space-between; }
  .greet { font-family: var(--font-display); font-weight: 700; font-size: var(--text-xl); letter-spacing: var(--tracking-tight); margin: var(--space-5) 0 var(--space-4); }

  /* KPIs */
  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--space-3); }
  .kpi { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-4); display: flex; flex-direction: column; gap: 4px; }
  .kpi__lbl { font-family: var(--font-mono); font-size: 10px; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--fg-secondary); }
  .kpi__num { font-family: var(--font-display); font-weight: 700; font-size: var(--text-xl); line-height: 1; letter-spacing: var(--tracking-tight); color: var(--fg-primary); }
  .kpi__num.gold { color: var(--accent-gold); }
  .kpi__num.teal { color: var(--accent-teal); }
  .kpi__num.danger { color: var(--color-error); }
  .kpi__hint { font-family: var(--font-mono); font-size: 10px; color: var(--fg-subtle); }

  /* Panel + chart */
  .panel { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-4) var(--space-5); margin-top: var(--space-3); }
  .panel__lbl { font-family: var(--font-mono); font-size: 10px; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--fg-secondary); margin-bottom: var(--space-4); }
  .panel__sub { color: var(--fg-subtle); margin-left: 6px; }
  .muted { color: var(--fg-subtle); font-size: var(--text-sm); font-style: italic; padding: var(--space-4) 0; }
  .chart { width: 100%; height: auto; display: block; }
  .chart__lbl { fill: var(--fg-subtle); font-family: var(--font-mono); font-size: 11px; }
  .chart__val { fill: var(--fg-secondary); font-family: var(--font-mono); font-size: 10px; }

  /* Acciones */
  .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: var(--space-4); }

  /* Form cards */
  .form-card { background: var(--bg-card); border: 1px solid var(--accent-gold-line); border-radius: var(--radius-lg); padding: var(--space-4) var(--space-5); margin-top: var(--space-3); }
  .form-card__t { font-family: var(--font-display); font-weight: 700; font-size: var(--text-md); color: var(--fg-primary); margin: 0 0 var(--space-3); }
  .form-card__hint { font-size: var(--text-sm); color: var(--fg-secondary); margin: 0 0 var(--space-3); line-height: 1.5; }
  .fgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px 16px; }
  .f { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .f--wide { grid-column: 1 / -1; }
  .f__lbl { font-family: var(--font-mono); font-size: 9px; letter-spacing: .15em; text-transform: uppercase; color: var(--accent-gold); }
  .form-card__foot { display: flex; align-items: center; gap: 8px; margin-top: var(--space-4); }
  .spacer { flex: 1; }

  .inp { width: 100%; padding: 9px 12px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--fg-primary); font-family: var(--font-body); font-size: var(--text-sm); outline: none; }
  .inp:focus { border-color: var(--accent-gold); }

  /* Chips + search */
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin: var(--space-5) 0 var(--space-3); }
  .chip { display: inline-flex; align-items: center; padding: 6px 12px; border: 1px solid var(--border); border-radius: var(--radius-pill); background: transparent; color: var(--fg-secondary); font-family: var(--font-mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; cursor: pointer; transition: all var(--duration-fast); }
  .chip:hover { border-color: var(--accent-gold); color: var(--fg-primary); }
  .chip.on { background: var(--accent-gold-dim); border-color: var(--accent-gold); color: var(--accent-gold); }
  .search { width: 100%; padding: 10px 14px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--fg-primary); font-size: var(--text-base); outline: none; margin-bottom: var(--space-4); }
  .search:focus { border-color: var(--accent-gold); }

  /* Tabla */
  .table-wrap { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
  .table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
  .table th { text-align: left; font-family: var(--font-mono); font-size: 10px; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--fg-subtle); padding: 12px 14px; border-bottom: 1px solid var(--border); white-space: nowrap; }
  .table td { padding: 12px 14px; border-bottom: 1px solid var(--border-subtle); color: var(--fg-secondary); vertical-align: middle; }
  .table tr:last-child td { border-bottom: 0; }
  .mono { font-family: var(--font-mono); font-size: var(--text-xs); }
  .gold { color: var(--accent-gold); }
  .teal { color: var(--accent-teal); }
  .dim { color: var(--fg-subtle); white-space: nowrap; }
  .t-name { color: var(--fg-primary); }
  .t-act { text-align: right; white-space: nowrap; }
  .paid-tick { font-family: var(--font-mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--accent-teal); }

  .status { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--fg-primary); padding: 6px 8px; font-size: var(--text-xs); cursor: pointer; }
  .status:focus { outline: none; border-color: var(--accent-gold); }
  .status--paid { color: var(--accent-teal); }
  .status--partial { color: #dfc08a; }
  .status--overdue { color: var(--color-error); }
  .status--void { color: var(--fg-subtle); }

  .pager { display: flex; align-items: center; justify-content: space-between; margin-top: var(--space-4); font-size: 11px; }

  .empty { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-6); text-align: center; color: var(--fg-secondary); font-style: italic; }
  .empty.err { color: var(--color-error); font-style: normal; }

  /* Botones */
  .b { display: inline-flex; align-items: center; justify-content: center; gap: 5px; border-radius: var(--radius-md); padding: 9px 14px; font-family: var(--font-mono); font-size: 9px; letter-spacing: .12em; text-transform: uppercase; cursor: pointer; border: 1px solid var(--border); background: transparent; color: var(--fg-secondary); transition: all var(--duration-fast); }
  .b:hover:not(:disabled) { border-color: var(--accent-gold); color: var(--fg-primary); }
  .b--primary { background: var(--accent-gold); border-color: var(--accent-gold); color: var(--fg-inverse); font-weight: 700; }
  .b--primary:hover:not(:disabled) { background: #dabd86; }
  .b--mini { padding: 5px 9px; }
  .b:disabled { opacity: .5; cursor: not-allowed; }

  .msg { font-family: var(--font-mono); font-size: 10px; color: var(--color-error); }
  .msg.ok { color: var(--accent-teal); }

  /* Modal */
  .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.7); display: flex; align-items: center; justify-content: center; z-index: 100; padding: var(--space-4); }
  .modal { width: 100%; max-width: 520px; background: var(--bg-card); border: 1px solid var(--border-accent); border-radius: var(--radius-lg); padding: var(--space-5); }
  .modal__t { font-family: var(--font-display); font-weight: 700; font-size: var(--text-lg); color: var(--fg-primary); margin: 0 0 10px; }
  .modal__b { color: var(--fg-secondary); font-size: var(--text-sm); line-height: 1.6; margin: 0 0 var(--space-4); }
  .modal__b strong { color: var(--accent-gold); }
  .modal__act { display: flex; justify-content: flex-end; gap: 8px; margin-top: var(--space-4); }

  @media (max-width: 720px) { .fgrid { grid-template-columns: 1fr; } }
</style>
