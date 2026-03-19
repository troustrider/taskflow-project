## TaskFlow

App web de tareas en **vanilla JS** + **Tailwind CSS v4** para organizar pendientes por urgencia, con búsqueda, filtros, drag & drop entre secciones, modo oscuro y persistencia en `localStorage`.

**Demo en producción:** https://taskflow-project-jet.vercel.app/

---

### Funcionalidades

- **Añadir tareas** con categoría (Trabajo, Personal, Estudio, Proyectos, Salud, Gestiones) y prioridad (Alta, Media, Baja).
- **Validaciones** al añadir o editar: máximo 300 caracteres, no permite duplicados (comparación normalizada, insensible a mayúsculas y espacios extra).
- **Editar tareas** en línea: botón `Editar` activa un input inline; `Guardar` o `Enter` confirman; `Cancelar` o `Esc` descartan.
- **Completar / restaurar tareas**: botón de check en cada tarjeta. Al completar, la tarjeta se anima y se mueve a "Hecho".
- **Completar todas las pendientes** de golpe con el botón `Completar todas`.
- **Borrar tareas** individualmente (con animación) o vaciar todas las completadas.
- **Agrupación por urgencia**: las tareas se organizan en tres secciones — "Pendiente" (media/baja prioridad), "Ahora" (alta prioridad) y "Hecho" (completadas, colapsado por defecto).
- **Drag & drop entre secciones**: arrastrar una tarea de "Ahora" a "Pendiente" cambia su prioridad de Alta a Media; de "Pendiente" a "Ahora" sube a Alta. Dentro de la misma sección, reordena. Feedback visual con outline dashed al arrastrar entre secciones.
- **Drag & drop dentro de secciones**: reordena libremente. El orden se persiste en `localStorage`.
- **Búsqueda** en tiempo real por texto, categoría y prioridad. Barra de búsqueda oculta por defecto, toggleable desde el header.
- **Filtros por categoría** mediante pills en grid (4 columnas en móvil, 7 en desktop).
- **Anillo de progreso** SVG centrado como elemento hero. Muestra porcentaje completado con mensajes contextuales ("Sin tareas aún", "Buen comienzo", "Casi lo tienes", "Todo listo").
- **Fecha, hora y ubicación**: la cabecera muestra la fecha en lenguaje natural, la hora local actualizada cada minuto, y la ciudad aproximada obtenida por IP (vía `ipapi.co`).
- **Tema claro/oscuro** con detección automática de preferencia del sistema. Persistido en `localStorage`.
- **Tipografía**: DM Sans (cuerpo) + DM Mono (contadores y UI monospace).
- **Prioridad Alta** marcada con franja amber en el borde izquierdo de la tarjeta.
- **Acciones de tarea** (Editar, Borrar): ocultas por defecto en desktop (aparecen en hover), siempre visibles en dispositivos táctiles (`@media (hover: none)`).
- **Atajos de teclado**:
  - `Esc` — limpia la búsqueda si hay texto activo; cancela la edición si hay una tarea en edición.
  - `Enter` — guarda la edición activa; añade tarea si el foco está en el input principal.

---

### Diseño

El wireframe del proyecto está en `docs/design/wireframe-taskflow.svg` (versión 3).

#### Paleta cromática (regla 60-30-10)

**Modo claro:**
- **60% — superficies:** `stone-50` (fondo) + `white` (tarjetas, inputs, pills).
- **30% — texto y bordes:** `stone-700` (texto principal), `stone-400/500` (secundario), `stone-200` (bordes).
- **10% — acento:** `amber-400/500` — anillo de progreso, franja de prioridad alta, pill activa, check completado, focus rings. Escaso e intencional.

