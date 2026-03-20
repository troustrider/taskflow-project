"use strict";

/**
 * TaskFlow — Refactored for scalability (Phase 3: backend-ready)
 *
 * Architecture:
 *   TaskStore     → Persistence layer (localStorage now, API in Phase 3)
 *   TaskService   → Pure business logic (validation, CRUD, stats) — no DOM
 *   UIState       → Centralized UI state object
 *   DOM           → Lazy-cached element references
 *   Theme         → Dark/light mode management
 *   Location      → IP geolocation with cache + fallback
 *   Search        → Header search bar logic
 *   Greeting      → Contextual greeting (with tasks)
 *   Welcome       → Empty-state onboarding (no tasks)
 *   Progress      → SVG ring + progress labels
 *   Sidebar       → XL sidebar: filters, stats, context
 *   DragDrop      → Cross-section drag & drop
 *   UndoToast     → Timed undo after delete
 *   TaskRenderer  → DOM construction for task cards
 *   Keyboard      → Centralized keyboard shortcuts
 *   App           → Init + render orchestration
 */

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */

const CONFIG = Object.freeze({
  STORAGE_KEY:        "taskflow_tasks_v12",
  THEME_KEY:          "taskflow_theme_v12",
  LOCATION_CACHE_KEY: "taskflow_location",
  MAX_TASK_LENGTH:    300,
  UNDO_TIMEOUT_MS:    4000,
  SEARCH_DEBOUNCE_MS: 150,
  LOCATION_TIMEOUT_MS: 5000,
  ANIMATION_MS:       220,
  CLOCK_INTERVAL_MS:  60000,
});

const CATEGORIES = Object.freeze(["Trabajo", "Personal", "Estudio", "Proyectos", "Salud", "Gestiones"]);

const CATEGORY_COLORS = Object.freeze({
  Trabajo:    "#c2410c",
  Personal:   "#2563eb",
  Estudio:    "#7c3aed",
  Proyectos:  "#0d9488",
  Salud:      "#db2777",
  Gestiones:  "#78716c",
});

const RING = Object.freeze({
  HERO_CIRCUMFERENCE:    201.1,
  SIDEBAR_CIRCUMFERENCE: 119.4,
});

/* ═══════════════════════════════════════════
   TAILWIND CLASS MAP
   ═══════════════════════════════════════════ */

const CLASSES = Object.freeze({
  priorityBase: "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
  priority: {
    Alta:  " border-red-200/80 bg-red-50 text-red-600 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-400",
    Media: " border-stone-200/80 bg-stone-100 text-stone-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400",
    Baja:  " border-stone-200/60 bg-white text-stone-400 dark:border-neutral-700/60 dark:bg-neutral-900 dark:text-neutral-500",
  },
  categoryBadge: "inline-flex items-center rounded-full border border-stone-200/60 bg-white px-2.5 py-0.5 text-[11px] font-medium text-stone-400 dark:border-neutral-700/50 dark:bg-neutral-800 dark:text-neutral-500",
  taskCard: {
    pending:   "group flex items-center justify-between gap-3 rounded-xl border border-stone-200/60 bg-white px-4 py-3 transition duration-200 ease-out hover:border-stone-300/80 dark:border-neutral-700/50 dark:bg-neutral-900 dark:hover:border-neutral-600",
    completed: "group flex items-center justify-between gap-3 rounded-xl border border-stone-200/40 bg-white px-4 py-3 transition duration-200 ease-out opacity-50 hover:opacity-80 dark:border-neutral-700/40 dark:bg-neutral-900 dark:hover:border-neutral-600",
  },
  checkButtonBase: "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold transition duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:focus:ring-neutral-600",
  checkButton: {
    pending:   " border-stone-200/80 bg-white text-stone-300 hover:border-amber-400 hover:text-amber-500 hover:bg-amber-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-600 dark:hover:border-neutral-500 dark:hover:text-neutral-300",
    completed: " border-amber-400 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700",
  },
  actionButton: "task-actions rounded-lg px-2 py-1 text-[11px] font-medium text-stone-400 transition duration-150 ease-out hover:bg-stone-100 hover:text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 dark:focus:ring-neutral-600",
  emptyState: "rounded-xl border border-dashed border-stone-200/50 bg-white px-4 py-8 text-sm text-stone-400 text-center dark:border-neutral-700/40 dark:bg-neutral-900 dark:text-neutral-600",
  filterPill: {
    active:   "border-amber-400 bg-amber-50 text-amber-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200",
    inactive: "border-stone-200/60 bg-white text-stone-400 hover:border-stone-300 hover:text-stone-600 dark:border-neutral-700/50 dark:bg-neutral-900 dark:text-neutral-500 dark:hover:border-neutral-600 dark:hover:text-neutral-300",
  },
  filterPillBase: "category-filter-btn rounded-full border px-2 py-1.5 text-[11px] sm:text-xs font-medium transition duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:focus:ring-neutral-600 ",
  editInput: "w-full min-w-[200px] rounded-lg border border-stone-200/80 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:ring-neutral-600",
});

/* ═══════════════════════════════════════════
   DOM — Lazy-cached element references
   ═══════════════════════════════════════════ */

const DOM = {
  _cache: {},

  /**
   * Returns a cached DOM element by ID. Queries once, caches forever.
   * @param {string} id - Element ID.
   * @returns {HTMLElement|null}
   */
  get(id) {
    if (!(id in this._cache)) {
      this._cache[id] = document.getElementById(id);
    }
    return this._cache[id];
  },

  /**
   * Returns all category filter pill buttons (static NodeList, cached).
   * @returns {NodeListOf<HTMLButtonElement>}
   */
  get categoryFilterButtons() {
    if (!this._filterBtns) {
      this._filterBtns = document.querySelectorAll(".category-filter-btn");
    }
    return this._filterBtns;
  },

  /**
   * Returns the category pills section element (cached).
   * @returns {HTMLElement|null}
   */
  get categoryPillsSection() {
    if (!this._pillsSection) {
      this._pillsSection = document.querySelector("section.grid.grid-cols-4");
    }
    return this._pillsSection;
  },
};

