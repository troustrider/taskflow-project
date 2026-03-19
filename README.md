## TaskFlow

App web de tareas en **vanilla JS** + **Tailwind CSS v4** para organizar pendientes y completadas con búsqueda, filtros, reordenación, modo oscuro y persistencia en `localStorage`.

**Demo en producción:** https://taskflow-project-jet.vercel.app/

---

### Funcionalidades

- **Añadir tareas** con categoría (Trabajo, Personal, Estudio, Proyectos, Salud, Gestiones) y prioridad (Alta, Media, Baja).
- **Validaciones** al añadir o editar: máximo 300 caracteres, no permite duplicados (comparación normalizada, insensible a mayúsculas y espacios extra).
- **Editar tareas** en línea: botón `Editar` activa un input inline; `Guardar` o `Enter` confirman; `Cancelar` o `Esc` descartan.
- **Completar / restaurar tareas**: botón de check en cada tarjeta. Al completar, la tarjeta se anima y se mueve a la sección de completadas.
- **Completar todas las pendientes** de golpe con el botón `Completar todas`.
- **Borrar tareas** individualmente o vaciar todas las completadas de una vez.
- **Reordenar tareas** mediante drag & drop dentro de cada lista (pendientes y completadas por separado). El orden se persiste en `localStorage`.
- **Búsqueda** en tiempo real por texto, categoría y prioridad. Muestra un botón para limpiar cuando hay texto activo.
- **Filtros por categoría** en el sidebar, con botón para limpiar el filtro.
- **Vistas del workspace**: Todas, Pendientes, Completadas. Ocultan la sección irrelevante.
- **Progreso contextual**: barra de progreso con mensajes dinámicos según porcentaje completado.
- **Contadores** en el sidebar: total, pendientes, completadas y por categoría.
- **Indicador de contexto activo**: muestra la vista, categoría y búsqueda actuales.
- **Tema claro/oscuro** con detección automática de preferencia del sistema. Se persiste en `localStorage`.
- **Tipografía**: DM Sans (cuerpo) + DM Mono (contadores y badges numéricos).
- **Prioridad Alta** marcada con franja de color en el borde izquierdo de la tarjeta.
- **Atajos de teclado**:
  - `Esc` — limpia la búsqueda si hay texto activo; cancela la edición si hay una tarea en edición.
  - `Enter` — guarda la edición activa.

---

### Diseño

El wireframe original del proyecto está en `docs/design/wireframe-taskflow.svg`.

TaskFlow usa una paleta **stone + amber** en modo claro y **neutral** (negros puros) en modo oscuro, sin acento de color en dark.

**Modo claro:**
- Fondo: `stone-50`. Tarjetas: `white`. Sidebar: `stone-50`.
- Acento amber: sidebar activo, botón Añadir, hover de inputs, barra de progreso, checkmark de completadas.
- Prioridad Alta: franja `#fca5a5` (rojo suave).

**Modo oscuro:**
- Fondo: `neutral-950`. Tarjetas: `neutral-900`. Sidebar: `neutral-900`.
- Sin acento amber — paleta completamente neutra.
- Prioridad Alta: franja `#ef4444` (rojo, coherente con el badge).

**Tarjetas completadas:** se muestran con `opacity-60` y recuperan opacidad completa al hacer hover, señalando visualmente el estado de archivado sin ocultar las acciones.

---

### Estructura del código (`app.js`)

El estado de la app vive en variables globales (`tasks`, `currentView`, `currentCategoryFilter`, etc.). Todas las clases Tailwind están centralizadas en el objeto `CLASSES` — modificar una entrada cambia el estilo globalmente sin tocar el HTML generado.

El flujo de render es unidireccional: cualquier cambio de estado llama a `commitTasksAndRender()`, que persiste y re-renderiza todo. No hay actualizaciones parciales del DOM.

#### Funciones principales

