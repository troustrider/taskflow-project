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
 * Badge hierarchy (psicología de la atención):
 *   1. Fecha  — rounded-md, font-mono (urgencia temporal, sistema 1)
 *   2. Prioridad — rounded-full, color semáforo (señal cromática)
 *   3. Categoría — rounded-full, dot ● circular + fondo neutro
 *   4. Proyecto — rounded-md, dot ■ cuadrado + color único por proyecto
 */

/* ═══════════════════════════════════════════
   CONSTANTES
   ═══════════════════════════════════════════ */

const CONFIG = Object.freeze({
  STORAGE_KEY: "taskflow_tasks_v13", THEME_KEY: "taskflow_theme_v12", LOCATION_CACHE_KEY: "taskflow_location",
  MAX_TASK_LENGTH: 300, MAX_NOTES_LENGTH: 2000, MAX_PROJECT_LENGTH: 30,
  UNDO_TIMEOUT_MS: 4000, SEARCH_DEBOUNCE_MS: 150, LOCATION_TIMEOUT_MS: 5000,
  ANIMATION_MS: 220, CLOCK_INTERVAL_MS: 60000,
});

const CATEGORIES = Object.freeze(["Trabajo", "Personal", "Estudio", "Salud", "Gestiones"]);

const CATEGORY_COLORS = Object.freeze({
  Trabajo: "#c2410c", Personal: "#2563eb", Estudio: "#7c3aed",
  Salud: "#db2777", Gestiones: "#78716c",
});

/** Tailwind classes for tinted category badges — each category gets its own identity. */
const CATEGORY_BADGE_CLASSES = Object.freeze({
  Trabajo:   "border-orange-200/60 bg-orange-50 text-orange-700 dark:border-orange-800/40 dark:bg-orange-950/30 dark:text-orange-400",
  Personal:  "border-blue-200/60 bg-blue-50 text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/30 dark:text-blue-400",
  Estudio:   "border-violet-200/60 bg-violet-50 text-violet-700 dark:border-violet-800/40 dark:bg-violet-950/30 dark:text-violet-400",
  Salud:     "border-pink-200/60 bg-pink-50 text-pink-700 dark:border-pink-800/40 dark:bg-pink-950/30 dark:text-pink-400",
  Gestiones: "border-stone-200/60 bg-stone-100 text-stone-600 dark:border-neutral-700/50 dark:bg-neutral-800 dark:text-neutral-400",
});

/** Paleta de proyectos — tonos fríos/verdes para no solapar con categorías (cálidas). */
const PROJECT_COLORS = Object.freeze([
  "#6366f1", "#8b5cf6", "#06b6d4", "#0891b2", "#059669", "#0284c7", "#7c3aed",
]);