/* ═══════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════ */

const Utils = {
  /** @param {*} value @returns {string} */
  safeTrim(value) {
    return (value ?? "").toString().trim();
  },

  /** Normalize for duplicate comparison: trim + collapse spaces + lowercase. */
  normalizeText(text) {
    return this.safeTrim(text).replace(/\s+/g, " ").toLowerCase();
  },

  /** Spanish date: "viernes 20 de marzo" */
  formatDate() {
    const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const now = new Date();
    return `${days[now.getDay()]} ${now.getDate()} de ${months[now.getMonth()]}`;
  },

  /** "14:32" */
  formatTime() {
    return new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  },

  /** Current hour (0–23). */
  currentHour() {
    return new Date().getHours();
  },
};

/* ═══════════════════════════════════════════
   TASK STORE — Persistence layer
   In Phase 3, replace localStorage calls with API fetch calls.
   The interface stays the same: load() returns Task[], save(tasks) persists.
   ═══════════════════════════════════════════ */

const TaskStore = {
  /**
   * Loads tasks from persistence. Normalizes structure with defaults.
   * @returns {Object[]} Array of task objects.
   */
  load() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed)
        ? parsed.map((t) => this._normalize(t))
        : [];
    } catch {
      return [];
    }
  },

  /**
   * Persists the tasks array.
   * @param {Object[]} tasks
   */
  save(tasks) {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(tasks));
  },

  /**
   * Ensures a task object has all required fields with sane defaults.
   * @param {Object} t - Raw task from storage.
   * @returns {Object} Normalized task.
   */
  _normalize(t) {
    return {
      id:          t.id ?? crypto.randomUUID(),
      text:        t.text ?? "",
      category:    t.category ?? "Personal",
      priority:    t.priority ?? "Media",
      completed:   Boolean(t.completed),
      createdAt:   t.createdAt ?? Date.now(),
      completedAt: t.completedAt ?? null,
    };
  },
};

/* ═══════════════════════════════════════════
   TASK SERVICE — Pure business logic (no DOM)
   ═══════════════════════════════════════════ */

const TaskService = {
  /** @type {Object[]} */
  tasks: [],

  /** Load from store into memory. */
  load() {
    this.tasks = TaskStore.load();
  },

  /** Persist current in-memory state to store. */
  save() {
    TaskStore.save(this.tasks);
  },

  /**
   * Validates and adds a new task.
   * @param {string} text
   * @param {string} category
   * @param {string} priority
   * @returns {{ ok: boolean, error?: string, task?: Object }}
   */
  add(text, category, priority) {
    const trimmed = Utils.safeTrim(text);
    if (!trimmed) return { ok: false, error: "EMPTY" };
    if (trimmed.length > CONFIG.MAX_TASK_LENGTH) return { ok: false, error: "TOO_LONG" };
    const norm = Utils.normalizeText(trimmed);
    if (this.tasks.some((t) => Utils.normalizeText(t.text) === norm)) return { ok: false, error: "DUPLICATE" };
    const task = {
      id: crypto.randomUUID(), text: trimmed, category, priority,
      completed: false, createdAt: Date.now(), completedAt: null,
    };
    this.tasks.unshift(task);
    return { ok: true, task };
  },

  /**
   * Updates the text of an existing task.
   * @param {string} id
   * @param {string} text
   * @returns {{ ok: boolean, error?: string }}
   */
  updateText(id, text) {
    const trimmed = Utils.safeTrim(text);
    if (!trimmed) return { ok: false, error: "EMPTY" };
    if (trimmed.length > CONFIG.MAX_TASK_LENGTH) return { ok: false, error: "TOO_LONG" };
    const norm = Utils.normalizeText(trimmed);
    if (this.tasks.some((t) => t.id !== id && Utils.normalizeText(t.text) === norm)) return { ok: false, error: "DUPLICATE" };
    this.tasks = this.tasks.map((t) => (t.id === id ? { ...t, text: trimmed } : t));
    return { ok: true };
  },

  /** @param {string} id @param {boolean} completed */
  setCompleted(id, completed) {
    this.tasks = this.tasks.map((t) =>
      t.id === id ? { ...t, completed, completedAt: completed ? Date.now() : null } : t
    );
  },

  /**
   * Removes a task by ID. Returns { removed, index } for undo.
   * @param {string} id
   * @returns {{ removed: Object|null, index: number }}
   */
  remove(id) {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return { removed: null, index: -1 };
    const [removed] = this.tasks.splice(idx, 1);
    return { removed, index: idx };
  },

  /** Insert a task at a specific index (for undo). */
  insertAt(task, index) {
    const idx = Math.min(index, this.tasks.length);
    this.tasks.splice(idx, 0, task);
  },

  /** Mark all pending as completed. */
  completeAll() {
    this.tasks = this.tasks.map((t) =>
      t.completed ? t : { ...t, completed: true, completedAt: Date.now() }
    );
  },

  /** Remove all completed tasks. */
  clearCompleted() {
    this.tasks = this.tasks.filter((t) => !t.completed);
  },

  /** Update a task field by ID (for drag & drop priority/status changes). */
  updateTask(id, updates) {
    this.tasks = this.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t));
  },

  /** Reorder: move task from one index to another. */
  reorder(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    const [moved] = this.tasks.splice(fromIndex, 1);
    this.tasks.splice(toIndex, 0, moved);
  },

  /**
   * Compute stats from current tasks.
   * @returns {{ total: number, pending: number, completed: number, byCategory: Object }}
   */
  computeStats() {
    let pending = 0, completed = 0;
    const byCategory = {};
    for (const cat of CATEGORIES) byCategory[cat] = 0;
    for (const t of this.tasks) {
      if (t.completed) completed++; else pending++;
      if (byCategory[t.category] !== undefined) byCategory[t.category]++;
    }
    return { total: this.tasks.length, pending, completed, byCategory };
  },

  /**
   * Filter + group tasks by search query and category.
   * @param {string} query - Search text.
   * @param {string} categoryFilter - "all" or a category name.
   * @returns {{ now: Object[], next: Object[], done: Object[] }}
   */
  getVisible(query, categoryFilter) {
    const q = query.toLowerCase();
    const filtered = this.tasks.filter((t) => {
      const searchOk = !q || t.text.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || t.priority.toLowerCase().includes(q);
      const catOk = categoryFilter === "all" || t.category === categoryFilter;
      return searchOk && catOk;
    });
    return {
      now:  filtered.filter((t) => !t.completed && t.priority === "Alta"),
      next: filtered.filter((t) => !t.completed && t.priority !== "Alta"),
      done: filtered.filter((t) => t.completed),
    };
  },

  /** @returns {boolean} */
  hasPending() { return this.tasks.some((t) => !t.completed); },

  /** @returns {boolean} */
  hasCompleted() { return this.tasks.some((t) => t.completed); },

  /** @returns {number} */
  get count() { return this.tasks.length; },
};