| Función | Descripción |
|---|---|
| `loadTasks()` | Lee `localStorage`, parsea JSON y normaliza la estructura de cada tarea. Inicializa `tasks = []` si hay error o datos inválidos. |
| `saveTasks()` | Serializa `tasks` a JSON y lo escribe en `localStorage`. |
| `loadTheme()` | Lee el tema guardado. Si no hay preferencia guardada, detecta `prefers-color-scheme`. |
| `applyTheme(theme)` | Añade o elimina la clase `dark` en `<html>` y actualiza el icono/texto del botón. |
| `toggleTheme()` | Alterna entre claro y oscuro, persiste la elección y aplica el tema. |
| `computeStats(taskList)` | Calcula total, pendientes, completadas y conteo por categoría. Usada por `updateCounters()` y `updateProgress()`. |
| `getVisibleTasks()` | Filtra `tasks` aplicando búsqueda (`matchesSearch`) y categoría (`matchesCategory`). Devuelve `{ pending, completed }`. |
| `matchesSearch(task, query)` | Devuelve `true` si el texto, categoría o prioridad de la tarea contienen el query (insensible a mayúsculas). |
| `matchesCategory(task)` | Devuelve `true` si la tarea pertenece a la categoría activa o si el filtro es `"all"`. |
| `addTask(text, category, priority)` | Valida (vacío, longitud, duplicado) y añade la tarea al principio del array. Devuelve `{ ok: true }` o `{ ok: false, error }`. |
| `updateTaskText(id, text)` | Valida y actualiza el texto de una tarea existente. Ignora el propio ID al detectar duplicados. |
| `setTaskCompleted(id, completed)` | Marca o desmarca una tarea, actualizando `completedAt`. |
| `deleteTask(id)` | Elimina una tarea del array por ID. |
| `clearCompletedTasks()` | Elimina todas las tareas con `completed: true`. |
| `completeAllTasks()` | Marca todas las tareas pendientes como completadas de golpe. |
| `animateAndComplete(li, id)` | Anima la salida de la tarjeta (fade + slide up, 220 ms) y luego llama a `setTaskCompleted`. Si no hay elemento DOM, completa directamente. |
| `commitTasksAndRender()` | Llama a `saveTasks()` y luego a `renderTasks()`. Punto de entrada único para cualquier cambio de estado. |
| `renderTasks()` | Limpia las listas, actualiza la meta UI (contadores, sidebar, contexto, progreso) y renderiza los items o el empty state. |
| `renderTaskListItems(listEl, items, options)` | Renderiza una lista de tareas o su empty state según si `items` está vacío. |
| `createTaskItem(task, completed)` | Construye el `<li>` completo de una tarea: clases, draggable, franja de prioridad, animación de entrada. |
| `createTaskLeft(task, completed)` | Construye el lado izquierdo de la tarjeta: botón de check + título (o input de edición si está en modo edición). |
| `createTaskRight(task)` | Construye el lado derecho: badges de categoría y prioridad, botones Editar/Guardar/Cancelar y Borrar. |
| `createActionButton(config)` | Factoría genérica de botones de acción. Acepta `action`, `id`, `className`, `textContent`, `innerHTML` y `ariaLabel`. |
| `createTaskTitle(task, completed)` | Crea el `<p>` del título con clases distintas según estado completado (tachado y color atenuado). |
| `createEmptyState(message)` | Crea el `<li>` de empty state con icono `○` y mensaje contextual. |
| `handleListActions(event)` | Delegación de eventos en las listas. Lee `data-action` y `data-id` y despacha a la función correspondiente (`complete`, `restore`, `delete`, `edit`, `edit-save`, `edit-cancel`). |
| `handleDragStart(event)` | Guarda en `dragSrcIndex` el índice en `tasks` de la tarjeta que empieza a arrastrarse. |
| `handleDrop(event)` | Calcula el índice destino del drop y llama a `reorderTasks`. |
| `reorderTasks(srcIndex, destIndex)` | Mueve un elemento del array `tasks` de `srcIndex` a `destIndex` usando `splice`. Persiste y re-renderiza. |
| `updateSidebarState()` | Aplica clases activas/inactivas a los botones de workspace y categoría según el estado actual. |
| `updateCounters()` | Actualiza los contadores del sidebar con `computeStats`. Añade la clase `font-mono-ui` a cada contador. |
| `updateProgress()` | Calcula el porcentaje de completado, actualiza el ancho de la barra y elige un mensaje contextual según el rango. |
| `updateCurrentContext()` | Construye y muestra el texto de contexto activo (vista + categoría + búsqueda si aplica). |
| `setActiveButtonClasses(buttons, options)` | Itera un `NodeList` de botones y aplica la clase activa o inactiva según la función `isActive` recibida. |
| `normalizeTaskText(text)` | Aplica `safeTrim` + colapso de espacios + lowercase. Usada para detectar duplicados. |
| `safeTrim(value)` | Convierte cualquier valor a string y aplica `trim()`. Evita errores con `null`/`undefined`. |
| `getSearchQuery()` | Devuelve el valor actual del input de búsqueda con `safeTrim`. |
| `animateNewItem(li)` | Anima la entrada de una tarjeta nueva (fade + slide down, 220 ms) usando `requestAnimationFrame`. |

---

### Requisitos

- Node.js ≥ 20 (requerido por `@tailwindcss/oxide`).

### Instalación

```bash
npm install
```

### Desarrollo (watch de CSS)

```bash
npm run dev:css
```

### Build de CSS (minificado)

```bash
npm run build:css
```

> Ejecutar `npm run build:css` siempre que se modifique `input.css` o se añadan nuevas clases Tailwind en `app.js`.

