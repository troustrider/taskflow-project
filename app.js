"use strict";

/**
 * TaskFlow — App de gestión de tareas con arquitectura modular
 *
 * Flujo unidireccional: App.commit() → TaskService.save() → App.render()
 *
 * Conceptos clave:
 *   - CATEGORÍA (#): Tipo fijo de actividad (Trabajo, Personal, Estudio, Salud, Gestiones).
 *     Son las 5 categorías predefinidas. No se crean ni se borran.
 *   - PROYECTO (/): Agrupación temporal y libre creada por el usuario (/mudanza, /sprint14).
 *     Se crean al asignar, desaparecen cuando no hay tareas activas.
 *   - FECHA LÍMITE (@): Fecha de vencimiento. Tareas vencidas o de hoy → "Ahora".
 *   - NOTAS: Texto libre ampliado, editable desde el panel de detalle inline.
 *
 * Badge hierarchy:
 *   1. Fecha  — rounded-md, font-mono (urgencia temporal, sistema 1)
 *   2. Prioridad — rounded-full, color semáforo (señal cromática)
 *   3. Categoría — rounded-full, dot ● circular + fondo neutro
 *   4. Proyecto — rounded-md, dot ■ cuadrado + color único por proyecto
 */

/* ═══════════════════════════════════════════
   CONSTANTES
   ═══════════════════════════════════════════ */

const CONFIG = Object.freeze({
  THEME_KEY: "taskflow_theme_v12", LOCATION_CACHE_KEY: "taskflow_location",
  MAX_TASK_LENGTH: 300, MAX_NOTES_LENGTH: 2000, MAX_PROJECT_LENGTH: 30,
  UNDO_TIMEOUT_MS: 4000, SEARCH_DEBOUNCE_MS: 150, LOCATION_TIMEOUT_MS: 5000,
  ANIMATION_MS: 220, CLOCK_INTERVAL_MS: 60000,
});

const CATEGORIES = Object.freeze(["Trabajo", "Personal", "Estudio", "Salud", "Gestiones"]);

const CATEGORY_COLORS = Object.freeze({
  Trabajo: "#b45309",
  Personal: "#be185d",
  Estudio: "#5b5bd6",
  Salud: "#0f766e",
  Gestiones: "#64748b",
});

const CATEGORY_COLORS_DARK = Object.freeze({
  Trabajo: "#8f7551",
  Personal: "#8f6676",
  Estudio: "#6f7399",
  Salud: "#5f8079",
  Gestiones: "#697384",
});

/** Clases Tailwind para badges de categoría tintados — cada categoría tiene su propia identidad visual. */
const CATEGORY_BADGE_CLASS = "border-stone-200/80 bg-stone-50/90 text-stone-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-200";
const PRIORITIES = Object.freeze(["Alta", "Media", "Baja"]);

/** Paleta de proyectos — tonos fríos/verdes para no solapar con categorías (cálidas). */
const PROJECT_COLORS = Object.freeze([
  "#4f46e5", "#0f766e", "#7c3aed", "#b7791f", "#2563eb", "#64748b", "#be185d",
]);

const PROJECT_COLORS_DARK = Object.freeze([
  "#7b84a1", "#68817d", "#81779a", "#8f7b5f", "#6f88a8", "#768091", "#8b6d7d",
]);

function isDarkTheme() {
  return document.documentElement.classList.contains("dark");
}

function categoryColor(name) {
  const palette = isDarkTheme() ? CATEGORY_COLORS_DARK : CATEGORY_COLORS;
  return palette[name] || "#999";
}

function projectColor(name) {
  const colors = isDarkTheme() ? PROJECT_COLORS_DARK : PROJECT_COLORS;
  if (!name) return colors[0];
  let h = 0; for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return colors[Math.abs(h) % colors.length];
}

function normalizeProjectName(value) {
  const trimmed = Utils.safeTrim(value);
  if (!trimmed) return null;
  return (trimmed.charAt(0).toUpperCase() + trimmed.slice(1)).slice(0, CONFIG.MAX_PROJECT_LENGTH);
}

function setProjectFilter(project) {
  UIState.projectFilter = project || "all";
  App.render();
}

const RING = Object.freeze({ HERO_CIRCUMFERENCE: 201.1, SIDEBAR_CIRCUMFERENCE: 119.4 });

const EXAMPLE_TASKS = Object.freeze([
  { text: "Preparar presentación Q2", category: "Trabajo", priority: "Alta", project: "Sprint 14", dueDate: Date.now() + 2 * 86400000 },
  { text: "Leer capítulo 4 de Node.js", category: "Estudio", priority: "Media" },
  { text: "Comprar fruta y verdura", category: "Gestiones", priority: "Baja", dueDate: Date.now() + 86400000 },
  { text: "Salir a correr 30 min", category: "Salud", priority: "Media" },
  { text: "Revisar PR del backend", category: "Trabajo", priority: "Alta", project: "Sprint 14", dueDate: Date.now() },
  { text: "Llamar al seguro por el piso", category: "Personal", priority: "Media", project: "Mudanza", dueDate: Date.now() + 3 * 86400000, notes: "Número: 900 123 456\nPreguntar por la cláusula de cancelación" },
]);

/* ═══════════════════════════════════════════
   CLASES TAILWIND
   ═══════════════════════════════════════════ */

const CLASSES = Object.freeze({
  /* Badge tokens: shared height (h-[22px]) + text-[11px] for uniform row */
  badgeBase: "inline-flex items-center h-[24px] border text-[11px] leading-none tracking-[0.01em] backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
  priorityBase: "inline-flex items-center h-[24px] rounded-full border px-2.5 text-[11px] font-semibold leading-none tracking-[0.01em] backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
  priority: {
    Alta:  "border-red-200/90 bg-red-50/90 text-red-700 dark:border-red-300/10 dark:bg-red-300/6 dark:text-red-200",
    Media: "border-amber-200/90 bg-amber-50/90 text-amber-800 dark:border-amber-300/10 dark:bg-amber-300/6 dark:text-stone-200",
    Baja:  "border-stone-200/85 bg-white/85 text-stone-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-stone-300",
  },
  categoryBase: "inline-flex items-center gap-1.5 h-[24px] rounded-full border px-2.5 text-[11px] font-medium leading-none tracking-[0.01em] backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
  projectBadge: "inline-flex items-center gap-1.5 h-[24px] rounded-xl border px-2.5 text-[11px] font-semibold leading-none tracking-[0.01em] cursor-pointer transition duration-150 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
  taskCard: {
    pending:   "group relative grid gap-3 rounded-[22px] border border-stone-200/85 bg-white/85 px-4 py-3 shadow-[0_20px_50px_rgba(41,31,20,0.07),0_3px_10px_rgba(41,31,20,0.04)] backdrop-blur-xl transition duration-200 ease-out hover:-translate-y-0.5 hover:border-stone-300/90 hover:bg-white/92 hover:shadow-[0_24px_60px_rgba(41,31,20,0.09),0_4px_12px_rgba(41,31,20,0.05)] sm:grid-cols-[minmax(0,1fr)_minmax(320px,max-content)] sm:items-start dark:border-white/10 dark:bg-[rgba(17,22,30,0.88)] dark:hover:border-white/16 dark:hover:bg-[rgba(21,27,36,0.94)] dark:shadow-[0_22px_52px_rgba(0,0,0,0.36),0_3px_12px_rgba(0,0,0,0.24)]",
    completed: "group relative grid gap-3 rounded-[22px] border border-stone-200/70 bg-white/72 px-4 py-3 shadow-[0_14px_34px_rgba(41,31,20,0.05)] backdrop-blur-lg transition duration-200 ease-out opacity-60 hover:opacity-88 sm:grid-cols-[minmax(0,1fr)_minmax(320px,max-content)] sm:items-start dark:border-white/8 dark:bg-[rgba(17,22,30,0.72)] dark:shadow-[0_16px_34px_rgba(0,0,0,0.26)]",
  },
  taskMain: "flex min-w-0 items-start gap-3",
  taskContent: "min-w-0 space-y-1",
  taskMetaText: "flex flex-wrap items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400 font-mono-ui",
  detailCue: "inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-stone-200/80 bg-stone-50/90 px-1 text-[9px] font-semibold text-stone-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-400",
  taskSide: "flex min-w-0 shrink-0 flex-col gap-2 pt-0.5 sm:min-w-[320px] sm:max-w-[360px] sm:items-end sm:pt-0",
  badgeRail: "badge-rail flex min-h-[24px] w-full items-center gap-2 overflow-x-auto overflow-y-hidden whitespace-nowrap sm:justify-end",
  badgeGroup: "badge-group flex shrink-0 items-center gap-1",
  actionRail: "flex flex-wrap items-center gap-0.5 rounded-lg bg-stone-50/28 p-[1px] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-sm sm:justify-end dark:bg-white/[0.012] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]",
  checkButtonBase: "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[10px] font-bold transition duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:focus:ring-amber-300/30",
  checkButton: {
    pending:   "border-stone-200/85 bg-white/88 text-stone-300 shadow-[0_1px_2px_rgba(41,31,20,0.04)] hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-stone-600 dark:hover:border-amber-300/25 dark:hover:text-amber-100",
    completed: "border-amber-300 bg-amber-50/90 text-amber-700 hover:bg-amber-100 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100 dark:hover:bg-amber-300/14",
  },
  actionButton: "task-actions inline-flex min-h-5.5 items-center justify-center rounded-md border border-stone-200/45 bg-white/28 px-1.5 py-0 text-[9px] font-medium text-stone-400 shadow-none backdrop-blur-sm transition duration-150 ease-out hover:border-stone-300/65 hover:bg-white/52 hover:text-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-400/15 dark:border-white/6 dark:bg-white/[0.014] dark:text-stone-500 dark:hover:border-white/9 dark:hover:bg-white/[0.03] dark:hover:text-stone-300 dark:focus:ring-amber-300/12",
  actionButtonDetails: "border-amber-200/55 bg-amber-50/28 text-amber-700 hover:border-amber-300/70 hover:bg-amber-50/52 dark:border-amber-300/8 dark:bg-amber-300/4 dark:text-stone-400 dark:hover:border-amber-300/12 dark:hover:bg-amber-300/7",
  emptyState: "rounded-[22px] border border-dashed border-stone-200/60 bg-white/76 px-4 py-8 text-sm text-stone-500 text-center shadow-[0_14px_34px_rgba(41,31,20,0.04)] backdrop-blur-lg dark:border-white/10 dark:bg-[rgba(17,22,30,0.72)] dark:text-stone-400",
  filterPill: {
    active: "border-amber-300/90 bg-amber-50/90 text-amber-800 shadow-[0_8px_18px_rgba(183,121,31,0.12)] dark:border-white/10 dark:bg-white/[0.045] dark:text-stone-100",
    inactive: "border-stone-200/75 bg-white/72 text-stone-500 hover:border-stone-300 hover:bg-white/90 hover:text-stone-700 dark:border-white/8 dark:bg-white/[0.03] dark:text-stone-400 dark:hover:border-white/12 dark:hover:text-stone-200",
  },
  filterPillBase: "category-filter-btn rounded-full border px-2.5 py-1.5 text-[11px] sm:text-xs font-medium transition duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:focus:ring-amber-300/30",
  editInput: "w-full min-w-[200px] rounded-xl border border-stone-200/85 bg-white/88 px-3 py-2 text-sm text-stone-800 shadow-[0_1px_2px_rgba(41,31,20,0.04)] backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-100 dark:focus:ring-amber-300/30",
  dueBadge: {
    base:    "inline-flex items-center gap-1 h-[24px] rounded-xl border px-2.5 text-[10px] font-mono-ui leading-none tracking-[0.02em] backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
    overdue: "border-red-200/90 bg-red-50/90 text-red-700 font-semibold dark:border-red-300/10 dark:bg-red-300/6 dark:text-red-200",
    today:   "border-amber-200/90 bg-amber-50/90 text-amber-800 font-semibold dark:border-amber-300/10 dark:bg-amber-300/6 dark:text-stone-200",
    future:  "border-stone-200/90 bg-stone-100/85 text-stone-600 font-medium dark:border-white/10 dark:bg-white/[0.03] dark:text-stone-300",
  },
});

/* ═══════════════════════════════════════════
   DOM
   ═══════════════════════════════════════════ */