/* ═══════════════════════════════════════════
   UI STATE — Centralized mutable UI state
   ═══════════════════════════════════════════ */

const UIState = {
  categoryFilter:    "all",
  lastAddedTaskId:   null,
  editingTaskId:     null,
  doneExpanded:      false,
  searchDebounceTimer: null,
};

/* ═══════════════════════════════════════════
   THEME
   ═══════════════════════════════════════════ */

const Theme = {
  load() {
    const saved = localStorage.getItem(CONFIG.THEME_KEY);
    if (saved === "dark" || saved === "light") { this.apply(saved); return; }
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    this.apply(prefersDark ? "dark" : "light");
  },

  apply(theme) {
    const isDark = theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    const icon = DOM.get("theme-icon");
    const text = DOM.get("theme-text");
    if (icon) icon.textContent = isDark ? "◗" : "○";
    if (text) text.textContent = isDark ? "Oscuro" : "Claro";
  },

  toggle() {
    const isDark = document.documentElement.classList.contains("dark");
    const next = isDark ? "light" : "dark";
    localStorage.setItem(CONFIG.THEME_KEY, next);
    this.apply(next);
  },
};

/* ═══════════════════════════════════════════
   LOCATION — IP geolocation with cache + fallback
   ═══════════════════════════════════════════ */

const Location = {
  _cached: sessionStorage.getItem(CONFIG.LOCATION_CACHE_KEY) || "",

  get city() { return this._cached; },

  formatTimeLocation() {
    const time = Utils.formatTime();
    return this._cached ? `${time} · ${this._cached}` : time;
  },

  fetch() {
    if (this._cached) { this._applyEverywhere(); return; }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.LOCATION_TIMEOUT_MS);

    fetch("http://ip-api.com/json/?fields=city,country", { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        clearTimeout(timeout);
        if (data.city) this._store(`${data.city}, ${data.country}`);
      })
      .catch(() => {
        clearTimeout(timeout);
        fetch("https://ipapi.co/json/")
          .then((r) => r.json())
          .then((data) => { if (data.city) this._store(`${data.city}, ${data.country_name}`); })
          .catch(() => {});
      });
  },

  _store(value) {
    this._cached = value;
    sessionStorage.setItem(CONFIG.LOCATION_CACHE_KEY, value);
    this._applyEverywhere();
  },

  _applyEverywhere() {
    const heroEl = DOM.get("time-location");
    if (heroEl) heroEl.textContent = this.formatTimeLocation();
    const sidebarTime = DOM.get("sidebar-time");
    const sidebarLoc  = DOM.get("sidebar-location");
    if (sidebarTime) sidebarTime.textContent = Utils.formatTime();
    if (sidebarLoc) sidebarLoc.textContent = this._cached;
  },
};

/* ═══════════════════════════════════════════
   SEARCH — Header search bar
   ═══════════════════════════════════════════ */

const Search = {
  getQuery() {
    return Utils.safeTrim(DOM.get("search-input")?.value);
  },

  clear() {
    const input = DOM.get("search-input");
    if (input) input.value = "";
  },

  focus() {
    DOM.get("search-input")?.focus();
  },

  updateHints() {
    const kbdHint = DOM.get("search-kbd-hint");
    const clearBtn = DOM.get("clear-search");
    if (!kbdHint || !clearBtn) return;
    const hasQuery = this.getQuery().length > 0;
    if (hasQuery) {
      kbdHint.classList.add("hidden");
      kbdHint.classList.remove("sm:flex");
      clearBtn.classList.remove("hidden");
    } else {
      kbdHint.classList.remove("hidden");
      kbdHint.classList.add("sm:flex");
      clearBtn.classList.add("hidden");
    }
  },
};

/* ═══════════════════════════════════════════
   GREETING — Contextual greeting (when tasks exist)
   ═══════════════════════════════════════════ */

