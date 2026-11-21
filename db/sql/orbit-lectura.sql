-- ════════════════════════════════════════════════════════════════
--  Usuario de SOLO LECTURA para la ficha de llamada (scripts/ficha-llamada.mjs)
--  Encargo «Ficha de llamada desde Orbit», 2026-11-15.
--
--  NO es una migración: lo aplica el dueño a mano en Neon (SQL Editor), una vez,
--  con su OK. Antes, cambiar CAMBIA_ESTA_CLAVE por una clave larga y aleatoria.
--  La cadena de conexión resultante va en .env.local como ORBIT_LECTURA_URL
--  (nunca en el código, nunca impresa).
--
--  Qué ve: leads (con su etapa), su historial, conversaciones de Marcy, citas, briefs,
--  diagnósticos, clientes (sin notas fiscales), proyectos (sin importes) y las
--  propuestas de venta (opciones con su precio, recomendada, elegida y caducidad).
--  Qué NO ve: nada de Finanzas (facturas, pagos, gastos, suscripciones, libros), ni la
--  lista interna de precios, ni sesiones del panel, ni IP ni navegador de los
--  visitantes. No escribe nada.
-- ════════════════════════════════════════════════════════════════

CREATE ROLE orbit_lectura WITH LOGIN PASSWORD 'CAMBIA_ESTA_CLAVE';

-- Nunca escribe, aunque algún día se le diera un permiso de más.
ALTER ROLE orbit_lectura SET default_transaction_read_only = on;
ALTER ROLE orbit_lectura SET statement_timeout = '15s';

DO $$ BEGIN EXECUTE format('GRANT CONNECT ON DATABASE %I TO orbit_lectura', current_database()); END $$;
GRANT USAGE ON SCHEMA public TO orbit_lectura;

-- Permisos por columna: lo que no está en la lista no se puede leer.
GRANT SELECT (id, ref_id, status, source, name, email, phone, business_name, city, interest, message,
              converted_brief_id, converted_client_id, converted_at, notes, page_url, created_at, updated_at)
  ON leads TO orbit_lectura;
GRANT SELECT (id, lead_ref, event_type, actor_email, data, created_at) ON lead_events TO orbit_lectura;
GRANT SELECT (sid, channel, lang, started_at, last_at, turns, lead_ref, lead_kind, takeover_at, contact_name)
  ON chat_conversations TO orbit_lectura;
GRANT SELECT (id, sid, created_at, user_text, reply, action_type, tool) ON chat_turns TO orbit_lectura;
GRANT SELECT (id, created_at, starts_at, duration_min, status, source, name, phone, email, topic, lang, lead_ref, notes)
  ON appointments TO orbit_lectura;
GRANT SELECT (project_id, status, created_at, business_name, owner_name, industry, years_in_market,
              business_description, products_services, current_website, website_type, pages_required,
              features_required, target_audience, main_objective, visitor_action, competitors, budget_range,
              timeline, deadline, additional_notes, summary, services, lang)
  ON briefs TO orbit_lectura;
GRANT SELECT (ref_id, created_at, business_name, url, problem, score_total, findings, lead_ref)
  ON diagnostics TO orbit_lectura;
GRANT SELECT (id, client_code, business_name, owner_name, city_state, status, source_lead_id, source_brief_id, created_at)
  ON clients TO orbit_lectura;
GRANT SELECT (id, project_code, client_id, brief_project_id, name, service_type, status, started_at, completed_at)
  ON projects TO orbit_lectura;

-- ── Ventas por etapas (migración 029; tanda 2 de Ventas, 7b, 2026-11-20) ──────────
-- Si el usuario ya existe, basta con aplicar SOLO este bloque (con OK del dueño).
-- La ficha enseña la etapa y la propuesta: lo propuesto es venta, no Finanzas.
-- Sin la lista interna de precios (sales_catalog) ni quién preparó cada propuesta
-- en Orbit (actor_email), ni sus notas internas.
GRANT SELECT (stage_changed_at, lost_reason, lost_note) ON leads TO orbit_lectura;
GRANT SELECT (id, ref_id, lead_ref, client_id, status, created_by, options, recommended_option, chosen_option,
              client_value_cents, sent_at, expires_on, follow_ups_done, next_follow_up_on, decided_at,
              decision_note, created_at, updated_at)
  ON proposals TO orbit_lectura;

-- Comprobación (la hace también `node --env-file=.env.local scripts/ficha-llamada.mjs --comprobar`):
--   con este usuario, SELECT * FROM invoices        → permiso denegado
--   con este usuario, INSERT INTO lead_events ...   → transacción de solo lectura
-- Para quitarlo: REVOKE ALL ON ALL TABLES IN SCHEMA public FROM orbit_lectura; DROP ROLE orbit_lectura;
