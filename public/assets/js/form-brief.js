/* ════════════════════════════════════════════════════════════════
   MARCYAN — Brief de Cliente · cliente JS
   • Auto-rellena fecha en el header.
   • Recolecta el formulario, agrupa checkboxes en arrays,
     POST a /api/brief y muestra success/error inline.
   ════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Auto fecha ────────────────────────────────────────────────
  const dateInput = document.getElementById('brief-date');
  if (dateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm   = String(today.getMonth() + 1).padStart(2, '0');
    const dd   = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  // ── Submit ────────────────────────────────────────────────────
  const form     = document.getElementById('brief-form');
  const button   = document.getElementById('brief-submit');
  const success  = document.getElementById('brief-success');
  const successId = document.getElementById('brief-success-id');
  const errorBox = document.getElementById('brief-error');
  const errorMsg = document.getElementById('brief-error-msg');

  if (!form) return;

  // Campos cuyo nombre representa un array (checkbox groups).
  const ARRAY_FIELDS = new Set(['pages_required', 'features_required']);

  function collectFormData(formEl) {
    const fd = new FormData(formEl);
    const data = {};
    for (const [key, value] of fd.entries()) {
      if (ARRAY_FIELDS.has(key)) {
        if (!Array.isArray(data[key])) data[key] = [];
        data[key].push(value);
      } else {
        data[key] = value;
      }
    }
    // Asegurar que los arrays existan aunque vacíos
    for (const f of ARRAY_FIELDS) {
      if (!Array.isArray(data[f])) data[f] = [];
    }
    return data;
  }

  function validate(data) {
    const email = (data.email || '').trim();
    const phone = (data.phone || '').trim();
    if (!email && !phone) {
      return 'Necesitamos al menos un email o un teléfono para contactarte.';
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'El correo electrónico no parece válido.';
    }
    return null;
  }

  function setLoading(isLoading) {
    if (!button) return;
    button.disabled = isLoading;
    button.classList.toggle('is-loading', isLoading);
  }

  function showSuccess(projectId) {
    if (errorBox) errorBox.hidden = true;
    if (success) {
      if (successId) successId.textContent = projectId || '';
      success.hidden = false;
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function showError(message) {
    if (success) success.hidden = true;
    if (errorBox && errorMsg) {
      errorMsg.textContent = message || 'Hubo un error al enviar el formulario. Intenta de nuevo.';
      errorBox.hidden = false;
      errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function clearMessages() {
    if (success)  success.hidden  = true;
    if (errorBox) errorBox.hidden = true;
  }

  form.addEventListener('submit', async function (ev) {
    ev.preventDefault();
    clearMessages();

    const data = collectFormData(form);

    const validationError = validate(data);
    if (validationError) {
      showError(validationError);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      let payload = null;
      try { payload = await response.json(); } catch (_) { /* ignore */ }

      if (!response.ok || !payload || !payload.ok) {
        const msg = (payload && payload.error)
          ? payload.error
          : 'No pudimos procesar el envío. Intenta de nuevo en un momento.';
        showError(msg);
        return;
      }

      // Éxito — deshabilitar el form y mostrar mensaje
      showSuccess(payload.projectId);
      form.querySelectorAll('input, textarea, button').forEach(el => {
        if (el !== button) el.disabled = true;
      });
      if (button) {
        button.disabled = true;
        const label = button.querySelector('.brief-submit-label');
        if (label) label.textContent = 'Enviado';
      }
    } catch (err) {
      console.error('[brief] network error:', err);
      showError('No pudimos conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  });
})();
