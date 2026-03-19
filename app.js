"use strict";

/* =========================
DOM
========================= */
const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const categorySelect = document.getElementById("task-category");
const prioritySelect = document.getElementById("task-priority");

const nowList = document.getElementById("now-list");
const nextList = document.getElementById("next-list");
const doneList = document.getElementById("done-list");

const searchInput = document.getElementById("search-input");
const clearSearchBtn = document.getElementById("clear-search");
const searchSection = document.getElementById("search-section");
const toggleSearchBtn = document.getElementById("toggle-search");

const dateHeadline = document.getElementById("date-headline");
const timeLocation = document.getElementById("time-location");
const progressText = document.getElementById("progress-text");
const progressRing = document.getElementById("progress-ring");
const progressPercent = document.getElementById("progress-percent");

const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");
const themeText = document.getElementById("theme-text");

const clearCompletedBtn = document.getElementById("clear-completed");
const completeAllBtn = document.getElementById("complete-all");
const toggleDoneBtn = document.getElementById("toggle-done");
const doneArrow = document.getElementById("done-arrow");
const doneCountEl = document.getElementById("done-count");

const nowSection = document.getElementById("now-section");
const nextSection = document.getElementById("next-section");
const doneSection = document.getElementById("done-section");

const categoryFilterButtons = document.querySelectorAll(".category-filter-btn");

/* =========================
Estado
========================= */
const STORAGE_KEY = "taskflow_tasks_v12";
const THEME_KEY = "taskflow_theme_v12";
const MAX_TASK_LENGTH = 300;
const RING_CIRCUMFERENCE = 201.1;

let tasks = [];
let currentCategoryFilter = "all";
let lastAddedTaskId = null;
let editingTaskId = null;
let dragSrcIndex = null;
let dragSrcSection = null;
let doneExpanded = false;

const CLASSES = {
priorityBase: "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
priority: {
Alta: " border-red-200/80 bg-red-50 text-red-600 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-400",
Media: " border-stone-200/80 bg-stone-100 text-stone-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400",
Baja: " border-stone-200/60 bg-white text-stone-400 dark:border-neutral-700/60 dark:bg-neutral-900 dark:text-neutral-500",
},
categoryBadge: "inline-flex items-center rounded-full border border-stone-200/60 bg-white px-2.5 py-0.5 text-[11px] font-medium text-stone-400 dark:border-neutral-700/50 dark:bg-neutral-800 dark:text-neutral-500",
taskCard: {
pending: "group flex items-center justify-between gap-3 rounded-xl border border-stone-200/60 bg-white px-4 py-3 transition duration-200 ease-out hover:border-stone-300/80 dark:border-neutral-700/50 dark:bg-neutral-900 dark:hover:border-neutral-600",
completed: "group flex items-center justify-between gap-3 rounded-xl border border-stone-200/40 bg-white px-4 py-3 transition duration-200 ease-out opacity-50 hover:opacity-80 dark:border-neutral-700/40 dark:bg-neutral-900 dark:hover:border-neutral-600",
},
checkButtonBase: "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold transition duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:focus:ring-neutral-600",
checkButton: {
pending: " border-stone-200/80 bg-white text-stone-300 hover:border-amber-400 hover:text-amber-500 hover:bg-amber-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-600 dark:hover:border-neutral-500 dark:hover:text-neutral-300",
completed: " border-amber-400 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700",
},
deleteButton: "task-actions rounded-lg px-2 py-1 text-[11px] font-medium text-stone-400 transition duration-150 ease-out hover:bg-stone-100 hover:text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 dark:focus:ring-neutral-600",
emptyState: "rounded-xl border border-dashed border-stone-200/50 bg-white px-4 py-8 text-sm text-stone-400 text-center dark:border-neutral-700/40 dark:bg-neutral-900 dark:text-neutral-600",
filterPill: {
active: "border-amber-400 bg-amber-50 text-amber-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200",
inactive: "border-stone-200/60 bg-white text-stone-400 hover:border-stone-300 hover:text-stone-600 dark:border-neutral-700/50 dark:bg-neutral-900 dark:text-neutral-500 dark:hover:border-neutral-600 dark:hover:text-neutral-300",
},
};

