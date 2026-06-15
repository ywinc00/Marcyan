<script>
  import { onMount } from 'svelte';
  import BrandLogo from './BrandLogo.svelte';
  import KpiArt from './KpiArt.svelte';

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
  // USD compacto para los tips del gráfico (p. ej. $4.1K).
  function fmtUsdShort(cents) {
    const n = Number(cents || 0) / 100;
    if (n >= 1000) return '$' + (n / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 }) + 'K';
    return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  // USD SIN centavos para los números grandes de los KPI (5 tarjetas angostas) —
  // así el monto no se corta con "…"; el detalle al centavo vive en las tablas.
  function fmtUsd0(cents) {
    return (Number(cents || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
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

  const SUB_CYCLES = [{ id: 'monthly', label: 'Mensual' }, { id: 'yearly', label: 'Anual' }];
  function cycleLabel(c) { return (SUB_CYCLES.find((x) => x.id === c) || {}).label || c; }

  // Monograma de cliente (iniciales) — para la tabla de facturas estilo Orbit.
  function initials(s) {
    const t = (s || '').trim();
    if (!t) return '·';
    const parts = t.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  const MONO_PALETTE = ['#6366f1', '#0ea5e9', '#14b8a6', '#f97316', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b'];
  function monoColor(s) {
    let h = 0; const str = s || '?';
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return MONO_PALETTE[Math.abs(h) % MONO_PALETTE.length];
  }

  // ── Estado: resumen / KPIs ───────────────────────────────────
  let summary = $state(null);
  const revenue = $derived(summary ? summary.revenue_by_month : []);
  const chartMax = $derived(Math.max(1, ...revenue.map((r) => Math.max(0, +r.total_cents || 0))));
  // Gastos del mes = gastos puntuales + run-rate mensual de suscripciones.
  const expensesMonthCents = $derived(
    summary ? (Number(summary.expenses_this_month_cents || 0) + Number(summary.subscriptions_monthly_cents || 0)) : 0,
  );
  // Delta del último mes vs el anterior (para el chart + KPI cobrado).
  const revDelta = $derived.by(() => {
    if (revenue.length < 2) return null;
    const last = Number(revenue[revenue.length - 1].total_cents || 0);
    const prev = Number(revenue[revenue.length - 2].total_cents || 0);
    if (prev <= 0) return null;
    return Math.round(((last - prev) / prev) * 100);
  });

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

  // ── Estado: egresos (gastos + suscripciones) ─────────────────
  let expenses = $state([]);
  let expForm = $state({ label: '', category: '', amount: '', spent_at: todayISO(), vendor: '' });
  let expMsg = $state(''); let expOk = $state(false); let expBusy = $state(false);
  let showExpForm = $state(false);

  let subs = $state([]);
  let subForm = $state({ name: '', category: '', amount: '', cycle: 'monthly', next_charge_at: '' });
  let subMsg = $state(''); let subOk = $state(false); let subBusy = $state(false);
  let showSubForm = $state(false);

  // Run-rate mensual de suscripciones activas (yearly→/12), calculado en cliente
  // para reflejar toggles al instante; el summary lo confirma tras refresh.
  const subsMonthlyCents = $derived(
    subs.filter((s) => s.active).reduce((acc, s) => {
      const c = Number(s.amount_cents || 0);
      return acc + (s.cycle === 'yearly' ? Math.round(c / 12) : c);
    }, 0),
  );
  const subsActiveCount = $derived(subs.filter((s) => s.active).length);
  const expensesThisMonthCents = $derived(summary ? Number(summary.expenses_this_month_cents || 0) : 0);

  // ── Gráfico interactivo: estado de hover ─────────────────────
  let hoverIdx = $state(-1);
  const hasRevenue = $derived(revenue.length > 0);
  // Geometría del gráfico (coordenadas internas del viewBox).
  // CW/CH = lienzo; TOP/BASE delimitan el área de trazado (PLOT alto útil).
  const CW = 560, CH = 200, TOP = 38, BASE = 160, PLOT = BASE - TOP; // alto útil = 122
  const BAR_MAX = 56;      // ancho máx de barra (à la Orbit: bars no se ensanchan)
  function bandW() { return CW / Math.max(1, revenue.length); }
  // Ancho real de la barra: 50% del band, pero acotado a BAR_MAX para que
  // 1-2 meses no produzcan losas anchas (datos escasos lucen intencionales).
  function barW() { return Math.min(bandW() * 0.5, BAR_MAX); }
  function barCx(i) { return i * bandW() + bandW() / 2; }
  function barX(i) { return barCx(i) - barW() / 2; }
  // Altura de barra; chartMax >= 1 evita división por cero / NaN con 0 datos.
  function barH(c) { return Math.max(0, (Number(c || 0) / chartMax) * PLOT); }
  function barY(c) { return BASE - barH(c); }
  function onChartMove(e) {
    if (!hasRevenue) return;
    const svg = e.currentTarget;
    const r = svg.getBoundingClientRect();
    if (!r.width) return;
    const x = ((e.clientX - r.left) / r.width) * CW;
    const i = Math.floor(x / bandW());
    hoverIdx = (i >= 0 && i < revenue.length) ? i : -1;
  }
  function onChartLeave() { hoverIdx = -1; }
  // Índice activo del gráfico: el hover gana; si no, el último mes.
  // Acotado a [0, len-1] para no salir de rango con datos escasos.
  const activeIdx = $derived(
    !hasRevenue ? -1 : (hoverIdx >= 0 ? hoverIdx : revenue.length - 1),
  );
  const activeRow = $derived(activeIdx >= 0 ? revenue[activeIdx] : null);

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
  async function loadExpenses() {
    try { const r = await api('/api/admin/expenses?limit=100'); const j = await r.json(); if (j.ok) expenses = j.rows || []; } catch (_) {}
  }
  async function loadSubs() {
    try { const r = await api('/api/admin/subscriptions'); const j = await r.json(); if (j.ok) subs = j.rows || []; } catch (_) {}
  }
  function setInvFilter(s) { invFilter = s; invOffset = 0; loadInvoices(); }
  function onSearchInput(e) {
    invSearch = e.currentTarget.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { invOffset = 0; loadInvoices(); }, 300);
  }
  function nextPage() { if (invOffset + LIMIT < invTotal) { invOffset += LIMIT; loadInvoices(); } }
  function prevPage() { if (invOffset > 0) { invOffset = Math.max(0, invOffset - LIMIT); loadInvoices(); } }

  function refreshAll() { loadSummary(); loadInvoices(); loadClients(); loadExpenses(); loadSubs(); }

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
      cliFormOk = true; cliFormMsg = `${j.client.client_code} creado`;
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
      convOk = true; convMsg = `${j.client.client_code} — ${j.client.business_name || 'cliente'}`;
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
      invFormOk = true; invFormMsg = `${j.invoice.invoice_number} creada`;
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
      payOk = true; payMsg = 'Pago registrado';
      await loadInvoices(); await loadSummary();
      setTimeout(() => { payInvoice = null; payMsg = ''; }, 900);
    } catch (e) { payOk = false; payMsg = e.message || 'Error al registrar'; }
    finally { paying = false; }
  }

  // ── Gastos de empresa ────────────────────────────────────────
  async function submitExpense() {
    const label = expForm.label.trim();
    if (!label) { expOk = false; expMsg = 'Escribe una etiqueta'; return; }
    const cents = dollarsToCents(expForm.amount);
    if (cents <= 0) { expOk = false; expMsg = 'El monto debe ser mayor a 0'; return; }
    expBusy = true; expMsg = 'Guardando…'; expOk = false;
    try {
      const r = await api('/api/admin/expenses', { method: 'POST', body: JSON.stringify({
        label,
        category: expForm.category || null,
        amount_cents: cents,
        spent_at: expForm.spent_at || null,
        vendor: expForm.vendor || null,
      }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Error');
      expOk = true; expMsg = 'Gasto añadido';
      expForm = { label: '', category: '', amount: '', spent_at: todayISO(), vendor: '' };
      await loadExpenses(); await loadSummary();
      setTimeout(() => { expMsg = ''; showExpForm = false; }, 1200);
    } catch (e) { expOk = false; expMsg = e.message || 'Error al guardar'; }
    finally { expBusy = false; }
  }
  async function deleteExpense(exp) {
    const prev = expenses;
    expenses = expenses.filter((e) => e.id !== exp.id);
    try {
      const r = await api('/api/admin/expenses/' + exp.id, { method: 'DELETE' });
      const j = await r.json();
      if (!j.ok) throw new Error();
      await loadSummary();
    } catch (_) { expenses = prev; }
  }

  // ── Suscripciones ────────────────────────────────────────────
  async function submitSub() {
    const name = subForm.name.trim();
    if (!name) { subOk = false; subMsg = 'Escribe un nombre'; return; }
    const cents = dollarsToCents(subForm.amount);
    if (cents <= 0) { subOk = false; subMsg = 'El monto debe ser mayor a 0'; return; }
    subBusy = true; subMsg = 'Guardando…'; subOk = false;
    try {
      const r = await api('/api/admin/subscriptions', { method: 'POST', body: JSON.stringify({
        name,
        category: subForm.category || null,
        amount_cents: cents,
        cycle: subForm.cycle,
        next_charge_at: subForm.next_charge_at || null,
      }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Error');
      subOk = true; subMsg = 'Suscripción añadida';
      subForm = { name: '', category: '', amount: '', cycle: 'monthly', next_charge_at: '' };
      await loadSubs(); await loadSummary();
      setTimeout(() => { subMsg = ''; showSubForm = false; }, 1200);
    } catch (e) { subOk = false; subMsg = e.message || 'Error al guardar'; }
    finally { subBusy = false; }
  }
  async function toggleSub(sub) {
    const prev = sub.active;
    sub.active = !sub.active; subs = [...subs];
    try {
      const r = await api('/api/admin/subscriptions/' + sub.id, { method: 'PATCH', body: JSON.stringify({ active: sub.active }) });
      const j = await r.json();
      if (!j.ok) throw new Error();
      await loadSummary();
    } catch (_) { sub.active = prev; subs = [...subs]; }
  }
  async function deleteSub(sub) {
    const prev = subs;
    subs = subs.filter((s) => s.id !== sub.id);
    try {
      const r = await api('/api/admin/subscriptions/' + sub.id, { method: 'DELETE' });
      const j = await r.json();
      if (!j.ok) throw new Error();
      await loadSummary();
    } catch (_) { subs = prev; }
  }

  onMount(() => { refreshAll(); });
</script>

<!-- ═══ Encabezado ═══ -->
<div class="sec-head">
  <h1 class="greet">Finanzas</h1>
  <button class="b b--ghost" onclick={refreshAll}>Actualizar</button>
</div>

<!-- ═══ KPIs — tarjetas Orbit con arte 3D de esquina + delta ═══ -->
<div class="kpis">
  <!-- Cobrado (mes) -->
  <div class="kpi">
    <span class="kpi__lbl">Cobrado (mes)</span>
    <div class="kpi__row">
      <span class="kpi__num teal">{summary ? fmtUsd0(summary.collected_this_month_cents) : '—'}</span>
      <KpiArt kind="coins" size={52} />
    </div>
    <p class="kpi__delta">
      {#if revDelta !== null}
        <span class:up={revDelta >= 0} class:down={revDelta < 0}>{revDelta >= 0 ? '+' : ''}{revDelta}%</span>
        <span class="dimtxt">vs mes anterior</span>
      {:else}<span class="dimtxt">pagos recibidos</span>{/if}
    </p>
  </div>

  <!-- Por cobrar -->
  <div class="kpi">
    <span class="kpi__lbl">Por cobrar</span>
    <div class="kpi__row">
      <span class="kpi__num gold">{summary ? fmtUsd0(summary.ar_total_cents) : '—'}</span>
      <KpiArt kind="invoice" size={52} />
    </div>
    <p class="kpi__delta">
      {#if summary}<span class="dimtxt">{summary.counts ? summary.counts.open_invoices : 0} factura{summary.counts && summary.counts.open_invoices === 1 ? '' : 's'} abiertas</span>{:else}<span class="dimtxt">cuentas por cobrar</span>{/if}
    </p>
  </div>

  <!-- Vencido -->
  <div class="kpi">
    <span class="kpi__lbl">Vencido</span>
    <div class="kpi__row">
      <span class="kpi__num" class:danger={summary && summary.overdue_cents > 0}>{summary ? fmtUsd0(summary.overdue_cents) : '—'}</span>
      <KpiArt kind="alert" size={52} />
    </div>
    <p class="kpi__delta">
      {#if summary && summary.overdue_count > 0}<span class="down">{summary.overdue_count} factura{summary.overdue_count === 1 ? '' : 's'}</span> <span class="dimtxt">requieren atención</span>{:else}<span class="up">al día</span> <span class="dimtxt">sin vencidos</span>{/if}
    </p>
  </div>

  <!-- Gastos (mes) -->
  <div class="kpi">
    <span class="kpi__lbl">Gastos (mes)</span>
    <div class="kpi__row">
      <span class="kpi__num">{summary ? fmtUsd0(expensesMonthCents) : '—'}</span>
      <KpiArt kind="card" size={52} />
    </div>
    <p class="kpi__delta">
      {#if summary}<span class="dimtxt">{fmtUsd(summary.subscriptions_monthly_cents)} en subs/mes</span>{:else}<span class="dimtxt">gastos + subs</span>{/if}
    </p>
  </div>

  <!-- Neto (mes) -->
  <div class="kpi">
    <span class="kpi__lbl">Neto (mes)</span>
    <div class="kpi__row">
      <span class="kpi__num"
        class:teal={summary && summary.net_this_month_cents >= 0}
        class:danger={summary && summary.net_this_month_cents < 0}>{summary ? fmtUsd0(summary.net_this_month_cents) : '—'}</span>
      <KpiArt kind="chart-up" size={52} />
    </div>
    <p class="kpi__delta">
      {#if summary}<span class:up={summary.net_this_month_cents >= 0} class:down={summary.net_this_month_cents < 0}>{summary.net_this_month_cents >= 0 ? 'positivo' : 'negativo'}</span> <span class="dimtxt">cobrado − egresos</span>{:else}<span class="dimtxt">cobrado − egresos</span>{/if}
    </p>
  </div>
</div>

<!-- ═══ Gráfico de ingresos por mes (SVG interactivo a mano) ═══ -->
<div class="panel chart-panel">
  <div class="chart-head">
    <div>
      <div class="panel__lbl">Ingresos por mes <span class="panel__sub">por fecha de pago</span></div>
      {#if summary}
        <div class="chart-amount">{fmtUsd(activeRow ? activeRow.total_cents : 0)}</div>
        <div class="chart-sub">
          {#if activeRow}<span class="cap">{monthLabel(activeRow.month)}</span>{/if}
          {#if revDelta !== null && activeIdx === revenue.length - 1}
            <span class:up={revDelta >= 0} class:down={revDelta < 0}>{revDelta >= 0 ? '+' : ''}{revDelta}%</span> <span class="dimtxt">vs mes anterior</span>
          {/if}
        </div>
      {/if}
    </div>
    <div class="legend"><span class="legend__dot"></span> mes activo</div>
  </div>

  {#if !summary}
    <div class="muted">Cargando…</div>
  {:else if !hasRevenue}
    <div class="chart-empty">
      <KpiArt kind="chart-up" size={44} />
      <div class="chart-empty__txt">
        <div class="chart-empty__title">Aún no hay ingresos registrados</div>
        <div class="chart-empty__sub">Registra un pago en una factura y aparecerá aquí.</div>
      </div>
    </div>
  {:else}
    <div class="chart-wrap">
      <svg
        class="chart"
        viewBox="0 0 {CW} {CH}"
        role="img"
        aria-label="Ingresos por mes"
        onmousemove={onChartMove}
        onmouseleave={onChartLeave}>
        <defs>
          <linearGradient id="finBarActive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#fb923c" /><stop offset="1" stop-color="#ea580c" />
          </linearGradient>
          <filter id="finBarGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="rgb(249, 115, 22)" flood-opacity="0.55" />
          </filter>
        </defs>

        <!-- gridlines punteadas + etiquetas de eje Y -->
        {#each [0, 1, 2, 3] as g}
          {@const gy = TOP + (PLOT / 3) * g}
          <line x1="0" y1={gy} x2={CW} y2={gy} class={g === 3 ? 'chart__base' : 'chart__grid'} />
          <text x="2" y={gy - 5} class="chart__axis">{fmtUsdShort(chartMax - (chartMax / 3) * g)}</text>
        {/each}

        <!-- guía punteada horizontal al valor activo -->
        {#if activeRow}
          {@const ay = barY(activeRow.total_cents)}
          <line x1="0" y1={ay} x2={CW} y2={ay} class="chart__guide" />
        {/if}

        <!-- barras redondeadas (la activa: gradiente naranja + glow) -->
        {#each revenue as a, i}
          {@const active = i === activeIdx}
          <rect
            x={barX(i)}
            y={barY(a.total_cents)}
            width={barW()}
            height={barH(a.total_cents)}
            rx="7"
            fill={active ? 'url(#finBarActive)' : '#2b2b33'}
            filter={active ? 'url(#finBarGlow)' : undefined}
            class="chart__bar" />
          <text x={barCx(i)} y={CH - 5} text-anchor="middle" class="chart__lbl" class:is-active={active}>{monthLabel(a.month)}</text>
        {/each}

        <!-- punto en el valor activo -->
        {#if activeRow}
          <circle cx={barCx(activeIdx)} cy={barY(activeRow.total_cents)} r="4" fill="var(--accent-gold)" stroke="var(--bg-card)" stroke-width="2.5" />
        {/if}
      </svg>

      <!-- tooltip flotante (primitiva global .chart-tip) -->
      {#if activeRow}
        <span
          class="chart-tip"
          style="left:{(barCx(activeIdx) / CW) * 100}%;top:{(barY(activeRow.total_cents) / CH) * 100}%">{fmtUsd(activeRow.total_cents)}</span>
      {/if}
    </div>
  {/if}
</div>

<!-- ═══ Facturas — encabezado + acciones de alta ═══ -->
<div class="block-head">
  <h2 class="block-head__t">Facturas <span class="dimtxt">{invTotal} en total</span></h2>
  <div class="actions">
    <button class="b b--primary b--mini" onclick={() => { showInvoiceForm = !showInvoiceForm; showClientForm = false; showConvertForm = false; }}>+ Factura</button>
    <button class="b b--mini" onclick={() => { showClientForm = !showClientForm; showInvoiceForm = false; showConvertForm = false; }}>+ Cliente</button>
    <button class="b b--mini" onclick={() => { showConvertForm = !showConvertForm; showInvoiceForm = false; showClientForm = false; }}>Brief → Cliente</button>
  </div>
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

<!-- ═══ Tabla de facturas (filas Orbit con monograma) ═══ -->
{#if loading}
  <div class="empty">Cargando…</div>
{:else if error}
  <div class="empty err">{error}</div>
{:else if invoices.length === 0}
  <div class="empty">
    <div class="empty__title">Sin facturas que coincidan</div>
    <div class="empty__sub">Crea una con “+ Factura”.</div>
  </div>
{:else}
  <div class="table-wrap">
    <table class="table">
      <thead><tr><th>Factura</th><th>Cliente</th><th class="num">Monto</th><th class="num">Saldo</th><th>Vence</th><th>Estado</th><th></th></tr></thead>
      <tbody>
        {#each invoices as inv (inv.id)}
          <tr>
            <td class="mono gold">{inv.invoice_number}</td>
            <td>
              <span class="cell-id">
                <span class="mono-avatar" style="background:{monoColor(inv.client_name || inv.client_code || '?')}">{initials(inv.client_name || inv.client_code)}</span>
                <span class="cell-id__txt">
                  <span class="t-name">{inv.client_name || inv.client_code || '—'}</span>
                  {#if inv.client_code && inv.client_name}<span class="sub-meta">{inv.client_code}</span>{/if}
                </span>
              </span>
            </td>
            <td class="mono num">{fmtUsd(inv.amount_cents)}</td>
            <td class="mono num" class:teal={Number(inv.balance_cents) <= 0} class:gold={Number(inv.balance_cents) > 0}>{fmtUsd(inv.balance_cents)}</td>
            <td class="mono dim">{inv.due_date ? fmtDate(inv.due_date) : '—'}</td>
            <td>
              <div class="pill-select pill--{inv.status}">
                <span class="pill__dot"></span>
                <select aria-label="Estado de factura" value={inv.status} onchange={(e) => setInvoiceStatus(inv, e.currentTarget.value)}>
                  {#each INVOICE_STATUSES as s}<option value={s.id}>{s.label}</option>{/each}
                </select>
              </div>
            </td>
            <td class="t-act">
              {#if inv.status !== 'paid' && inv.status !== 'void' && Number(inv.balance_cents) > 0}
                <button class="b b--mini b--primary" onclick={() => openPay(inv)}>+ Pago</button>
              {:else if inv.status === 'paid'}
                <span class="paid-tick">pagada</span>
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

<!-- ═══ Egresos y suscripciones ═══ -->
<div class="egresos">
  <!-- (a) Gastos de empresa -->
  <div class="panel egresos__col">
    <div class="panel__lbl">
      Gastos de empresa <span class="panel__sub">puntuales</span>
      <span class="panel__total">{fmtUsd(expensesThisMonthCents)} este mes</span>
    </div>

    <div class="mini-add">
      <button class="b b--mini b--ghost" onclick={() => { showExpForm = !showExpForm; }}>{showExpForm ? 'Cerrar' : '+ Gasto'}</button>
    </div>
    {#if showExpForm}
      <div class="inline-form">
        <input class="inp" type="text" placeholder="Concepto (p. ej. dominio)" bind:value={expForm.label} />
        <input class="inp inp--sm" type="text" placeholder="Categoría" bind:value={expForm.category} />
        <input class="inp inp--sm" type="text" inputmode="decimal" placeholder="$ USD" bind:value={expForm.amount} />
        <input class="inp inp--sm" type="date" bind:value={expForm.spent_at} />
        <input class="inp inp--sm" type="text" placeholder="Vendor" bind:value={expForm.vendor} />
        <button class="b b--primary b--mini" disabled={expBusy} onclick={submitExpense}>Guardar</button>
      </div>
      {#if expMsg}<div class="msg msg--inline" class:ok={expOk}>{expMsg}</div>{/if}
    {/if}

    {#if expenses.length === 0}
      <div class="mini-empty">Aún no hay gastos registrados.</div>
    {:else}
      <div class="table-wrap table-wrap--flush">
        <table class="table">
          <thead><tr><th>Concepto</th><th>Categoría</th><th class="num">Monto</th><th>Fecha</th><th></th></tr></thead>
          <tbody>
            {#each expenses as exp (exp.id)}
              <tr>
                <td class="t-name">{exp.label}{#if exp.vendor}<span class="sub-meta"> · {exp.vendor}</span>{/if}</td>
                <td>{#if exp.category}<span class="tag">{exp.category}</span>{:else}<span class="dim">—</span>{/if}</td>
                <td class="mono num">{fmtUsd(exp.amount_cents)}</td>
                <td class="mono dim">{fmtDate(exp.spent_at)}</td>
                <td class="t-act"><button class="icon-del" title="Eliminar gasto" aria-label="Eliminar gasto" onclick={() => deleteExpense(exp)}>×</button></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  <!-- (b) Suscripciones — destacando los logos de marca -->
  <div class="panel egresos__col">
    <div class="panel__lbl">
      Suscripciones <span class="panel__sub">SaaS recurrentes</span>
      <span class="panel__total">{fmtUsd(subsMonthlyCents)}/mes activas</span>
    </div>

    <!-- titular run-rate -->
    <div class="subs-headline">
      <div>
        <span class="subs-headline__num">{fmtUsd(subsMonthlyCents)}</span>
        <span class="subs-headline__unit">/ mes</span>
      </div>
      <span class="subs-headline__meta">{subsActiveCount} activa{subsActiveCount === 1 ? '' : 's'} · {fmtUsd(subsMonthlyCents * 12)}/año</span>
    </div>

    <div class="mini-add">
      <button class="b b--mini b--ghost" onclick={() => { showSubForm = !showSubForm; }}>{showSubForm ? 'Cerrar' : '+ Suscripción'}</button>
    </div>
    {#if showSubForm}
      <div class="inline-form">
        <input class="inp" type="text" placeholder="Servicio (p. ej. Vercel)" bind:value={subForm.name} />
        <input class="inp inp--sm" type="text" placeholder="Categoría" bind:value={subForm.category} />
        <input class="inp inp--sm" type="text" inputmode="decimal" placeholder="$ USD" bind:value={subForm.amount} />
        <select class="inp inp--sm" bind:value={subForm.cycle}>{#each SUB_CYCLES as c}<option value={c.id}>{c.label}</option>{/each}</select>
        <input class="inp inp--sm" type="date" title="Próximo cargo" bind:value={subForm.next_charge_at} />
        <button class="b b--primary b--mini" disabled={subBusy} onclick={submitSub}>Guardar</button>
      </div>
      {#if subMsg}<div class="msg msg--inline" class:ok={subOk}>{subMsg}</div>{/if}
    {/if}

    {#if subs.length === 0}
      <div class="mini-empty">Aún no hay suscripciones.</div>
    {:else}
      <div class="sub-list">
        {#each subs as sub (sub.id)}
          <div class="sub-row" class:row-off={!sub.active}>
            <BrandLogo name={sub.name} size={26} />
            <div class="sub-row__main">
              <span class="sub-row__name">{sub.name}</span>
              <span class="sub-row__meta">
                {#if sub.category}<span class="tag tag--xs">{sub.category}</span>{/if}
                <span class="dim">próx. {sub.next_charge_at ? fmtDate(sub.next_charge_at) : '—'}</span>
              </span>
            </div>
            <div class="sub-row__price">
              <span class="mono">{fmtUsd(sub.amount_cents)}</span>
              <span class="cycle-pill">{cycleLabel(sub.cycle)}</span>
            </div>
            <button class="toggle" class:on={sub.active} role="switch" aria-checked={sub.active} aria-label="Activar suscripción" onclick={() => toggleSub(sub)}>
              <span class="toggle__knob"></span>
            </button>
            <button class="icon-del" title="Eliminar suscripción" aria-label="Eliminar suscripción" onclick={() => deleteSub(sub)}>×</button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- ═══ Modal: registrar pago ═══ -->
{#if payInvoice}
  <div class="backdrop" role="presentation" tabindex="-1"
       onclick={(e) => { if (e.target === e.currentTarget) closePay(); }}
       onkeydown={(e) => { if (e.key === 'Escape') closePay(); }}>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="pay-modal-title">
      <h3 class="modal__t" id="pay-modal-title">Registrar pago</h3>
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

  .dimtxt { color: var(--fg-subtle); }
  .up { color: var(--accent-teal); font-weight: 600; }
  .down { color: var(--color-error); font-weight: 600; }

  /* KPIs — tarjetas Orbit densas con arte 3D de esquina + delta.
     Proporciones exactas de Orbit: 4 columnas iguales, gap 14px;
     padding 16/16/14; número 36px tight; arte 52px; delta 13px. */
  .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
  .kpi { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 16px 16px 14px; display: flex; flex-direction: column; min-width: 0; }
  .kpi__lbl { margin: 0 0 10px; font-family: var(--font-body); font-weight: 500; font-size: var(--text-sm); color: var(--fg-secondary); }
  .kpi__row { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; }
  .kpi__num { font-family: var(--font-display); font-weight: 700; font-size: var(--text-2xl); line-height: 1; letter-spacing: var(--tracking-tight); color: var(--fg-primary); min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .kpi__num.gold { color: var(--accent-gold); }
  .kpi__num.teal { color: var(--accent-teal); }
  .kpi__num.danger { color: var(--color-error); }
  .kpi__delta { margin: 12px 0 0; font-size: var(--text-sm); }

  /* Responsive: 4→2→1 columnas, igual que el resto del dashboard. */
  @media (max-width: 900px) { .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 460px) { .kpis { grid-template-columns: 1fr; } }

  /* Panel + chart */
  .panel { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-4) var(--space-5); margin-top: var(--space-3); }
  .panel__lbl { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-family: var(--font-body); font-weight: 600; font-size: var(--text-sm); color: var(--fg-secondary); margin-bottom: var(--space-4); }
  .panel__sub { color: var(--fg-subtle); }
  .panel__total { margin-left: auto; color: var(--accent-gold); font-size: 11px; }
  .muted { color: var(--fg-subtle); font-size: var(--text-sm); font-style: italic; padding: var(--space-4) 0; }

  .chart-panel { margin-top: var(--space-4); }
  .chart-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: var(--space-3); }
  .chart-head .panel__lbl { margin-bottom: 8px; }
  .chart-amount { font-family: var(--font-display); font-weight: 700; font-size: var(--text-2xl); letter-spacing: var(--tracking-tight); line-height: 1; color: var(--fg-primary); }
  .chart-sub { margin-top: 6px; font-size: 12px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .chart-sub .cap { text-transform: uppercase; letter-spacing: .06em; font-family: var(--font-mono); font-size: 10px; color: var(--accent-gold); }
  .legend { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--fg-subtle); white-space: nowrap; }
  .legend__dot { width: 9px; height: 9px; border-radius: 3px; background: linear-gradient(180deg, #fb923c, #ea580c); box-shadow: var(--shadow-gold); }

  .chart-wrap { position: relative; }
  .chart { width: 100%; height: auto; display: block; cursor: crosshair; }
  .chart__bar { transition: y .18s ease, height .18s ease, fill .18s ease; }
  .chart__lbl { fill: var(--fg-subtle); font-family: var(--font-mono); font-size: 11px; }
  .chart__lbl.is-active { fill: var(--accent-gold); font-weight: 700; }
  .chart__axis { fill: var(--fg-subtle); font-family: var(--font-mono); font-size: 9px; }
  .chart__grid { stroke: rgba(255, 255, 255, 0.06); stroke-dasharray: 3 4; }
  .chart__base { stroke: rgba(255, 255, 255, 0.12); }
  .chart__guide { stroke: rgba(249, 115, 22, 0.4); stroke-dasharray: 4 4; }

  /* Empty state del chart — alto similar al gráfico para no saltar el layout */
  .chart-empty { display: flex; align-items: center; gap: 14px; min-height: 168px; padding: var(--space-3) var(--space-2); }
  .chart-empty__title { font-weight: 600; font-size: var(--text-sm); color: var(--fg-primary); }
  .chart-empty__sub { font-size: var(--text-xs); color: var(--fg-secondary); margin-top: 3px; }

  /* Encabezado de bloque + acciones */
  .block-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin: 18px 0 var(--space-3); }
  .block-head__t { font-family: var(--font-display); font-weight: 700; font-size: var(--text-md); color: var(--fg-primary); margin: 0; display: flex; align-items: baseline; gap: 8px; }
  .block-head__t .dimtxt { font-family: var(--font-mono); font-size: 11px; font-weight: 400; }
  .actions { display: flex; flex-wrap: wrap; gap: 8px; }

  /* Form cards */
  .form-card { background: var(--bg-card); border: 1px solid var(--accent-gold-line); border-radius: var(--radius-lg); padding: var(--space-4) var(--space-5); margin-top: var(--space-3); }
  .form-card__t { font-family: var(--font-display); font-weight: 700; font-size: var(--text-md); color: var(--fg-primary); margin: 0 0 var(--space-3); }
  .form-card__hint { font-size: var(--text-sm); color: var(--fg-secondary); margin: 0 0 var(--space-3); line-height: 1.5; }
  .fgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px 16px; }
  .f { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .f--wide { grid-column: 1 / -1; }
  .f__lbl { font-family: var(--font-body); font-weight: 500; font-size: var(--text-xs); text-transform: none; color: var(--fg-secondary); }
  .form-card__foot { display: flex; align-items: center; gap: 8px; margin-top: var(--space-4); }
  .spacer { flex: 1; }

  .inp { width: 100%; padding: 9px 12px; background-color: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--fg-primary); font-family: var(--font-body); font-size: var(--text-sm); outline: none; }
  .inp:focus { border-color: var(--accent-gold); }
  .inp--sm { padding: 8px 10px; font-size: var(--text-xs); }
  /* Reserva espacio para el caret del select (la imagen viene del global). */
  select.inp { padding-right: 30px; }
  select.inp--sm { padding-right: 26px; background-position: right 8px center; }

  /* Chips + search */
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin: var(--space-4) 0 var(--space-3); }
  .chip { display: inline-flex; align-items: center; padding: 6px 12px; border: 1px solid var(--border); border-radius: var(--radius-pill); background: transparent; color: var(--fg-secondary); font-family: var(--font-mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; cursor: pointer; transition: all var(--duration-fast); }
  .chip:hover { border-color: var(--accent-gold); color: var(--fg-primary); }
  .chip.on { background: var(--accent-gold-dim); border-color: var(--accent-gold); color: var(--accent-gold); }
  .search { width: 100%; padding: 10px 14px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--fg-primary); font-size: var(--text-base); outline: none; margin-bottom: var(--space-4); }
  .search:focus { border-color: var(--accent-gold); }

  /* Tabla */
  .table-wrap { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
  .table-wrap--flush { border: 0; border-top: 1px solid var(--border-subtle); border-radius: 0; margin-top: var(--space-2); }
  .table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
  .table th { text-align: left; font-family: var(--font-mono); font-size: 10px; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--fg-subtle); padding: 11px 14px; border-bottom: 1px solid var(--border); white-space: nowrap; }
  .table th.num { text-align: right; }
  .table td { padding: 10px 14px; border-bottom: 1px solid var(--border-subtle); color: var(--fg-secondary); vertical-align: middle; }
  .table tbody tr:last-child td { border-bottom: 0; }
  .table tbody tr:hover { background: var(--bg-elevated); }
  .mono { font-family: var(--font-mono); font-size: var(--text-xs); }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .gold { color: var(--accent-gold); }
  .teal { color: var(--accent-teal); }
  .dim { color: var(--fg-subtle); white-space: nowrap; }
  .t-name { color: var(--fg-primary); }
  .sub-meta { color: var(--fg-subtle); font-size: var(--text-xs); }
  .t-act { text-align: right; white-space: nowrap; }
  .paid-tick { font-family: var(--font-mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--accent-teal); }
  .tag { display: inline-block; padding: 2px 8px; border-radius: var(--radius-pill); background: var(--bg-elevated); border: 1px solid var(--border-subtle); color: var(--fg-secondary); font-size: 10px; }
  .tag--xs { padding: 1px 7px; font-size: 9px; }

  /* Celda de identidad con monograma (filas Orbit) */
  .cell-id { display: inline-flex; align-items: center; gap: 9px; min-width: 0; }
  .mono-avatar { width: 28px; height: 28px; flex: 0 0 auto; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: #fff; font-family: var(--font-display); font-weight: 700; font-size: 11px; letter-spacing: -.01em; }
  .cell-id__txt { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
  .cell-id__txt .sub-meta { font-family: var(--font-mono); }

  /* Pill-select de estado (factura) */
  .pill-select { display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px 3px 10px; border-radius: var(--radius-pill); border: 1px solid var(--border); background: var(--bg-elevated); }
  .pill-select .pill__dot { width: 7px; height: 7px; border-radius: 50%; background: var(--fg-subtle); flex: 0 0 auto; }
  .pill-select select { background: transparent; border: 0; outline: none; color: inherit; font-family: var(--font-mono); font-size: 10px; letter-spacing: .04em; cursor: pointer; padding-right: 2px; }
  .pill-select select option { color: var(--fg-primary); background: var(--bg-card); }
  .pill--draft   { color: var(--fg-secondary); border-color: var(--border); }
  .pill--draft   .pill__dot { background: var(--fg-subtle); }
  .pill--sent    { color: var(--accent-gold); border-color: var(--accent-gold-line); background: var(--accent-gold-dim); }
  .pill--sent    .pill__dot { background: var(--accent-gold); }
  .pill--partial { color: var(--accent-gold-hover); border-color: var(--accent-gold-line); background: var(--accent-gold-dim); }
  .pill--partial .pill__dot { background: var(--accent-gold-hover); }
  .pill--paid    { color: var(--accent-teal); border-color: var(--accent-teal-line); background: var(--accent-teal-dim); }
  .pill--paid    .pill__dot { background: var(--accent-teal); }
  .pill--overdue { color: var(--color-error); border-color: rgba(239, 68, 68, .35); background: rgba(239, 68, 68, .12); }
  .pill--overdue .pill__dot { background: var(--color-error); }
  .pill--void    { color: var(--fg-subtle); border-color: var(--border); }
  .pill--void    .pill__dot { background: var(--fg-subtle); }

  .pager { display: flex; align-items: center; justify-content: space-between; margin-top: var(--space-4); font-size: 11px; }

  .empty { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-7) var(--space-6); text-align: center; }
  .empty__title { color: var(--fg-primary); font-weight: 600; font-size: var(--text-sm); }
  .empty__sub { color: var(--fg-secondary); font-size: var(--text-xs); margin-top: 4px; }
  .empty.err { color: var(--color-error); }

  /* Egresos y suscripciones */
  .egresos { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); margin-top: var(--space-4); }
  .egresos__col { margin-top: 0; }
  .mini-add { margin-bottom: 6px; }
  .inline-form { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 4px; }
  .inline-form .inp { flex: 1 1 130px; min-width: 0; }
  .inline-form .inp--sm { flex: 0 1 92px; }
  .mini-empty { color: var(--fg-subtle); font-size: var(--text-xs); padding: var(--space-4) 0 var(--space-2); }
  .row-off { opacity: .5; }
  .cycle-pill { display: inline-block; padding: 1px 7px; border-radius: var(--radius-pill); background: var(--bg-elevated); border: 1px solid var(--border-subtle); color: var(--fg-subtle); font-family: var(--font-mono); font-size: 9px; letter-spacing: .04em; text-transform: uppercase; }

  /* Titular run-rate de suscripciones */
  .subs-headline { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 10px 12px; margin-bottom: var(--space-3); border-radius: var(--radius-md); background: var(--accent-gold-dim); border: 1px solid var(--accent-gold-line); }
  .subs-headline__num { font-family: var(--font-display); font-weight: 700; font-size: var(--text-xl); letter-spacing: var(--tracking-tight); color: var(--accent-gold); }
  .subs-headline__unit { font-size: 12px; color: var(--accent-gold); opacity: .8; }
  .subs-headline__meta { font-family: var(--font-mono); font-size: 10px; color: var(--fg-subtle); }

  /* Lista de suscripciones — filas Orbit con logo de marca */
  .sub-list { display: flex; flex-direction: column; }
  .sub-row { display: flex; align-items: center; gap: 11px; padding: 9px 4px; border-top: 1px solid var(--border-subtle); transition: background var(--duration-fast); border-radius: var(--radius-md); }
  .sub-row:first-child { border-top: 0; }
  .sub-row:hover { background: var(--bg-elevated); }
  .sub-row__main { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
  .sub-row__name { font-size: var(--text-sm); color: var(--fg-primary); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sub-row__meta { display: flex; align-items: center; gap: 7px; font-size: var(--text-xs); }
  .sub-row__price { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex: 0 0 auto; }
  .sub-row__price .mono { color: var(--fg-primary); font-variant-numeric: tabular-nums; }

  /* Toggle de activa */
  .toggle { width: 34px; height: 19px; border-radius: var(--radius-pill); border: 1px solid var(--border); background: var(--bg-elevated); padding: 0; cursor: pointer; position: relative; transition: all var(--duration-fast); flex: 0 0 auto; }
  .toggle__knob { position: absolute; top: 50%; left: 2px; transform: translateY(-50%); width: 13px; height: 13px; border-radius: 50%; background: var(--fg-subtle); transition: all var(--duration-fast); }
  .toggle.on { background: var(--accent-teal-dim); border-color: var(--accent-teal-line); }
  .toggle.on .toggle__knob { left: 16px; background: var(--accent-teal); }

  .icon-del { width: 24px; height: 24px; flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-md); border: 1px solid transparent; background: transparent; color: var(--fg-subtle); font-size: 18px; line-height: 1; cursor: pointer; transition: all var(--duration-fast); }
  .icon-del:hover { color: var(--color-error); border-color: rgba(239, 68, 68, .35); background: rgba(239, 68, 68, .1); }

  /* Botones */
  /* La definición canónica de .b/.b--primary/.b--mini vive en dashboard.css (global). */

  .msg { font-family: var(--font-mono); font-size: 10px; color: var(--color-error); }
  .msg.ok { color: var(--accent-teal); }
  .msg--inline { margin-top: 6px; margin-bottom: 4px; }

  /* Modal */
  .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.7); display: flex; align-items: center; justify-content: center; z-index: 100; padding: var(--space-4); }
  .modal { width: 100%; max-width: 520px; background: var(--bg-card); border: 1px solid var(--border-accent); border-radius: var(--radius-lg); padding: var(--space-5); }
  .modal__t { font-family: var(--font-display); font-weight: 700; font-size: var(--text-lg); color: var(--fg-primary); margin: 0 0 10px; }
  .modal__b { color: var(--fg-secondary); font-size: var(--text-sm); line-height: 1.6; margin: 0 0 var(--space-4); }
  .modal__b strong { color: var(--accent-gold); }
  .modal__act { display: flex; justify-content: flex-end; gap: 8px; margin-top: var(--space-4); }

  @media (max-width: 920px) { .egresos { grid-template-columns: 1fr; } }
  @media (max-width: 720px) { .fgrid { grid-template-columns: 1fr; } }
</style>
