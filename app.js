"use strict";

/* ===== 1) Referencias al DOM ===== */
const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const list = document.getElementById("task-list");
// (Si ya metiste el search-input, lo dejamos preparado)
const searchInput = document.getElementById("search-input");

/* ===== 2) Estado (modelo) ===== */
let tasks = [];
const STORAGE_KEY = "taskflow.tasks";

/* ===== 3) Persistencia ===== */
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEY);
  tasks = raw ? JSON.parse(raw) : [];
}

/* ===== 4) Render (vista) ===== */
function renderTasks(filterText = "") {
  list.innerHTML = "";

  const q = filterText.trim().toLowerCase();

  for (const task of tasks) {
    const matches = task.text.toLowerCase().includes(q);
    if (q && !matches) continue;

    const li = document.createElement("li");
    li.dataset.id = task.id;

    // Card container
    li.className =
      "group flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 " +
      "transition hover:-translate-y-0.5 hover:bg-zinc-50 hover:shadow-sm " +
      "dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-900";

    // Title
    const title = document.createElement("span");
    title.className = "flex-1 text-sm font-semibold tracking-tight";
    title.textContent = task.text;

    // Category pill
    const category = document.createElement("span");
    category.className =
      "hidden sm:inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700 " +
      "dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200";
    category.textContent = task.category;

    // Priority pill (sutil)
    const badge = document.createElement("span");
    badge.className =
      "inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold " +
      "text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100";
    badge.textContent = task.priority;

    // Delete button (aparece más al hover en desktop)
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.dataset.action = "delete";
    delBtn.textContent = "Eliminar";
    delBtn.className =
      "rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-800 " +
      "transition hover:bg-zinc-100 focus:outline-none focus:ring-4 focus:ring-zinc-200 " +
      "sm:opacity-0 sm:group-hover:opacity-100 " +
      "dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus:ring-zinc-800";

    li.append(title, category, badge, delBtn);
    list.prepend(li);
  }
}

/* ===== 5) Eventos ===== */

// 5.1 Añadir tarea
form.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = input.value.trim();
  if (!text) return;

  const task = {
    id: crypto.randomUUID(),
    text,
    category: "Personal",
    priority: "Baja",
    priorityClass: "priority-low",
  };

  tasks.unshift(task);
  saveTasks();

  // si hay filtro activo, render respetándolo
  const currentFilter = searchInput ? searchInput.value : "";
  renderTasks(currentFilter);

  input.value = "";
  input.focus();
});

// 5.2 Borrar tarea (delegación)
list.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-action='delete']");
  if (!btn) return;

  const li = btn.closest("li[data-id]");
  if (!li) return;

  const id = li.dataset.id;

  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();

  const currentFilter = searchInput ? searchInput.value : "";
  renderTasks(currentFilter);
});

// 5.3 Bonus: filtro de búsqueda
if (searchInput) {
  searchInput.addEventListener("input", () => {
    renderTasks(searchInput.value);
  });
}

/* ===== 6) Inicio ===== */
loadTasks();
renderTasks();
// ===== Dark mode toggle =====
const themeBtn = document.getElementById("theme-toggle");

function setTheme(isDark) {
  document.documentElement.classList.toggle("dark", isDark);
  localStorage.setItem("taskflow.theme", isDark ? "dark" : "light");
}

const savedTheme = localStorage.getItem("taskflow.theme");
if (savedTheme) setTheme(savedTheme === "dark");

if (themeBtn) {
  themeBtn.addEventListener("click", () => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(!isDark);
  });
}