/* =========================
Storage
========================= */

/** Persiste el array de tareas en localStorage como JSON. */
function saveTasks() { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }

/**
 * Carga las tareas desde localStorage.
 * Normaliza la estructura de cada tarea y aplica valores por defecto.
 * Si hay error de parseo o datos inválidos, inicializa tasks como array vacío.
 */
function loadTasks() {
try {
const raw = localStorage.getItem(STORAGE_KEY);
const parsed = raw ? JSON.parse(raw) : [];
tasks = Array.isArray(parsed)
? parsed.map((task) => ({
id: task.id ?? crypto.randomUUID(), text: task.text ?? "", category: task.category ?? "Personal",
priority: task.priority ?? "Media", completed: Boolean(task.completed),
createdAt: task.createdAt ?? Date.now(), completedAt: task.completedAt ?? null,
}))
: [];
} catch { tasks = []; }
}

/* =========================
Utilidades
========================= */

/**
 * Convierte cualquier valor a string y aplica trim.
 * @param {*} value - Valor a limpiar.
 * @returns {string} String limpio sin espacios al inicio/final.
 */
function safeTrim(value) { return (value ?? "").toString().trim(); }

/**
 * Normaliza texto para comparación de duplicados.
 * Aplica trim, colapsa espacios múltiples y convierte a minúsculas.
 * @param {string} text - Texto a normalizar.
 * @returns {string} Texto normalizado.
 */
function normalizeTaskText(text) { return safeTrim(text).replace(/\s+/g, " ").toLowerCase(); }

/** @returns {string} Valor actual del input de búsqueda, trimmed. */
function getSearchQuery() { return safeTrim(searchInput?.value); }

/**
 * Devuelve las clases Tailwind para un badge de prioridad.
 * @param {string} priority - "Alta", "Media" o "Baja".
 * @returns {string} Clases CSS concatenadas.
 */
function getPriorityClasses(priority) { return CLASSES.priorityBase + (CLASSES.priority[priority] ?? CLASSES.priority.Baja); }

/** @returns {string} Clases Tailwind para un badge de categoría. */
function getCategoryClasses() { return CLASSES.categoryBadge; }

/**
 * Devuelve las clases de la tarjeta de tarea según su estado.
 * @param {boolean} [completed=false] - Si la tarea está completada.
 * @returns {string} Clases CSS concatenadas.
 */
function getTaskCardClasses(completed = false) { return completed ? CLASSES.taskCard.completed : CLASSES.taskCard.pending; }

/**
 * Devuelve las clases del botón de check según estado.
 * @param {boolean} [completed=false] - Si la tarea está completada.
 * @returns {string} Clases CSS concatenadas.
 */
function getCheckButtonClasses(completed = false) { return CLASSES.checkButtonBase + (completed ? CLASSES.checkButton.completed : CLASSES.checkButton.pending); }

/** @returns {string} Clases Tailwind para los botones de acción (Editar, Borrar). */
function getDeleteButtonClasses() { return CLASSES.deleteButton; }

/**
 * Genera el titular de fecha en español (e.g. "jueves 19 de marzo").
 * @returns {string} Fecha formateada.
 */
function formatDateHeadline() {
const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const now = new Date();
return `${days[now.getDay()]} ${now.getDate()} de ${months[now.getMonth()]}`;
}

/**
 * Devuelve la hora local en formato HH:MM.
 * @returns {string} Hora formateada.
 */