function projectColor(name) {
  if (!name) return PROJECT_COLORS[0];
  let h = 0; for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return PROJECT_COLORS[Math.abs(h) % PROJECT_COLORS.length];
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
  badgeBase: "inline-flex items-center h-[22px] text-[11px] leading-none",
  priorityBase: "inline-flex items-center h-[22px] rounded-full border px-2.5 text-[11px] font-semibold leading-none",
  priority: {
    Alta:  "border-red-200/80 bg-red-50 text-red-600 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-400",
    Media: "border-stone-200/80 bg-stone-100 text-stone-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400",
    Baja:  "border-stone-200/60 bg-white text-stone-400 dark:border-neutral-700/60 dark:bg-neutral-900 dark:text-neutral-500",
  },
  categoryBase: "inline-flex items-center gap-1.5 h-[22px] rounded-full border px-2.5 text-[11px] font-medium leading-none",
  projectBadge: "inline-flex items-center gap-1.5 h-[22px] rounded-md border px-2 text-[11px] font-semibold leading-none cursor-pointer transition-colors duration-150",
  taskCard: {
    pending:   "group relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 rounded-xl border border-stone-200/60 bg-white px-4 py-3 transition duration-200 ease-out hover:border-stone-300/80 dark:border-neutral-700/50 dark:bg-neutral-900 dark:hover:border-neutral-600",
    completed: "group relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 rounded-xl border border-stone-200/40 bg-white px-4 py-3 transition duration-200 ease-out opacity-50 hover:opacity-80 dark:border-neutral-700/40 dark:bg-neutral-900 dark:hover:border-neutral-600",
  },
  checkButtonBase: "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold transition duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:focus:ring-neutral-600",
  checkButton: {
    pending:   "border-stone-200/80 bg-white text-stone-300 hover:border-amber-400 hover:text-amber-500 hover:bg-amber-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-600 dark:hover:border-neutral-500 dark:hover:text-neutral-300",
    completed: "border-amber-400 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700",
  },
  actionButton: "task-actions rounded-lg px-2 py-1 text-[11px] font-medium text-stone-400 transition duration-150 ease-out hover:bg-stone-100 hover:text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 dark:focus:ring-neutral-600",
  emptyState: "rounded-xl border border-dashed border-stone-200/50 bg-white px-4 py-8 text-sm text-stone-400 text-center dark:border-neutral-700/40 dark:bg-neutral-900 dark:text-neutral-600",
  filterPill: {
    active: "border-amber-400 bg-amber-50 text-amber-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200",
    inactive: "border-stone-200/60 bg-white text-stone-400 hover:border-stone-300 hover:text-stone-600 dark:border-neutral-700/50 dark:bg-neutral-900 dark:text-neutral-500 dark:hover:border-neutral-600 dark:hover:text-neutral-300",
  },
  filterPillBase: "category-filter-btn rounded-full border px-2 py-1.5 text-[11px] sm:text-xs font-medium transition duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:focus:ring-neutral-600",
  editInput: "w-full min-w-[200px] rounded-lg border border-stone-200/80 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:ring-neutral-600",
  dueBadge: {
    base:    "inline-flex items-center gap-1 h-[22px] rounded-md border px-2 text-[10px] font-mono-ui leading-none",
    overdue: "border-red-300/80 bg-red-50 text-red-600 font-semibold dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-400",
    today:   "border-blue-200/80 bg-blue-50 text-blue-600 font-semibold dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-400",
    future:  "border-stone-300/80 bg-stone-100 text-stone-500 font-medium dark:border-neutral-700/50 dark:bg-neutral-800 dark:text-neutral-500",
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
  safeTrim(v) { return (v ?? "").toString().trim(); },
  normalizeText(t) { return this.safeTrim(t).replace(/\s+/g, " ").toLowerCase(); },
  formatDate() {
    const d = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
    const m = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
    const n = new Date(); return `${d[n.getDay()]} ${n.getDate()} de ${m[n.getMonth()]}`;
  },
  formatTime() { return new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }); },
  currentHour() { return new Date().getHours(); },
  relativeTime(ts) {
    if (!ts) return ""; const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000); const hrs = Math.floor(diff / 3600000); const days = Math.floor(diff / 86400000);
    if (mins < 1) return "ahora"; if (mins < 60) return `hace ${mins} min`;
    if (hrs < 24) return `hace ${hrs} h`; if (days < 7) return `hace ${days} d`;
    const d = new Date(ts); const mo = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
    return `${d.getDate()} ${mo[d.getMonth()]}`;
  },
  highlightText(text, q) {
    if (!q || q.length < 2) return this._escapeHtml(text);
    return this._escapeHtml(text).replace(new RegExp(`(${this._escapeRegex(q)})`, "gi"), '<mark class="search-highlight">$1</mark>');
  },
  _escapeHtml(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; },
  _escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); },
  startOfDay(ts) { const d = new Date(ts); d.setHours(0,0,0,0); return d.getTime(); },
  isDueToday(ts) { return ts && this.startOfDay(ts) === this.startOfDay(Date.now()); },
  isOverdue(ts) { return ts && this.startOfDay(ts) < this.startOfDay(Date.now()); },
  formatDueDate(ts) {
    if (!ts) return "";
    const diff = (this.startOfDay(ts) - this.startOfDay(Date.now())) / 86400000;
    if (diff === 0) return "hoy"; if (diff === 1) return "mañana"; if (diff === -1) return "ayer";
    const d = new Date(ts);
    const days = ["dom","lun","mar","mié","jue","vie","sáb"];
    const mo = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
    return diff > 1 && diff <= 6 ? `${days[d.getDay()]} ${d.getDate()} ${mo[d.getMonth()]}` : `${d.getDate()} ${mo[d.getMonth()]}`;
  },
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
  parse(raw) {
    let text = raw; let category = null; let priority = null; let dueDate = null; let project = null;
    const cm = text.match(/#\w+/gi);
    if (cm) { for (const tk of cm) { if (this._catMap[tk.toLowerCase()]) { category = this._catMap[tk.toLowerCase()]; text = text.replace(tk, ""); break; } } }
    const pm = text.match(/!\w+/gi);
    if (pm) { for (const tk of pm) { if (this._priMap[tk.toLowerCase()]) { priority = this._priMap[tk.toLowerCase()]; text = text.replace(tk, ""); break; } } }
    const dm = text.match(/@[\w\-áéíóúñü]+/gi);
    if (dm) { for (const tk of dm) { const p = Utils.parseDateToken(tk); if (p) { dueDate = p; text = text.replace(tk, ""); break; } } }
    const pjm = text.match(/\/([^\s]+)/);
    if (pjm) { let pn = pjm[1].charAt(0).toUpperCase() + pjm[1].slice(1).toLowerCase(); project = pn.slice(0, CONFIG.MAX_PROJECT_LENGTH); text = text.replace(pjm[0], ""); }
    return { text: text.replace(/\s+/g, " ").trim(), category, priority, dueDate, project };
  },
  updatePreview(val) {
    const pv = DOM.get("input-preview"); if (!pv) return;
    const tr = Utils.safeTrim(val);
    if (!tr) { pv.classList.add("hidden"); return; }
    const p = this.parse(tr);
    const cat = p.category || DOM.get("task-category")?.value || "Personal";
    const pri = p.priority || DOM.get("task-priority")?.value || "Media";
    pv.classList.remove("hidden");
    const dot = DOM.get("preview-cat-dot"); if (dot) dot.style.background = CATEGORY_COLORS[cat] || "#999";
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
  load() {
    try { const r = localStorage.getItem(CONFIG.STORAGE_KEY); const p = r ? JSON.parse(r) : []; return Array.isArray(p) ? p.map(t => this._normalize(t)) : []; }
    catch { return []; }
  },
  save(tasks) { localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(tasks)); },
  _normalize(t) {
    const o = { id: t.id ?? crypto.randomUUID(), text: t.text ?? "", category: t.category ?? "Personal", priority: t.priority ?? "Media",
      completed: Boolean(t.completed), createdAt: t.createdAt ?? Date.now(), completedAt: t.completedAt ?? null,
      dueDate: t.dueDate ?? null, notes: t.notes ?? "", project: t.project ?? null };
    if (o.category === "Proyectos") o.category = "Personal";
    return o;
  },
};

/* ═══════════════════════════════════════════
   TASK SERVICE
   ═══════════════════════════════════════════ */