const Greeting = {
  /**
   * @param {number} percent
   * @param {number} pending
   * @returns {{ title: string, sub: string }}
   */
  _getText(percent, pending) {
    const h = Utils.currentHour();
    if (percent === 100) return { title: "¡Todo hecho!", sub: "Buen trabajo. Disfruta del resto del día." };
    if (percent >= 66) return { title: "Ya casi lo tienes", sub: `Solo te quedan ${pending} tarea${pending === 1 ? "" : "s"}. ¡Último empujón!` };
    if (h >= 5 && h < 13) return { title: "Buenos días", sub: "Esto es lo que tienes para hoy." };
    if (h >= 13 && h < 20) return { title: "Buenas tardes", sub: "Esto es lo que queda por hacer." };
    return { title: "Buenas noches", sub: "Así va tu día." };
  },

  update() {
    const section = DOM.get("greeting-section");
    const title   = DOM.get("hero-greeting");
    const sub     = DOM.get("hero-greeting-sub");
    if (!section || !title) return;
    const hasTasks = TaskService.count > 0;
    section.classList.toggle("hidden", !hasTasks);
    if (hasTasks) {
      const { total, completed, pending } = TaskService.computeStats();
      const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
      const txt = this._getText(percent, pending);
      title.textContent = txt.title;
      if (sub) sub.textContent = txt.sub;
    }
  },
};

/* ═══════════════════════════════════════════
   WELCOME — Empty-state onboarding (no tasks)
   ═══════════════════════════════════════════ */

const Welcome = {
  _getText() {
    const h = Utils.currentHour();
    if (h >= 5 && h < 13) return { title: "Tu día empieza aquí", sub: "Añade tu primera tarea y empieza a organizar tu mañana." };
    if (h >= 13 && h < 20) return { title: "Todo bajo control", sub: "Planifica lo que queda del día añadiendo tu primera tarea." };
    return { title: "Prepárate para mañana", sub: "Deja tus tareas listas para empezar el día con ventaja." };
  },

  update() {
    const section  = DOM.get("welcome-section");
    if (!section) return;
    const hasTasks  = TaskService.count > 0;
    const hasQuery  = Search.getQuery().length > 0;
    const show      = !hasTasks && !hasQuery;

    section.classList.toggle("hidden", !show);

    // Category pills
    const pills = DOM.categoryPillsSection;
    if (pills) pills.style.display = show ? "none" : "";

    if (show) {
      DOM.get("now-section")?.classList.add("hidden");
      DOM.get("next-section")?.classList.add("hidden");
      DOM.get("done-section")?.classList.add("hidden");
      const txt = this._getText();
      const greetingEl = DOM.get("welcome-greeting");
      const subEl = DOM.get("welcome-sub");
      if (greetingEl) greetingEl.textContent = txt.title;
      if (subEl) subEl.textContent = txt.sub;
    } else {
      DOM.get("next-section")?.classList.remove("hidden");
      DOM.get("done-section")?.classList.remove("hidden");
    }
  },
};

/* ═══════════════════════════════════════════
   PROGRESS — SVG ring + labels
   ═══════════════════════════════════════════ */

const Progress = {
  /** Update hero ring + sidebar ring + progress text. */
  update() {
    const { total, completed } = TaskService.computeStats();
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    // Hero ring
    this._updateRing(DOM.get("progress-ring"), RING.HERO_CIRCUMFERENCE, percent);
    const heroPercent = DOM.get("progress-percent");
    if (heroPercent) heroPercent.textContent = `${percent}%`;

    // Progress text
    const textEl = DOM.get("progress-text");
    if (textEl) textEl.textContent = this._getLabel(total, completed, percent);

    // Date headline
    const dateEl = DOM.get("date-headline");
    if (dateEl) dateEl.textContent = Utils.formatDate();
  },

  _updateRing(el, circumference, percent) {
    if (!el) return;
    const offset = circumference - (circumference * percent / 100);
    el.setAttribute("stroke-dashoffset", offset);
  },

  _getLabel(total, completed, percent) {
    if (total === 0) return "Sin tareas aún";
    if (percent === 0) return `${total - completed} pendientes`;
    if (percent < 33) return `Buen comienzo — ${completed} de ${total}`;
    if (percent < 66) return `Vas por buen camino — ${completed} de ${total}`;
    if (percent < 100) return `Casi lo tienes — ${completed} de ${total}`;
    return "Todo listo";
  },
};

/* ═══════════════════════════════════════════
   UNDO TOAST
   ═══════════════════════════════════════════ */

const UndoToast = {
  _timer: null,
  _task: null,
  _index: null,

  show(task, originalIndex) {
    if (this._timer) clearTimeout(this._timer);
    this._task = task;
    this._index = originalIndex;

    const toast = DOM.get("undo-toast");
    if (!toast) return;

    // Progress bar
    const existing = toast.querySelector(".undo-toast-progress");
    if (existing) existing.remove();
    const bar = document.createElement("div");
    bar.className = "undo-toast-progress";
    bar.style.width = "100%";
    toast.appendChild(bar);

    // Message
    const msg = DOM.get("undo-toast-msg");
    const name = task.text.length > 28 ? task.text.slice(0, 28) + "…" : task.text;
    if (msg) msg.textContent = `"${name}" eliminada`;

    toast.classList.add("visible");
    requestAnimationFrame(() => {
      bar.style.transitionDuration = `${CONFIG.UNDO_TIMEOUT_MS}ms`;
      bar.style.width = "0%";
    });

    this._timer = setTimeout(() => this.hide(), CONFIG.UNDO_TIMEOUT_MS);
  },

  hide() {
    DOM.get("undo-toast")?.classList.remove("visible");
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    this._task = null;
    this._index = null;
  },

  undo() {
    if (!this._task) return;
    TaskService.insertAt(this._task, this._index ?? 0);
    App.commit();
    this.hide();
  },
};

/* ═══════════════════════════════════════════
   TASK RENDERER — DOM construction for task cards
   ═══════════════════════════════════════════ */