function formatTime() {
return new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Obtiene la ubicación aproximada del usuario por IP (vía ipapi.co).
 * Actualiza el elemento #time-location con "HH:MM · Ciudad, País".
 * Si la petición falla, muestra solo la hora.
 */
function fetchLocation() {
fetch("https://ipapi.co/json/")
.then((r) => r.json())
.then((data) => {
if (data.city && timeLocation) {
timeLocation.textContent = `${formatTime()} · ${data.city}, ${data.country_name}`;
}
})
.catch(() => { if (timeLocation) timeLocation.textContent = formatTime(); });
}

/* =========================
Tema
========================= */

/**
 * Aplica un tema (claro u oscuro) al documento.
 * Añade o elimina la clase "dark" en <html> y actualiza el icono del botón.
 * @param {"light"|"dark"} theme - Tema a aplicar.
 */
function applyTheme(theme) {
const isDark = theme === "dark";
document.documentElement.classList.toggle("dark", isDark);
if (themeIcon) themeIcon.textContent = isDark ? "◗" : "○";
if (themeText) themeText.textContent = isDark ? "Oscuro" : "Claro";
}

/**
 * Carga el tema desde localStorage.
 * Si no hay preferencia guardada, detecta prefers-color-scheme del sistema.
 */
function loadTheme() {
const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme === "dark" || savedTheme === "light") { applyTheme(savedTheme); return; }
const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
applyTheme(prefersDark ? "dark" : "light");
}

/** Alterna entre tema claro y oscuro, persiste la elección y aplica. */
function toggleTheme() {
const isDark = document.documentElement.classList.contains("dark");
const nextTheme = isDark ? "light" : "dark";
localStorage.setItem(THEME_KEY, nextTheme);
applyTheme(nextTheme);
}

/* =========================
Filtros
========================= */

/**
 * Comprueba si una tarea coincide con la búsqueda.
 * Busca en texto, categoría y prioridad (case-insensitive).
 * @param {Object} task - Tarea a comprobar.
 * @param {string} query - Texto de búsqueda.
 * @returns {boolean}
 */
function matchesSearch(task, query) {
const q = query.toLowerCase();
return task.text.toLowerCase().includes(q) || task.category.toLowerCase().includes(q) || task.priority.toLowerCase().includes(q);
}

/**
 * Comprueba si una tarea pertenece a la categoría activa.
 * @param {Object} task - Tarea a comprobar.
 * @returns {boolean}
 */
function matchesCategory(task) {
if (currentCategoryFilter === "all") return true;
return task.category === currentCategoryFilter;
}

/**
 * Filtra las tareas según búsqueda y categoría activa.
 * Agrupa por urgencia: now (Alta), next (Media/Baja), done (completadas).
 * @returns {{ now: Object[], next: Object[], done: Object[] }}
 */
function getVisibleTasks() {
const query = getSearchQuery();
const filtered = tasks.filter((task) => {
const searchOk = query ? matchesSearch(task, query) : true;
return searchOk && matchesCategory(task);
});
return {
now: filtered.filter((t) => !t.completed && t.priority === "Alta"),
next: filtered.filter((t) => !t.completed && t.priority !== "Alta"),
done: filtered.filter((t) => t.completed),
};
}

/** Aplica las clases activa/inactiva a cada pill de categoría según el filtro actual. */
function updateFilterPills() {
categoryFilterButtons.forEach((btn) => {
const isActive = btn.dataset.categoryFilter === currentCategoryFilter;
const base = "category-filter-btn rounded-full border px-2 py-1.5 text-[11px] sm:text-xs font-medium transition duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:focus:ring-neutral-600 ";
btn.className = base + (isActive ? CLASSES.filterPill.active : CLASSES.filterPill.inactive);
});
}

/* =========================
Empty state
========================= */

/**
 * Crea un elemento <li> de empty state con mensaje centrado.
 * @param {string} message - Texto a mostrar.
 * @returns {HTMLLIElement}
 */
function createEmptyState(message) {
const li = document.createElement("li");
li.className = CLASSES.emptyState;
const text = document.createElement("p");
text.textContent = message;
li.appendChild(text);
return li;
}

/* =========================
Estado extra UI
========================= */

/**
 * Actualiza el anillo SVG de progreso y el mensaje contextual.
 * Calcula el porcentaje de tareas completadas y ajusta stroke-dashoffset.
 */
function updateProgress() {
const { total, completed } = computeStats(tasks);
const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
const offset = RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * percent / 100);
if (progressRing) progressRing.setAttribute("stroke-dashoffset", offset);
if (progressPercent) progressPercent.textContent = `${percent}%`;
let label;
if (total === 0) label = "Sin tareas aún";
else if (percent === 0) label = `${total - completed} pendientes`;
else if (percent < 33) label = `Buen comienzo — ${completed} de ${total}`;
else if (percent < 66) label = `Vas por buen camino — ${completed} de ${total}`;
else if (percent < 100) label = `Casi lo tienes — ${completed} de ${total}`;
else label = "Todo listo";
if (progressText) progressText.textContent = label;
}

