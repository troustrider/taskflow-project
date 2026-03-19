"use strict";

/* =========================
DOM
========================= */
const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const categorySelect = document.getElementById("task-category");
const prioritySelect = document.getElementById("task-priority");

const taskList = document.getElementById("task-list");
const completedList = document.getElementById("completed-list");

const searchInput = document.getElementById("search-input");
const clearSearchBtn = document.getElementById("clear-search");

const currentContext = document.getElementById("current-context");
const progressBar = document.getElementById("progress-bar");
const progressText = document.getElementById("progress-text");

const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");
const themeText = document.getElementById("theme-text");

const allCount = document.getElementById("all-count");
const pendingCount = document.getElementById("pending-count");
const completedCount = document.getElementById("completed-count");
const taskCount = document.getElementById("task-count");

const trabajoCount = document.getElementById("count-trabajo");
const personalCount = document.getElementById("count-personal");
const estudioCount = document.getElementById("count-estudio");
const proyectosCount = document.getElementById("count-proyectos");
const saludCount = document.getElementById("count-salud");
const errandsCount = document.getElementById("count-errands");

const clearCompletedBtn = document.getElementById("clear-completed");

const workspaceButtons = document.querySelectorAll(".workspace-btn");
const categoryFilterButtons = document.querySelectorAll(".category-filter-btn");
const clearCategoryFilterBtn = document.getElementById("clear-category-filter");

const pendingSection = document.getElementById("pending-section");
const completedSection = document.getElementById("completed-section");

/* =========================
Estado
========================= */
const STORAGE_KEY = "taskflow_tasks_v12";
const THEME_KEY = "taskflow_theme_v12";
/** @type {number} Máximo de caracteres permitidos por tarea. Cambiar aquí afecta validación y mensajes de error. */
const MAX_TASK_LENGTH = 300;

/** @type {Array<{id: string, text: string, category: string, priority: string, completed: boolean, createdAt: number, completedAt: number|null}>} */
let tasks = [];
let currentView = "all";
let currentCategoryFilter = "all";
/** @type {string|null} ID de la última tarea añadida; activa su animación de entrada en el render siguiente. */
let lastAddedTaskId = null;
/** @type {string|null} ID de la tarea en modo edición activa. Null si ninguna está siendo editada. */
let editingTaskId = null;
/** @type {number|null} Índice en `tasks` de la tarea que se está arrastrando. Null si no hay arrastre activo. */
let dragSrcIndex = null;

/** Clases Tailwind centralizadas por componente. Modificar aquí cambia el estilo globalmente. */
const CLASSES = {
priorityBase:
"inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
priority: {
Alta:
" border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
Media:
" border-stone-200 bg-stone-100 text-stone-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
Baja:
" border-stone-200 bg-white text-stone-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-500",
},
categoryBadge:
"inline-flex items-center rounded-full border border-stone-200/80 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300",
taskCard: {
pending:
"group flex items-center justify-between gap-3 rounded-2xl border border-stone-200/60 bg-white px-4 py-3 shadow-sm transition duration-200 ease-out hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800",
completed:
"group flex items-center justify-between gap-3 rounded-2xl border border-stone-200/40 bg-white px-4 py-3 shadow-sm transition duration-200 ease-out hover:shadow-md opacity-60 hover:opacity-100 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800",
},
checkButtonBase:
"inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold shadow-sm transition duration-200 ease-out focus:outline-none focus:ring-4 focus:ring-stone-200 dark:focus:ring-neutral-700",
checkButton: {
pending:
" border-stone-200 bg-white text-stone-400 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200",
completed:
" border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700",
},
deleteButton:
"rounded-xl px-3 py-2 text-xs font-semibold text-stone-400 transition duration-200 ease-out hover:bg-stone-100 hover:text-stone-900 focus:outline-none focus:ring-4 focus:ring-amber-200 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 dark:focus:ring-neutral-700",
emptyState:
"rounded-2xl border border-dashed border-stone-200/70 bg-white px-4 py-6 text-sm text-stone-400 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-500",
sidebar: {
workspaceBase:
"workspace-btn flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition duration-200 ease-out ",
categoryBase:
"category-filter-btn flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition duration-200 ease-out ",
active:
"bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-neutral-800 dark:text-neutral-100 dark:ring-neutral-700",
inactive:
"text-stone-600 hover:bg-amber-100/60 focus:outline-none focus:ring-4 focus:ring-amber-200 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:focus:ring-neutral-700",
},
};

