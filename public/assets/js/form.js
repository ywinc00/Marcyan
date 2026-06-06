/* ════════════════════════════════════════════════════════════════
   MARCYAN — Home contact form
   Real submission to /api/brief (same pipeline as /formulario).
   Maps the quick-contact fields and shows inline success / error.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const form = document.getElementById('home-contact-form');
  if (!form) return;

  const button   = form.querySelector('.btn-submit');
  const errorBox = document.getElementById('home-form-error');
  const okBox    = document.getElementById('home-form-success');

  function dict() {
    const lang = document.documentElement.lang || 'en';
    return (window.translations && window.translations[lang]) || {};
  }
  const t = (key, fallback) => dict()[key] || fallback;
  const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const show = (box, msg) => { if (box) { box.textContent = msg; box.hidden = false; } };
  const hide = box => { if (box) box.hidden = true; };

  form.addEventListener('submit', async function (ev) {
    ev.preventDefault();
    hide(errorBox);
    hide(okBox);

    const fd = new FormData(form);
    const data = {};
    for (const [k, v] of fd.entries()) data[k] = (typeof v === 'string') ? v.trim() : v;

    // Honeypot — silently stop bots
    if (data.website_hp) return;

    if (!isEmail(data.email || '')) {
      const lang = document.documentElement.lang || 'en';
      show(errorBox, lang === 'es'
        ? 'Ingresa un email válido para que podamos contactarte.'
        : 'Please enter a valid email so we can reach you.');
      return;
    }

    const original = button ? button.textContent : '';
    if (button) { button.disabled = true; button.textContent = t('form.sending', 'Sending…'); }

    try {
      const res = await fetch('/api/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      let payload = null;
      try { payload = await res.json(); } catch (_) { /* ignore */ }

      if (!res.ok || !payload || !payload.ok) {
        show(errorBox, (payload && payload.error) || t('form.error', 'Something went wrong.'));
        if (button) { button.disabled = false; button.textContent = original; }
        return;
      }

      const id = payload.projectId ? ' · ' + payload.projectId : '';
      show(okBox, t('form.success', '✓ Message sent') + id);
      form.querySelectorAll('input, select, textarea').forEach(el => { el.disabled = true; });
      if (button) button.textContent = t('form.success', '✓ Message sent');

    } catch (err) {
      console.error('[home-form] network error:', err);
      show(errorBox, t('form.error', 'Something went wrong.'));
      if (button) { button.disabled = false; button.textContent = original; }
    }
  });
})();