/** Actualiza el titular de fecha en el DOM. */
function updateDateHeadline() { if (dateHeadline) dateHeadline.textContent = formatDateHeadline(); }

/** Actualiza el contador de tareas completadas junto al toggle "Hecho". */
function updateDoneCount() { if (doneCountEl) doneCountEl.textContent = tasks.filter((t) => t.completed).length; }

/** Muestra u oculta el botón "Limpiar" según si hay texto en la búsqueda. */
function updateClearSearchVisibility() { if (clearSearchBtn) clearSearchBtn.classList.toggle("hidden", getSearchQuery().length === 0); }

/* =========================
Render
========================= */

/**
 * Anima la entrada de una nueva tarea (fade + slide down, 220ms).
 * @param {HTMLLIElement} li - Elemento a animar.
 */
function animateNewItem(li) {
li.style.opacity = "0";
li.style.transform = "translateY(8px)";
requestAnimationFrame(() => {
li.style.transition = "opacity 220ms ease, transform 220ms ease";
li.style.opacity = "1";
li.style.transform = "translateY(0)";
});
}

/**
 * Factoría genérica de botones de acción para tarjetas de tarea.
 * @param {Object} config - Configuración del botón.
 * @param {string} config.action - Valor de data-action.
 * @param {string} config.id - Valor de data-id (ID de la tarea).
 * @param {string} config.className - Clases CSS.
 * @param {string} [config.textContent] - Texto del botón.
 * @param {string} [config.innerHTML] - HTML interno del botón.
 * @param {string} [config.ariaLabel] - Etiqueta ARIA.
 * @returns {HTMLButtonElement}
 */
function createActionButton({ action, id, className, textContent, innerHTML, ariaLabel }) {
const btn = document.createElement("button");
btn.type = "button"; btn.dataset.action = action; btn.dataset.id = id; btn.className = className;
if (ariaLabel) btn.setAttribute("aria-label", ariaLabel);
if (innerHTML !== undefined) btn.innerHTML = innerHTML;
else if (textContent !== undefined) btn.textContent = textContent;
return btn;
}

/**
 * Crea el elemento <p> del título de una tarea.
 * @param {Object} task - Tarea.
 * @param {boolean} completed - Si está completada (tachado y color atenuado).
 * @returns {HTMLParagraphElement}
 */
function createTaskTitle(task, completed) {
const title = document.createElement("p");
title.className = completed
? "truncate text-sm text-stone-400 line-through dark:text-neutral-500"
: "truncate text-sm text-stone-700 dark:text-neutral-200";
title.textContent = task.text;
return title;
}

/**
 * Construye el lado izquierdo de una tarjeta: check button + título o input de edición.
 * @param {Object} task - Tarea.
 * @param {boolean} completed - Si está completada.
 * @returns {HTMLDivElement}
 */
function createTaskLeft(task, completed) {
const left = document.createElement("div");
left.className = "flex min-w-0 items-center gap-3";
const checkBtn = createActionButton({
action: completed ? "restore" : "complete", id: task.id,
className: getCheckButtonClasses(completed),
innerHTML: completed ? "✓" : "",
ariaLabel: completed ? "Marcar como pendiente" : "Marcar como completada",
});
const textWrap = document.createElement("div");
textWrap.className = "min-w-0";
if (editingTaskId === task.id) {
const editInput = document.createElement("input");
editInput.dataset.role = "edit-text"; editInput.value = task.text;
editInput.className = "w-full min-w-[200px] rounded-lg border border-stone-200/80 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:ring-neutral-600";
textWrap.appendChild(editInput);
} else { textWrap.appendChild(createTaskTitle(task, completed)); }
left.append(checkBtn, textWrap);
return left;
}

/**
 * Construye el lado derecho de una tarjeta: badges + botones de acción.
 * @param {Object} task - Tarea.
 * @returns {HTMLDivElement}
 */