const VIEW_LABELS = {
all: "Todas",
pending: "Pendientes",
completed: "Completadas",
};

const CATEGORY_LABELS = {
all: "Todas",
Trabajo: "Trabajo",
Personal: "Personal",
Estudio: "Estudio",
Proyectos: "Proyectos",
Salud: "Salud",
Gestiones: "Gestiones",
};

/* =========================
Storage
========================= */
/**
 * Guarda el array `tasks` en `localStorage`.
 * @returns {void}
 */
function saveTasks() {
localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

/**
 * Carga tareas desde `localStorage` y normaliza su estructura.
 * Si hay datos inválidos, inicializa `tasks` como arreglo vacío.
 * @returns {void}
 */
function loadTasks() {
try {
const raw = localStorage.getItem(STORAGE_KEY);
const parsed = raw ? JSON.parse(raw) : [];

tasks = Array.isArray(parsed)
? parsed.map((task) => ({
id: task.id ?? crypto.randomUUID(),
text: task.text ?? "",
category: task.category ?? "Personal",
priority: task.priority ?? "Media",
completed: Boolean(task.completed),
createdAt: task.createdAt ?? Date.now(),
completedAt: task.completedAt ?? null,
}))
: [];
} catch {
tasks = [];
}
}

/* =========================
Utilidades
========================= */

/**
 * Convierte un valor a string y aplica `trim()`.
 * @param {unknown} value
 * @returns {string}
 */
function safeTrim(value) {
return (value ?? "").toString().trim();
}

/**
 * Normaliza un texto para comparaciones (p.ej. detectar duplicados).
 * @param {unknown} text
 * @returns {string}
 */
function normalizeTaskText(text) {
return safeTrim(text).replace(/\s+/g, " ").toLowerCase();
}

/**
 * Obtiene el query de búsqueda actual (trim).
 * @returns {string}
 */
function getSearchQuery() {
return safeTrim(searchInput?.value);
}

/** @param {"Alta"|"Media"|"Baja"} priority @returns {string} */
function getPriorityClasses(priority) {
return CLASSES.priorityBase + (CLASSES.priority[priority] ?? CLASSES.priority.Baja);
}

function getCategoryClasses() {
return CLASSES.categoryBadge;
}

function getTaskCardClasses(completed = false) {
return completed ? CLASSES.taskCard.completed : CLASSES.taskCard.pending;
}

function getCheckButtonClasses(completed = false) {
return (
CLASSES.checkButtonBase +
(completed ? CLASSES.checkButton.completed : CLASSES.checkButton.pending)
);
}

function getDeleteButtonClasses() {
return CLASSES.deleteButton;
}

/* =========================
Tema
========================= */
function applyTheme(theme) {
const isDark = theme === "dark";
document.documentElement.classList.toggle("dark", isDark);

if (themeIcon) themeIcon.textContent = isDark ? "◗" : "○";
if (themeText) themeText.textContent = isDark ? "Oscuro" : "Claro";
}

function loadTheme() {
const savedTheme = localStorage.getItem(THEME_KEY);

if (savedTheme === "dark" || savedTheme === "light") {
applyTheme(savedTheme);
return;
}

const prefersDark =
window.matchMedia &&
window.matchMedia("(prefers-color-scheme: dark)").matches;

applyTheme(prefersDark ? "dark" : "light");
}

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
 * Determina si una tarea coincide con el texto de búsqueda.
 * @param {{text: string}} task
 * @param {string} query
 * @returns {boolean}
 */
function matchesSearch(task, query) {
const q = query.toLowerCase();
return (
task.text.toLowerCase().includes(q) ||
task.category.toLowerCase().includes(q) ||
task.priority.toLowerCase().includes(q)
);
}

/**
 * Determina si una tarea coincide con el filtro de categoría actual.
 * @param {{category: string}} task
 * @returns {boolean}
 */
function matchesCategory(task) {
if (currentCategoryFilter === "all") return true;
return task.category === currentCategoryFilter;
}

/**
 * Devuelve tareas visibles según búsqueda y categoría.
 * @returns {{pending: Array<any>, completed: Array<any>}}
 */
function getVisibleTasks() {
const query = getSearchQuery();

const filtered = tasks.filter((task) => {
const searchOk = query ? matchesSearch(task, query) : true;
const categoryOk = matchesCategory(task);
return searchOk && categoryOk;
});

return {
pending: filtered.filter((task) => !task.completed),
completed: filtered.filter((task) => task.completed),
};
}

/**
 * Aplica clases activas o inactivas a un grupo de botones del sidebar.
 * @param {NodeListOf<HTMLButtonElement>} buttons
 * @param {{ baseClass: string, isActive: (btn: HTMLButtonElement) => boolean }} options
 * @returns {void}
 */
function setActiveButtonClasses(buttons, { baseClass, isActive }) {
buttons.forEach((btn) => {
btn.className =
baseClass + (isActive(btn) ? CLASSES.sidebar.active : CLASSES.sidebar.inactive);
});
}

function updateSidebarState() {
setActiveButtonClasses(workspaceButtons, {
baseClass: CLASSES.sidebar.workspaceBase,
isActive: (btn) => btn.dataset.view === currentView,
});

setActiveButtonClasses(categoryFilterButtons, {
baseClass: CLASSES.sidebar.categoryBase,
isActive: (btn) => btn.dataset.categoryFilter === currentCategoryFilter,
});
}

/* =========================
Empty state
========================= */
function createEmptyState(message) {
const li = document.createElement("li");
li.className = CLASSES.emptyState + " text-center";

const symbol = document.createElement("div");
symbol.className = "mb-2 text-2xl text-stone-300 dark:text-neutral-700";
symbol.textContent = "○";

const text = document.createElement("p");
text.textContent = message;

li.append(symbol, text);
return li;
}

/* =========================
Estado extra UI
========================= */
function updateCounters() {
const stats = computeStats(tasks);
const { total, pending, completed, byCategory } = stats;

if (allCount) { allCount.textContent = total; allCount.classList.add("font-mono-ui"); }
if (pendingCount) { pendingCount.textContent = pending; pendingCount.classList.add("font-mono-ui"); }
if (completedCount) { completedCount.textContent = completed; completedCount.classList.add("font-mono-ui"); }
if (taskCount) taskCount.textContent = `(${total})`;

if (trabajoCount) { trabajoCount.textContent = byCategory.Trabajo; trabajoCount.classList.add("font-mono-ui"); }
if (personalCount) { personalCount.textContent = byCategory.Personal; personalCount.classList.add("font-mono-ui"); }
if (estudioCount) { estudioCount.textContent = byCategory.Estudio; estudioCount.classList.add("font-mono-ui"); }
if (proyectosCount) { proyectosCount.textContent = byCategory.Proyectos; proyectosCount.classList.add("font-mono-ui"); }
if (saludCount) { saludCount.textContent = byCategory.Salud; saludCount.classList.add("font-mono-ui"); }
if (errandsCount) { errandsCount.textContent = byCategory.Gestiones; errandsCount.classList.add("font-mono-ui"); }
}

function updateCurrentContext() {
const parts = [
`Vista: ${VIEW_LABELS[currentView]}`,
`Categoría: ${CATEGORY_LABELS[currentCategoryFilter]}`,
];

const query = getSearchQuery();
if (query) parts.push(`Búsqueda: "${query}"`);

if (currentContext) currentContext.textContent = parts.join(" · ");
}

function updateProgress() {
const { total, completed } = computeStats(tasks);
const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

if (progressBar) progressBar.style.width = `${percent}%`;

let label;
if (total === 0)       label = "Sin tareas aún";
else if (percent === 0)  label = "Por donde empezarás hoy";
else if (percent < 33)  label = "Buen comienzo — " + percent + "%";
else if (percent < 66)  label = "Vas por buen camino — " + percent + "%";
else if (percent < 100) label = "Casi lo tienes — " + percent + "%";
else                    label = "Todo listo ●";

if (progressText) progressText.textContent = label;
}

function updateClearSearchVisibility() {
const hasQuery = getSearchQuery().length > 0;
if (!clearSearchBtn) return;
clearSearchBtn.classList.toggle("hidden", !hasQuery);
}

/* =========================
Render
========================= */
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
 * Crea un botón con `data-action` y `data-id`.
 * @param {{
 *  action: string,
 *  id: string,
 *  className: string,
 *  textContent?: string,
 *  innerHTML?: string,
 *  ariaLabel?: string
 * }} config
 * @returns {HTMLButtonElement}
 */
function createActionButton({
action,
id,
className,
textContent,
innerHTML,
ariaLabel,
}) {
const btn = document.createElement("button");
btn.type = "button";
btn.dataset.action = action;
btn.dataset.id = id;
btn.className = className;
if (ariaLabel) btn.setAttribute("aria-label", ariaLabel);
if (innerHTML !== undefined) {
btn.innerHTML = innerHTML;
} else if (textContent !== undefined) {
btn.textContent = textContent;
}
return btn;
}

/**
 * Crea el nodo de texto (título) de una tarea.
 * @param {{text: string}} task
 * @param {boolean} completed
 * @returns {HTMLParagraphElement}
 */
function createTaskTitle(task, completed) {
const title = document.createElement("p");
title.className = completed
? "truncate text-sm font-semibold text-stone-400 line-through dark:text-neutral-500"
: "truncate text-sm font-semibold text-stone-900 dark:text-neutral-100";
title.textContent = task.text;
return title;
}

/**
 * Crea la mitad izquierda de la tarjeta: botón de completar y título (o input de edición).
 * @param {{id: string, text: string}} task
 * @param {boolean} completed
 * @returns {HTMLDivElement}
 */
function createTaskLeft(task, completed) {
const left = document.createElement("div");
left.className = "flex min-w-0 items-center gap-4";

const checkBtn = createActionButton({
action: completed ? "restore" : "complete",
id: task.id,
className: getCheckButtonClasses(completed),
innerHTML: completed ? "✓" : "",
ariaLabel: completed ? "Marcar como pendiente" : "Marcar como completada",
});

const textWrap = document.createElement("div");
textWrap.className = "min-w-0 pr-2";
if (editingTaskId === task.id) {
const editInput = document.createElement("input");
editInput.dataset.role = "edit-text";
editInput.value = task.text;
editInput.className =
"w-full min-w-[220px] rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm shadow-sm " +
"focus:outline-none focus:ring-4 focus:ring-stone-200 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:ring-neutral-700";
textWrap.appendChild(editInput);
} else {
textWrap.appendChild(createTaskTitle(task, completed));
}

left.append(checkBtn, textWrap);
return left;
}

/**
 * Crea la mitad derecha de la tarjeta: badges de categoría/prioridad y botones de acción.
 * @param {{id: string, category: string, priority: string}} task
 * @returns {HTMLDivElement}
 */
function createTaskRight(task) {
const right = document.createElement("div");
right.className = "flex items-center gap-2";

const categoryBadge = document.createElement("span");
categoryBadge.className = getCategoryClasses();
categoryBadge.textContent = task.category;

const priorityBadge = document.createElement("span");
priorityBadge.className = getPriorityClasses(task.priority);
priorityBadge.textContent = task.priority;

const editBtn =
editingTaskId === task.id
? createActionButton({
action: "edit-save",
id: task.id,
className: getDeleteButtonClasses(),
textContent: "Guardar",
})
: createActionButton({
action: "edit",
id: task.id,
className: getDeleteButtonClasses(),
textContent: "Editar",
});

const cancelBtn =
editingTaskId === task.id
? createActionButton({
action: "edit-cancel",
id: task.id,
className: getDeleteButtonClasses(),
textContent: "Cancelar",
})
: null;

const deleteBtn = createActionButton({
action: "delete",
id: task.id,
className: getDeleteButtonClasses(),
textContent: "Borrar",
});

right.append(categoryBadge, priorityBadge, editBtn);
if (cancelBtn) right.append(cancelBtn);
right.append(deleteBtn);
return right;
}

/**
 * Crea el item visual (`li`) de una tarea.
 * @param {{id: string, text: string, category: string, priority: string}} task
 * @param {boolean} [completed=false]
 * @returns {HTMLLIElement}
 */
function createTaskItem(task, completed = false) {
const li = document.createElement("li");
li.dataset.id = task.id;
li.className = getTaskCardClasses(completed);
li.draggable = true;
li.addEventListener("dragstart", () => (li.style.opacity = "0.4"));
li.addEventListener("dragend",   () => (li.style.opacity = "1"));

if (task.priority === "Alta" && !completed) {
li.classList.add("priority-high");
}

li.append(createTaskLeft(task, completed), createTaskRight(task));

if (task.id === lastAddedTaskId && !completed) {
animateNewItem(li);
}

return li;
}

function clearTaskLists() {
taskList.innerHTML = "";
completedList.innerHTML = "";
}

function renderMetaUi() {
updateCounters();
updateSidebarState();
updateCurrentContext();
updateProgress();
updateClearSearchVisibility();
}

function renderSectionVisibility() {
pendingSection.classList.toggle("hidden", currentView === "completed");
completedSection.classList.toggle("hidden", currentView === "pending");
}

/**
 * Renderiza una lista de tareas o su empty-state.
 * @param {HTMLElement} listEl
 * @param {Array<any>} items
 * @param {{completed: boolean, emptyMessage: string}} options
 * @returns {void}
 */
function renderTaskListItems(listEl, items, { completed, emptyMessage }) {
if (items.length === 0) {
listEl.appendChild(createEmptyState(emptyMessage));
return;
}

items.forEach((task) => {
listEl.appendChild(createTaskItem(task, completed));
});
}

/**
 * Renderiza toda la pantalla (listas y meta UI) según filtros actuales.
 * @returns {void}
 */
function renderTasks() {
const { pending, completed } = getVisibleTasks();
const query = getSearchQuery();
const hasQuery = Boolean(query);
const isHighPriorityQuery = hasQuery && query.toLowerCase().includes("alta");

const emptySearchMessage =
"No encontré nada con esa búsqueda. Prueba con otras palabras o limpia el filtro.";
const emptyTrabajoMessage =
"Por aquí todo tranquilo: no tienes tareas de Trabajo. Añade una cuando lo necesites.";
const emptyHighPriorityMessage =
"¡Bien! No tienes tareas de alta prioridad ahora mismo. Si surge algo urgente, márcalo como Alta.";

clearTaskLists();
renderMetaUi();
renderSectionVisibility();

renderTaskListItems(taskList, pending, {
completed: false,
emptyMessage: hasQuery
? (isHighPriorityQuery ? emptyHighPriorityMessage : emptySearchMessage)
: currentCategoryFilter === "Trabajo"
? emptyTrabajoMessage
: "Aún no tienes tareas pendientes. Añade la primera arriba.",
});

renderTaskListItems(completedList, completed, {
completed: true,
emptyMessage: hasQuery
? (isHighPriorityQuery ? emptyHighPriorityMessage : emptySearchMessage)
: currentCategoryFilter === "Trabajo"
? emptyTrabajoMessage
: "Todavía no has completado ninguna tarea.",
});

lastAddedTaskId = null;
}

/**
 * Calcula estadísticas agregadas de un listado de tareas.
 * @param {Array<{completed: boolean, category: string}>} taskList
 * @returns {{ total: number, pending: number, completed: number, byCategory: {Trabajo: number, Personal: number, Estudio: number} }}
 */
function computeStats(taskList) {
const total = taskList.length;

let pending = 0;
let completed = 0;
const byCategory = {
Trabajo: 0,
Personal: 0,
Estudio: 0,
Proyectos: 0,
Salud: 0,
Gestiones: 0,
};

for (const task of taskList) {
if (task.completed) {
completed += 1;
} else {
pending += 1;
}

if (byCategory[task.category] !== undefined) {
byCategory[task.category] += 1;
}
}

return { total, pending, completed, byCategory };
}

/* =========================
Lógica
========================= */
/**
 * Añade una tarea validando:
 * - no vacía
 * - máximo 300 caracteres
 * - no duplicada (por texto normalizado)
 * Persiste y re-renderiza si se añadió correctamente.
 * @param {string} text
 * @param {string} category
 * @param {string} priority
 * @returns {{ ok: true } | { ok: false, error: "EMPTY" | "TOO_LONG" | "DUPLICATE" }}
 */
function addTask(text, category, priority) {
const trimmed = safeTrim(text);
if (!trimmed) return { ok: false, error: "EMPTY" };
if (trimmed.length > MAX_TASK_LENGTH) return { ok: false, error: "TOO_LONG" };

const normalized = normalizeTaskText(trimmed);
const isDuplicate = tasks.some(
(t) => normalizeTaskText(t.text) === normalized
);
if (isDuplicate) return { ok: false, error: "DUPLICATE" };

const task = {
id: crypto.randomUUID(),
text: trimmed,
category,
priority,
completed: false,
createdAt: Date.now(),
completedAt: null,
};

tasks.unshift(task);
lastAddedTaskId = task.id;
commitTasksAndRender();
return { ok: true };
}

/**
 * Actualiza el texto de una tarea existente validando longitud y duplicados.
 * @param {string} id
 * @param {string} text
 * @returns {{ ok: true } | { ok: false, error: "EMPTY" | "TOO_LONG" | "DUPLICATE" }}
 */
function updateTaskText(id, text) {
const trimmed = safeTrim(text);
if (!trimmed) return { ok: false, error: "EMPTY" };
if (trimmed.length > MAX_TASK_LENGTH) return { ok: false, error: "TOO_LONG" };

const normalized = normalizeTaskText(trimmed);
const isDuplicate = tasks.some(
(t) => t.id !== id && normalizeTaskText(t.text) === normalized
);
if (isDuplicate) return { ok: false, error: "DUPLICATE" };

tasks = tasks.map((t) => (t.id === id ? { ...t, text: trimmed } : t));
commitTasksAndRender();
return { ok: true };
}

/**
 * Marca una tarea como completada o pendiente.
 * Actualiza `completedAt` acorde y persiste + renderiza.
 * @param {string} id
 * @param {boolean} completed
 * @returns {void}
 */
function setTaskCompleted(id, completed) {
tasks = tasks.map((task) =>
task.id === id
? {
...task,
completed,
completedAt: completed ? Date.now() : null,
}
: task
);

commitTasksAndRender();
}

function deleteTask(id) {
tasks = tasks.filter((task) => task.id !== id);
commitTasksAndRender();
}

function clearCompletedTasks() {
tasks = tasks.filter((task) => !task.completed);
commitTasksAndRender();
}

/**
 * Anima la salida de una tarjeta pendiente y luego la marca como completada.
 * Si no hay elemento DOM disponible, completa directamente sin animación.
 * @param {HTMLLIElement|null} li
 * @param {string} id
 * @returns {void}
 */
function animateAndComplete(li, id) {
if (!li) {
setTaskCompleted(id, true);
return;
}

li.style.transition = "opacity 220ms ease, transform 220ms ease";
li.style.opacity = "0";
li.style.transform = "translateY(-6px)";

setTimeout(() => {
setTaskCompleted(id, true);
}, 220);
}

function commitTasksAndRender() {
saveTasks();
renderTasks();
}

/**
 * Guarda el índice origen al iniciar un arrastre.
 * @param {DragEvent} event
 * @returns {void}
 */
function handleDragStart(event) {
  const li = event.target.closest("[data-id]");
  if (!li) return;
  dragSrcIndex = tasks.findIndex((task) => task.id === li.dataset.id);
}

/**
 * Reordena el array tasks moviendo el elemento de srcIndex a destIndex.
 * @param {number} srcIndex
 * @param {number} destIndex
 * @returns {void}
 */
function reorderTasks(srcIndex, destIndex) {
  if (srcIndex === destIndex) return;
  const [moved] = tasks.splice(srcIndex, 1);
  tasks.splice(destIndex, 0, moved);
  commitTasksAndRender();
}

/**
 * Maneja el drop: calcula el índice destino y reordena.
 * @param {DragEvent} event
 * @returns {void}
 */
function handleDrop(event) {
  event.preventDefault();
  const li = event.target.closest("[data-id]");
  if (!li) return;
  if (dragSrcIndex === null) return;
  const destIndex = tasks.findIndex((task) => task.id === li.dataset.id);
  if (destIndex === -1) return;
  reorderTasks(dragSrcIndex, destIndex);
  dragSrcIndex = null;
}

/* =========================
Eventos
========================= */
form?.addEventListener("submit", (event) => {
event.preventDefault();

const text = safeTrim(input?.value);
const category = categorySelect?.value ?? "Personal";
const priority = prioritySelect?.value ?? "Media";

if (!text) return;

if (input) input.setCustomValidity("");

const result = addTask(text, category, priority);
if (!result.ok) {
if (input) {
const message =
result.error === "TOO_LONG"
? `La tarea no puede superar ${MAX_TASK_LENGTH} caracteres.`
: result.error === "DUPLICATE"
? "Ya existe una tarea con ese mismo texto."
: result.error === "EMPTY"
? "Escribe una tarea."
: "No se pudo añadir la tarea. Revisa el texto.";

input.setCustomValidity(message);
input.reportValidity();
}
return;
}

if (input) {
input.value = "";
input.focus();
}
if (categorySelect) categorySelect.value = "Personal";
if (prioritySelect) prioritySelect.value = "Media";
});

taskList?.addEventListener("dragover",  (e) => e.preventDefault());
completedList?.addEventListener("dragover", (e) => e.preventDefault());
taskList?.addEventListener("drop", handleDrop);
completedList?.addEventListener("drop", handleDrop);
taskList?.addEventListener("dragstart", handleDragStart);
completedList?.addEventListener("dragstart", handleDragStart);
input?.addEventListener("input", () => {
input.setCustomValidity("");
});

searchInput?.addEventListener("input", () => {
renderTasks();
});

clearSearchBtn?.addEventListener("click", () => {
searchInput.value = "";
renderTasks();
searchInput.focus();
});

document.addEventListener("keydown", (event) => {
if (event.key !== "Escape") return;
if (editingTaskId && document.activeElement?.matches('input[data-role="edit-text"]')) {
editingTaskId = null;
renderTasks();
return;
}
if (!searchInput || !searchInput.value) return;
searchInput.value = "";
renderTasks();
searchInput.focus();
});

themeToggle?.addEventListener("click", () => {
toggleTheme();
});

workspaceButtons.forEach((btn) => {
btn.addEventListener("click", () => {
currentView = btn.dataset.view;
renderTasks();
});
});

categoryFilterButtons.forEach((btn) => {
btn.addEventListener("click", () => {
currentCategoryFilter = btn.dataset.categoryFilter;
renderTasks();
});
});

clearCategoryFilterBtn?.addEventListener("click", () => {
currentCategoryFilter = "all";
if (searchInput) searchInput.value = "";
renderTasks();
});

/**
 * Maneja acciones delegadas en las listas (completar/restaurar/borrar).
 * Lee `data-action` y `data-id` desde el elemento clickeado.
 * @param {MouseEvent} event
 * @returns {void}
 */
function handleListActions(event) {
const actionBtn = event.target.closest("[data-action]");
if (!actionBtn) return;

const action = actionBtn.dataset.action;
const id = actionBtn.dataset.id;
if (!id) return;

const li = actionBtn.closest("li");

if (action === "complete") {
animateAndComplete(li, id);
return;
}

if (action === "restore") {
setTaskCompleted(id, false);
return;
}

if (action === "delete") {
deleteTask(id);
}

if (action === "edit") {
editingTaskId = id;
renderTasks();
setTimeout(() => {
const inputEl = document.querySelector(`li[data-id="${id}"] input[data-role="edit-text"]`);
inputEl?.focus();
}, 0);
return;
}

if (action === "edit-cancel") {
editingTaskId = null;
renderTasks();
return;
}

if (action === "edit-save") {
const inputEl = li?.querySelector('input[data-role="edit-text"]');
const nextText = inputEl?.value ?? "";
const result = updateTaskText(id, nextText);
if (!result.ok && inputEl) {
const message =
result.error === "TOO_LONG"
? `La tarea no puede superar ${MAX_TASK_LENGTH} caracteres.`
: result.error === "DUPLICATE"
? "Ya existe una tarea con ese mismo texto."
: "Escribe una tarea.";
inputEl.setCustomValidity(message);
inputEl.reportValidity();
return;
}
editingTaskId = null;
renderTasks();
}
}

taskList?.addEventListener("click", handleListActions);
completedList?.addEventListener("click", handleListActions);

document.addEventListener("keydown", (event) => {
if (!editingTaskId) return;
if (!document.activeElement?.matches('input[data-role="edit-text"]')) return;
if (event.key === "Escape") {
editingTaskId = null;
renderTasks();
return;
}
if (event.key !== "Enter") return;
const nextText = document.activeElement.value;
const result = updateTaskText(editingTaskId, nextText);
if (!result.ok) return;
editingTaskId = null;
renderTasks();
});

clearCompletedBtn?.addEventListener("click", () => {
clearCompletedTasks();
});

/* =========================
Init
========================= */
loadTheme();
loadTasks();
renderTasks();