---

### Estructura del proyecto

```
├── index.html          # Layout y markup
├── app.js              # Lógica de la app (estado, render, eventos)
├── style.css           # CSS original pre-Tailwind (referencia del proceso de diseño)
├── input.css           # Entrada de Tailwind (fuentes, clases custom)
├── css/
│   └── output.css      # CSS generado (no editar a mano)
├── backup/             # Snapshots manuales antes de cambios de diseño
└── docs/
    ├── design/         # Wireframe del proyecto
    └── AI/             # Documentación de IA (Fase 2)
```

---

### Testing manual

Pruebas realizadas manualmente sobre la aplicación:

| Prueba | Resultado |
|---|---|
| App con lista vacía | Se muestra el empty state con mensaje "Aún no tienes tareas pendientes. Añade la primera arriba." y el icono ○. Contadores en 0, barra de progreso vacía con texto "Sin tareas aún". |
| Añadir tarea sin título | El formulario no envía (campo vacío). Si se fuerza, `addTask` devuelve `{ ok: false, error: "EMPTY" }` y muestra validación nativa del navegador. |
| Añadir tarea con título muy largo (>300 caracteres) | Se muestra el mensaje de error "La tarea no puede superar 300 caracteres" vía `setCustomValidity`. La tarea no se añade. |
| Añadir tarea duplicada (mismo texto, distinta capitalización) | Se detecta como duplicado gracias a `normalizeTaskText` y se bloquea con mensaje "Ya existe una tarea con ese mismo texto." |
| Marcar varias tareas como completadas | Cada tarea se anima (fade + slide up) y aparece en la sección de completadas con opacidad reducida y texto tachado. Los contadores se actualizan correctamente. |
| Completar todas las pendientes | El botón "Completar todas" marca todas las pendientes de golpe. Contadores y barra de progreso se actualizan a 100%. |
| Eliminar varias tareas | Cada tarea se elimina del DOM y del array. Los contadores y la barra de progreso se recalculan. |
| Vaciar completadas | Todas las tareas completadas desaparecen. Solo quedan las pendientes. |
| Recargar la página | Las tareas persisten correctamente desde `localStorage`. El tema (claro/oscuro) también se mantiene. |
| Editar una tarea | El input inline aparece con el texto actual. Guardar con Enter o botón funciona. Cancelar con Esc o botón descarta los cambios. |
| Drag & drop | Las tarjetas se pueden reordenar arrastrando. El nuevo orden se persiste en `localStorage` y se mantiene tras recargar. |
| Búsqueda | Filtra en tiempo real por texto, categoría y prioridad. El botón "Limpiar búsqueda" aparece cuando hay texto activo. Esc limpia la búsqueda. |
| Filtro por categoría | Al pulsar una categoría en el sidebar, solo se muestran las tareas de esa categoría. "Limpiar" restaura la vista completa. |
| Modo oscuro | El toggle cambia el tema. La preferencia se guarda en `localStorage`. Si no hay preferencia guardada, detecta `prefers-color-scheme` del sistema. |
| Navegación con teclado | Todos los botones e inputs son accesibles con Tab. El foco es visible con ring de 4px. Los atajos Esc y Enter funcionan correctamente. |
| HTML validado con W3C | El HTML pasa el validador del W3C sin errores. |

---

### Uso

**Añadir una tarea:**
1. Escribe el texto en el input principal.
2. Selecciona categoría y prioridad.
3. Pulsa `+ Añadir` o `Enter`.

**Editar una tarea:**
1. Pulsa `Editar` en la tarjeta.
2. Modifica el texto y pulsa `Guardar` o `Enter`.
3. Para cancelar, pulsa `Cancelar` o `Esc`.

**Reordenar tareas:**
1. Arrastra una tarjeta de la lista de pendientes a otra posición.
2. El nuevo orden se guarda automáticamente.

**Filtrar por categoría:**
1. Pulsa una categoría en el sidebar.
2. Para ver todas, pulsa `Limpiar` junto a CATEGORÍAS.

**Buscar:**
1. Escribe en el campo de búsqueda — filtra por texto, categoría y prioridad en tiempo real.
2. Pulsa `Limpiar búsqueda` o `Esc` para restablecer.

---

### Notas

- Los datos se guardan en `localStorage` bajo la key `taskflow_tasks_v12`.
- El tema se guarda en `localStorage` bajo la key `taskflow_theme_v12`.
- La carpeta `backup/` contiene snapshots de `index.html`, `input.css` y `CLASSES_backup.js` del estado pre-revisión UX/UI. Para revertir, copiar el archivo correspondiente a la raíz del proyecto.
- El archivo `style.css` contiene los estilos originales previos a la migración a Tailwind CSS. No se usa en producción pero se conserva como referencia del proceso de diseño.