function createTaskRight(task) {
const right = document.createElement("div");
right.className = "flex items-center gap-1.5";
const categoryBadge = document.createElement("span");
categoryBadge.className = getCategoryClasses(); categoryBadge.textContent = task.category;
const priorityBadge = document.createElement("span");
priorityBadge.className = getPriorityClasses(task.priority); priorityBadge.textContent = task.priority;
const editBtn = editingTaskId === task.id
? createActionButton({ action: "edit-save", id: task.id, className: getDeleteButtonClasses(), textContent: "Guardar" })
: createActionButton({ action: "edit", id: task.id, className: getDeleteButtonClasses(), textContent: "Editar" });
const cancelBtn = editingTaskId === task.id
? createActionButton({ action: "edit-cancel", id: task.id, className: getDeleteButtonClasses(), textContent: "Cancelar" }) : null;
const deleteBtn = createActionButton({ action: "delete", id: task.id, className: getDeleteButtonClasses(), textContent: "Borrar" });
right.append(categoryBadge, priorityBadge, editBtn);
if (cancelBtn) right.append(cancelBtn);
right.append(deleteBtn);
return right;
}

/**
 * Construye el <li> completo de una tarea: clases, draggable, franja de prioridad, animación.
 * @param {Object} task - Tarea.
 * @param {boolean} [completed=false] - Si está completada.
 * @returns {HTMLLIElement}
 */
function createTaskItem(task, completed = false) {
const li = document.createElement("li");
li.dataset.id = task.id; li.className = getTaskCardClasses(completed); li.draggable = true;
li.addEventListener("dragstart", () => (li.style.opacity = "0.4"));
li.addEventListener("dragend", () => (li.style.opacity = "1"));
if (task.priority === "Alta" && !completed) li.classList.add("priority-high");
li.append(createTaskLeft(task, completed), createTaskRight(task));
if (task.id === lastAddedTaskId && !completed) animateNewItem(li);
return li;
}

/**
 * Renderiza una lista de tareas o su empty state.
 * @param {HTMLUListElement} listEl - Elemento <ul> destino.
 * @param {Object[]} items - Tareas a renderizar.
 * @param {Object} options
 * @param {boolean} options.completed - Si las tareas son completadas.
 * @param {string} options.emptyMessage - Mensaje si no hay tareas.
 */
function renderTaskListItems(listEl, items, { completed, emptyMessage }) {
listEl.innerHTML = "";
if (items.length === 0) { listEl.appendChild(createEmptyState(emptyMessage)); return; }
items.forEach((task) => { listEl.appendChild(createTaskItem(task, completed)); });
}

/**
 * Re-renderiza toda la UI: las 3 listas, progreso, pills, contadores.
 * Oculta la sección "Ahora" si no hay tareas de prioridad Alta.
 */
function renderTasks() {
const { now, next, done } = getVisibleTasks();
const query = getSearchQuery();
const hasQuery = Boolean(query);
updateFilterPills(); updateProgress(); updateDoneCount(); updateClearSearchVisibility();
const emptySearch = "No encontré nada con esa búsqueda.";
renderTaskListItems(nextList, next, { completed: false, emptyMessage: hasQuery ? emptySearch : "Añade una tarea arriba para empezar." });
renderTaskListItems(nowList, now, { completed: false, emptyMessage: hasQuery ? emptySearch : "Nada urgente ahora mismo." });
if (doneExpanded) { doneList.classList.remove("hidden"); renderTaskListItems(doneList, done, { completed: true, emptyMessage: hasQuery ? emptySearch : "Todavía no has completado ninguna tarea." }); }
else { doneList.classList.add("hidden"); doneList.innerHTML = ""; }
if (now.length === 0 && !hasQuery && currentCategoryFilter === "all") { nowSection.classList.add("hidden"); } else { nowSection.classList.remove("hidden"); }
lastAddedTaskId = null;
}

/**
 * Calcula estadísticas de una lista de tareas.
 * @param {Object[]} taskList - Array de tareas.
 * @returns {{ total: number, pending: number, completed: number, byCategory: Object }}
 */
