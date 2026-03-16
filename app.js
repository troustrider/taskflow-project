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
const MAX_TASK_LENGTH = 300;

let tasks = [];
let currentView = "all";
let currentCategoryFilter = "all";
let lastAddedTaskId = null;
let editingTaskId = null;

const CLASSES = {
priorityBase:
"inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
priority: {
Alta:
" border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200",
Media:
" border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200",
Baja:
" border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300",
},
categoryBadge:
"inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300",
taskCard: {
pending:
"group flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm transition duration-200 ease-out hover:bg-zinc-50 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/70",
completed:
"group flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 shadow-sm transition duration-200 ease-out hover:bg-zinc-100 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/70",
},
checkButtonBase:
"inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold shadow-sm transition duration-200 ease-out focus:outline-none focus:ring-4 focus:ring-zinc-200 dark:focus:ring-zinc-800",
checkButton: {
pending:
" border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
completed:
" border-zinc-300 bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600",
},
deleteButton:
"rounded-xl px-3 py-2 text-xs font-semibold text-zinc-500 transition duration-200 ease-out hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white dark:focus:ring-zinc-800",
emptyState:
"rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-6 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300",
sidebar: {
workspaceBase:
"workspace-btn flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition duration-200 ease-out ",
categoryBase:
"category-filter-btn flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition duration-200 ease-out ",
active:
"bg-zinc-100 text-zinc-900 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700",
inactive:
"text-zinc-700 hover:bg-zinc-100 focus:outline-none focus:ring-4 focus:ring-zinc-200 dark:text-zinc-200 dark:hover:bg-zinc-800/60 dark:focus:ring-zinc-800",
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
/**
 * Aplica el tema indicado (clase `dark`) y sincroniza el texto/icono.
 * @param {"dark"|"light"} theme
 * @returns {void}
 */
function applyTheme(theme) {
const isDark = theme === "dark";
document.documentElement.classList.toggle("dark", isDark);

if (themeIcon) themeIcon.textContent = isDark ? "🌙" : "☀️";
if (themeText) themeText.textContent = isDark ? "Oscuro" : "Claro";
}

/**
 * Carga el tema guardado o usa preferencia del sistema.
 * @returns {void}
 */
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

/**
 * Alterna entre tema claro y oscuro y lo persiste.
 * @returns {void}
 */
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

function setActiveButtonClasses(buttons, { baseClass, isActive }) {
buttons.forEach((btn) => {
btn.className =
baseClass + (isActive(btn) ? CLASSES.sidebar.active : CLASSES.sidebar.inactive);
});
}

/**
 * Actualiza el estado visual (clases) de los botones del sidebar.
 * @returns {void}
 */
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
/**
 * Crea un `li` para mostrar un mensaje de lista vacía.
 * @param {string} message
 * @returns {HTMLLIElement}
 */
function createEmptyState(message) {
const li = document.createElement("li");
li.className = CLASSES.emptyState;
li.textContent = message;
return li;
}

/* =========================
Estado extra UI
========================= */
/**
 * Actualiza contadores (totales, pendientes, completadas y por categoría).
 * @returns {void}
 */
function updateCounters() {
const stats = computeStats(tasks);
const { total, pending, completed, byCategory } = stats;

if (allCount) allCount.textContent = total;
if (pendingCount) pendingCount.textContent = pending;
if (completedCount) completedCount.textContent = completed;
if (taskCount) taskCount.textContent = `(${total})`;

if (trabajoCount) trabajoCount.textContent = byCategory.Trabajo;
if (personalCount) personalCount.textContent = byCategory.Personal;
if (estudioCount) estudioCount.textContent = byCategory.Estudio;
}

/**
 * Actualiza el texto de contexto (vista/categoría/búsqueda).
 * @returns {void}
 */
function updateCurrentContext() {
const parts = [
`Vista: ${VIEW_LABELS[currentView]}`,
`Categoría: ${CATEGORY_LABELS[currentCategoryFilter]}`,
];

const query = getSearchQuery();
if (query) parts.push(`Búsqueda: "${query}"`);

if (currentContext) currentContext.textContent = parts.join(" · ");
}

/**
 * Calcula y muestra el progreso de completado.
 * @returns {void}
 */
function updateProgress() {
const { total, completed } = computeStats(tasks);
const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

if (progressBar) progressBar.style.width = `${percent}%`;
if (progressText) progressText.textContent = `${percent}% completado`;
}

/**
 * Muestra u oculta el botón para limpiar búsqueda.
 * @returns {void}
 */
function updateClearSearchVisibility() {
const hasQuery = getSearchQuery().length > 0;
if (!clearSearchBtn) return;
clearSearchBtn.classList.toggle("hidden", !hasQuery);
}

/* =========================
Render
========================= */
/**
 * Anima la entrada visual de un item nuevo.
 * @param {HTMLElement} li
 * @returns {void}
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
? "truncate text-sm font-semibold text-zinc-500 line-through dark:text-zinc-400"
: "truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100";
title.textContent = task.text;
return title;
}

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
"w-full min-w-[220px] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm " +
"focus:outline-none focus:ring-4 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:ring-zinc-800";
textWrap.appendChild(editInput);
} else {
textWrap.appendChild(createTaskTitle(task, completed));
}

left.append(checkBtn, textWrap);
return left;
}

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

li.append(createTaskLeft(task, completed), createTaskRight(task));

if (task.id === lastAddedTaskId && !completed) {
animateNewItem(li);
}

return li;
}

/**
 * Limpia ambas listas del DOM (pendientes y completadas).
 * @returns {void}
 */
function clearTaskLists() {
taskList.innerHTML = "";
completedList.innerHTML = "";
}

/**
 * Actualiza los elementos auxiliares del UI (contadores, progreso, contexto, etc.).
 * @returns {void}
 */
function renderMetaUi() {
updateCounters();
updateSidebarState();
updateCurrentContext();
updateProgress();
updateClearSearchVisibility();
}

/**
 * Muestra/oculta secciones según la vista seleccionada.
 * @returns {void}
 */
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
"Por aquí todo tranquilo: no tienes tareas de Trabajo. Añade una cuando lo necesites 💼";
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
: "Aún no tienes tareas pendientes. Añade la primera arriba 🙂",
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

/**
 * Elimina una tarea por id, persiste y renderiza.
 * @param {string} id
 * @returns {void}
 */
function deleteTask(id) {
tasks = tasks.filter((task) => task.id !== id);
commitTasksAndRender();
}

/**
 * Elimina todas las tareas completadas, persiste y renderiza.
 * @returns {void}
 */
function clearCompletedTasks() {
tasks = tasks.filter((task) => !task.completed);
commitTasksAndRender();
}

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

/**
 * Guarda y re-renderiza el estado actual.
 * @returns {void}
 */
function commitTasksAndRender() {
saveTasks();
renderTasks();
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