const TaskService = {
  tasks: [],
  load() { this.tasks = TaskStore.load(); },
  save() { TaskStore.save(this.tasks); },

  add(text, category, priority, { dueDate = null, notes = "", project = null } = {}) {
    const tr = Utils.safeTrim(text);
    if (!tr) return { ok: false, error: "EMPTY" };
    if (tr.length > CONFIG.MAX_TASK_LENGTH) return { ok: false, error: "TOO_LONG" };
    if (this.tasks.some(t => Utils.normalizeText(t.text) === Utils.normalizeText(tr))) return { ok: false, error: "DUPLICATE" };
    const task = { id: crypto.randomUUID(), text: tr, category, priority, completed: false, createdAt: Date.now(), completedAt: null, dueDate, notes, project };
    this.tasks.unshift(task);
    return { ok: true, task };
  },
  updateText(id, text) {
    const tr = Utils.safeTrim(text);
    if (!tr) return { ok: false, error: "EMPTY" };
    if (tr.length > CONFIG.MAX_TASK_LENGTH) return { ok: false, error: "TOO_LONG" };
    if (this.tasks.some(t => t.id !== id && Utils.normalizeText(t.text) === Utils.normalizeText(tr))) return { ok: false, error: "DUPLICATE" };
    this.tasks = this.tasks.map(t => t.id === id ? { ...t, text: tr } : t);
    return { ok: true };
  },
  setCompleted(id, c) { this.tasks = this.tasks.map(t => t.id === id ? { ...t, completed: c, completedAt: c ? Date.now() : null } : t); },
  remove(id) { const i = this.tasks.findIndex(t => t.id === id); if (i === -1) return { removed: null, index: -1 }; const [r] = this.tasks.splice(i, 1); return { removed: r, index: i }; },
  insertAt(task, idx) { this.tasks.splice(Math.min(idx, this.tasks.length), 0, task); },
  completeAll() { this.tasks = this.tasks.map(t => t.completed ? t : { ...t, completed: true, completedAt: Date.now() }); },
  clearCompleted() { this.tasks = this.tasks.filter(t => !t.completed); },
  updateTask(id, u) { this.tasks = this.tasks.map(t => t.id === id ? { ...t, ...u } : t); },
  reorder(fi, ti) { if (fi === ti) return; const [m] = this.tasks.splice(fi, 1); this.tasks.splice(ti, 0, m); },

  computeStats() {
    let pending = 0, completed = 0; const byCategory = {};
    for (const c of CATEGORIES) byCategory[c] = 0;
    for (const t of this.tasks) { if (t.completed) completed++; else pending++; if (byCategory[t.category] !== undefined) byCategory[t.category]++; }
    return { total: this.tasks.length, pending, completed, byCategory };
  },
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

const UIState = {
  categoryFilter: "all", projectFilter: "all",
  lastAddedTaskId: null, editingTaskId: null, expandedTaskId: null,
  doneExpanded: false, searchDebounceTimer: null,
  focusMode: false, focusIndex: 0, selectorsExpanded: false,
};

/* ═══════════════════════════════════════════
   THEME / LOCATION / SEARCH
   ═══════════════════════════════════════════ */

const Theme = {
  load() { const s = localStorage.getItem(CONFIG.THEME_KEY); if (s === "dark" || s === "light") { this.apply(s); return; } this.apply(window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"); },
  apply(theme) { const dk = theme === "dark"; document.documentElement.classList.toggle("dark", dk); const i = DOM.get("theme-icon"); const t = DOM.get("theme-text"); if (i) i.textContent = dk ? "◗" : "○"; if (t) t.textContent = dk ? "Oscuro" : "Claro"; },
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
    const s = DOM.get("greeting-section"); const t = DOM.get("hero-greeting"); const u = DOM.get("hero-greeting-sub");
    if (!s || !t) return; s.classList.toggle("hidden", TaskService.count === 0);
    if (TaskService.count > 0) { const st = TaskService.computeStats(); const p = st.total === 0 ? 0 : Math.round((st.completed/st.total)*100); const tx = this._getText(p, st.pending); t.textContent = tx.title; if (u) u.textContent = tx.sub; }
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
    const s = DOM.get("welcome-section"); if (!s) return;
    const show = TaskService.count === 0 && !Search.getQuery();
    s.classList.toggle("hidden", !show);
    const pills = DOM.categoryPillsSection; if (pills) pills.style.display = show ? "none" : "";
    if (show) {
      DOM.get("now-section")?.classList.add("hidden"); DOM.get("next-section")?.classList.add("hidden"); DOM.get("done-section")?.classList.add("hidden");
      const tx = this._getText(); const g = DOM.get("welcome-greeting"); const u = DOM.get("welcome-sub");
      if (g) g.textContent = tx.title; if (u) u.textContent = tx.sub;
    } else { DOM.get("next-section")?.classList.remove("hidden"); DOM.get("done-section")?.classList.remove("hidden"); }
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
  undo() { if (!this._task) return; TaskService.insertAt(this._task, this._index ?? 0); App.commit(); this.hide(); },
};

/* ═══════════════════════════════════════════
   TASK DETAIL — Panel inline
   ═══════════════════════════════════════════ */

const TaskDetail = {
  createPanel(task) {
    const panel = document.createElement("div");
    panel.className = "task-detail-panel mt-2 rounded-lg border border-stone-200/40 bg-stone-50/50 p-4 space-y-3 dark:border-neutral-700/30 dark:bg-neutral-800/30";
    panel.dataset.detailFor = task.id;

    const r1 = document.createElement("div"); r1.className = "flex flex-wrap gap-3";
    const dw = document.createElement("div"); dw.className = "flex-1 min-w-[140px]";
    dw.innerHTML = `<label class="text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-neutral-500 mb-1 block">Fecha límite</label>`;
    const di = document.createElement("input"); di.type = "date";
    di.className = "w-full rounded-lg border border-stone-200/80 bg-white px-3 py-1.5 text-xs text-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300";
    di.value = task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "";
    di.addEventListener("change", () => { TaskService.updateTask(task.id, { dueDate: di.value ? Utils.startOfDay(Date.parse(di.value+"T00:00:00")) : null }); App.commit(); });
    dw.appendChild(di);

    const pw = document.createElement("div"); pw.className = "flex-1 min-w-[140px]";
    pw.innerHTML = `<label class="text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-neutral-500 mb-1 block">Proyecto</label>`;
    const pi = document.createElement("input"); pi.type = "text"; pi.placeholder = "Ej: Mudanza, Sprint 14…";
    pi.className = "w-full rounded-lg border border-stone-200/80 bg-white px-3 py-1.5 text-xs text-stone-600 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:placeholder-neutral-600";
    pi.value = task.project || ""; pi.setAttribute("list", "project-options-" + task.id);
    const dl = document.createElement("datalist"); dl.id = "project-options-" + task.id;
    for (const n of TaskService.getAllProjectNames()) { const o = document.createElement("option"); o.value = n; dl.appendChild(o); }
    pi.addEventListener("change", () => { let v = Utils.safeTrim(pi.value); if (v) { v = (v.charAt(0).toUpperCase()+v.slice(1)).slice(0, CONFIG.MAX_PROJECT_LENGTH); pi.value = v; } TaskService.updateTask(task.id, { project: v || null }); App.commit(); });
    pw.append(pi, dl); r1.append(dw, pw);

    const r2 = document.createElement("div"); r2.className = "flex flex-wrap gap-3";
    const cw = document.createElement("div"); cw.className = "flex-1 min-w-[120px]";
    cw.innerHTML = `<label class="text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-neutral-500 mb-1 block">Categoría</label>`;
    const cs = document.createElement("select");
    cs.className = "w-full rounded-lg border border-stone-200/80 bg-white px-3 py-1.5 text-xs text-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300";
    for (const c of CATEGORIES) { const o = document.createElement("option"); o.value = c; o.textContent = c; if (c === task.category) o.selected = true; cs.appendChild(o); }
    cs.addEventListener("change", () => { TaskService.updateTask(task.id, { category: cs.value }); App.commit(); });
    cw.appendChild(cs);

    const prw = document.createElement("div"); prw.className = "flex-1 min-w-[100px]";
    prw.innerHTML = `<label class="text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-neutral-500 mb-1 block">Prioridad</label>`;
    const ps = document.createElement("select");
    ps.className = "w-full rounded-lg border border-stone-200/80 bg-white px-3 py-1.5 text-xs text-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300";
    for (const p of ["Alta","Media","Baja"]) { const o = document.createElement("option"); o.value = p; o.textContent = p; if (p === task.priority) o.selected = true; ps.appendChild(o); }
    ps.addEventListener("change", () => { TaskService.updateTask(task.id, { priority: ps.value }); App.commit(); });
    prw.appendChild(ps); r2.append(cw, prw);

    const nw = document.createElement("div");
    nw.innerHTML = `<label class="text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-neutral-500 mb-1 block">Notas</label>`;
    const ta = document.createElement("textarea");
    ta.className = "w-full rounded-lg border border-stone-200/80 bg-white px-3 py-2 text-xs text-stone-600 placeholder-stone-300 resize-y min-h-[60px] focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:placeholder-neutral-600";
    ta.placeholder = "Añade notas, detalles, enlaces…"; ta.value = task.notes || ""; ta.maxLength = CONFIG.MAX_NOTES_LENGTH;
    ta.addEventListener("blur", () => { TaskService.updateTask(task.id, { notes: ta.value }); TaskService.save(); });
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

  _button({ action, id, className, text, html, ariaLabel }) {
    const b = document.createElement("button"); b.type = "button"; b.dataset.action = action; b.dataset.id = id; b.className = className;
    if (ariaLabel) b.setAttribute("aria-label", ariaLabel);
    if (html !== undefined) b.innerHTML = html; else if (text !== undefined) b.textContent = text; return b;
  },

  createItem(task, completed = false) {
    const wrapper = document.createElement("li"); wrapper.dataset.id = task.id; wrapper.draggable = true;
    wrapper.addEventListener("dragstart", () => wrapper.style.opacity = "0.4");
    wrapper.addEventListener("dragend", () => wrapper.style.opacity = "1");
    const card = document.createElement("div"); card.className = this.cardClasses(completed);
    if (task.priority === "Alta" && !completed) card.classList.add("priority-high");
    card.append(this._buildLeft(task, completed), this._buildRight(task, completed));
    if (task.id === UIState.lastAddedTaskId && !completed) this._animateIn(card);
    wrapper.appendChild(card);
    if (UIState.expandedTaskId === task.id && !completed) wrapper.appendChild(TaskDetail.createPanel(task));
    return wrapper;
  },

  _buildLeft(task, completed) {
    const wrap = document.createElement("div"); wrap.className = "flex min-w-0 items-center gap-3";
    const chk = this._button({ action: completed ? "restore" : "complete", id: task.id, className: this.checkClasses(completed), html: completed ? "✓" : "", ariaLabel: completed ? "Marcar como pendiente" : "Marcar como completada" });
    const tw = document.createElement("div"); tw.className = "min-w-0";
    if (UIState.editingTaskId === task.id) {
      const inp = document.createElement("input"); inp.dataset.role = "edit-text"; inp.value = task.text; inp.className = CLASSES.editInput; tw.appendChild(inp);
    } else {
      const p = document.createElement("p"); const sq = Search.getQuery();
      if (sq && !completed) { p.className = "truncate text-sm text-stone-700 dark:text-neutral-200"; p.innerHTML = Utils.highlightText(task.text, sq); }
      else { p.className = completed ? "truncate text-sm text-stone-400 line-through dark:text-neutral-500" : "truncate text-sm text-stone-700 dark:text-neutral-200"; p.textContent = task.text; }
      tw.appendChild(p);
      const meta = document.createElement("span"); meta.className = "text-[10px] text-stone-300 dark:text-neutral-600 font-mono-ui flex items-center gap-1";
      meta.textContent = Utils.relativeTime(completed ? task.completedAt : task.createdAt);
      if (task.dueDate && !completed) {
        const dueSep = document.createTextNode(" \u00b7 ");
        const dueSpan = document.createElement("span");
        dueSpan.textContent = Utils.formatDueDate(task.dueDate);
        dueSpan.className = Utils.isOverdue(task.dueDate) ? "text-red-500 dark:text-red-400 font-semibold" : Utils.isDueToday(task.dueDate) ? "text-blue-600 dark:text-blue-400 font-semibold" : "";
        meta.append(dueSep, dueSpan);
      }
      tw.appendChild(meta);
      if (task.notes && !completed) {
        const notePreview = document.createElement("p");
        notePreview.className = "notes-preview text-[10px] text-stone-400/70 dark:text-neutral-500/70 italic truncate mt-0.5 cursor-pointer";
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
      const catClasses = CATEGORY_BADGE_CLASSES[task.category] || CATEGORY_BADGE_CLASSES.Gestiones;
      cb.className = `${CLASSES.categoryBase} ${catClasses}`;
      const cd = document.createElement("span");
      cd.className = "w-1.5 h-1.5 rounded-full shrink-0";
      cd.style.background = CATEGORY_COLORS[task.category] || "#999";
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
          UIState.projectFilter = task.project;
          App.render();
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
        hint.className = "detail-hint inline-flex items-center justify-center w-5 h-5 rounded-md border border-stone-200/60 bg-stone-50 text-[10px] text-stone-400 cursor-pointer shrink-0 transition hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50 dark:border-neutral-700/50 dark:bg-neutral-800 dark:text-neutral-500 dark:hover:border-neutral-600 dark:hover:text-neutral-300";
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
      sep.className = "w-px h-4 bg-stone-200/50 dark:bg-neutral-700/40 mx-0.5 shrink-0 hidden sm:block";
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
    const card = li?.querySelector(":scope > div:first-child"); if (!card) { TaskService.setCompleted(id, true); App.commit(); return; }
    card.style.transition = `opacity ${CONFIG.ANIMATION_MS}ms ease, transform ${CONFIG.ANIMATION_MS}ms ease`; card.style.opacity = "0"; card.style.transform = "translateY(-6px)";
    setTimeout(() => { TaskService.setCompleted(id, true); App.commit(); }, CONFIG.ANIMATION_MS);
  },
  delete(li, id) {
    const card = li?.querySelector(":scope > div:first-child"); if (!card) { this._doDelete(id); return; }
    card.style.transition = `opacity ${CONFIG.ANIMATION_MS}ms ease, transform ${CONFIG.ANIMATION_MS}ms ease`; card.style.opacity = "0"; card.style.transform = "scale(0.95) translateY(-4px)";
    setTimeout(() => this._doDelete(id), CONFIG.ANIMATION_MS);
  },
  _doDelete(id) { const { removed, index } = TaskService.remove(id); App.commit(); if (removed) UndoToast.show(removed, index); },
};

const DragDrop = {
  _srcIndex: null, _srcSection: null,
  handleStart(e) { const li = e.target.closest("[data-id]"); if (!li) return; this._srcIndex = TaskService.tasks.findIndex(t => t.id === li.dataset.id); const pl = li.closest("[data-section]"); this._srcSection = pl ? pl.dataset.section : null; },
  handleEnter(e) { const l = e.target.closest("[data-section]"); if (l && this._srcSection && l.dataset.section !== this._srcSection) l.classList.add("drag-over"); },
  handleLeave(e) { const l = e.target.closest("[data-section]"); if (l && !l.contains(e.relatedTarget)) l.classList.remove("drag-over"); },
  handleDrop(e) {
    e.preventDefault(); document.querySelectorAll(".drag-over").forEach(el => el.classList.remove("drag-over"));
    const tl = e.target.closest("[data-section]"); if (!tl || this._srcIndex === null) { this._reset(); return; }
    const d = tl.dataset.section; const s = this._srcSection; const tid = TaskService.tasks[this._srcIndex]?.id; if (!tid) { this._reset(); return; }
    if (s !== d) { this._cross(s, d, tid); this._reset(); return; }
    const li = e.target.closest("[data-id]"); if (!li) { this._reset(); return; }
    const di = TaskService.tasks.findIndex(t => t.id === li.dataset.id);
    if (di !== -1 && di !== this._srcIndex) { TaskService.reorder(this._srcIndex, di); App.commit(); }
    this._reset();
  },
  _cross(s, d, id) {
    if ((s==="now"||s==="next") && d==="done") { TaskService.updateTask(id, { completed: true, completedAt: Date.now() }); if (!UIState.doneExpanded) { UIState.doneExpanded = true; const a = DOM.get("done-arrow"); if (a) a.style.transform = "rotate(90deg)"; } }
    else if (s==="done" && d==="now") TaskService.updateTask(id, { completed: false, completedAt: null, priority: "Alta" });
    else if (s==="done" && d==="next") { const t = TaskService.tasks.find(t=>t.id===id); TaskService.updateTask(id, { completed:false, completedAt:null, priority: t?.priority==="Alta"?"Media":(t?.priority??"Media") }); }
    else if (s==="now" && d==="next") TaskService.updateTask(id, { priority: "Media" });
    else if (s==="next" && d==="now") TaskService.updateTask(id, { priority: "Alta" });
    App.commit();
  },
  _reset() { this._srcIndex = null; this._srcSection = null; },
};

/* ═══════════════════════════════════════════
   SIDEBAR — con sección de Proyectos
   ═══════════════════════════════════════════ */

const Sidebar = {
  build() {
    const c = DOM.get("sidebar-category-filters"); if (!c) return; c.innerHTML = "";
    for (const cat of ["all", ...CATEGORIES]) {
      const btn = document.createElement("button"); btn.type = "button"; btn.className = "sidebar-filter-btn" + (UIState.categoryFilter === cat ? " active" : ""); btn.dataset.sidebarFilter = cat;
      const dot = document.createElement("span"); Object.assign(dot.style, { width:"8px", height:"8px", borderRadius:"50%", flexShrink:"0" }); dot.style.background = cat === "all" ? "rgb(163 163 163)" : (CATEGORY_COLORS[cat] || "#999");
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
        const fill = document.createElement("div"); fill.className = "category-bar-fill"; fill.style.width = `${Math.round((count/st.total)*100)}%`; fill.style.background = CATEGORY_COLORS[cat] || "#f59e0b"; bar.appendChild(fill);
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
  open() { UIState.focusMode = true; UIState.focusIndex = 0; this._tasks = TaskService.getPendingForFocus(); DOM.get("focus-overlay")?.classList.remove("hidden"); document.body.style.overflow = "hidden"; this._render(); DOM.get("focus-toggle")?.classList.add("text-amber-500","border-amber-400"); },
  close() { UIState.focusMode = false; DOM.get("focus-overlay")?.classList.add("hidden"); document.body.style.overflow = ""; DOM.get("focus-toggle")?.classList.remove("text-amber-500","border-amber-400"); App.render(); },
  toggle() { if (UIState.focusMode) this.close(); else this.open(); },
  completeCurrent() { const t = this._tasks[UIState.focusIndex]; if (!t) return; TaskService.setCompleted(t.id, true); TaskService.save(); this._tasks = TaskService.getPendingForFocus(); if (UIState.focusIndex >= this._tasks.length) UIState.focusIndex = 0; this._render(); },
  skipCurrent() { UIState.focusIndex = (UIState.focusIndex + 1) % Math.max(1, this._tasks.length); this._render(); },
  _render() {
    const card = DOM.get("focus-card"); const empty = DOM.get("focus-empty"); const nav = DOM.get("focus-nav"); const counter = DOM.get("focus-counter");
    if (!card) return;
    if (this._tasks.length === 0) { card.innerHTML = ""; card.classList.add("hidden"); empty?.classList.remove("hidden"); nav?.classList.add("hidden"); if (counter) counter.textContent = ""; return; }
    card.classList.remove("hidden"); empty?.classList.add("hidden"); nav?.classList.remove("hidden");
    const t = this._tasks[UIState.focusIndex]; if (!t) return;
    const color = CATEGORY_COLORS[t.category] || "#999";
    const urgent = t.priority === "Alta" || Utils.isOverdue(t.dueDate) || Utils.isDueToday(t.dueDate);
    const dueTxt = t.dueDate ? Utils.formatDueDate(t.dueDate) : "";
    const dueClass = Utils.isOverdue(t.dueDate) ? "text-red-500 dark:text-red-400" : Utils.isDueToday(t.dueDate) ? "text-blue-600 dark:text-blue-400" : "text-stone-500 dark:text-neutral-500";
    const notes = t.notes ? `<p class="text-xs text-stone-400 dark:text-neutral-500 mt-4 text-left whitespace-pre-line max-h-28 overflow-y-auto italic border-t border-stone-100 dark:border-neutral-800 pt-3">${Utils._escapeHtml(t.notes)}</p>` : "";
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

const Keyboard = {
  init() { document.addEventListener("keydown", e => this._global(e)); document.addEventListener("keydown", e => this._edit(e)); },
  _global(e) {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === "k") { e.preventDefault(); Search.focus(); return; }
    if (mod && e.key === "f" && !document.activeElement?.matches("input, textarea")) { e.preventDefault(); FocusMode.toggle(); return; }
    if (mod && e.shiftKey && e.key === "C") { e.preventDefault(); if (TaskService.hasPending()) { TaskService.completeAll(); App.commit(); } return; }
    if (mod && e.shiftKey && e.key === "X") { e.preventDefault(); if (TaskService.hasCompleted()) { TaskService.clearCompleted(); App.commit(); } return; }
    if (e.key !== "Escape") return;
    if (UIState.focusMode) { FocusMode.close(); return; }
    if (UIState.expandedTaskId) { UIState.expandedTaskId = null; App.render(); return; }
    const ih = DOM.get("input-help"); if (ih && !ih.classList.contains("hidden")) { ih.classList.add("hidden"); return; }
    if (UIState.editingTaskId && document.activeElement?.matches('input[data-role="edit-text"]')) { UIState.editingTaskId = null; App.render(); return; }
    const si = DOM.get("search-input"); if (si?.value) { si.value = ""; App.render(); Search.updateHints(); si.focus(); return; }
    if (document.activeElement === si) si.blur();
  },
  _edit(e) {
    if (!UIState.editingTaskId || !document.activeElement?.matches('input[data-role="edit-text"]')) return;
    if (e.key === "Escape") { UIState.editingTaskId = null; App.render(); return; }
    if (e.key !== "Enter") return;
    const r = TaskService.updateText(UIState.editingTaskId, document.activeElement.value);
    if (!r.ok) return; UIState.editingTaskId = null; App.commit();
  },
};

const ListActions = {
  handle(event) {
    const btn = event.target.closest("[data-action]"); if (!btn) return;
    const { action, id } = btn.dataset; if (!id) return; const li = btn.closest("li");
    switch (action) {
      case "complete": Animations.complete(li, id); break;
      case "restore": TaskService.setCompleted(id, false); App.commit(); break;
      case "delete": Animations.delete(li, id); break;
      case "toggle-detail": UIState.expandedTaskId = UIState.expandedTaskId === id ? null : id; App.render(); break;
      case "edit": UIState.editingTaskId = id; App.render(); setTimeout(() => document.querySelector(`li[data-id="${id}"] input[data-role="edit-text"]`)?.focus(), 0); break;
      case "edit-cancel": UIState.editingTaskId = null; App.render(); break;
      case "edit-save": {
        const inp = li?.querySelector('input[data-role="edit-text"]');
        const r = TaskService.updateText(id, inp?.value ?? "");
        if (!r.ok && inp) { inp.setCustomValidity(r.error === "TOO_LONG" ? `Máx ${CONFIG.MAX_TASK_LENGTH} chars.` : r.error === "DUPLICATE" ? "Ya existe." : "Escribe algo."); inp.reportValidity(); return; }
        UIState.editingTaskId = null; App.commit(); break;
      }
    }
  },
};

/* ═══════════════════════════════════════════
   APP
   ═══════════════════════════════════════════ */

const App = {
  commit() { TaskService.save(); this.render(); },
  render() {
    const q = Search.getQuery(); const hq = Boolean(q);
    const { now, next, done } = TaskService.getVisible(q, UIState.categoryFilter, UIState.projectFilter);
    const es = "No encontré nada con esa búsqueda.";
    this._updateFilterPills(); Progress.update(); Greeting.update();

    const pp = DOM.get("active-project-pill");
    if (pp) { if (UIState.projectFilter && UIState.projectFilter !== "all") { pp.classList.remove("hidden"); pp.textContent = `${UIState.projectFilter} ✕`; } else { pp.classList.add("hidden"); } }

    const dc = DOM.get("done-count"); if (dc) dc.textContent = TaskService.tasks.filter(t => t.completed).length;
    const cb = DOM.get("clear-search"); if (cb) cb.classList.toggle("hidden", !hq);
    TaskRenderer.renderList(DOM.get("next-list"), next, { completed: false, emptyMessage: hq ? es : "Añade una tarea arriba para empezar." });
    TaskRenderer.renderList(DOM.get("now-list"), now, { completed: false, emptyMessage: hq ? es : "Nada urgente ahora mismo." });
    const dl = DOM.get("done-list");
    if (UIState.doneExpanded) { dl?.classList.remove("hidden"); TaskRenderer.renderList(dl, done, { completed: true, emptyMessage: hq ? es : "Todavía no has completado ninguna tarea." }); }
    else { dl?.classList.add("hidden"); if (dl) dl.innerHTML = ""; }
    const nv = now.length > 0 || hq; DOM.get("now-section")?.classList.toggle("hidden", !nv);
    const cn = DOM.get("complete-all-now"); const cx = DOM.get("complete-all-next");
    if (cn && cx) { cn.classList.toggle("hidden", !nv); cx.classList.toggle("hidden", nv); }
    UIState.lastAddedTaskId = null; Welcome.update(); Sidebar.update();
    const classicDl = DOM.get("classic-project-options");
    if (classicDl) { classicDl.innerHTML = ""; for (const n of TaskService.getAllProjectNames()) { const o = document.createElement("option"); o.value = n; classicDl.appendChild(o); } }
  },
  _updateFilterPills() {
    DOM.categoryFilterButtons.forEach(b => {
      const variant = b.dataset.categoryFilter === UIState.categoryFilter ? CLASSES.filterPill.active : CLASSES.filterPill.inactive;
      b.className = `${CLASSES.filterPillBase} ${variant}`;
    });
  },
  _bindEvents() {
    DOM.get("task-form")?.addEventListener("submit", e => {
      e.preventDefault(); const inp = DOM.get("task-input"); const raw = Utils.safeTrim(inp?.value); if (!raw) return;
      if (inp) inp.setCustomValidity("");
      const p = InputParser.parse(raw); const text = p.text; const cat = p.category || DOM.get("task-category")?.value || "Personal"; const pri = p.priority || DOM.get("task-priority")?.value || "Media";
      if (!text) return;
      const dueDate = p.dueDate || (DOM.get("task-duedate")?.value ? Utils.startOfDay(Date.parse(DOM.get("task-duedate").value + "T00:00:00")) : null);
      let projectRaw = p.project || Utils.safeTrim(DOM.get("task-project")?.value) || null;
      const project = projectRaw ? (projectRaw.charAt(0).toUpperCase() + projectRaw.slice(1)).slice(0, CONFIG.MAX_PROJECT_LENGTH) : null;
      const r = TaskService.add(text, cat, pri, { dueDate, project });
      if (!r.ok) { if (inp) { inp.setCustomValidity(r.error === "TOO_LONG" ? `Máx ${CONFIG.MAX_TASK_LENGTH} chars.` : r.error === "DUPLICATE" ? "Ya existe." : "Escribe algo."); inp.reportValidity(); } return; }
      UIState.lastAddedTaskId = r.task.id; this.commit();
      if (inp) { inp.value = ""; inp.focus(); }
      DOM.get("input-preview")?.classList.add("hidden");
      const eh = DOM.get("enter-hint"); if (eh) eh.classList.remove("visible");
      const cs2 = DOM.get("task-category"); const ps2 = DOM.get("task-priority"); if (cs2) cs2.value = "Personal"; if (ps2) ps2.value = "Media";
      const dd = DOM.get("task-duedate"); if (dd) dd.value = "";
      const pj = DOM.get("task-project"); if (pj) pj.value = "";
    });
    const ti = DOM.get("task-input"); const eh = DOM.get("enter-hint");
    ti?.addEventListener("input", () => { ti.setCustomValidity(""); if (eh) eh.classList.toggle("visible", Utils.safeTrim(ti.value).length > 0); InputParser.updatePreview(ti.value); });
    ti?.addEventListener("focus", () => { if (eh && Utils.safeTrim(ti.value).length > 0) eh.classList.add("visible"); if (!Utils.safeTrim(ti.value)) DOM.get("input-help")?.classList.remove("hidden"); });
    ti?.addEventListener("blur", () => { if (eh) eh.classList.remove("visible"); setTimeout(() => DOM.get("input-help")?.classList.add("hidden"), 200); });
    DOM.get("toggle-selectors")?.addEventListener("click", () => { UIState.selectorsExpanded = !UIState.selectorsExpanded; const p2 = DOM.get("selector-panel"); const a = DOM.get("selector-arrow"); if (p2) p2.classList.toggle("hidden",!UIState.selectorsExpanded); if (a) a.style.transform = UIState.selectorsExpanded?"rotate(90deg)":"rotate(0deg)"; });
    const si = DOM.get("search-input");
    si?.addEventListener("input", () => { Search.updateHints(); if (UIState.searchDebounceTimer) clearTimeout(UIState.searchDebounceTimer); UIState.searchDebounceTimer = setTimeout(() => this.render(), CONFIG.SEARCH_DEBOUNCE_MS); });
    DOM.get("clear-search")?.addEventListener("click", () => { Search.clear(); this.render(); Search.updateHints(); Search.focus(); });
    DOM.get("active-project-pill")?.addEventListener("click", () => { UIState.projectFilter = "all"; App.render(); });
    DOM.get("theme-toggle")?.addEventListener("click", () => Theme.toggle());
    DOM.get("focus-toggle")?.addEventListener("click", () => FocusMode.toggle());
    DOM.get("focus-close")?.addEventListener("click", () => FocusMode.close());
    DOM.get("focus-complete-btn")?.addEventListener("click", () => FocusMode.completeCurrent());
    DOM.get("focus-skip-btn")?.addEventListener("click", () => FocusMode.skipCurrent());
    DOM.categoryFilterButtons.forEach(b => b.addEventListener("click", () => { UIState.categoryFilter = b.dataset.categoryFilter; this.render(); }));
    DOM.get("toggle-done")?.addEventListener("click", () => { UIState.doneExpanded = !UIState.doneExpanded; const a = DOM.get("done-arrow"); if (a) a.style.transform = UIState.doneExpanded?"rotate(90deg)":"rotate(0deg)"; this.render(); });
    ["now-list","next-list","done-list"].forEach(id => {
      const l = DOM.get(id); if (!l) return;
      l.addEventListener("dragover", e => e.preventDefault()); l.addEventListener("drop", e => DragDrop.handleDrop(e));
      l.addEventListener("dragstart", e => DragDrop.handleStart(e)); l.addEventListener("dragenter", e => DragDrop.handleEnter(e));
      l.addEventListener("dragleave", e => DragDrop.handleLeave(e)); l.addEventListener("click", e => ListActions.handle(e));
    });
    DOM.get("clear-completed")?.addEventListener("click", () => { TaskService.clearCompleted(); this.commit(); });
    DOM.get("complete-all-now")?.addEventListener("click", () => { TaskService.completeAll(); this.commit(); });
    DOM.get("complete-all-next")?.addEventListener("click", () => { TaskService.completeAll(); this.commit(); });
    DOM.get("sidebar-complete-all")?.addEventListener("click", () => { TaskService.completeAll(); this.commit(); });
    DOM.get("sidebar-clear-done")?.addEventListener("click", () => { TaskService.clearCompleted(); this.commit(); });
    DOM.get("undo-toast-btn")?.addEventListener("click", () => UndoToast.undo());
    DOM.get("load-examples")?.addEventListener("click", () => { for (const ex of EXAMPLE_TASKS) TaskService.add(ex.text, ex.category, ex.priority, { dueDate: ex.dueDate, project: ex.project, notes: ex.notes || "" }); this.commit(); });
    Keyboard.init();
  },
  init() {
    Theme.load(); TaskService.load(); this._bindEvents(); Location.fetch();
    setInterval(() => Location._applyEverywhere(), CONFIG.CLOCK_INTERVAL_MS); Sidebar.build();
    const ht = DOM.get("time-location"); if (ht) ht.textContent = Location.formatTimeLocation();
    this.render();
  },
};

App.init();
