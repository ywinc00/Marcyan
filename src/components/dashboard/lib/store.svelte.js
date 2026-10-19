// ─────────────────────────────────────────────────────────────
// Datos compartidos de la carcasa: los que se ven en más de una vista.
//   · subs      → barra lateral (suscripciones + gasto/mes) y Finanzas
//   · projects  → Inicio (proyectos recientes) y la miga "N proyectos activos"
//   · home      → Inicio (KPIs, gráfico, embudo)
//   · leads     → Inicio (recientes, exportar) y Leads
// Cada colección lleva su estado de carga y su error, para que la vista
// pinte esqueleto, error con Reintentar o vacío (nunca un esqueleto eterno).
// refreshShell() lo llama la carcasa tras cualquier cambio (SH-08).
// ─────────────────────────────────────────────────────────────
import { api, errorMessage, isSessionError } from './api.js';

export const data = $state({
  home: null, homeLoading: false, homeError: '', loadedAt: null,
  leads: [], leadStats: null, leadsLoading: false, leadsError: '', leadsLoaded: false,
  projects: [], projectsError: '', projectsLoaded: false,
  subs: [], subsError: '', subsLoaded: false,
});

export async function loadHome() {
  data.homeLoading = true; data.homeError = '';
  try {
    const j = await api('/api/admin/dashboard/analytics');
    data.home = j; data.loadedAt = new Date();
  } catch (e) {
    if (!isSessionError(e)) data.homeError = errorMessage(e, 'No se pudieron cargar las cifras del inicio.');
  } finally { data.homeLoading = false; }
}

export async function loadLeads() {
  data.leadsLoading = true; data.leadsError = '';
  try {
    const j = await api('/api/admin/leads?limit=100');
    data.leads = j.rows || [];
    data.leadStats = j.stats || null;
    data.leadsLoaded = true;
  } catch (e) {
    if (!isSessionError(e)) data.leadsError = errorMessage(e, 'No se pudieron cargar los leads.');
  } finally { data.leadsLoading = false; }
}

export async function loadProjects() {
  data.projectsError = '';
  try {
    const j = await api('/api/admin/projects');
    data.projects = j.rows || [];
    data.projectsLoaded = true;
  } catch (e) {
    if (!isSessionError(e)) data.projectsError = errorMessage(e, 'No se pudieron cargar los proyectos.');
  }
}

export async function loadSubs() {
  data.subsError = '';
  try {
    const j = await api('/api/admin/subscriptions');
    data.subs = j.rows || [];
    data.subsLoaded = true;
  } catch (e) {
    if (!isSessionError(e)) data.subsError = errorMessage(e, 'No se pudieron cargar las suscripciones.');
  }
}

/** Lo que la carcasa refresca tras un cambio en cualquier sección. */
export function refreshShell() { return Promise.all([loadSubs(), loadProjects()]); }

/** Todo, al entrar con sesión válida. */
export function loadAll() { return Promise.all([loadHome(), loadLeads(), loadProjects(), loadSubs()]); }

/** Al salir o caducar la sesión: nada de datos en memoria. */
export function clearData() {
  data.home = null; data.homeError = ''; data.loadedAt = null;
  data.leads = []; data.leadStats = null; data.leadsError = ''; data.leadsLoaded = false;
  data.projects = []; data.projectsError = ''; data.projectsLoaded = false;
  data.subs = []; data.subsError = ''; data.subsLoaded = false;
}