const DOM = {
  _cache: {},
  get(id) { if (!(id in this._cache)) this._cache[id] = document.getElementById(id); return this._cache[id]; },
  get categoryFilterButtons() { if (!this._filterBtns) this._filterBtns = document.querySelectorAll(".category-filter-btn"); return this._filterBtns; },
  get categoryPillsSection() { if (!this._pillsSection) this._pillsSection = document.querySelector("section.grid.grid-cols-3"); return this._pillsSection; },
};

/* ═══════════════════════════════════════════
   UTILIDADES
   ═══════════════════════════════════════════ */

const Utils = {
  /** Recorta cualquier valor a string, devolviendo "" para valores nulos. */
  safeTrim(v) { return (v ?? "").toString().trim(); },

  /** Normaliza texto para detección de duplicados: recorta, colapsa espacios y pasa a minúsculas. */
  normalizeText(t) { return this.safeTrim(t).replace(/\s+/g, " ").toLowerCase(); },

  /** Devuelve la fecha de hoy en formato legible en español, ej: "viernes 21 de marzo". */
  formatDate() {
    const d = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
    const m = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
    const n = new Date(); return `${d[n.getDay()]} ${n.getDate()} de ${m[n.getMonth()]}`;
  },

  /** Devuelve la hora actual formateada como HH:MM (24 h, locale español). */
  formatTime() { return new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }); },

  /** Devuelve la hora actual (0-23) para el saludo contextual. */
  currentHour() { return new Date().getHours(); },

  /**
   * Convierte un timestamp en una cadena relativa legible (español).
   * @param {number|null} ts — Milisegundos desde Unix epoch
   * @returns {string} e.g. "ahora", "hace 3 min", "hace 2 h", "hace 5 d", "14 mar"
   */
  relativeTime(ts) {
    if (!ts) return ""; const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000); const hrs = Math.floor(diff / 3600000); const days = Math.floor(diff / 86400000);
    if (mins < 1) return "ahora"; if (mins < 60) return `hace ${mins} min`;
    if (hrs < 24) return `hace ${hrs} h`; if (days < 7) return `hace ${days} d`;
    const d = new Date(ts); const mo = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
    return `${d.getDate()} ${mo[d.getMonth()]}`;
  },

  /**
   * Envuelve las coincidencias de búsqueda en elementos <mark> para resaltado visual.
   * @param {string} text — Texto crudo de la tarea
   * @param {string} q   — Consulta de búsqueda actual (mín 2 caracteres para activar)
   * @returns {string} HTML con las coincidencias resaltadas
   */
  highlightText(text, q) {
    if (!q || q.length < 2) return this._escapeHtml(text);
    return this._escapeHtml(text).replace(new RegExp(`(${this._escapeRegex(q)})`, "gi"), '<mark class="search-highlight">$1</mark>');
  },

  /** @private Escapa entidades HTML para prevenir XSS en contenido dinámico. */
  _escapeHtml(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; },
  /** @private Escapa caracteres especiales de regex en cadenas del usuario. */
  _escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); },

  /** Trunca un timestamp a medianoche (00:00:00.000) para comparaciones por fecha. */
  startOfDay(ts) { const d = new Date(ts); d.setHours(0,0,0,0); return d.getTime(); },
  /** Devuelve true si el timestamp corresponde a la fecha de hoy. */
  isDueToday(ts) { return ts && this.startOfDay(ts) === this.startOfDay(Date.now()); },
  /** Devuelve true si el timestamp es anterior a hoy (tarea vencida). */
  isOverdue(ts) { return ts && this.startOfDay(ts) < this.startOfDay(Date.now()); },

  /**
   * Formatea un timestamp de fecha límite en una etiqueta corta y contextual.
   * @param {number|null} ts — Milisegundos Unix epoch
   * @returns {string} "hoy", "mañana", "ayer", "vie 21 mar", or "21 mar"
   */
  formatDueDate(ts) {
    if (!ts) return "";
    const diff = (this.startOfDay(ts) - this.startOfDay(Date.now())) / 86400000;
    if (diff === 0) return "hoy"; if (diff === 1) return "mañana"; if (diff === -1) return "ayer";
    const d = new Date(ts);
    const days = ["dom","lun","mar","mié","jue","vie","sáb"];
    const mo = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
    return diff > 1 && diff <= 6 ? `${days[d.getDay()]} ${d.getDate()} ${mo[d.getMonth()]}` : `${d.getDate()} ${mo[d.getMonth()]}`;
  },

  /**
   * Parsea un token @fecha del input rápido y lo convierte en timestamp.
   * Soporta: @hoy, @mañana, @viernes (próxima ocurrencia), @15mar, y fechas ISO.
   * @param {string} token — e.g. "@hoy", "@viernes", "@15mar"
   * @returns {number|null} Timestamp a medianoche o null si no se reconoce
   */
  parseDateToken(token) {
    const t = token.toLowerCase().replace("@", "");
    if (t === "hoy" || t === "today") return this.startOfDay(Date.now());
    if (t === "mañana" || t === "manana" || t === "tomorrow") return this.startOfDay(Date.now()) + 86400000;
    const dayNames = { dom:0,lun:1,mar:2,mie:3,mié:3,jue:4,vie:5,sab:6,sáb:6,domingo:0,lunes:1,martes:2,miercoles:3,miércoles:3,jueves:4,viernes:5,sabado:6,sábado:6 };
    if (dayNames[t] !== undefined) { let d = dayNames[t] - new Date().getDay(); if (d <= 0) d += 7; return this.startOfDay(Date.now()) + d * 86400000; }
    const sm = t.match(/^(\d{1,2})(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)$/);
    if (sm) { const mi = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"].indexOf(sm[2]); const d = new Date(); d.setMonth(mi, parseInt(sm[1])); d.setHours(0,0,0,0); if (d.getTime() < this.startOfDay(Date.now())) d.setFullYear(d.getFullYear() + 1); return d.getTime(); }
    const iso = Date.parse(t); if (!isNaN(iso)) return this.startOfDay(iso);
    return null;
  },
};

/* ═══════════════════════════════════════════
   INPUT PARSER — @fecha !prioridad #categoría /proyecto
   ═══════════════════════════════════════════ */