function computeStats(taskList) {
const total = taskList.length; let pending = 0, completed = 0;
const byCategory = { Trabajo: 0, Personal: 0, Estudio: 0, Proyectos: 0, Salud: 0, Gestiones: 0 };
for (const task of taskList) { if (task.completed) completed += 1; else pending += 1; if (byCategory[task.category] !== undefined) byCategory[task.category] += 1; }
return { total, pending, completed, byCategory };
}

/* =========================
Lógica
========================= */

/**
 * Añade una nueva tarea al principio del array.
 * Valida texto vacío, longitud máxima y duplicados.
 * @param {string} text - Texto de la tarea.
 * @param {string} category - Categoría.
 * @param {string} priority - Prioridad ("Alta", "Media", "Baja").
 * @returns {{ ok: boolean, error?: string }}
 */
function addTask(text, category, priority) {
const trimmed = safeTrim(text);
if (!trimmed) return { ok: false, error: "EMPTY" };
if (trimmed.length > MAX_TASK_LENGTH) return { ok: false, error: "TOO_LONG" };
const normalized = normalizeTaskText(trimmed);
if (tasks.some((t) => normalizeTaskText(t.text) === normalized)) return { ok: false, error: "DUPLICATE" };
const task = { id: crypto.randomUUID(), text: trimmed, category, priority, completed: false, createdAt: Date.now(), completedAt: null };
tasks.unshift(task); lastAddedTaskId = task.id; commitTasksAndRender(); return { ok: true };
}

/**
 * Actualiza el texto de una tarea existente.
 * Valida las mismas reglas que addTask, excluyendo la propia tarea al detectar duplicados.
 * @param {string} id - ID de la tarea a editar.
 * @param {string} text - Nuevo texto.
 * @returns {{ ok: boolean, error?: string }}
 */
function updateTaskText(id, text) {
const trimmed = safeTrim(text);
if (!trimmed) return { ok: false, error: "EMPTY" };
if (trimmed.length > MAX_TASK_LENGTH) return { ok: false, error: "TOO_LONG" };
const normalized = normalizeTaskText(trimmed);
if (tasks.some((t) => t.id !== id && normalizeTaskText(t.text) === normalized)) return { ok: false, error: "DUPLICATE" };
tasks = tasks.map((t) => (t.id === id ? { ...t, text: trimmed } : t)); commitTasksAndRender(); return { ok: true };
}

/**
 * Marca o desmarca una tarea como completada.
 * @param {string} id - ID de la tarea.
 * @param {boolean} completed - Nuevo estado.
 */
function setTaskCompleted(id, completed) { tasks = tasks.map((task) => task.id === id ? { ...task, completed, completedAt: completed ? Date.now() : null } : task); commitTasksAndRender(); }

/** @param {string} id - ID de la tarea a eliminar. */
function deleteTask(id) { tasks = tasks.filter((task) => task.id !== id); commitTasksAndRender(); }

/** Elimina todas las tareas completadas. */
function clearCompletedTasks() { tasks = tasks.filter((task) => !task.completed); commitTasksAndRender(); }

/** Marca todas las tareas pendientes como completadas. */
function completeAllTasks() { tasks = tasks.map((task) => task.completed ? task : { ...task, completed: true, completedAt: Date.now() }); commitTasksAndRender(); }

/**
 * Anima la salida de una tarjeta (fade + slide up) y luego la marca como completada.
 * @param {HTMLLIElement|null} li - Elemento DOM de la tarjeta.
 * @param {string} id - ID de la tarea.
 */
function animateAndComplete(li, id) {
if (!li) { setTaskCompleted(id, true); return; }
li.style.transition = "opacity 220ms ease, transform 220ms ease"; li.style.opacity = "0"; li.style.transform = "translateY(-6px)";
setTimeout(() => { setTaskCompleted(id, true); }, 220);
}

/**
 * Anima la salida de una tarjeta (fade + scale down) y luego la elimina.
 * @param {HTMLLIElement|null} li - Elemento DOM de la tarjeta.
 * @param {string} id - ID de la tarea.
 */
function animateAndDelete(li, id) {
if (!li) { deleteTask(id); return; }
li.style.transition = "opacity 220ms ease, transform 220ms ease"; li.style.opacity = "0"; li.style.transform = "scale(0.95) translateY(-4px)";
setTimeout(() => { deleteTask(id); }, 220);
}

