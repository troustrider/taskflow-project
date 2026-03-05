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
    // Bonus filtro: si no coincide, no lo pintamos
    const matches = task.text.toLowerCase().includes(q);
    if (q && !matches) continue;

    const li = document.createElement("li");
    li.className = "task-card";
    li.dataset.id = task.id;

    const title = document.createElement("span");
    title.className = "task-title";
    title.textContent = task.text;

    const category = document.createElement("span");
    category.className = "task-category";
    category.textContent = task.category;

    const badge = document.createElement("span");
    badge.className = `task-badge ${task.priorityClass}`;
    badge.textContent = task.priority;

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "task-delete";
    delBtn.textContent = "Eliminar";
    delBtn.dataset.action = "delete";

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

  const li = btn.closest("li.task-card");
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