const TaskRenderer = {
  /** @returns {string} */
  priorityClasses(priority) {
    return CLASSES.priorityBase + (CLASSES.priority[priority] ?? CLASSES.priority.Baja);
  },

  /** @returns {string} */
  cardClasses(completed) {
    return completed ? CLASSES.taskCard.completed : CLASSES.taskCard.pending;
  },

  /** @returns {string} */
  checkClasses(completed) {
    return CLASSES.checkButtonBase + (completed ? CLASSES.checkButton.completed : CLASSES.checkButton.pending);
  },

  /** Generic button factory. */
  _button({ action, id, className, text, html, ariaLabel }) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.action = action;
    btn.dataset.id = id;
    btn.className = className;
    if (ariaLabel) btn.setAttribute("aria-label", ariaLabel);
    if (html !== undefined) btn.innerHTML = html;
    else if (text !== undefined) btn.textContent = text;
    return btn;
  },

  /** Build a complete <li> task card. */
  createItem(task, completed = false) {
    const li = document.createElement("li");
    li.dataset.id = task.id;
    li.className = this.cardClasses(completed);
    li.draggable = true;
    li.addEventListener("dragstart", () => (li.style.opacity = "0.4"));
    li.addEventListener("dragend", () => (li.style.opacity = "1"));
    if (task.priority === "Alta" && !completed) li.classList.add("priority-high");

    li.append(this._buildLeft(task, completed), this._buildRight(task));
    if (task.id === UIState.lastAddedTaskId && !completed) this._animateIn(li);
    return li;
  },

  _buildLeft(task, completed) {
    const wrap = document.createElement("div");
    wrap.className = "flex min-w-0 items-center gap-3";
    const checkBtn = this._button({
      action: completed ? "restore" : "complete", id: task.id,
      className: this.checkClasses(completed),
      html: completed ? "✓" : "",
      ariaLabel: completed ? "Marcar como pendiente" : "Marcar como completada",
    });
    const textWrap = document.createElement("div");
    textWrap.className = "min-w-0";

    if (UIState.editingTaskId === task.id) {
      const input = document.createElement("input");
      input.dataset.role = "edit-text";
      input.value = task.text;
      input.className = CLASSES.editInput;
      textWrap.appendChild(input);
    } else {
      const p = document.createElement("p");
      p.className = completed
        ? "truncate text-sm text-stone-400 line-through dark:text-neutral-500"
        : "truncate text-sm text-stone-700 dark:text-neutral-200";
      p.textContent = task.text;
      textWrap.appendChild(p);
    }
    wrap.append(checkBtn, textWrap);
    return wrap;
  },

  _buildRight(task) {
    const wrap = document.createElement("div");
    wrap.className = "flex items-center gap-1.5";
    const catBadge = document.createElement("span");
    catBadge.className = CLASSES.categoryBadge;
    catBadge.textContent = task.category;
    const priBadge = document.createElement("span");
    priBadge.className = this.priorityClasses(task.priority);
    priBadge.textContent = task.priority;
    const isEditing = UIState.editingTaskId === task.id;
    const editBtn = this._button({
      action: isEditing ? "edit-save" : "edit", id: task.id,
      className: CLASSES.actionButton,
      text: isEditing ? "Guardar" : "Editar",
    });
    wrap.append(catBadge, priBadge, editBtn);
    if (isEditing) {
      wrap.append(this._button({ action: "edit-cancel", id: task.id, className: CLASSES.actionButton, text: "Cancelar" }));
    }
    wrap.append(this._button({ action: "delete", id: task.id, className: CLASSES.actionButton, text: "Borrar" }));
    return wrap;
  },

  _animateIn(li) {
    li.style.opacity = "0";
    li.style.transform = "translateY(8px)";
    requestAnimationFrame(() => {
      li.style.transition = `opacity ${CONFIG.ANIMATION_MS}ms ease, transform ${CONFIG.ANIMATION_MS}ms ease`;
      li.style.opacity = "1";
      li.style.transform = "translateY(0)";
    });
  },

  /** Render items into a <ul>, or show empty state. */
  renderList(listEl, items, { completed, emptyMessage }) {
    listEl.innerHTML = "";
    if (items.length === 0) {
      const li = document.createElement("li");
      li.className = CLASSES.emptyState;
      const p = document.createElement("p");
      p.textContent = emptyMessage;
      li.appendChild(p);
      listEl.appendChild(li);
      return;
    }
    for (const task of items) {
      listEl.appendChild(this.createItem(task, completed));
    }
  },
};

/* ═══════════════════════════════════════════
   ANIMATIONS — Animate before state change
   ═══════════════════════════════════════════ */

const Animations = {
  /** Fade+slide out, then complete. */
  complete(li, id) {
    if (!li) { TaskService.setCompleted(id, true); App.commit(); return; }
    li.style.transition = `opacity ${CONFIG.ANIMATION_MS}ms ease, transform ${CONFIG.ANIMATION_MS}ms ease`;
    li.style.opacity = "0";
    li.style.transform = "translateY(-6px)";
    setTimeout(() => { TaskService.setCompleted(id, true); App.commit(); }, CONFIG.ANIMATION_MS);
  },

  /** Fade+scale out, then delete with undo. */
  delete(li, id) {
    if (!li) { this._doDelete(id); return; }
    li.style.transition = `opacity ${CONFIG.ANIMATION_MS}ms ease, transform ${CONFIG.ANIMATION_MS}ms ease`;
    li.style.opacity = "0";
    li.style.transform = "scale(0.95) translateY(-4px)";
    setTimeout(() => this._doDelete(id), CONFIG.ANIMATION_MS);
  },

  _doDelete(id) {
    const { removed, index } = TaskService.remove(id);
    App.commit();
    if (removed) UndoToast.show(removed, index);
  },
};

/* ═══════════════════════════════════════════
   DRAG & DROP
   ═══════════════════════════════════════════ */