/** Persiste en localStorage y re-renderiza toda la UI. Punto de entrada único para cambios de estado. */
function commitTasksAndRender() { saveTasks(); renderTasks(); }

/* =========================
Drag & drop
========================= */

/**
 * Handler de dragstart. Guarda el índice y la sección de origen de la tarea arrastrada.
 * @param {DragEvent} event
 */
function handleDragStart(event) {
const li = event.target.closest("[data-id]");
if (!li) return;
dragSrcIndex = tasks.findIndex((task) => task.id === li.dataset.id);
const parentList = li.closest("[data-section]");
dragSrcSection = parentList ? parentList.dataset.section : null;
}

/**
 * Handler de dragenter. Añade feedback visual (outline) al entrar en una sección distinta.
 * @param {DragEvent} event
 */
function handleDragEnter(event) {
const list = event.target.closest("[data-section]");
if (list && dragSrcSection && list.dataset.section !== dragSrcSection) list.classList.add("drag-over");
}

/**
 * Handler de dragleave. Quita el feedback visual al salir de la sección.
 * @param {DragEvent} event
 */
function handleDragLeave(event) {
const list = event.target.closest("[data-section]");
if (list && !list.contains(event.relatedTarget)) list.classList.remove("drag-over");
}

/**
 * Handler de drop. Si es cross-section, cambia la prioridad de la tarea:
 * - Ahora → Pendiente: Alta → Media
 * - Pendiente → Ahora: Media/Baja → Alta
 * Si es same-section, reordena mediante splice.
 * @param {DragEvent} event
 */
function handleDrop(event) {
event.preventDefault();
document.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
const targetList = event.target.closest("[data-section]");
if (!targetList || dragSrcIndex === null) { dragSrcIndex = null; dragSrcSection = null; return; }
const destSection = targetList.dataset.section;
const taskId = tasks[dragSrcIndex]?.id;
if (!taskId) { dragSrcIndex = null; dragSrcSection = null; return; }
if (dragSrcSection === "now" && destSection === "next") {
tasks = tasks.map((t) => t.id === taskId ? { ...t, priority: "Media" } : t);
saveTasks(); renderTasks(); dragSrcIndex = null; dragSrcSection = null; return;
}
if (dragSrcSection === "next" && destSection === "now") {
tasks = tasks.map((t) => t.id === taskId ? { ...t, priority: "Alta" } : t);
saveTasks(); renderTasks(); dragSrcIndex = null; dragSrcSection = null; return;
}
const li = event.target.closest("[data-id]");
if (!li) { dragSrcIndex = null; dragSrcSection = null; return; }
const destIndex = tasks.findIndex((task) => task.id === li.dataset.id);
if (destIndex === -1 || destIndex === dragSrcIndex) { dragSrcIndex = null; dragSrcSection = null; return; }
const [moved] = tasks.splice(dragSrcIndex, 1);
tasks.splice(destIndex, 0, moved);
commitTasksAndRender(); dragSrcIndex = null; dragSrcSection = null;
}

/* =========================
Eventos
========================= */
form?.addEventListener("submit", (event) => {
event.preventDefault();
const text = safeTrim(input?.value); const category = categorySelect?.value ?? "Personal"; const priority = prioritySelect?.value ?? "Media";
if (!text) return;
if (input) input.setCustomValidity("");
const result = addTask(text, category, priority);
if (!result.ok) {
if (input) { const message = result.error === "TOO_LONG" ? `La tarea no puede superar ${MAX_TASK_LENGTH} caracteres.` : result.error === "DUPLICATE" ? "Ya existe una tarea con ese mismo texto." : result.error === "EMPTY" ? "Escribe una tarea." : "No se pudo añadir la tarea."; input.setCustomValidity(message); input.reportValidity(); }
return;
}
if (input) { input.value = ""; input.focus(); }
if (categorySelect) categorySelect.value = "Personal";
if (prioritySelect) prioritySelect.value = "Media";
});