**Modo oscuro — completamente neutro:**
- **Fondo:** `neutral-950` (#0a0a0a). **Tarjetas:** `neutral-900` (#171717). **Ring widget:** `neutral-800` (#262626) — un paso de elevación por encima de las tarjetas.
- **Bordes:** `neutral-700/50` — visibles pero no protagonistas.
- **Texto:** `neutral-100/200` (principal), `neutral-400/500` (secundario).
- **Acento:** el **único** amber en dark mode es el trazo del anillo SVG y la franja de prioridad alta. Todo lo demás (pills activas, checks completados, focus rings, labels) es neutro.
- **Focus rings:** `neutral-600` en todo — consistente y uniforme.

#### Decisiones de diseño

- **Sin sidebar.** Los filtros de categoría son pills inline en grid. El sidebar consumía 30% del ancho para 6 botones.
- **Anillo centrado como hero.** Se lee en 0.1s frente a 1-2s de una barra. Es lo primero que ves al abrir la app.
- **Pendiente primero, Ahora después.** El flujo natural es: tareas normales arriba (las que más hay), urgentes debajo (las que requieren atención inmediata), completadas colapsadas al final.
- **Command bar sin botón visible.** Submit con Enter — menos ceremonia, más acción.
- **Acciones hover-only en desktop, siempre visibles en touch.** `@media (hover: none)` resuelve la accesibilidad en móvil sin ensuciar la interfaz en desktop.

---

### Estructura del código (`app.js`)

El estado de la app vive en variables globales (`tasks`, `currentCategoryFilter`, etc.). Todas las clases Tailwind están centralizadas en el objeto `CLASSES` — modificar una entrada cambia el estilo globalmente sin tocar el HTML generado.

El flujo de render es unidireccional: cualquier cambio de estado llama a `commitTasksAndRender()`, que persiste y re-renderiza todo.

#### Funciones principales

| Función | Descripción |
|---|---|
| `loadTasks()` | Lee `localStorage`, parsea JSON y normaliza la estructura de cada tarea. |
| `saveTasks()` | Serializa `tasks` a JSON y lo escribe en `localStorage`. |
| `loadTheme()` | Lee el tema guardado o detecta `prefers-color-scheme`. |
| `applyTheme(theme)` | Añade/elimina la clase `dark` en `<html>` y actualiza el icono. |
| `toggleTheme()` | Alterna claro/oscuro, persiste y aplica. |
| `computeStats(taskList)` | Calcula total, pendientes, completadas y conteo por categoría. |
| `getVisibleTasks()` | Filtra `tasks` por búsqueda y categoría. Devuelve `{ now, next, done }`. |
| `addTask(text, category, priority)` | Valida (vacío, longitud, duplicado) y añade al principio del array. |
| `updateTaskText(id, text)` | Valida y actualiza el texto de una tarea existente. |
| `setTaskCompleted(id, completed)` | Marca/desmarca una tarea. |
| `deleteTask(id)` | Elimina una tarea por ID. |
| `clearCompletedTasks()` | Elimina todas las completadas. |
| `completeAllTasks()` | Marca todas las pendientes como completadas. |
| `animateAndComplete(li, id)` | Anima fade+slide (220ms) y luego completa. |
| `animateAndDelete(li, id)` | Anima fade+scale (220ms) y luego elimina. |
| `commitTasksAndRender()` | Persiste en localStorage y re-renderiza. Punto de entrada único. |
| `renderTasks()` | Limpia las 3 listas, actualiza progreso/pills/contadores y renderiza items o empty states. |
| `createTaskItem(task, completed)` | Construye el `<li>` completo: clases, draggable, franja de prioridad, animación de entrada. |
| `handleListActions(event)` | Delegación de eventos: despacha `complete`, `restore`, `delete`, `edit`, `edit-save`, `edit-cancel`. |
| `handleDragStart(event)` | Guarda índice y sección de origen del drag. |
| `handleDrop(event)` | Si cross-section: cambia prioridad. Si same-section: reordena. |
| `handleDragEnter/Leave(event)` | Añade/quita clase `drag-over` para feedback visual. |
| `formatDateHeadline()` | Devuelve "jueves 19 de marzo" en español. |
| `formatTime()` | Devuelve la hora local en formato HH:MM. |
| `fetchLocation()` | Consulta `ipapi.co/json/` para obtener ciudad y país por IP. |
| `updateProgress()` | Calcula porcentaje, actualiza `stroke-dashoffset` del anillo SVG y elige mensaje contextual. |
| `updateFilterPills()` | Aplica clases activas/inactivas a las pills de categoría. |
| `normalizeTaskText(text)` | `safeTrim` + colapso de espacios + lowercase. Para detectar duplicados. |

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

> Ejecutar `npm run build:css` siempre que se modifique `input.css` o se añadan nuevas clases Tailwind en `app.js` o `index.html`.

---

### Estructura del proyecto

```
├── index.html          # Layout y markup
├── app.js              # Lógica de la app (estado, render, eventos)
├── style.css           # CSS original pre-Tailwind (referencia)
├── input.css           # Entrada de Tailwind (fuentes, custom CSS)
├── css/
│   └── output.css      # CSS generado (no editar a mano)
├── docs/
│   ├── design/
│   │   └── wireframe-taskflow.svg  # Wireframe v3
│   └── AI/             # Documentación de IA (Fase 2)
│       ├── reflection.md
│       ├── experiments.md
│       ├── cursor-workflow.md
│       ├── prompt-engineering.md
│       └── ai-comparison.md
└── backup/             # Snapshots pre-rediseño
```

---

### Testing manual

| Prueba | Resultado |
|---|---|
| App con lista vacía | Empty state "Añade una tarea arriba para empezar." Anillo en 0%, mensaje "Sin tareas aún". |
| Añadir tarea sin título | `addTask` devuelve `{ ok: false, error: "EMPTY" }`. Validación nativa del navegador. |
| Añadir tarea >300 caracteres | Error "La tarea no puede superar 300 caracteres" vía `setCustomValidity`. |
| Añadir tarea duplicada | Detectada por `normalizeTaskText`. Bloqueada con mensaje. |
| Completar tareas | Animación fade+slide. Aparecen en "Hecho" (si expandido). Anillo se actualiza. |
| Completar todas | Marca todas las pendientes. Anillo al 100%, mensaje "Todo listo". |
| Eliminar tareas | Animación fade+scale. Contadores y anillo se recalculan. |
| Vaciar completadas | Todas las completadas desaparecen. |
| Recargar página | Tareas y tema persisten desde `localStorage`. |
| Editar tarea | Input inline con Enter/Guardar para confirmar, Esc/Cancelar para descartar. |
| Drag & drop dentro de sección | Reordena. Orden persiste. |
| Drag & drop Ahora → Pendiente | Prioridad cambia de Alta a Media. Tarea se mueve de sección. |
| Drag & drop Pendiente → Ahora | Prioridad cambia a Alta. Tarea se mueve a "Ahora". |
| Búsqueda | Filtra en tiempo real. Botón "Limpiar" aparece. Esc limpia. |
| Filtro por categoría | Pills en grid. La activa tiene estilo diferenciado. |
| Modo oscuro | Toggle funciona. Persiste en localStorage. Detecta preferencia del sistema. Dark mode completamente neutro excepto anillo y stripe. |
| Hora y ubicación | Hora local se muestra y actualiza cada minuto. Ciudad por IP aparece tras la carga. |
| Móvil | Form stackea correctamente. Pills en 4 columnas. Acciones de tarea siempre visibles (touch). |
| Navegación con teclado | Todos los elementos son accesibles con Tab. Focus rings visibles. |

---

### Uso

**Añadir tarea:** escribe en el input y pulsa Enter. Selecciona categoría y prioridad con los selects.

**Editar:** pulsa Editar → modifica → Enter o Guardar. Esc o Cancelar para descartar.

**Cambiar prioridad:** arrastra una tarea entre "Pendiente" y "Ahora". La prioridad se ajusta automáticamente.

**Filtrar:** pulsa una pill de categoría. "Todas" para restablecer.

**Buscar:** pulsa ⌕ en el header. Escribe para filtrar. Esc para cerrar.

---

### Notas

- Datos en `localStorage` key `taskflow_tasks_v12`. Tema en `taskflow_theme_v12`.
- La hora se obtiene del sistema. La ubicación se obtiene de `ipapi.co/json/` (aproximada por IP, sin permisos de geolocalización).
- `style.css` contiene los estilos originales pre-Tailwind. No se usa en producción.
- `backup/` contiene snapshots del estado pre-rediseño.