const DragDrop = {
  _srcIndex: null,
  _srcSection: null,

  handleStart(event) {
    const li = event.target.closest("[data-id]");
    if (!li) return;
    this._srcIndex = TaskService.tasks.findIndex((t) => t.id === li.dataset.id);
    const parentList = li.closest("[data-section]");
    this._srcSection = parentList ? parentList.dataset.section : null;
  },

  handleEnter(event) {
    const list = event.target.closest("[data-section]");
    if (list && this._srcSection && list.dataset.section !== this._srcSection) {
      list.classList.add("drag-over");
    }
  },

  handleLeave(event) {
    const list = event.target.closest("[data-section]");
    if (list && !list.contains(event.relatedTarget)) list.classList.remove("drag-over");
  },

  handleDrop(event) {
    event.preventDefault();
    document.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));

    const targetList = event.target.closest("[data-section]");
    if (!targetList || this._srcIndex === null) { this._reset(); return; }

    const dest = targetList.dataset.section;
    const src = this._srcSection;
    const taskId = TaskService.tasks[this._srcIndex]?.id;
    if (!taskId) { this._reset(); return; }

    // Cross-section
    if (src !== dest) {
      this._handleCrossSection(src, dest, taskId);
      this._reset();
      return;
    }

    // Same-section reorder
    const li = event.target.closest("[data-id]");
    if (!li) { this._reset(); return; }
    const destIndex = TaskService.tasks.findIndex((t) => t.id === li.dataset.id);
    if (destIndex !== -1 && destIndex !== this._srcIndex) {
      TaskService.reorder(this._srcIndex, destIndex);
      App.commit();
    }
    this._reset();
  },

  _handleCrossSection(src, dest, taskId) {
    // Pending/Now → Done
    if ((src === "now" || src === "next") && dest === "done") {
      TaskService.updateTask(taskId, { completed: true, completedAt: Date.now() });
      if (!UIState.doneExpanded) {
        UIState.doneExpanded = true;
        const arrow = DOM.get("done-arrow");
        if (arrow) arrow.style.transform = "rotate(90deg)";
      }
    }
    // Done → Now
    else if (src === "done" && dest === "now") {
      TaskService.updateTask(taskId, { completed: false, completedAt: null, priority: "Alta" });
    }
    // Done → Pending
    else if (src === "done" && dest === "next") {
      const task = TaskService.tasks.find((t) => t.id === taskId);
      TaskService.updateTask(taskId, {
        completed: false, completedAt: null,
        priority: task?.priority === "Alta" ? "Media" : (task?.priority ?? "Media"),
      });
    }
    // Now → Pending
    else if (src === "now" && dest === "next") {
      TaskService.updateTask(taskId, { priority: "Media" });
    }
    // Pending → Now
    else if (src === "next" && dest === "now") {
      TaskService.updateTask(taskId, { priority: "Alta" });
    }
    App.commit();
  },

  _reset() {
    this._srcIndex = null;
    this._srcSection = null;
  },
};

/* ═══════════════════════════════════════════
   SIDEBAR — XL sidebar: filters, stats, context
   ═══════════════════════════════════════════ */

const Sidebar = {
  build() {
    const container = DOM.get("sidebar-category-filters");
    if (!container) return;
    container.innerHTML = "";
    const cats = ["all", ...CATEGORIES];
    const labels = { all: "Todas" };
    for (const cat of cats) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sidebar-filter-btn" + (UIState.categoryFilter === cat ? " active" : "");
      btn.dataset.sidebarFilter = cat;
      const dot = document.createElement("span");
      Object.assign(dot.style, { width: "8px", height: "8px", borderRadius: "50%", flexShrink: "0" });
      dot.style.background = cat === "all" ? "rgb(163 163 163)" : (CATEGORY_COLORS[cat] || "#999");
      const label = document.createElement("span");
      label.textContent = labels[cat] || cat;
      btn.append(dot, label);
      btn.addEventListener("click", () => { UIState.categoryFilter = cat; App.render(); });
      container.appendChild(btn);
    }
  },

  update() {
    const { total, pending, completed, byCategory } = TaskService.computeStats();
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    const offset = RING.SIDEBAR_CIRCUMFERENCE - (RING.SIDEBAR_CIRCUMFERENCE * percent / 100);

    // Ring
    const ring = DOM.get("progress-ring-sidebar");
    if (ring) ring.setAttribute("stroke-dashoffset", offset);
    const pct = DOM.get("progress-percent-sidebar");
    if (pct) pct.textContent = `${percent}%`;
    const label = DOM.get("sidebar-progress-label");
    if (label) label.textContent = total === 0 ? "Sin tareas" : `${completed}/${total} completadas`;

    // Category bars
    const statsEl = DOM.get("sidebar-category-stats");
    if (statsEl) {
      statsEl.innerHTML = "";
      for (const [cat, count] of Object.entries(byCategory)) {
        if (count === 0) continue;
        const li = document.createElement("li");
        li.className = "space-y-1";
        const row = document.createElement("div");
        row.className = "flex items-center justify-between";
        const nameSpan = document.createElement("span");
        nameSpan.className = "text-stone-500 dark:text-neutral-400";
        nameSpan.textContent = cat;
        const countSpan = document.createElement("span");
        countSpan.className = "font-mono-ui text-stone-600 dark:text-neutral-300";
        countSpan.textContent = count;
        row.append(nameSpan, countSpan);
        const bar = document.createElement("div");
        bar.className = "category-bar";
        const fill = document.createElement("div");
        fill.className = "category-bar-fill";
        fill.style.width = `${Math.round((count / total) * 100)}%`;
        fill.style.background = CATEGORY_COLORS[cat] || "#f59e0b";
        bar.appendChild(fill);
        li.append(row, bar);
        statsEl.appendChild(li);
      }
    }

    // Summary numbers
    const totalEl = DOM.get("sidebar-total");
    const pendEl  = DOM.get("sidebar-pending");
    const compEl  = DOM.get("sidebar-completed");
    if (totalEl) totalEl.textContent = total;
    if (pendEl) pendEl.textContent = pending;
    if (compEl) compEl.textContent = completed;

    // Filter active states
    const container = DOM.get("sidebar-category-filters");
    if (container) {
      container.querySelectorAll(".sidebar-filter-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.sidebarFilter === UIState.categoryFilter);
      });
    }

    // Date/time
    const dateEl = DOM.get("sidebar-date");
    if (dateEl) dateEl.textContent = Utils.formatDate();
    const timeEl = DOM.get("sidebar-time");
    if (timeEl) timeEl.textContent = Utils.formatTime();
    const locEl = DOM.get("sidebar-location");
    if (locEl) locEl.textContent = Location.city;
  },
};