[nowList, nextList, doneList].forEach((list) => {
if (!list) return;
list.addEventListener("dragover", (e) => e.preventDefault());
list.addEventListener("drop", handleDrop);
list.addEventListener("dragstart", handleDragStart);
list.addEventListener("dragenter", handleDragEnter);
list.addEventListener("dragleave", handleDragLeave);
});

input?.addEventListener("input", () => { input.setCustomValidity(""); });
searchInput?.addEventListener("input", () => { renderTasks(); });
clearSearchBtn?.addEventListener("click", () => { searchInput.value = ""; renderTasks(); searchInput.focus(); });

toggleSearchBtn?.addEventListener("click", () => {
searchSection.classList.toggle("hidden");
if (!searchSection.classList.contains("hidden")) { searchInput.focus(); }
else { searchInput.value = ""; renderTasks(); }
});

document.addEventListener("keydown", (event) => {
if (event.key !== "Escape") return;
if (editingTaskId && document.activeElement?.matches('input[data-role="edit-text"]')) { editingTaskId = null; renderTasks(); return; }
if (!searchInput || !searchInput.value) return;
searchInput.value = ""; renderTasks(); searchInput.focus();
});

themeToggle?.addEventListener("click", () => { toggleTheme(); });
categoryFilterButtons.forEach((btn) => { btn.addEventListener("click", () => { currentCategoryFilter = btn.dataset.categoryFilter; renderTasks(); }); });

toggleDoneBtn?.addEventListener("click", () => {
doneExpanded = !doneExpanded;
if (doneArrow) doneArrow.style.transform = doneExpanded ? "rotate(90deg)" : "rotate(0deg)";
renderTasks();
});

/**
 * Delegación de eventos para acciones dentro de las listas de tareas.
 * Lee data-action y data-id del botón pulsado y despacha la función correspondiente.
 * @param {MouseEvent} event
 */
function handleListActions(event) {
const actionBtn = event.target.closest("[data-action]");
if (!actionBtn) return;
const action = actionBtn.dataset.action; const id = actionBtn.dataset.id;
if (!id) return;
const li = actionBtn.closest("li");
if (action === "complete") { animateAndComplete(li, id); return; }
if (action === "restore") { setTaskCompleted(id, false); return; }
if (action === "delete") { animateAndDelete(li, id); return; }
if (action === "edit") { editingTaskId = id; renderTasks(); setTimeout(() => { document.querySelector(`li[data-id="${id}"] input[data-role="edit-text"]`)?.focus(); }, 0); return; }
if (action === "edit-cancel") { editingTaskId = null; renderTasks(); return; }
if (action === "edit-save") {
const inputEl = li?.querySelector('input[data-role="edit-text"]'); const nextText = inputEl?.value ?? "";
const result = updateTaskText(id, nextText);
if (!result.ok && inputEl) { const message = result.error === "TOO_LONG" ? `La tarea no puede superar ${MAX_TASK_LENGTH} caracteres.` : result.error === "DUPLICATE" ? "Ya existe una tarea con ese mismo texto." : "Escribe una tarea."; inputEl.setCustomValidity(message); inputEl.reportValidity(); return; }
editingTaskId = null; renderTasks();
}
}

[nowList, nextList, doneList].forEach((list) => { list?.addEventListener("click", handleListActions); });

document.addEventListener("keydown", (event) => {
if (!editingTaskId) return;
if (!document.activeElement?.matches('input[data-role="edit-text"]')) return;
if (event.key === "Escape") { editingTaskId = null; renderTasks(); return; }
if (event.key !== "Enter") return;
const nextText = document.activeElement.value;
const result = updateTaskText(editingTaskId, nextText);
if (!result.ok) return;
editingTaskId = null; renderTasks();
});

clearCompletedBtn?.addEventListener("click", () => { clearCompletedTasks(); });
completeAllBtn?.addEventListener("click", () => { completeAllTasks(); });

/* =========================
Init
========================= */
loadTheme();
loadTasks();
updateDateHeadline();
if (timeLocation) timeLocation.textContent = formatTime();
fetchLocation();
setInterval(() => { if (timeLocation) timeLocation.textContent = timeLocation.textContent.replace(/^\d{2}:\d{2}/, formatTime()); }, 60000);
renderTasks();