const InputParser = {
  _catMap: {
    "#trabajo":"Trabajo","#trab":"Trabajo","#work":"Trabajo","#personal":"Personal","#pers":"Personal",
    "#estudio":"Estudio","#est":"Estudio","#study":"Estudio",
    "#salud":"Salud","#health":"Salud","#gestiones":"Gestiones","#gest":"Gestiones",
  },
  _priMap: {
    "!alta":"Alta","!high":"Alta","!a":"Alta","!urgente":"Alta","!1":"Alta",
    "!media":"Media","!med":"Media","!m":"Media","!2":"Media",
    "!baja":"Baja","!low":"Baja","!b":"Baja","!3":"Baja",
  },
  /**
   * Extrae tokens inteligentes del input rápido manteniendo la UX del formulario.
   * @param {string} raw
   * @returns {{ text: string, category: (string|null), priority: (string|null), dueDate: (number|null), project: (string|null) }}
   */
  parse(raw) {
    let text = raw; let category = null; let priority = null; let dueDate = null; let project = null;
    const cm = text.match(/#\w+/gi);
    if (cm) { for (const tk of cm) { if (this._catMap[tk.toLowerCase()]) { category = this._catMap[tk.toLowerCase()]; text = text.replace(tk, ""); break; } } }
    const pm = text.match(/!\w+/gi);
    if (pm) { for (const tk of pm) { if (this._priMap[tk.toLowerCase()]) { priority = this._priMap[tk.toLowerCase()]; text = text.replace(tk, ""); break; } } }
    const dm = text.match(/@[\w\-áéíóúñü]+/gi);
    if (dm) { for (const tk of dm) { const p = Utils.parseDateToken(tk); if (p) { dueDate = p; text = text.replace(tk, ""); break; } } }
    const pjm = text.match(/\/([^\s]+)/);
    if (pjm) { project = normalizeProjectName(pjm[1].toLowerCase()); text = text.replace(pjm[0], ""); }
    return { text: text.replace(/\s+/g, " ").trim(), category, priority, dueDate, project };
  },
  updatePreview(val) {
    const pv = DOM.get("input-preview"); if (!pv) return;
    const tr = Utils.safeTrim(val);
    if (!tr) { pv.classList.add("hidden"); return; }
    const p = this.parse(tr);
    const hasSmartTokens = Boolean(p.dueDate || p.project || p.category || p.priority || p.text !== tr);
    if (!hasSmartTokens) { pv.classList.add("hidden"); return; }
    const cat = p.category || DOM.get("task-category")?.value || "Personal";
    const pri = p.priority || DOM.get("task-priority")?.value || "Media";
    pv.classList.remove("hidden");
    const dot = DOM.get("preview-cat-dot"); if (dot) dot.style.background = categoryColor(cat);
    const ct = DOM.get("preview-cat-text"); if (ct) ct.textContent = cat;
    const pb = DOM.get("preview-priority"); if (pb) { pb.textContent = pri; pb.className = CLASSES.priorityBase + (CLASSES.priority[pri] ?? CLASSES.priority.Media); }
    const pd = DOM.get("preview-due"); if (pd) { pd.textContent = p.dueDate ? Utils.formatDueDate(p.dueDate) : ""; pd.classList.toggle("hidden", !p.dueDate); }
    const pp = DOM.get("preview-project"); if (pp) { pp.textContent = p.project || ""; pp.classList.toggle("hidden", !p.project); }
    const pt = DOM.get("preview-text"); if (pt) pt.textContent = p.text ? `→ "${p.text}"` : "";
  },
};

/* ═══════════════════════════════════════════
   TASK STORE — v13 con dueDate, notes, project
   ═══════════════════════════════════════════ */

const TaskStore = {
  async load() {
    try {
      const tasks = await apiCargarTareas();
      return Array.isArray(tasks) ? tasks.map(t => this._normalize(t)) : [];
    } catch (err) {
      console.error('Error cargando tareas del servidor:', err);
      throw err;
    }
  },
  async create(taskData) {
    try {
      const task = await apiCrearTarea(taskData);
      return this._normalize(task);
    } catch (err) {
      console.error('Error creando tarea en el servidor:', err);
      throw err;
    }
  },
  async update(id, updates) {
    try {
      const task = await apiActualizarTarea(id, updates);
      return this._normalize(task);
    } catch (err) {
      console.error('Error actualizando tarea en el servidor:', err);
      throw err;
    }
  },
  async remove(id) {
    try {
      await apiEliminarTarea(id);
    } catch (err) {
      console.error('Error eliminando tarea en el servidor:', err);
      throw err;
    }
  },
  async sync(tasks) {
    try {
      const syncedTasks = await apiSincronizarTareas(tasks);
      return Array.isArray(syncedTasks) ? syncedTasks.map(t => this._normalize(t)) : [];
    } catch (err) {
      console.error('Error sincronizando con el servidor:', err);
      throw err;
    }
  },
  _normalize(t) {
    const o = { id: t.id ?? crypto.randomUUID(), text: t.text ?? "", category: t.category ?? "Personal", priority: t.priority ?? "Media",
      completed: Boolean(t.completed), createdAt: t.createdAt ?? Date.now(), completedAt: t.completedAt ?? null,
      dueDate: t.dueDate ?? null, notes: t.notes ?? "", project: t.project ?? null };
    if (o.category === "Proyectos") o.category = "Personal";
    return o;
  },
};

/* ═══════════════════════════════════════════
   NETWORK UI — Estados de carga y error
   ═══════════════════════════════════════════ */

const NetworkUI = {
  showLoading() { DOM.get("loading-overlay")?.classList.remove("hidden"); },
  hideLoading() { DOM.get("loading-overlay")?.classList.add("hidden"); },
  showPending(message = "Sincronizando cambios...") {
    const badge = DOM.get("network-pending");
    const text = DOM.get("network-pending-msg");
    if (text) text.textContent = message;
    if (badge) badge.classList.remove("hidden");
  },
  hidePending() { DOM.get("network-pending")?.classList.add("hidden"); },
  showError(msg) {
    const banner = DOM.get("network-error");
    const msgEl = DOM.get("network-error-msg");
    if (banner) banner.classList.remove("hidden");
    if (msgEl) msgEl.textContent = msg || "Error de conexión con el servidor";
  },
  hideError() { DOM.get("network-error")?.classList.add("hidden"); },
};

/* ═══════════════════════════════════════════
   TASK SERVICE
   ═══════════════════════════════════════════ */

const TaskService = {
  tasks: [],
  async load() { this.tasks = await TaskStore.load(); },
  async save() { this.tasks = await TaskStore.sync(this.tasks); },

  _validateText(text, currentId = null) {
    const trimmed = Utils.safeTrim(text);
    if (!trimmed) return { ok: false, error: "EMPTY" };
    if (trimmed.length > CONFIG.MAX_TASK_LENGTH) return { ok: false, error: "TOO_LONG" };
    const normalized = Utils.normalizeText(trimmed);
    const duplicate = this.tasks.some(task => task.id !== currentId && Utils.normalizeText(task.text) === normalized);
    if (duplicate) return { ok: false, error: "DUPLICATE" };
    return { ok: true, text: trimmed };
  },
  validateText(id, text) {
    return this._validateText(text, id);
  },

  /**
   * Crea una tarea y la inserta al inicio del array.
   * @param {string} text
   * @param {string} category
   * @param {string} priority
   * @param {{ dueDate?: (number|null), notes?: string, project?: (string|null) }} [options]
   * @returns {{ ok: true, task: object } | { ok: false, error: string }}
   */
  add(text, category, priority, { dueDate = null, notes = "", project = null } = {}) {
    const validation = this._validateText(text);
    if (!validation.ok) return validation;
    const task = { id: crypto.randomUUID(), text: validation.text, category, priority, completed: false, createdAt: Date.now(), completedAt: null, dueDate, notes, project };
    this.tasks.unshift(task);
    return { ok: true, task };
  },
  async createRemote(text, category, priority, { dueDate = null, notes = "", project = null } = {}) {
    const validation = this._validateText(text);
    if (!validation.ok) return validation;

    const createdTask = await TaskStore.create({
      text: validation.text,
      category,
      priority,
      dueDate,
      notes,
      project,
    });

    this.tasks.unshift(createdTask);
    return { ok: true, task: createdTask };
  },
  updateText(id, text) {
    const validation = this._validateText(text, id);
    if (!validation.ok) return validation;
    this.tasks = this.tasks.map(t => t.id === id ? { ...t, text: validation.text } : t);
    return { ok: true };
  },
  async patchRemote(id, updates) {
    const index = this.tasks.findIndex(t => t.id === id);
    if (index === -1) throw new Error("NOT_FOUND");

    if (updates.text !== undefined) {
      const validation = this._validateText(updates.text, id);
      if (!validation.ok) return validation;
      updates = { ...updates, text: validation.text };
    }

    const previousTask = structuredClone(this.tasks[index]);
    this.tasks[index] = { ...this.tasks[index], ...updates };

    try {
      const updatedTask = await TaskStore.update(id, updates);
      this.tasks[index] = updatedTask;
      return { ok: true, task: updatedTask };
    } catch (err) {
      this.tasks[index] = previousTask;
      throw err;
    }
  },
  setCompleted(id, c) { this.tasks = this.tasks.map(t => t.id === id ? { ...t, completed: c, completedAt: c ? Date.now() : null } : t); },
  completeTasks(ids) {
    const set = new Set(ids);
    if (set.size === 0) return false;
    const completedAt = Date.now();
    let changed = false;
    this.tasks = this.tasks.map(t => {
      if (!set.has(t.id) || t.completed) return t;
      changed = true;
      return { ...t, completed: true, completedAt };
    });
    return changed;
  },
  remove(id) { const i = this.tasks.findIndex(t => t.id === id); if (i === -1) return { removed: null, index: -1 }; const [r] = this.tasks.splice(i, 1); return { removed: r, index: i }; },
  async removeRemote(id) {
    const removal = this.remove(id);
    if (!removal.removed) {
      throw new Error("NOT_FOUND");
    }

    try {
      await TaskStore.remove(id);
      return removal;
    } catch (err) {
      this.insertAt(removal.removed, removal.index);
      throw err;
    }
  },
  insertAt(task, idx) { this.tasks.splice(Math.min(idx, this.tasks.length), 0, task); },
  completeAll() { this.tasks = this.tasks.map(t => t.completed ? t : { ...t, completed: true, completedAt: Date.now() }); },
  clearCompleted(ids = null) {
    if (!ids) {
      this.tasks = this.tasks.filter(t => !t.completed);
      return;
    }
    const set = new Set(ids);
    this.tasks = this.tasks.filter(t => !t.completed || !set.has(t.id));
  },
  updateTask(id, u) { this.tasks = this.tasks.map(t => t.id === id ? { ...t, ...u } : t); },
  reorderVisible(visibleIds, movedId, targetId = null) {
    if (!visibleIds.includes(movedId)) return false;
    const visibleSet = new Set(visibleIds);
    const movedTask = this.tasks.find(t => t.id === movedId);
    if (!movedTask) return false;

    const reorderedVisible = this.tasks.filter(t => visibleSet.has(t.id) && t.id !== movedId);
    const targetIndex = targetId ? reorderedVisible.findIndex(t => t.id === targetId) : -1;
    if (targetIndex === -1) reorderedVisible.push(movedTask);
    else reorderedVisible.splice(targetIndex, 0, movedTask);

    const nextVisibleIds = reorderedVisible.map(t => t.id);
    if (nextVisibleIds.join("|") === visibleIds.join("|")) return false;

    let visibleCursor = 0;
    this.tasks = this.tasks.map(t => visibleSet.has(t.id) ? reorderedVisible[visibleCursor++] : t);
    return true;
  },

  computeStats() {
    let pending = 0, completed = 0; const byCategory = {};
    for (const c of CATEGORIES) byCategory[c] = 0;
    for (const t of this.tasks) { if (t.completed) completed++; else pending++; if (byCategory[t.category] !== undefined) byCategory[t.category]++; }
    return { total: this.tasks.length, pending, completed, byCategory };
  },
  /**
   * Divide la colección filtrada en las tres secciones que renderiza la UI.
   * @param {string} query
   * @param {string} categoryFilter
   * @param {string} projectFilter
   * @returns {{ now: object[], next: object[], done: object[] }}
   */
  getVisible(query, categoryFilter, projectFilter) {
    const q = query.toLowerCase();
    const filtered = this.tasks.filter(t => {
      const sok = !q || t.text.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || t.priority.toLowerCase().includes(q) || (t.notes && t.notes.toLowerCase().includes(q)) || (t.project && t.project.toLowerCase().includes(q));
      const cok = categoryFilter === "all" || t.category === categoryFilter;
      const pok = !projectFilter || projectFilter === "all" || t.project === projectFilter;
      return sok && cok && pok;
    });
    return {
      now: filtered.filter(t => !t.completed && (t.priority === "Alta" || Utils.isOverdue(t.dueDate) || Utils.isDueToday(t.dueDate))),
      next: filtered.filter(t => !t.completed && t.priority !== "Alta" && !Utils.isOverdue(t.dueDate) && !Utils.isDueToday(t.dueDate)),
      done: filtered.filter(t => t.completed),
    };
  },
  getPendingForFocus() {
    return this.tasks.filter(t => !t.completed).sort((a, b) => {
      const au = Utils.isOverdue(a.dueDate) || Utils.isDueToday(a.dueDate);
      const bu = Utils.isOverdue(b.dueDate) || Utils.isDueToday(b.dueDate);
      if (au !== bu) return au ? -1 : 1;
      const p = { Alta: 0, Media: 1, Baja: 2 };
      if ((p[a.priority]??1) !== (p[b.priority]??1)) return (p[a.priority]??1) - (p[b.priority]??1);
      return a.createdAt - b.createdAt;
    });
  },
  getActiveProjects() {
    const c = {}; for (const t of this.tasks) { if (t.project && !t.completed) c[t.project] = (c[t.project]||0) + 1; }
    return Object.entries(c).sort((a,b) => b[1] - a[1]);
  },
  getAllProjectNames() { const s = new Set(); for (const t of this.tasks) if (t.project) s.add(t.project); return [...s].sort(); },
  hasPending() { return this.tasks.some(t => !t.completed); },
  hasCompleted() { return this.tasks.some(t => t.completed); },
  get count() { return this.tasks.length; },
};

/* ═══════════════════════════════════════════
   UI STATE
   ═══════════════════════════════════════════ */

/**
 * Estado mutable de la UI — fuente única de verdad para flags transitorios de vista.
 * Mutado directamente por event handlers; leído por App.render() para decidir qué mostrar.
 *
 * @property {string}  categoryFilter     — Filtro de categoría activo ("all" | category name)
 * @property {string}  projectFilter      — Filtro de proyecto activo ("all" | project name)
 * @property {string|null} lastAddedTaskId — ID de la tarea recién creada (dispara animación de entrada, se resetea tras render)
 * @property {string|null} editingTaskId   — ID de la tarea en modo edición inline
 * @property {string|null} expandedTaskId  — ID de la tarea cuyo panel de detalle está abierto
 * @property {boolean} doneExpanded        — Si la sección "Completadas" está expandida o colapsada
 * @property {number|null} searchDebounceTimer — Handle de setTimeout para el debounce de búsqueda
 * @property {boolean} focusMode           — Si el overlay de Focus Mode está activo
 * @property {number}  focusIndex          — Índice de la tarea mostrada en Focus Mode
 * @property {boolean} selectorsExpanded   — Si el panel de selectores guiados está abierto
 * @property {object}  visibleTaskIds      — { now: string[], next: string[], done: string[] } — IDs renderizados en cada sección (usado por drag-drop y acciones masivas)
 */
const UIState = {
  categoryFilter: "all", projectFilter: "all",
  lastAddedTaskId: null, editingTaskId: null, expandedTaskId: null,
  doneExpanded: false, searchDebounceTimer: null,
  focusMode: false, focusIndex: 0, selectorsExpanded: false,
  visibleTaskIds: { now: [], next: [], done: [] },
};

/* ═══════════════════════════════════════════
   THEME / LOCATION / SEARCH
   ═══════════════════════════════════════════ */

const Theme = {
  load() { const s = localStorage.getItem(CONFIG.THEME_KEY); if (s === "dark" || s === "light") { this.apply(s); return; } this.apply(window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"); },
  apply(theme) {
    const dk = theme === "dark";
    document.documentElement.classList.toggle("dark", dk);
    const i = DOM.get("theme-icon");
    const t = DOM.get("theme-text");
    const b = DOM.get("theme-toggle");
    if (i) i.textContent = dk ? "◗" : "○";
    if (t) t.textContent = dk ? "Oscuro" : "Claro";
    if (b) {
      b.setAttribute("aria-pressed", dk ? "true" : "false");
      b.setAttribute("title", dk ? "Cambiar a tema claro" : "Cambiar a tema oscuro");
    }
  },
  toggle() { const n = document.documentElement.classList.contains("dark") ? "light" : "dark"; localStorage.setItem(CONFIG.THEME_KEY, n); this.apply(n); },
};

const Location = {
  _cached: sessionStorage.getItem(CONFIG.LOCATION_CACHE_KEY) || "",
  get city() { return this._cached; },
  formatTimeLocation() { const t = Utils.formatTime(); return this._cached ? `${t} · ${this._cached}` : t; },
  fetch() {
    if (this._cached) { this._applyEverywhere(); return; }
    const c = new AbortController(); const to = setTimeout(() => c.abort(), CONFIG.LOCATION_TIMEOUT_MS);
    fetch("http://ip-api.com/json/?fields=city,country", { signal: c.signal }).then(r => r.json()).then(d => { clearTimeout(to); if (d.city) this._store(`${d.city}, ${d.country}`); })
      .catch(() => { clearTimeout(to); fetch("https://ipapi.co/json/").then(r => r.json()).then(d => { if (d.city) this._store(`${d.city}, ${d.country_name}`); }).catch(()=>{}); });
  },
  _store(v) { this._cached = v; sessionStorage.setItem(CONFIG.LOCATION_CACHE_KEY, v); this._applyEverywhere(); },
  _applyEverywhere() { const h = DOM.get("time-location"); if (h) h.textContent = this.formatTimeLocation(); const st = DOM.get("sidebar-time"); const sl = DOM.get("sidebar-location"); if (st) st.textContent = Utils.formatTime(); if (sl) sl.textContent = this._cached; },
};

const Search = {
  getQuery() { return Utils.safeTrim(DOM.get("search-input")?.value); },
  clear() { const i = DOM.get("search-input"); if (i) i.value = ""; },
  focus() { DOM.get("search-input")?.focus(); },
  updateHints() {
    const k = DOM.get("search-kbd-hint"); const c = DOM.get("clear-search"); if (!k || !c) return;
    if (this.getQuery().length > 0) { k.classList.add("hidden"); k.classList.remove("sm:flex"); c.classList.remove("hidden"); }
    else { k.classList.remove("hidden"); k.classList.add("sm:flex"); c.classList.add("hidden"); }
  },
};

const ShortcutHints = {
  _isMac() {
    return /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || "");
  },
  _format(key, { shift = false } = {}) {
    return this._isMac()
      ? `${shift ? "⌘⇧" : "⌘"}${key.toUpperCase()}`
      : `${shift ? "Ctrl Shift " : "Ctrl "}${key.toUpperCase()}`;
  },
  apply() {
    const searchHint = DOM.get("search-kbd-hint")?.querySelector("kbd");
    if (searchHint) searchHint.textContent = this._format("k");

    const rows = DOM.get("sidebar-left")?.querySelectorAll("kbd");
    if (!rows || rows.length < 5) return;
    rows[0].textContent = this._format("k");
    rows[1].textContent = this._format("f");
    rows[2].textContent = this._format("c", { shift: true });
    rows[3].textContent = this._format("x", { shift: true });
    rows[4].textContent = "Esc";
  },
};

const FormVisualOrder = {
  apply() {
    const taskInput = DOM.get("task-input");
    if (taskInput) taskInput.placeholder = "Escribe una tarea…";

    const preview = DOM.get("input-preview");
    if (preview) {
      const previewOrder = ["preview-due", "preview-project", "preview-category", "preview-priority", "preview-text"];
      for (const id of previewOrder) {
        const node = DOM.get(id);
        if (node) preview.appendChild(node);
      }
    }

    const panel = DOM.get("selector-panel");
    if (panel) {
      const fieldIds = ["task-duedate", "task-project", "task-category", "task-priority"];
      const fields = fieldIds
        .map(id => DOM.get(id)?.closest(".relative"))
        .filter(Boolean);
      for (const field of fields) panel.appendChild(field);
    }

    const legacySelectorToggle = document.querySelector('#classic-selectors > button#toggle-selectors');
    if (legacySelectorToggle) {
      legacySelectorToggle.id = "toggle-selectors-legacy";
      legacySelectorToggle.hidden = true;
      legacySelectorToggle.setAttribute("aria-hidden", "true");
    }

    const welcomeExample = document.querySelector("#welcome-section .grid > div:first-child p:last-child");
    if (welcomeExample) {
      welcomeExample.innerHTML = 'Usa <kbd class="font-mono-ui text-amber-700">@viernes</kbd> <kbd class="font-mono-ui text-indigo-500">/proyecto</kbd> <kbd class="font-mono-ui text-amber-600">#trabajo</kbd> <kbd class="font-mono-ui text-red-500">!alta</kbd>';
    }
  },
};

/* ═══════════════════════════════════════════
   GREETING / WELCOME / PROGRESS
   ═══════════════════════════════════════════ */

const Greeting = {
  _getText(pct, pend) {
    const h = Utils.currentHour();
    if (pct === 100) return { title: "¡Todo hecho!", sub: "Buen trabajo. Disfruta del resto del día." };
    if (pct >= 66) return { title: "Ya casi lo tienes", sub: `Solo te quedan ${pend} tarea${pend === 1 ? "" : "s"}. ¡Último empujón!` };
    if (h >= 5 && h < 13) return { title: "Buenos días", sub: "Esto es lo que tienes para hoy." };
    if (h >= 13 && h < 20) return { title: "Buenas tardes", sub: "Esto es lo que queda por hacer." };
    return { title: "Buenas noches", sub: "Así va tu día." };
  },
  update() {
    const t = DOM.get("hero-greeting"); const u = DOM.get("hero-greeting-sub");
    if (!t) return;
    if (TaskService.count > 0) {
      const st = TaskService.computeStats();
      const p = st.total === 0 ? 0 : Math.round((st.completed / st.total) * 100);
      const tx = this._getText(p, st.pending);
      t.textContent = tx.title;
      if (u) u.textContent = tx.sub;
    }
  },
};

const Welcome = {
  _getText() {
    const h = Utils.currentHour();
    if (h >= 5 && h < 13) return { title: "Tu día empieza aquí", sub: "Añade tu primera tarea o prueba con las de ejemplo." };
    if (h >= 13 && h < 20) return { title: "Todo bajo control", sub: "Planifica lo que queda del día añadiendo tu primera tarea." };
    return { title: "Prepárate para mañana", sub: "Deja tus tareas listas para empezar el día con ventaja." };
  },
  update() {
    const tx = this._getText();
    const g = DOM.get("welcome-greeting");
    const u = DOM.get("welcome-sub");
    if (g) g.textContent = tx.title;
    if (u) u.textContent = tx.sub;
  },
};

const Progress = {
  update() {
    const st = TaskService.computeStats(); const pct = st.total === 0 ? 0 : Math.round((st.completed/st.total)*100);
    this._ring(DOM.get("progress-ring"), RING.HERO_CIRCUMFERENCE, pct);
    const hp = DOM.get("progress-percent"); if (hp) hp.textContent = `${pct}%`;
    const te = DOM.get("progress-text"); if (te) te.textContent = this._label(st.total, st.completed, pct);
    const de = DOM.get("date-headline"); if (de) de.textContent = Utils.formatDate();
  },
  _ring(el, c, p) { if (el) el.setAttribute("stroke-dashoffset", c - (c * p / 100)); },
  _label(t,c,p) { if (t===0) return "Sin tareas aún"; if (p===0) return `${t-c} pendientes`; if (p<33) return `Buen comienzo — ${c} de ${t}`; if (p<66) return `Vas por buen camino — ${c} de ${t}`; if (p<100) return `Casi lo tienes — ${c} de ${t}`; return "Todo listo"; },
};

/* ═══════════════════════════════════════════
   UNDO TOAST
   ═══════════════════════════════════════════ */

const UndoToast = {
  _timer: null, _task: null, _index: null,
  show(task, idx) {
    if (this._timer) clearTimeout(this._timer); this._task = task; this._index = idx;
    const toast = DOM.get("undo-toast"); if (!toast) return;
    const ex = toast.querySelector(".undo-toast-progress"); if (ex) ex.remove();
    const bar = document.createElement("div"); bar.className = "undo-toast-progress"; bar.style.width = "100%"; toast.appendChild(bar);
    const msg = DOM.get("undo-toast-msg"); if (msg) msg.textContent = `"${task.text.length > 28 ? task.text.slice(0,28)+"…" : task.text}" eliminada`;
    toast.classList.add("visible");
    requestAnimationFrame(() => { bar.style.transitionDuration = `${CONFIG.UNDO_TIMEOUT_MS}ms`; bar.style.width = "0%"; });
    this._timer = setTimeout(() => this.hide(), CONFIG.UNDO_TIMEOUT_MS);
  },
  hide() { DOM.get("undo-toast")?.classList.remove("visible"); if (this._timer) { clearTimeout(this._timer); this._timer = null; } this._task = null; this._index = null; },
  undo() { if (!this._task) return; TaskService.insertAt(this._task, this._index ?? 0); void App.commit("Restaurando tarea..."); this.hide(); },
};

/* ═══════════════════════════════════════════
   TASK DETAIL — Panel inline
   ═══════════════════════════════════════════ */

const TaskDetail = {
  /**
   * Construye el editor de detalle inline que se muestra bajo una tarjeta expandida.
   * @param {object} task
   * @returns {HTMLDivElement}
   */
  createPanel(task) {
    const panel = document.createElement("div");
    panel.className = "task-detail-panel mt-2 rounded-[20px] border p-4 space-y-3";
    panel.dataset.detailFor = task.id;

    const r1 = document.createElement("div"); r1.className = "flex flex-wrap gap-3";
    const dw = document.createElement("div"); dw.className = "flex-1 min-w-[140px]";
    dw.innerHTML = `<label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">Fecha limite</label>`;
    const di = document.createElement("input"); di.type = "date";
    di.className = "w-full rounded-xl border border-stone-200/85 bg-white/88 px-3 py-2 text-sm text-stone-800 shadow-[0_1px_2px_rgba(41,31,20,0.04)] backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-100 dark:focus:ring-amber-300/30";
    di.value = task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "";
    di.addEventListener("change", () => {
      void App.patchTask(
        task.id,
        { dueDate: di.value ? Utils.startOfDay(Date.parse(di.value + "T00:00:00")) : null },
        "Actualizando fecha limite..."
      );
    });
    dw.appendChild(di);

    const pw = document.createElement("div"); pw.className = "flex-1 min-w-[140px]";
    pw.innerHTML = `<label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">Proyecto</label>`;
    const pi = document.createElement("input"); pi.type = "text"; pi.placeholder = "Ej: Mudanza, Sprint 14…";
    pi.className = "w-full rounded-xl border border-stone-200/85 bg-white/88 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 shadow-[0_1px_2px_rgba(41,31,20,0.04)] backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-100 dark:placeholder-stone-500 dark:focus:ring-amber-300/30";
    pi.value = task.project || ""; pi.setAttribute("list", "project-options-" + task.id);
    const dl = document.createElement("datalist"); dl.id = "project-options-" + task.id;
    for (const n of TaskService.getAllProjectNames()) { const o = document.createElement("option"); o.value = n; dl.appendChild(o); }
    pi.addEventListener("change", () => {
      const value = normalizeProjectName(pi.value);
      pi.value = value || "";
      void App.patchTask(task.id, { project: value }, "Actualizando proyecto...");
    });
    pw.append(pi, dl); r1.append(dw, pw);

    const r2 = document.createElement("div"); r2.className = "flex flex-wrap gap-3";
    const cw = document.createElement("div"); cw.className = "flex-1 min-w-[120px]";
    cw.innerHTML = `<label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">Categoria</label>`;
    const cs = document.createElement("select");
    cs.className = "w-full rounded-xl border border-stone-200/85 bg-white/88 px-3 py-2 text-sm text-stone-800 shadow-[0_1px_2px_rgba(41,31,20,0.04)] backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-100 dark:focus:ring-amber-300/30";
    for (const c of CATEGORIES) { const o = document.createElement("option"); o.value = c; o.textContent = c; if (c === task.category) o.selected = true; cs.appendChild(o); }
    cs.addEventListener("change", () => {
      void App.patchTask(task.id, { category: cs.value }, "Actualizando categoria...");
    });
    cw.appendChild(cs);

    const prw = document.createElement("div"); prw.className = "flex-1 min-w-[100px]";
    prw.innerHTML = `<label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">Prioridad</label>`;
    const ps = document.createElement("select");
    ps.className = "w-full rounded-xl border border-stone-200/85 bg-white/88 px-3 py-2 text-sm text-stone-800 shadow-[0_1px_2px_rgba(41,31,20,0.04)] backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-100 dark:focus:ring-amber-300/30";
    for (const p of PRIORITIES) { const o = document.createElement("option"); o.value = p; o.textContent = p; if (p === task.priority) o.selected = true; ps.appendChild(o); }
    ps.addEventListener("change", () => {
      void App.patchTask(task.id, { priority: ps.value }, "Actualizando prioridad...");
    });
    prw.appendChild(ps); r2.append(cw, prw);

    const nw = document.createElement("div");
    nw.innerHTML = `<label class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">Notas</label>`;
    const ta = document.createElement("textarea");
    ta.className = "w-full min-h-[84px] resize-y rounded-xl border border-stone-200/85 bg-white/88 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 shadow-[0_1px_2px_rgba(41,31,20,0.04)] backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-100 dark:placeholder-stone-500 dark:focus:ring-amber-300/30";
    ta.placeholder = "Añade notas, detalles, enlaces…"; ta.value = task.notes || ""; ta.maxLength = CONFIG.MAX_NOTES_LENGTH;
    ta.addEventListener("blur", () => {
      void App.patchTask(task.id, { notes: ta.value }, "Guardando notas...");
    });
    nw.appendChild(ta);
    panel.append(r1, r2, nw);
    return panel;
  },
};

/* ═══════════════════════════════════════════
   TASK RENDERER
   ═══════════════════════════════════════════ */

const TaskRenderer = {
  priorityClasses(p) { return `${CLASSES.priorityBase} ${CLASSES.priority[p] ?? CLASSES.priority.Baja}`; },
  cardClasses(c) { return c ? CLASSES.taskCard.completed : CLASSES.taskCard.pending; },
  checkClasses(c) { return `${CLASSES.checkButtonBase} ${c ? CLASSES.checkButton.completed : CLASSES.checkButton.pending}`; },

  _createDueBadge(dueDate) {
    if (!dueDate) return null;
    const variant = Utils.isOverdue(dueDate)
      ? CLASSES.dueBadge.overdue
      : Utils.isDueToday(dueDate) ? CLASSES.dueBadge.today : CLASSES.dueBadge.future;
    const badge = document.createElement("span");
    badge.className = `${CLASSES.dueBadge.base} ${variant}`;
    badge.textContent = Utils.formatDueDate(dueDate);
    return badge;
  },
  _createCategoryBadge(category) {
    const badge = document.createElement("span");
    badge.className = `${CLASSES.categoryBase} ${CATEGORY_BADGE_CLASS}`;
    const dot = document.createElement("span");
    dot.className = "w-1.5 h-1.5 rounded-full shrink-0";
    dot.style.background = categoryColor(category);
    const label = document.createElement("span");
    label.textContent = category;
    badge.append(dot, label);
    return badge;
  },
  _createProjectBadge(project) {
    if (!project) return null;
    const color = projectColor(project);
    const badge = document.createElement("button");
    badge.type = "button";
    badge.className = CLASSES.projectBadge;
    badge.style.borderColor = color + "40";
    badge.style.background = color + "12";
    badge.style.color = color;
    const dot = document.createElement("span");
    dot.className = "w-1.5 h-1.5 rounded-sm shrink-0";
    dot.style.background = color;
    const label = document.createElement("span");
    label.className = "truncate max-w-[84px] sm:max-w-[96px]";
    label.textContent = project;
    badge.append(dot, label);
    badge.title = `Proyecto: ${project} (click para filtrar)`;
    badge.addEventListener("click", (event) => {
      event.stopPropagation();
      setProjectFilter(project);
    });
    return badge;
  },

  _button({ action, id, className, text, html, ariaLabel }) {
    const b = document.createElement("button"); b.type = "button"; b.dataset.action = action; b.dataset.id = id; b.className = className;
    if (ariaLabel) b.setAttribute("aria-label", ariaLabel);
    if (html !== undefined) b.innerHTML = html; else if (text !== undefined) b.textContent = text; return b;
  },

  /**
   * Crea el nodo DOM de una tarea, incluyendo el panel de detalle si está expandida.
   * @param {object} task
   * @param {boolean} [completed=false]
   * @returns {HTMLLIElement}
   */
  createItem(task, completed = false) {
    const wrapper = document.createElement("li"); wrapper.dataset.id = task.id; wrapper.draggable = true;
    wrapper.addEventListener("dragstart", () => wrapper.style.opacity = "0.4");
    wrapper.addEventListener("dragend", () => wrapper.style.opacity = "1");
    const card = document.createElement("div"); card.className = this.cardClasses(completed);
    if (task.priority === "Alta" && !completed) card.classList.add("priority-high");
    card.append(this._buildMain(task, completed), this._buildAside(task, completed));
    if (task.id === UIState.lastAddedTaskId && !completed) this._animateIn(card);
    wrapper.appendChild(card);
    if (UIState.expandedTaskId === task.id && !completed) wrapper.appendChild(TaskDetail.createPanel(task));
    return wrapper;
  },

  _buildMain(task, completed) {
    const wrap = document.createElement("div"); wrap.className = CLASSES.taskMain;
    const chk = this._button({ action: completed ? "restore" : "complete", id: task.id, className: this.checkClasses(completed), html: completed ? "✓" : "", ariaLabel: completed ? "Marcar como pendiente" : "Marcar como completada" });
    const tw = document.createElement("div"); tw.className = CLASSES.taskContent;
    if (UIState.editingTaskId === task.id) {
      const inp = document.createElement("input"); inp.dataset.role = "edit-text"; inp.value = task.text; inp.className = CLASSES.editInput; tw.appendChild(inp);
    } else {
      const p = document.createElement("p"); const sq = Search.getQuery();
      if (sq && !completed) { p.className = "truncate text-[15px] font-medium tracking-[-0.01em] text-stone-800 dark:text-stone-100"; p.innerHTML = Utils.highlightText(task.text, sq); }
      else { p.className = completed ? "truncate text-[15px] text-stone-400 line-through dark:text-stone-500" : "truncate text-[15px] font-medium tracking-[-0.01em] text-stone-800 dark:text-stone-100"; p.textContent = task.text; }
      tw.appendChild(p);
      const meta = document.createElement("span"); meta.className = CLASSES.taskMetaText;
      meta.textContent = completed ? `Hecha ${Utils.relativeTime(task.completedAt)}` : Utils.relativeTime(task.createdAt);
      if (task.notes && !completed && UIState.expandedTaskId !== task.id) {
        const cue = document.createElement("span");
        cue.className = CLASSES.detailCue;
        cue.textContent = "···";
        cue.title = "La tarea tiene detalles ocultos";
        cue.setAttribute("aria-label", "La tarea tiene detalles ocultos");
        meta.append(document.createTextNode(" · "), cue);
      }
      tw.appendChild(meta);
      if (task.notes && !completed) {
        const notePreview = document.createElement("p");
        notePreview.className = "notes-preview truncate cursor-pointer text-[11px] italic text-stone-500/90 dark:text-stone-400/90";
        const firstLine = task.notes.split("\n")[0].trim();
        notePreview.textContent = firstLine.length > 50 ? firstLine.slice(0, 50) + "\u2026" : firstLine;
        notePreview.title = "Click para ver detalles";
        notePreview.addEventListener("click", (e) => { e.stopPropagation(); UIState.expandedTaskId = UIState.expandedTaskId === task.id ? null : task.id; App.render(); });
        tw.appendChild(notePreview);
      }
    }
    wrap.append(chk, tw); return wrap;
  },

  _buildRight(task, completed) {
    const isEd = !completed && UIState.editingTaskId === task.id;
    const wrap = document.createElement("div");
    wrap.className = "badge-row flex items-center gap-1.5 flex-wrap justify-start sm:justify-end";

    if (!isEd) {
      // ── Obligatorios (siempre visibles) ──
      // 1. Prioridad — señal cromática inmediata
      const prb = document.createElement("span");
      prb.className = this.priorityClasses(task.priority);
      prb.textContent = task.priority;
      wrap.appendChild(prb);

      // 2. Categoría — contexto del tipo de actividad (tintado por categoría)
      const cb = document.createElement("span");
      cb.className = `${CLASSES.categoryBase} ${CATEGORY_BADGE_CLASS}`;
      const cd = document.createElement("span");
      cd.className = "w-1.5 h-1.5 rounded-full shrink-0";
      cd.style.background = categoryColor(task.category);
      const cl = document.createElement("span");
      cl.textContent = task.category;
      cb.append(cd, cl);
      wrap.appendChild(cb);

      // ── Opcionales (solo si existen) ──
      // 3. Fecha — urgencia temporal
      if (task.dueDate && !completed) {
        const variant = Utils.isOverdue(task.dueDate)
          ? CLASSES.dueBadge.overdue
          : Utils.isDueToday(task.dueDate) ? CLASSES.dueBadge.today : CLASSES.dueBadge.future;
        const db = document.createElement("span");
        db.className = `${CLASSES.dueBadge.base} ${variant}`;
        db.textContent = Utils.formatDueDate(task.dueDate);
        wrap.appendChild(db);
      }

      // 4. Proyecto — agrupación libre
      if (task.project) {
        const pColor = projectColor(task.project);
        const pb = document.createElement("span");
        pb.className = CLASSES.projectBadge;
        pb.style.borderColor = pColor + "40";
        pb.style.background = pColor + "12";
        pb.style.color = pColor;
        const pbDot = document.createElement("span");
        pbDot.className = "w-1.5 h-1.5 rounded-sm shrink-0";
        pbDot.style.background = pColor;
        const pbLabel = document.createElement("span");
        pbLabel.className = "truncate max-w-[100px]";
        pbLabel.textContent = task.project;
        pb.append(pbDot, pbLabel);
        pb.title = `Proyecto: ${task.project} (click para filtrar)`;
        pb.addEventListener("click", (e) => {
          e.stopPropagation();
          setProjectFilter(task.project);
        });
        wrap.appendChild(pb);
      }

      // 5. Indicador de detalles ocultos (notas / fecha / proyecto)
      const hasHiddenDetails = !completed && (
        (task.notes && UIState.expandedTaskId !== task.id) ||
        (task.dueDate && completed) ||
        task.project || task.notes
      );
      if (!completed && task.notes && UIState.expandedTaskId !== task.id) {
        const hint = document.createElement("button");
        hint.type = "button";
        hint.className = "detail-hint inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-stone-200/80 bg-white/80 text-[11px] text-stone-500 shadow-[0_1px_2px_rgba(41,31,20,0.04)] backdrop-blur-sm transition hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-stone-400 dark:hover:border-amber-300/20 dark:hover:text-amber-100";
        hint.textContent = "\u2026";
        hint.title = "Tiene notas \u2014 click para ver";
        hint.setAttribute("aria-label", "Ver notas de la tarea");
        hint.addEventListener("click", (e) => {
          e.stopPropagation();
          UIState.expandedTaskId = task.id;
          App.render();
        });
        wrap.appendChild(hint);
      }
    }

    // Separador visual entre badges y acciones
    if (!isEd && !completed) {
      const sep = document.createElement("span");
      sep.className = "mx-0.5 hidden h-4 w-px shrink-0 bg-stone-200/70 dark:bg-white/8 sm:block";
      wrap.appendChild(sep);
    }

    if (!completed) {
      wrap.append(this._button({
        action: "toggle-detail", id: task.id, className: CLASSES.actionButton,
        text: UIState.expandedTaskId === task.id ? "Cerrar" : "Detalles",
      }));
      wrap.append(this._button({
        action: isEd ? "edit-save" : "edit", id: task.id, className: CLASSES.actionButton,
        text: isEd ? "Guardar" : "Editar",
      }));
      if (isEd) {
        wrap.append(this._button({
          action: "edit-cancel", id: task.id, className: CLASSES.actionButton, text: "Cancelar",
        }));
      }
    }
    wrap.append(this._button({ action: "delete", id: task.id, className: CLASSES.actionButton, text: "Borrar" }));
    return wrap;
  },

  _buildAside(task, completed) {
    const wrap = document.createElement("div");
    wrap.className = CLASSES.taskSide;
    wrap.append(this._buildBadges(task, completed), this._buildActions(task, completed));
    return wrap;
  },

  _buildBadges(task, completed) {
    const wrap = document.createElement("div");
    wrap.className = CLASSES.badgeRail;
    const scheduleGroup = document.createElement("div");
    scheduleGroup.className = CLASSES.badgeGroup;
    const contextGroup = document.createElement("div");
    contextGroup.className = CLASSES.badgeGroup;

    const dueBadge = !completed ? this._createDueBadge(task.dueDate) : null;
    if (dueBadge) scheduleGroup.appendChild(dueBadge);

    contextGroup.appendChild(this._createCategoryBadge(task.category));

    const prb = document.createElement("span");
    prb.className = this.priorityClasses(task.priority);
    prb.textContent = task.priority;
    contextGroup.appendChild(prb);

    const projectBadge = this._createProjectBadge(task.project);
    if (projectBadge) scheduleGroup.appendChild(projectBadge);

    if (scheduleGroup.childElementCount > 0) wrap.appendChild(scheduleGroup);
    wrap.appendChild(contextGroup);
    return wrap;
  },

  _buildActions(task, completed) {
    const isEd = !completed && UIState.editingTaskId === task.id;
    const wrap = document.createElement("div");
    wrap.className = CLASSES.actionRail;
    const hasHiddenDetails = !completed && task.notes && UIState.expandedTaskId !== task.id;

    if (!completed) {
      if (!isEd) {
        const detailBtn = this._button({
          action: "toggle-detail", id: task.id, className: CLASSES.actionButton,
          text: UIState.expandedTaskId === task.id ? "Ocultar" : "Detalles",
        });
        if (hasHiddenDetails) detailBtn.className = `${CLASSES.actionButton} ${CLASSES.actionButtonDetails}`;
        wrap.append(detailBtn);
        wrap.append(this._button({
          action: "edit", id: task.id, className: CLASSES.actionButton, text: "Editar",
        }));
      } else {
        wrap.append(this._button({
          action: "edit-save", id: task.id, className: CLASSES.actionButton, text: "Guardar",
        }));
        wrap.append(this._button({
          action: "edit-cancel", id: task.id, className: CLASSES.actionButton, text: "Cancelar",
        }));
      }
    }

    wrap.append(this._button({ action: "delete", id: task.id, className: CLASSES.actionButton, text: "Borrar" }));
    return wrap;
  },

  _animateIn(el) {
    el.style.opacity = "0"; el.style.transform = "translateY(8px)";
    requestAnimationFrame(() => { el.style.transition = `opacity ${CONFIG.ANIMATION_MS}ms ease, transform ${CONFIG.ANIMATION_MS}ms ease`; el.style.opacity = "1"; el.style.transform = "translateY(0)"; });
  },

  renderList(listEl, items, { completed, emptyMessage }) {
    listEl.innerHTML = "";
    if (items.length === 0) { const li = document.createElement("li"); li.className = CLASSES.emptyState; const p = document.createElement("p"); p.textContent = emptyMessage; li.appendChild(p); listEl.appendChild(li); return; }
    for (const t of items) listEl.appendChild(this.createItem(t, completed));
  },
};

/* ═══════════════════════════════════════════
   ANIMATIONS / DRAG & DROP
   ═══════════════════════════════════════════ */

const Animations = {
  complete(li, id) {
    const card = li?.querySelector(":scope > div:first-child");
    if (!card) {
      void App.patchTask(id, { completed: true, completedAt: Date.now() }, "Marcando tarea como completada...");
      return;
    }
    card.style.transition = `opacity ${CONFIG.ANIMATION_MS}ms ease, transform ${CONFIG.ANIMATION_MS}ms ease`; card.style.opacity = "0"; card.style.transform = "translateY(-6px)";
    setTimeout(() => {
      void App.patchTask(id, { completed: true, completedAt: Date.now() }, "Marcando tarea como completada...");
    }, CONFIG.ANIMATION_MS);
  },
  delete(li, id) {
    const card = li?.querySelector(":scope > div:first-child"); if (!card) { this._doDelete(id); return; }
    card.style.transition = `opacity ${CONFIG.ANIMATION_MS}ms ease, transform ${CONFIG.ANIMATION_MS}ms ease`; card.style.opacity = "0"; card.style.transform = "scale(0.95) translateY(-4px)";
    setTimeout(() => this._doDelete(id), CONFIG.ANIMATION_MS);
  },
  async _doDelete(id) {
    const result = await App.deleteTask(id);
    if (result.ok && result.removed) {
      UndoToast.show(result.removed, result.index);
    }
  },
};

const DragDrop = {
  _srcId: null, _srcSection: null,
  handleStart(e) {
    const li = e.target.closest("[data-id]");
    if (!li) return;
    this._srcId = li.dataset.id;
    const pl = li.closest("[data-section]");
    this._srcSection = pl ? pl.dataset.section : null;
  },
  handleEnter(e) { const l = e.target.closest("[data-section]"); if (l && this._srcSection && l.dataset.section !== this._srcSection) l.classList.add("drag-over"); },
  handleLeave(e) { const l = e.target.closest("[data-section]"); if (l && !l.contains(e.relatedTarget)) l.classList.remove("drag-over"); },
  handleDrop(e) {
    e.preventDefault(); document.querySelectorAll(".drag-over").forEach(el => el.classList.remove("drag-over"));
    const tl = e.target.closest("[data-section]"); if (!tl || !this._srcId) { this._reset(); return; }
    const d = tl.dataset.section; const s = this._srcSection; const tid = this._srcId; if (!tid) { this._reset(); return; }
    if (s !== d) { this._cross(s, d, tid); this._reset(); return; }
    const visibleIds = UIState.visibleTaskIds[d] || [];
    if (!visibleIds.includes(tid)) { this._reset(); return; }
    const li = e.target.closest("[data-id]");
    if (li?.dataset.id === tid) { this._reset(); return; }
    const targetId = li?.dataset.id && li.dataset.id !== tid ? li.dataset.id : null;
    if (TaskService.reorderVisible(visibleIds, tid, targetId)) void App.commit("Reordenando tareas...");
    this._reset();
  },
  _cross(s, d, id) {
    if ((s==="now"||s==="next") && d==="done") { TaskService.updateTask(id, { completed: true, completedAt: Date.now() }); if (!UIState.doneExpanded) { UIState.doneExpanded = true; const a = DOM.get("done-arrow"); if (a) a.style.transform = "rotate(90deg)"; } }
    else if (s==="done" && d==="now") TaskService.updateTask(id, { completed: false, completedAt: null, priority: "Alta" });
    else if (s==="done" && d==="next") { const t = TaskService.tasks.find(t=>t.id===id); TaskService.updateTask(id, { completed:false, completedAt:null, priority: t?.priority==="Alta"?"Media":(t?.priority??"Media") }); }
    else if (s==="now" && d==="next") TaskService.updateTask(id, { priority: "Media" });
    else if (s==="next" && d==="now") TaskService.updateTask(id, { priority: "Alta" });
    void App.commit("Actualizando tareas...");
  },
  _reset() { this._srcId = null; this._srcSection = null; },
};

/* ═══════════════════════════════════════════
   SIDEBAR — con sección de Proyectos
   ═══════════════════════════════════════════ */

const Sidebar = {
  build() {
    const c = DOM.get("sidebar-category-filters"); if (!c) return; c.innerHTML = "";
    for (const cat of ["all", ...CATEGORIES]) {
      const btn = document.createElement("button"); btn.type = "button"; btn.className = "sidebar-filter-btn" + (UIState.categoryFilter === cat ? " active" : ""); btn.dataset.sidebarFilter = cat;
      const dot = document.createElement("span"); Object.assign(dot.style, { width:"8px", height:"8px", borderRadius:"50%", flexShrink:"0" }); dot.style.background = cat === "all" ? "rgb(163 163 163)" : categoryColor(cat);
      const label = document.createElement("span"); label.textContent = cat === "all" ? "Todas" : cat; btn.append(dot, label);
      btn.addEventListener("click", () => { UIState.categoryFilter = cat; App.render(); }); c.appendChild(btn);
    }
  },
  update() {
    const st = TaskService.computeStats(); const pct = st.total === 0 ? 0 : Math.round((st.completed/st.total)*100);
    const ring = DOM.get("progress-ring-sidebar"); if (ring) ring.setAttribute("stroke-dashoffset", RING.SIDEBAR_CIRCUMFERENCE - (RING.SIDEBAR_CIRCUMFERENCE * pct / 100));
    const pc = DOM.get("progress-percent-sidebar"); if (pc) pc.textContent = `${pct}%`;
    const lb = DOM.get("sidebar-progress-label"); if (lb) lb.textContent = st.total === 0 ? "Sin tareas" : `${st.completed}/${st.total} completadas`;
    const se = DOM.get("sidebar-category-stats"); if (se) { se.innerHTML = "";
      for (const [cat, count] of Object.entries(st.byCategory)) {
        if (count === 0) continue; const li = document.createElement("li"); li.className = "space-y-1";
        const row = document.createElement("div"); row.className = "flex items-center justify-between";
        const ns = document.createElement("span"); ns.className = "text-stone-500 dark:text-neutral-400"; ns.textContent = cat;
        const cs = document.createElement("span"); cs.className = "font-mono-ui text-stone-600 dark:text-neutral-300"; cs.textContent = count;
        row.append(ns, cs); const bar = document.createElement("div"); bar.className = "category-bar";
        const fill = document.createElement("div"); fill.className = "category-bar-fill"; fill.style.width = `${Math.round((count/st.total)*100)}%`; fill.style.background = categoryColor(cat); bar.appendChild(fill);
        li.append(row, bar); se.appendChild(li);
      }
    }
    const pe = DOM.get("sidebar-projects"); if (pe) {
      const projects = TaskService.getActiveProjects();
      if (projects.length === 0) { pe.classList.add("hidden"); } else {
        pe.classList.remove("hidden"); const list = pe.querySelector(".sidebar-project-list"); if (list) { list.innerHTML = "";
          const allBtn = document.createElement("button"); allBtn.type = "button"; allBtn.className = "sidebar-filter-btn" + (UIState.projectFilter === "all" ? " active" : "");
          allBtn.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:rgb(163 163 163)"></span><span>Todos</span>`;
          allBtn.addEventListener("click", () => { UIState.projectFilter = "all"; App.render(); }); list.appendChild(allBtn);
          for (const [name, count] of projects) {
            const btn = document.createElement("button"); btn.type = "button"; btn.className = "sidebar-filter-btn" + (UIState.projectFilter === name ? " active" : "");
            btn.innerHTML = `<span style="width:8px;height:8px;border-radius:2px;flex-shrink:0;background:${projectColor(name)}"></span><span>${name}</span><span class="ml-auto font-mono-ui text-stone-400 dark:text-neutral-500">${count}</span>`;
            btn.addEventListener("click", () => { UIState.projectFilter = name; App.render(); }); list.appendChild(btn);
          }
        }
      }
    }
    const te = DOM.get("sidebar-total"); const pn = DOM.get("sidebar-pending"); const ce = DOM.get("sidebar-completed");
    if (te) te.textContent = st.total; if (pn) pn.textContent = st.pending; if (ce) ce.textContent = st.completed;
    const cf = DOM.get("sidebar-category-filters");
    if (cf) cf.querySelectorAll(".sidebar-filter-btn").forEach(b => b.classList.toggle("active", b.dataset.sidebarFilter === UIState.categoryFilter));
    const de = DOM.get("sidebar-date"); if (de) de.textContent = Utils.formatDate();
    const ti = DOM.get("sidebar-time"); if (ti) ti.textContent = Utils.formatTime();
    const lo = DOM.get("sidebar-location"); if (lo) lo.textContent = Location.city;
  },
};

/* ═══════════════════════════════════════════
   FOCUS MODE
   ═══════════════════════════════════════════ */

const FocusMode = {
  _tasks: [],
  _lastFocused: null,
  _handleTrap(e) {
    if (!UIState.focusMode || e.key !== "Tab") return;
    const overlay = DOM.get("focus-overlay");
    if (!overlay) return;
    const focusables = [...overlay.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(el => !el.classList.contains("hidden"));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  },
  open() {
    UIState.focusMode = true;
    UIState.focusIndex = 0;
    this._lastFocused = document.activeElement;
    this._tasks = TaskService.getPendingForFocus();
    const overlay = DOM.get("focus-overlay");
    overlay?.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    this._render();
    DOM.get("focus-toggle")?.classList.add("text-amber-500","border-amber-400");
    App._syncDisclosureState();
    document.addEventListener("keydown", this._handleTrap);
    setTimeout(() => DOM.get("focus-close")?.focus(), 0);
  },
  close() {
    UIState.focusMode = false;
    DOM.get("focus-overlay")?.classList.add("hidden");
    document.body.style.overflow = "";
    DOM.get("focus-toggle")?.classList.remove("text-amber-500","border-amber-400");
    document.removeEventListener("keydown", this._handleTrap);
    App._syncDisclosureState();
    App.render();
    this._lastFocused?.focus?.();
  },
  toggle() { if (UIState.focusMode) this.close(); else this.open(); },
  async completeCurrent() {
    const t = this._tasks[UIState.focusIndex];
    if (!t) return;

    const result = await App.patchTask(
      t.id,
      { completed: true, completedAt: Date.now() },
      "Actualizando tarea..."
    );

    if (!result.ok) return;

    this._tasks = TaskService.getPendingForFocus();
    if (UIState.focusIndex >= this._tasks.length) UIState.focusIndex = 0;
    this._render();
  },
  skipCurrent() { UIState.focusIndex = (UIState.focusIndex + 1) % Math.max(1, this._tasks.length); this._render(); },
  _render() {
    const card = DOM.get("focus-card"); const empty = DOM.get("focus-empty"); const nav = DOM.get("focus-nav"); const counter = DOM.get("focus-counter");
    if (!card) return;
    if (this._tasks.length === 0) { card.innerHTML = ""; card.classList.add("hidden"); empty?.classList.remove("hidden"); nav?.classList.add("hidden"); if (counter) counter.textContent = ""; return; }
    card.classList.remove("hidden"); empty?.classList.add("hidden"); nav?.classList.remove("hidden");
    const t = this._tasks[UIState.focusIndex]; if (!t) return;
    const color = categoryColor(t.category);
    const urgent = t.priority === "Alta" || Utils.isOverdue(t.dueDate) || Utils.isDueToday(t.dueDate);
    const dueTxt = t.dueDate ? Utils.formatDueDate(t.dueDate) : "";
    const dueClass = Utils.isOverdue(t.dueDate) ? "text-red-500 dark:text-red-400" : Utils.isDueToday(t.dueDate) ? "text-amber-700 dark:text-amber-300" : "text-stone-500 dark:text-neutral-500";
    const notes = t.notes ? `<p class="text-sm text-stone-500 dark:text-neutral-400 mt-4 text-left whitespace-pre-line max-h-28 overflow-y-auto italic border-t border-stone-100 dark:border-neutral-800 pt-3">${Utils._escapeHtml(t.notes)}</p>` : "";
    const pColor = t.project ? projectColor(t.project) : "";
    card.innerHTML = `<div class="rounded-2xl border ${urgent?"border-amber-300/50 ring-2 ring-amber-400/20 dark:ring-neutral-600/30":"border-stone-200/60"} bg-white p-6 sm:p-8 dark:border-neutral-700/50 dark:bg-neutral-900">
      <h3 class="text-lg sm:text-xl font-semibold text-stone-800 dark:text-neutral-100 leading-relaxed text-center">${Utils._escapeHtml(t.text)}</h3>
      <div class="flex items-center justify-center gap-2 mt-4 flex-wrap">
        ${dueTxt ? `<span class="inline-flex items-center gap-1 rounded-md border border-stone-200/60 bg-stone-50 px-2 py-0.5 text-[10px] font-mono-ui font-semibold ${dueClass} dark:border-neutral-700/50 dark:bg-neutral-800">${dueTxt}</span>` : ""}
        <span class="${TaskRenderer.priorityClasses(t.priority)}">${t.priority}</span>
        <span class="inline-flex items-center gap-1 rounded-full border border-stone-200/60 bg-white px-2.5 py-0.5 text-[11px] font-medium text-stone-400 dark:border-neutral-700/50 dark:bg-neutral-800 dark:text-neutral-500"><span class="w-1.5 h-1.5 rounded-full" style="background:${color}"></span>${t.category}</span>
        ${t.project ? `<span class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold" style="border-color:${pColor}40;background:${pColor}12;color:${pColor}"><span class="w-1.5 h-1.5 rounded-sm shrink-0" style="background:${pColor}"></span>${Utils._escapeHtml(t.project).slice(0, CONFIG.MAX_PROJECT_LENGTH)}</span>` : ""}
      </div>
      <p class="text-[10px] text-stone-300 dark:text-neutral-600 mt-3 font-mono-ui text-center">${Utils.relativeTime(t.createdAt)}</p>
      ${notes}
    </div>`;
    if (counter) counter.textContent = `${UIState.focusIndex + 1} de ${this._tasks.length} pendientes`;
  },
};

/* ═══════════════════════════════════════════
   KEYBOARD / LIST ACTIONS
   ═══════════════════════════════════════════ */

/**
 * Keyboard — Atajos globales y gestión de teclas en edición inline.
 *
 * Atajos (modificadores Cmd/Ctrl):
 *   Ctrl/⌘ + K          → Enfocar campo de búsqueda
 *   Ctrl/⌘ + F          → Alternar Focus Mode (solo cuando no hay input/textarea activo)
 *   Ctrl/⌘ + Shift + C  → Completar todas las tareas pendientes
 *   Ctrl/⌘ + Shift + X  → Vaciar todas las tareas completadas
 *   Escape              → Cerrar overlay / panel / edición / búsqueda (prioridad en cascada)
 *
 * Edición inline:
 *   Enter   → Guardar edición
 *   Escape  → Cancelar edición
 */
const Keyboard = {
  init() { document.addEventListener("keydown", e => this._global(e)); document.addEventListener("keydown", e => this._edit(e)); },
  /** @private Gestiona atajos globales (búsqueda, focus mode, acciones masivas, cascada de escape). */
  _global(e) {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === "k") { e.preventDefault(); Search.focus(); return; }
    if (mod && e.key === "f" && !document.activeElement?.matches("input, textarea")) { e.preventDefault(); FocusMode.toggle(); return; }
    if (mod && e.shiftKey && e.key === "C") { e.preventDefault(); if (TaskService.hasPending()) { TaskService.completeAll(); void App.commit("Completando tareas..."); } return; }
    if (mod && e.shiftKey && e.key === "X") { e.preventDefault(); if (TaskService.hasCompleted()) { TaskService.clearCompleted(); void App.commit("Eliminando tareas completadas..."); } return; }
    if (e.key !== "Escape") return;
    if (UIState.focusMode) { FocusMode.close(); return; }
    if (UIState.expandedTaskId) { UIState.expandedTaskId = null; App.render(); return; }
    const ih = DOM.get("input-help"); if (ih && !ih.classList.contains("hidden")) { App._setInputHelpOpen(false); return; }
    if (UIState.selectorsExpanded) { App._setSelectorsOpen(false); return; }
    if (UIState.editingTaskId && document.activeElement?.matches('input[data-role="edit-text"]')) { UIState.editingTaskId = null; App.render(); return; }
    const si = DOM.get("search-input"); if (si?.value) { si.value = ""; App.render(); Search.updateHints(); si.focus(); return; }
    if (document.activeElement === si) si.blur();
  },
  _edit(e) {
    if (!UIState.editingTaskId || !document.activeElement?.matches('input[data-role="edit-text"]')) return;
    if (e.key === "Escape") { UIState.editingTaskId = null; App.render(); return; }
    if (e.key !== "Enter") return;
    const validation = TaskService.validateText(UIState.editingTaskId, document.activeElement.value);
    if (!validation.ok) return;
    void (async () => {
      const r = await App.patchTask(
        UIState.editingTaskId,
        { text: validation.text },
        "Guardando texto..."
      );
      if (!r.ok) return;
      UIState.editingTaskId = null;
      App.render();
    })();
  },
};

const ListActions = {
  handle(event) {
    const btn = event.target.closest("[data-action]"); if (!btn) return;
    const { action, id } = btn.dataset; if (!id) return; const li = btn.closest("li");
    switch (action) {
      case "complete": Animations.complete(li, id); break;
      case "restore": void App.patchTask(id, { completed: false, completedAt: null }, "Restaurando tarea..."); break;
      case "delete": Animations.delete(li, id); break;
      case "toggle-detail": UIState.expandedTaskId = UIState.expandedTaskId === id ? null : id; App.render(); break;
      case "edit": UIState.editingTaskId = id; App.render(); setTimeout(() => document.querySelector(`li[data-id="${id}"] input[data-role="edit-text"]`)?.focus(), 0); break;
      case "edit-cancel": UIState.editingTaskId = null; App.render(); break;
      case "edit-save": {
        const inp = li?.querySelector('input[data-role="edit-text"]');
        const validation = TaskService.validateText(id, inp?.value ?? "");
        if (!validation.ok && inp) {
          inp.setCustomValidity(validation.error === "TOO_LONG" ? `Max ${CONFIG.MAX_TASK_LENGTH} chars.` : validation.error === "DUPLICATE" ? "Ya existe." : "Escribe algo.");
          inp.reportValidity();
          return;
        }
        void (async () => {
          const r = await App.patchTask(id, { text: validation.text }, "Guardando texto...");
          if (!r.ok && inp) {
            inp.setCustomValidity(r.error === "TOO_LONG" ? `Max ${CONFIG.MAX_TASK_LENGTH} chars.` : r.error === "DUPLICATE" ? "Ya existe." : "Escribe algo.");
            inp.reportValidity();
            return;
          }
          UIState.editingTaskId = null;
          App.render();
        })();
        break;
        /*
        if (!r.ok && inp) { inp.setCustomValidity(r.error === "TOO_LONG" ? `Máx ${CONFIG.MAX_TASK_LENGTH} chars.` : r.error === "DUPLICATE" ? "Ya existe." : "Escribe algo."); inp.reportValidity(); return; }
        */
      }
    }
  },
};

/* ═══════════════════════════════════════════
   APP
   ═══════════════════════════════════════════ */

const App = {
  /**
   * Persiste el estado actual en el servidor y refresca todas las secciones renderizadas.
   */
  async commit(message = "Sincronizando cambios...") {
    const snapshot = structuredClone(TaskService.tasks);
    this.render();
    NetworkUI.showPending(message);

    try {
      await TaskService.save();
      NetworkUI.hideError();
      this.render();
      return true;
    } catch (err) {
      TaskService.tasks = snapshot;
      NetworkUI.showError(err.message);
      this.render();
      return false;
    } finally {
      NetworkUI.hidePending();
    }
  },
  async createTask(text, category, priority, options = {}) {
    NetworkUI.showPending("Guardando tarea...");

    try {
      const result = await TaskService.createRemote(text, category, priority, options);
      if (result.ok) {
        NetworkUI.hideError();
        this.render();
      }
      return result;
    } catch (err) {
      NetworkUI.showError(err.message);
      this.render();
      return { ok: false, error: err.message };
    } finally {
      NetworkUI.hidePending();
    }
  },
  async patchTask(id, updates, pendingMessage = "Guardando cambios...") {
    NetworkUI.showPending(pendingMessage);

    try {
      const pendingPatch = TaskService.patchRemote(id, updates);
      this.render();
      const result = await pendingPatch;
      if (result.ok) {
        NetworkUI.hideError();
        this.render();
      }
      return result;
    } catch (err) {
      NetworkUI.showError(err.message);
      this.render();
      return { ok: false, error: err.message };
    } finally {
      NetworkUI.hidePending();
    }
  },
  async deleteTask(id) {
    NetworkUI.showPending("Eliminando tarea...");

    try {
      const pendingDelete = TaskService.removeRemote(id);
      this.render();
      const result = await pendingDelete;
      NetworkUI.hideError();
      return { ok: true, ...result };
    } catch (err) {
      NetworkUI.showError(err.message);
      this.render();
      return { ok: false, error: err.message };
    } finally {
      NetworkUI.hidePending();
    }
  },
  _getViewState() {
    const query = Search.getQuery();
    const hasQuery = Boolean(query);
    const { now, next, done } = TaskService.getVisible(query, UIState.categoryFilter, UIState.projectFilter);
    const showWelcome = TaskService.count === 0 && !hasQuery;
    return {
      query,
      hasQuery,
      now,
      next,
      done,
      showWelcome,
      showGreeting: !showWelcome && TaskService.count > 0,
      showNow: !showWelcome && (now.length > 0 || hasQuery),
      showNext: !showWelcome,
      showDone: !showWelcome,
      emptySearchMessage: "No encontrÃ© nada con esa bÃºsqueda.",
    };
  },
  _emptyMessage(section, view) {
    const hasScopedFilters = UIState.categoryFilter !== "all" || UIState.projectFilter !== "all";
    if (view.hasQuery && hasScopedFilters) return "No hay resultados aqui con la busqueda y los filtros activos.";
    if (view.hasQuery) return "No hay resultados para esa busqueda en esta seccion.";
    if (hasScopedFilters) {
      if (section === "done") return "Nada completado con los filtros activos.";
      return "No hay tareas en esta vista con los filtros activos.";
    }
    if (section === "now") return "Nada urgente ahora mismo.";
    if (section === "next") return "Anade una tarea arriba para empezar.";
    return "Todavia no has completado ninguna tarea.";
  },
  _setInputHelpOpen(open) {
    const panel = DOM.get("input-help");
    const btn = DOM.get("toggle-input-help");
    if (panel) panel.classList.toggle("hidden", !open);
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
    this._syncDisclosureState();
  },
  _setSelectorsOpen(open) {
    UIState.selectorsExpanded = open;
    const panel = DOM.get("selector-panel");
    const btn = DOM.get("toggle-selectors");
    const arrow = DOM.get("selector-arrow");
    if (panel) panel.classList.toggle("hidden", !open);
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (arrow) arrow.style.transform = open ? "rotate(90deg)" : "rotate(0deg)";
    this._syncDisclosureState();
  },
  _renderActiveFiltersSummary(query) {
    const section = DOM.get("active-filters-summary");
    const chips = DOM.get("active-filter-chips");
    const clear = DOM.get("clear-active-filters");
    if (!section || !chips || !clear) return;
    const items = [];
    if (query) items.push({ key: "query", label: `Busqueda: ${query}` });
    if (UIState.categoryFilter !== "all") items.push({ key: "category", label: `Categoria: ${UIState.categoryFilter}` });
    if (UIState.projectFilter !== "all") items.push({ key: "project", label: `Proyecto: ${UIState.projectFilter}` });
    chips.innerHTML = "";
    for (const item of items) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.dataset.clearFilter = item.key;
      chip.className = "inline-flex items-center gap-1 rounded-full border border-stone-200/70 bg-stone-50 px-3 py-1 text-[11px] font-medium text-stone-600 transition hover:border-stone-300 hover:text-stone-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:text-neutral-100";
      chip.textContent = `${item.label} x`;
      chips.appendChild(chip);
    }
    const hasItems = items.length > 0;
    section.classList.toggle("hidden", !hasItems);
    clear.classList.toggle("hidden", !hasItems);
  },
  _syncDisclosureState() {
    const doneBtn = DOM.get("toggle-done");
    if (doneBtn) doneBtn.setAttribute("aria-expanded", UIState.doneExpanded ? "true" : "false");
    const selectorsBtn = DOM.get("toggle-selectors");
    if (selectorsBtn) selectorsBtn.setAttribute("aria-expanded", UIState.selectorsExpanded ? "true" : "false");
    const helpBtn = DOM.get("toggle-input-help");
    if (helpBtn) helpBtn.setAttribute("aria-expanded", DOM.get("input-help")?.classList.contains("hidden") ? "false" : "true");
    const focusBtn = DOM.get("focus-toggle");
    if (focusBtn) focusBtn.setAttribute("aria-pressed", UIState.focusMode ? "true" : "false");
  },
  /**
   * Recalcula la vista activa y actualiza todos los fragmentos dinámicos de la UI.
   */
  render() {
    const view = this._getViewState();
    UIState.visibleTaskIds = { now: view.now.map(t => t.id), next: view.next.map(t => t.id), done: view.done.map(t => t.id) };
    const { now, next, done } = view;
    this._updateFilterPills(); Progress.update(); Greeting.update(); Welcome.update();
    this._renderActiveFiltersSummary(view.query);
    this._syncDisclosureState();

    const pp = DOM.get("active-project-pill");
    if (pp) { if (UIState.projectFilter && UIState.projectFilter !== "all") { pp.classList.remove("hidden"); pp.textContent = `${UIState.projectFilter} x`; } else { pp.classList.add("hidden"); } }

    const dc = DOM.get("done-count"); if (dc) dc.textContent = TaskService.tasks.filter(t => t.completed).length;
    const cb = DOM.get("clear-search"); if (cb) cb.classList.toggle("hidden", !view.hasQuery);
    TaskRenderer.renderList(DOM.get("next-list"), next, { completed: false, emptyMessage: this._emptyMessage("next", view) });
    TaskRenderer.renderList(DOM.get("now-list"), now, { completed: false, emptyMessage: this._emptyMessage("now", view) });
    const dl = DOM.get("done-list");
    if (UIState.doneExpanded) { dl?.classList.remove("hidden"); TaskRenderer.renderList(dl, done, { completed: true, emptyMessage: this._emptyMessage("done", view) }); }
    else { dl?.classList.add("hidden"); if (dl) dl.innerHTML = ""; }
    DOM.get("welcome-section")?.classList.toggle("hidden", !view.showWelcome);
    DOM.get("greeting-section")?.classList.toggle("hidden", !view.showGreeting);
    DOM.get("now-section")?.classList.toggle("hidden", !view.showNow);
    DOM.get("next-section")?.classList.toggle("hidden", !view.showNext);
    DOM.get("done-section")?.classList.toggle("hidden", !view.showDone);
    const pills = DOM.categoryPillsSection; if (pills) pills.style.display = view.showWelcome ? "none" : "";
    const cn = DOM.get("complete-all-now"); const cx = DOM.get("complete-all-next");
    if (cn && cx) { cn.classList.toggle("hidden", !view.showNow); cx.classList.toggle("hidden", view.showNow); }
    UIState.lastAddedTaskId = null; Sidebar.update();
    const classicDl = DOM.get("classic-project-options");
    if (classicDl) { classicDl.innerHTML = ""; for (const n of TaskService.getAllProjectNames()) { const o = document.createElement("option"); o.value = n; classicDl.appendChild(o); } }
  },
  _updateFilterPills() {
    DOM.categoryFilterButtons.forEach(b => {
      const variant = b.dataset.categoryFilter === UIState.categoryFilter ? CLASSES.filterPill.active : CLASSES.filterPill.inactive;
      b.className = `${CLASSES.filterPillBase} ${variant}`;
    });
  },
  /**
   * Conecta todos los event listeners del DOM de la aplicación.
   *
   * Agrupados por funcionalidad:
   *   • Task form     — submit, preview del input, enter-hint, ayuda de sintaxis
   *   • Selectors     — panel de campos guiados
   *   • Search        — input con debounce, botón limpiar
   *   • Filters       — pills de categoría, pill de proyecto, chips de filtros activos, limpiar todo
   *   • Theme         — alternar claro/oscuro
   *   • Focus Mode    — abrir/cerrar/completar/saltar
   *   • Task lists    — drag-and-drop + delegación de click
   *   • Bulk actions  — completar todas, vaciar completadas (ámbito visible)
   *   • Undo toast    — botón deshacer
   *   • Welcome       — cargar tareas de ejemplo
   *   • Click-outside — cerrar tooltip de sintaxis automáticamente
   *   • Keyboard      — atajos globales (via Keyboard.init)
   */
  _bindEvents() {
    const completeVisible = (...sections) => {
      const ids = [...new Set(sections.flatMap(section => UIState.visibleTaskIds[section] || []))];
      if (ids.length === 0) return;
      if (TaskService.completeTasks(ids)) void this.commit("Sincronizando tareas...");
    };
    const clearVisibleDone = () => {
      const ids = UIState.visibleTaskIds.done || [];
      if (ids.length === 0) return;
      TaskService.clearCompleted(ids);
      void this.commit("Eliminando tareas completadas...");
    };

    DOM.get("task-form")?.addEventListener("submit", async e => {
      e.preventDefault(); const inp = DOM.get("task-input"); const raw = Utils.safeTrim(inp?.value); if (!raw) return;
      if (inp) inp.setCustomValidity("");
      const p = InputParser.parse(raw); const text = p.text; const cat = p.category || DOM.get("task-category")?.value || "Personal"; const pri = p.priority || DOM.get("task-priority")?.value || "Media";
      if (!text) return;
      const dueDate = p.dueDate || (DOM.get("task-duedate")?.value ? Utils.startOfDay(Date.parse(DOM.get("task-duedate").value + "T00:00:00")) : null);
      const project = normalizeProjectName(p.project || DOM.get("task-project")?.value);
      const r = await this.createTask(text, cat, pri, { dueDate, project });
      if (!r.ok) { if (inp) { inp.setCustomValidity(r.error === "TOO_LONG" ? `Máx ${CONFIG.MAX_TASK_LENGTH} chars.` : r.error === "DUPLICATE" ? "Ya existe." : "Escribe algo."); inp.reportValidity(); } return; }
      UIState.lastAddedTaskId = r.task.id;
      if (inp) { inp.value = ""; inp.focus(); }
      DOM.get("input-preview")?.classList.add("hidden");
      this._setInputHelpOpen(false);
      const eh = DOM.get("enter-hint"); if (eh) eh.classList.remove("visible");
      const cs2 = DOM.get("task-category"); const ps2 = DOM.get("task-priority"); if (cs2) cs2.value = "Personal"; if (ps2) ps2.value = "Media";
      const dd = DOM.get("task-duedate"); if (dd) dd.value = "";
      const pj = DOM.get("task-project"); if (pj) pj.value = "";
    });
    const ti = DOM.get("task-input"); const eh = DOM.get("enter-hint");
    ti?.addEventListener("input", () => { ti.setCustomValidity(""); if (eh) eh.classList.toggle("visible", Utils.safeTrim(ti.value).length > 0); InputParser.updatePreview(ti.value); });
    ti?.addEventListener("focus", () => { if (eh && Utils.safeTrim(ti.value).length > 0) eh.classList.add("visible"); });
    ti?.addEventListener("blur", () => { if (eh) eh.classList.remove("visible"); });
    DOM.get("toggle-input-help")?.addEventListener("click", () => {
      const panel = DOM.get("input-help");
      this._setInputHelpOpen(panel?.classList.contains("hidden"));
    });
    DOM.get("toggle-selectors")?.addEventListener("click", () => this._setSelectorsOpen(!UIState.selectorsExpanded));
    const si = DOM.get("search-input");
    si?.addEventListener("input", () => { Search.updateHints(); if (UIState.searchDebounceTimer) clearTimeout(UIState.searchDebounceTimer); UIState.searchDebounceTimer = setTimeout(() => this.render(), CONFIG.SEARCH_DEBOUNCE_MS); });
    DOM.get("clear-search")?.addEventListener("click", () => { Search.clear(); this.render(); Search.updateHints(); Search.focus(); });
    DOM.get("active-project-pill")?.addEventListener("click", () => setProjectFilter(null));
    DOM.get("theme-toggle")?.addEventListener("click", () => Theme.toggle());
    DOM.get("focus-toggle")?.addEventListener("click", () => FocusMode.toggle());
    DOM.get("focus-close")?.addEventListener("click", () => FocusMode.close());
    DOM.get("focus-complete-btn")?.addEventListener("click", () => FocusMode.completeCurrent());
    DOM.get("focus-skip-btn")?.addEventListener("click", () => FocusMode.skipCurrent());
    DOM.categoryFilterButtons.forEach(b => b.addEventListener("click", () => { UIState.categoryFilter = b.dataset.categoryFilter; this.render(); }));
    DOM.get("toggle-done")?.addEventListener("click", () => { UIState.doneExpanded = !UIState.doneExpanded; const a = DOM.get("done-arrow"); if (a) a.style.transform = UIState.doneExpanded?"rotate(90deg)":"rotate(0deg)"; this.render(); });
    DOM.get("clear-active-filters")?.addEventListener("click", () => {
      UIState.categoryFilter = "all";
      UIState.projectFilter = "all";
      Search.clear();
      Search.updateHints();
      this.render();
    });
    DOM.get("active-filter-chips")?.addEventListener("click", e => {
      const chip = e.target.closest("[data-clear-filter]");
      if (!chip) return;
      if (chip.dataset.clearFilter === "query") Search.clear();
      if (chip.dataset.clearFilter === "category") UIState.categoryFilter = "all";
      if (chip.dataset.clearFilter === "project") UIState.projectFilter = "all";
      Search.updateHints();
      this.render();
    });
    document.addEventListener("click", e => {
      const help = DOM.get("input-help");
      const helpBtn = DOM.get("toggle-input-help");
      if (help && !help.classList.contains("hidden") && !help.contains(e.target) && !helpBtn?.contains(e.target)) this._setInputHelpOpen(false);
    });
    ["now-list","next-list","done-list"].forEach(id => {
      const l = DOM.get(id); if (!l) return;
      l.addEventListener("dragover", e => e.preventDefault()); l.addEventListener("drop", e => DragDrop.handleDrop(e));
      l.addEventListener("dragstart", e => DragDrop.handleStart(e)); l.addEventListener("dragenter", e => DragDrop.handleEnter(e));
      l.addEventListener("dragleave", e => DragDrop.handleLeave(e)); l.addEventListener("click", e => ListActions.handle(e));
    });
    DOM.get("clear-completed")?.addEventListener("click", () => clearVisibleDone());
    DOM.get("complete-all-now")?.addEventListener("click", () => completeVisible("now"));
    DOM.get("complete-all-next")?.addEventListener("click", () => completeVisible("next"));
    DOM.get("sidebar-complete-all")?.addEventListener("click", () => completeVisible("now", "next"));
    DOM.get("sidebar-clear-done")?.addEventListener("click", () => clearVisibleDone());
    DOM.get("undo-toast-btn")?.addEventListener("click", () => UndoToast.undo());
    DOM.get("load-examples")?.addEventListener("click", () => {
      for (const ex of EXAMPLE_TASKS) {
        TaskService.add(ex.text, ex.category, ex.priority, {
          dueDate: ex.dueDate,
          project: ex.project,
          notes: ex.notes || "",
        });
      }
      void this.commit("Sincronizando tareas de ejemplo...");
    });
    Keyboard.init();
  },
  /**
   * Inicializa tema, datos, listeners y el primer renderizado.
   */
  async init() {
    Theme.load();
    this._bindEvents();
    ShortcutHints.apply();
    FormVisualOrder.apply();
    Location.fetch();
    setInterval(() => Location._applyEverywhere(), CONFIG.CLOCK_INTERVAL_MS);
    Sidebar.build();
    const ht = DOM.get("time-location"); if (ht) ht.textContent = Location.formatTimeLocation();
    NetworkUI.showLoading();
    try {
      await TaskService.load();
      NetworkUI.hideError();
    } catch (err) {
      NetworkUI.showError(err.message);
    }
    NetworkUI.hideLoading();
    this.render();
    DOM.get("network-retry")?.addEventListener("click", async () => {
      NetworkUI.showLoading();
      try {
        await TaskService.load();
        NetworkUI.hideError();
      } catch (err) {
        NetworkUI.showError(err.message);
      }
      NetworkUI.hideLoading();
      this.render();
    });
  },
};

App.init();