/* ═══════════════════════════════════════════
   KEYBOARD — Centralized keyboard shortcuts
   ═══════════════════════════════════════════ */

const Keyboard = {
  init() {
    document.addEventListener("keydown", (e) => this._handleGlobal(e));
    document.addEventListener("keydown", (e) => this._handleEdit(e));
  },

  _handleGlobal(e) {
    const mod = e.ctrlKey || e.metaKey;

    // Ctrl+K → focus search
    if (mod && e.key === "k") { e.preventDefault(); Search.focus(); return; }

    // Ctrl+Shift+C → complete all
    if (mod && e.shiftKey && e.key === "C") {
      e.preventDefault();
      if (TaskService.hasPending()) { TaskService.completeAll(); App.commit(); }
      return;
    }

    // Ctrl+Shift+X → clear completed
    if (mod && e.shiftKey && e.key === "X") {
      e.preventDefault();
      if (TaskService.hasCompleted()) { TaskService.clearCompleted(); App.commit(); }
      return;
    }

    // Escape
    if (e.key !== "Escape") return;
    if (UIState.editingTaskId && document.activeElement?.matches('input[data-role="edit-text"]')) {
      UIState.editingTaskId = null; App.render(); return;
    }
    const searchInput = DOM.get("search-input");
    if (searchInput?.value) {
      searchInput.value = ""; App.render(); Search.updateHints(); searchInput.focus(); return;
    }
    if (document.activeElement === searchInput) { searchInput.blur(); }
  },

  _handleEdit(e) {
    if (!UIState.editingTaskId) return;
    if (!document.activeElement?.matches('input[data-role="edit-text"]')) return;
    if (e.key === "Escape") { UIState.editingTaskId = null; App.render(); return; }
    if (e.key !== "Enter") return;
    const text = document.activeElement.value;
    const result = TaskService.updateText(UIState.editingTaskId, text);
    if (!result.ok) return;
    UIState.editingTaskId = null;
    App.commit();
  },
};

/* ═══════════════════════════════════════════
   LIST ACTIONS — Delegated click handler
   ═══════════════════════════════════════════ */

const ListActions = {
  handle(event) {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (!id) return;
    const li = btn.closest("li");

    switch (action) {
      case "complete": Animations.complete(li, id); break;
      case "restore":  TaskService.setCompleted(id, false); App.commit(); break;
      case "delete":   Animations.delete(li, id); break;
      case "edit":
        UIState.editingTaskId = id;
        App.render();
        setTimeout(() => document.querySelector(`li[data-id="${id}"] input[data-role="edit-text"]`)?.focus(), 0);
        break;
      case "edit-cancel":
        UIState.editingTaskId = null;
        App.render();
        break;
      case "edit-save": {
        const inputEl = li?.querySelector('input[data-role="edit-text"]');
        const result = TaskService.updateText(id, inputEl?.value ?? "");
        if (!result.ok && inputEl) {
          const msg = result.error === "TOO_LONG" ? `La tarea no puede superar ${CONFIG.MAX_TASK_LENGTH} caracteres.`
            : result.error === "DUPLICATE" ? "Ya existe una tarea con ese mismo texto." : "Escribe una tarea.";
          inputEl.setCustomValidity(msg);
          inputEl.reportValidity();
          return;
        }
        UIState.editingTaskId = null;
        App.commit();
        break;
      }
    }
  },
};

/* ═══════════════════════════════════════════
   APP — Init + render orchestration
   ═══════════════════════════════════════════ */

