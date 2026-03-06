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

let tasks = [];
let currentView = "all";
let currentCategoryFilter = "all";
let lastAddedTaskId = null;

/* =========================
Storage
========================= */
function saveTasks() {
localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

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
Utilidades UI
========================= */
function safeTrim(value) {
return (value ?? "").toString().trim();
}

function getPriorityClasses(priority) {
const base =
"inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold";

if (priority === "Alta") {
return (
base +
" border-red-200 bg-red-50 text-red-700 " +
"dark:border-red-800 dark:bg-red-950/60 dark:text-red-200"
);
}

if (priority === "Media") {
return (
base +
" border-zinc-200 bg-zinc-100 text-zinc-700 " +
"dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
);
}

return (
base +
" border-zinc-200 bg-white text-zinc-600 " +
"dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
);
}

function getCategoryClasses() {
return (
"inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 " +
"dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
);
}

function getTaskCardClasses() {
return (
"group flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm " +
"transition duration-200 ease-out hover:bg-zinc-50 hover:shadow-md " +
"dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/70"
);
}

function getCompletedTaskCardClasses() {
return (
"group flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 shadow-sm " +
"transition duration-200 ease-out hover:bg-zinc-100 hover:shadow-md " +
"dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/70"
);
}

function getCheckButtonClasses(completed = false) {
const base =
"inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold shadow-sm " +
"transition duration-200 ease-out focus:outline-none focus:ring-4 focus:ring-zinc-200 dark:focus:ring-zinc-800";

if (completed) {
return (
base +
" border-zinc-300 bg-zinc-100 text-zinc-800 hover:bg-zinc-200 " +
"dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
);
}

return (
base +
" border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 " +
"dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
);
}

function getDeleteButtonClasses() {
return (
"rounded-xl px-3 py-2 text-xs font-semibold text-zinc-500 " +
"transition duration-200 ease-out hover:bg-zinc-100 hover:text-zinc-900 " +
"focus:outline-none focus:ring-4 focus:ring-zinc-200 " +
"dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white dark:focus:ring-zinc-800"
);
}

/* =========================
Tema
========================= */
function applyTheme(theme) {
const isDark = theme === "dark";
document.documentElement.classList.toggle("dark", isDark);

if (themeIcon) themeIcon.textContent = isDark ? "🌙" : "☀️";
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
function matchesSearch(task, query) {
return task.text.toLowerCase().includes(query.toLowerCase());
}

function matchesCategory(task) {
if (currentCategoryFilter === "all") return true;
return task.category === currentCategoryFilter;
}

function getVisibleTasks() {
const query = safeTrim(searchInput?.value);

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

function updateSidebarState() {
workspaceButtons.forEach((btn) => {
const isActive = btn.dataset.view === currentView;
btn.className =
"workspace-btn flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition duration-200 ease-out " +
(isActive
? "bg-zinc-100 text-zinc-900 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700"
: "text-zinc-700 hover:bg-zinc-100 focus:outline-none focus:ring-4 focus:ring-zinc-200 dark:text-zinc-200 dark:hover:bg-zinc-800/60 dark:focus:ring-zinc-800");
});

categoryFilterButtons.forEach((btn) => {
const isActive = btn.dataset.categoryFilter === currentCategoryFilter;
btn.className =
"category-filter-btn flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition duration-200 ease-out " +
(isActive
? "bg-zinc-100 text-zinc-900 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700"
: "text-zinc-700 hover:bg-zinc-100 focus:outline-none focus:ring-4 focus:ring-zinc-200 dark:text-zinc-200 dark:hover:bg-zinc-800/60 dark:focus:ring-zinc-800");
});
}

/* =========================
Empty state
========================= */
function createEmptyState(message) {
const li = document.createElement("li");
li.className =
"rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-6 text-sm text-zinc-600 shadow-sm " +
"dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300";
li.textContent = message;
return li;
}

/* =========================
Estado extra UI
========================= */
function updateCounters() {
const total = tasks.length;
const pending = tasks.filter((task) => !task.completed).length;
const completed = tasks.filter((task) => task.completed).length;

const trabajo = tasks.filter((task) => task.category === "Trabajo").length;
const personal = tasks.filter((task) => task.category === "Personal").length;
const estudio = tasks.filter((task) => task.category === "Estudio").length;

if (allCount) allCount.textContent = total;
if (pendingCount) pendingCount.textContent = pending;
if (completedCount) completedCount.textContent = completed;
if (taskCount) taskCount.textContent = `(${total})`;

if (trabajoCount) trabajoCount.textContent = trabajo;
if (personalCount) personalCount.textContent = personal;
if (estudioCount) estudioCount.textContent = estudio;
}

function updateCurrentContext() {
const viewMap = {
all: "Todas",
pending: "Pendientes",
completed: "Completadas",
};

const categoryMap = {
all: "Todas",
Trabajo: "Trabajo",
Personal: "Personal",
Estudio: "Estudio",
};

const parts = [
`Vista: ${viewMap[currentView]}`,
`Categoría: ${categoryMap[currentCategoryFilter]}`,
];

const query = safeTrim(searchInput?.value);
if (query) parts.push(`Búsqueda: "${query}"`);

if (currentContext) currentContext.textContent = parts.join(" · ");
}

function updateProgress() {
const total = tasks.length;
const completed = tasks.filter((task) => task.completed).length;
const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

if (progressBar) progressBar.style.width = `${percent}%`;
if (progressText) progressText.textContent = `${percent}% completado`;
}

function updateClearSearchVisibility() {
const hasQuery = safeTrim(searchInput?.value).length > 0;
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

function createTaskItem(task, completed = false) {
const li = document.createElement("li");
li.dataset.id = task.id;
li.className = completed ? getCompletedTaskCardClasses() : getTaskCardClasses();

const left = document.createElement("div");
left.className = "flex min-w-0 items-center gap-4";

const checkBtn = document.createElement("button");
checkBtn.type = "button";
checkBtn.dataset.action = completed ? "restore" : "complete";
checkBtn.dataset.id = task.id;
checkBtn.className = getCheckButtonClasses(completed);
checkBtn.setAttribute(
"aria-label",
completed ? "Marcar como pendiente" : "Marcar como completada"
);
checkBtn.innerHTML = completed ? "✓" : "";

const textWrap = document.createElement("div");
textWrap.className = "min-w-0 pr-2";

const title = document.createElement("p");
title.className = completed
? "truncate text-sm font-semibold text-zinc-500 line-through dark:text-zinc-400"
: "truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100";
title.textContent = task.text;

textWrap.appendChild(title);
left.append(checkBtn, textWrap);

const right = document.createElement("div");
right.className = "flex items-center gap-2";

const categoryBadge = document.createElement("span");
categoryBadge.className = getCategoryClasses();
categoryBadge.textContent = task.category;

const priorityBadge = document.createElement("span");
priorityBadge.className = getPriorityClasses(task.priority);
priorityBadge.textContent = task.priority;

right.append(categoryBadge, priorityBadge);

const deleteBtn = document.createElement("button");
deleteBtn.type = "button";
deleteBtn.dataset.action = "delete";
deleteBtn.dataset.id = task.id;
deleteBtn.className = getDeleteButtonClasses();
deleteBtn.textContent = "Borrar";

right.append(deleteBtn);

li.append(left, right);

if (task.id === lastAddedTaskId && !completed) {
animateNewItem(li);
}

return li;
}

function renderTasks() {
const { pending, completed } = getVisibleTasks();

taskList.innerHTML = "";
completedList.innerHTML = "";

updateCounters();
updateSidebarState();
updateCurrentContext();
updateProgress();
updateClearSearchVisibility();

pendingSection.classList.toggle("hidden", currentView === "completed");
completedSection.classList.toggle("hidden", currentView === "pending");

if (pending.length === 0) {
taskList.appendChild(
createEmptyState(
safeTrim(searchInput?.value)
? "No hay tareas pendientes que coincidan con tu búsqueda."
: "Aún no tienes tareas pendientes. Añade la primera arriba 🙂"
)
);
} else {
pending.forEach((task) => {
taskList.appendChild(createTaskItem(task, false));
});
}

if (completed.length === 0) {
completedList.appendChild(
createEmptyState(
safeTrim(searchInput?.value)
? "No hay tareas completadas que coincidan con tu búsqueda."
: "Todavía no has completado ninguna tarea."
)
);
} else {
completed.forEach((task) => {
completedList.appendChild(createTaskItem(task, true));
});
}

lastAddedTaskId = null;
}

/* =========================
Lógica
========================= */
function addTask(text, category, priority) {
const task = {
id: crypto.randomUUID(),
text,
category,
priority,
completed: false,
createdAt: Date.now(),
completedAt: null,
};

tasks.unshift(task);
lastAddedTaskId = task.id;
saveTasks();
renderTasks();
}

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

saveTasks();
renderTasks();
}

function deleteTask(id) {
tasks = tasks.filter((task) => task.id !== id);
saveTasks();
renderTasks();
}

function clearCompletedTasks() {
tasks = tasks.filter((task) => !task.completed);
saveTasks();
renderTasks();
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

/* =========================
Eventos
========================= */
form?.addEventListener("submit", (event) => {
event.preventDefault();

const text = safeTrim(input?.value);
const category = categorySelect?.value ?? "Personal";
const priority = prioritySelect?.value ?? "Media";

if (!text) return;

addTask(text, category, priority);

input.value = "";
categorySelect.value = "Personal";
prioritySelect.value = "Media";
input.focus();
});

searchInput?.addEventListener("input", () => {
renderTasks();
});

clearSearchBtn?.addEventListener("click", () => {
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
}

taskList?.addEventListener("click", handleListActions);
completedList?.addEventListener("click", handleListActions);

clearCompletedBtn?.addEventListener("click", () => {
clearCompletedTasks();
});

/* =========================
Init
========================= */
loadTheme();
loadTasks();
renderTasks();