const App = {
  /** Save to store + full re-render. Single entry point for state changes. */
  commit() {
    TaskService.save();
    this.render();
  },

  /** Full UI re-render (no persistence). */
  render() {
    const query = Search.getQuery();
    const hasQuery = Boolean(query);
    const { now, next, done } = TaskService.getVisible(query, UIState.categoryFilter);
    const emptySearch = "No encontré nada con esa búsqueda.";

    // Update all UI modules
    this._updateFilterPills();
    Progress.update();
    Greeting.update();

    // Done count
    const doneCountEl = DOM.get("done-count");
    if (doneCountEl) doneCountEl.textContent = TaskService.tasks.filter((t) => t.completed).length;

    // Clear search visibility
    const clearBtn = DOM.get("clear-search");
    if (clearBtn) clearBtn.classList.toggle("hidden", !hasQuery);

    // Render lists
    TaskRenderer.renderList(DOM.get("next-list"), next, { completed: false, emptyMessage: hasQuery ? emptySearch : "Añade una tarea arriba para empezar." });
    TaskRenderer.renderList(DOM.get("now-list"), now, { completed: false, emptyMessage: hasQuery ? emptySearch : "Nada urgente ahora mismo." });

    // Done list
    const doneList = DOM.get("done-list");
    if (UIState.doneExpanded) {
      doneList?.classList.remove("hidden");
      TaskRenderer.renderList(doneList, done, { completed: true, emptyMessage: hasQuery ? emptySearch : "Todavía no has completado ninguna tarea." });
    } else {
      doneList?.classList.add("hidden");
      if (doneList) doneList.innerHTML = "";
    }

    // Now section visibility
    const nowVisible = now.length > 0 || hasQuery;
    DOM.get("now-section")?.classList.toggle("hidden", !nowVisible);

    // Complete-all button placement
    const caNow  = DOM.get("complete-all-now");
    const caNext = DOM.get("complete-all-next");
    if (caNow && caNext) {
      caNow.classList.toggle("hidden", !nowVisible);
      caNext.classList.toggle("hidden", nowVisible);
    }

    UIState.lastAddedTaskId = null;
    Welcome.update();
    Sidebar.update();
  },

  _updateFilterPills() {
    DOM.categoryFilterButtons.forEach((btn) => {
      const isActive = btn.dataset.categoryFilter === UIState.categoryFilter;
      btn.className = CLASSES.filterPillBase + (isActive ? CLASSES.filterPill.active : CLASSES.filterPill.inactive);
    });
  },

  /** Wire up all event listeners. Called once. */
  _bindEvents() {
    // Form submit
    DOM.get("task-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const inputEl = DOM.get("task-input");
      const text = Utils.safeTrim(inputEl?.value);
      const category = DOM.get("task-category")?.value ?? "Personal";
      const priority = DOM.get("task-priority")?.value ?? "Media";
      if (!text) return;
      if (inputEl) inputEl.setCustomValidity("");

      const result = TaskService.add(text, category, priority);
      if (!result.ok) {
        if (inputEl) {
          const msg = result.error === "TOO_LONG" ? `La tarea no puede superar ${CONFIG.MAX_TASK_LENGTH} caracteres.`
            : result.error === "DUPLICATE" ? "Ya existe una tarea con ese mismo texto."
            : result.error === "EMPTY" ? "Escribe una tarea." : "No se pudo añadir la tarea.";
          inputEl.setCustomValidity(msg);
          inputEl.reportValidity();
        }
        return;
      }

      UIState.lastAddedTaskId = result.task.id;
      this.commit();
      if (inputEl) { inputEl.value = ""; inputEl.focus(); }
      const enterHint = DOM.get("enter-hint");
      if (enterHint) enterHint.classList.remove("visible");
      const catSel = DOM.get("task-category");
      const priSel = DOM.get("task-priority");
      if (catSel) catSel.value = "Personal";
      if (priSel) priSel.value = "Media";
    });

    // Enter hint on task input
    const taskInput = DOM.get("task-input");
    const enterHint = DOM.get("enter-hint");
    taskInput?.addEventListener("input", () => {
      taskInput.setCustomValidity("");
      if (enterHint) enterHint.classList.toggle("visible", Utils.safeTrim(taskInput.value).length > 0);
    });
    taskInput?.addEventListener("focus", () => {
      if (enterHint && Utils.safeTrim(taskInput.value).length > 0) enterHint.classList.add("visible");
    });
    taskInput?.addEventListener("blur", () => {
      if (enterHint) enterHint.classList.remove("visible");
    });

    // Search input
    const searchInput = DOM.get("search-input");
    searchInput?.addEventListener("input", () => {
      Search.updateHints();
      if (UIState.searchDebounceTimer) clearTimeout(UIState.searchDebounceTimer);
      UIState.searchDebounceTimer = setTimeout(() => this.render(), CONFIG.SEARCH_DEBOUNCE_MS);
    });

    // Clear search
    DOM.get("clear-search")?.addEventListener("click", () => {
      Search.clear();
      this.render();
      Search.updateHints();
      Search.focus();
    });

    // Theme toggle
    DOM.get("theme-toggle")?.addEventListener("click", () => Theme.toggle());

    // Category filter pills
    DOM.categoryFilterButtons.forEach((btn) => {
      btn.addEventListener("click", () => { UIState.categoryFilter = btn.dataset.categoryFilter; this.render(); });
    });

    // Done toggle
    DOM.get("toggle-done")?.addEventListener("click", () => {
      UIState.doneExpanded = !UIState.doneExpanded;
      const arrow = DOM.get("done-arrow");
      if (arrow) arrow.style.transform = UIState.doneExpanded ? "rotate(90deg)" : "rotate(0deg)";
      this.render();
    });

    // Drag & drop on all 3 lists
    ["now-list", "next-list", "done-list"].forEach((id) => {
      const list = DOM.get(id);
      if (!list) return;
      list.addEventListener("dragover", (e) => e.preventDefault());
      list.addEventListener("drop",      (e) => DragDrop.handleDrop(e));
      list.addEventListener("dragstart", (e) => DragDrop.handleStart(e));
      list.addEventListener("dragenter", (e) => DragDrop.handleEnter(e));
      list.addEventListener("dragleave", (e) => DragDrop.handleLeave(e));
      list.addEventListener("click",     (e) => ListActions.handle(e));
    });

    // Bulk actions
    DOM.get("clear-completed")?.addEventListener("click", () => { TaskService.clearCompleted(); this.commit(); });
    DOM.get("complete-all-now")?.addEventListener("click", () => { TaskService.completeAll(); this.commit(); });
    DOM.get("complete-all-next")?.addEventListener("click", () => { TaskService.completeAll(); this.commit(); });
    DOM.get("sidebar-complete-all")?.addEventListener("click", () => { TaskService.completeAll(); this.commit(); });
    DOM.get("sidebar-clear-done")?.addEventListener("click", () => { TaskService.clearCompleted(); this.commit(); });

    // Undo toast
    DOM.get("undo-toast-btn")?.addEventListener("click", () => UndoToast.undo());

    // Keyboard
    Keyboard.init();
  },

  /** App entry point. */
  init() {
    Theme.load();
    TaskService.load();
    this._bindEvents();
    Location.fetch();
    setInterval(() => Location._applyEverywhere(), CONFIG.CLOCK_INTERVAL_MS);
    Sidebar.build();

    // Initial time display
    const heroTime = DOM.get("time-location");
    if (heroTime) heroTime.textContent = Location.formatTimeLocation();

    this.render();
  },
};

/* ═══════════════════════════════════════════
   BOOT
   ═══════════════════════════════════════════ */

App.init();
