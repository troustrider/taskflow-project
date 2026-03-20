## TaskFlow

App web de gestión de tareas con diseño responsive de 3 columnas, construida en **vanilla JS** + **Tailwind CSS v4**. Arquitectura modular preparada para backend en Fase 3.

**Demo:** https://taskflow-project-jet.vercel.app/

---

### Stack técnico

- **Frontend:** HTML5, vanilla JavaScript (ES2022+, `"use strict"`), Tailwind CSS v4 (`@tailwindcss/cli`)
- **Tipografía:** DM Sans (cuerpo) + DM Mono (contadores, UI monospace) via Google Fonts
- **Persistencia:** `localStorage` (Fase 2), diseñado para migrar a API REST (Fase 3)
- **Deploy:** Vercel (build automático con `npm run build:css`)

---

### Arquitectura del código (`app.js`)

El código está organizado en 17 módulos con responsabilidad única. El flujo de datos es unidireccional: cualquier cambio de estado pasa por `App.commit()` → `TaskService.save()` → `App.render()`.

```
CONFIG / CATEGORIES / CATEGORY_COLORS / RING / CLASSES   ← Constantes inmutables (Object.freeze)
                          │
                    ┌─────┴─────┐
                    │  Utils    │  ← Funciones puras: safeTrim, normalizeText, formatDate/Time
                    └─────┬─────┘
                          │
              ┌───────────┴───────────┐
              │      TaskStore        │  ← Capa de persistencia (localStorage)
              │  load() / save()      │     En Fase 3: reemplazar por fetch("/api/tasks")
              └───────────┬───────────┘
                          │
              ┌───────────┴───────────┐
              │     TaskService       │  ← Lógica de negocio pura (sin DOM)
              │  add / updateText /   │     CRUD, validación, stats, filtrado
              │  remove / completeAll │
              │  getVisible / reorder │
              └───────────┬───────────┘
                          │
              ┌───────────┴───────────┐
              │     UIState           │  ← Estado UI centralizado
              │  categoryFilter       │     (categoryFilter, editingTaskId,
              │  editingTaskId        │      doneExpanded, lastAddedTaskId,
              │  doneExpanded ...     │      searchDebounceTimer)
              └───────────┬───────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   ┌────┴────┐     ┌──────┴──────┐    ┌────┴────┐
   │   DOM   │     │    App      │    │Keyboard │
   │ get(id) │     │ commit()    │    │ init()  │
   │ (cache) │     │ render()    │    └─────────┘
   └─────────┘     │ _bindEvents│
                   └──────┬──────┘
                          │ render() llama a:
        ┌────┬────┬───┬───┼───┬────┬────┬────┐
        │    │    │   │   │   │    │    │    │
     Theme Loc Search Greet Welc Prog Side Rend Anim
                                              │
                                          UndoToast
                                          DragDrop
                                          ListActions
```

#### Módulos

| Módulo | Responsabilidad |
|---|---|
| `CONFIG` | Constantes de la app: keys de storage, límites, timeouts, duraciones |
| `CATEGORIES` | Array de categorías disponibles |
| `CATEGORY_COLORS` | Mapa categoría → color hex para dots y barras |
| `RING` | Circumferencias SVG (hero: 201.1, sidebar: 119.4) |
| `CLASSES` | Mapa centralizado de clases Tailwind para todos los elementos generados por JS |
| `DOM` | Cache lazy de `getElementById`. `DOM.get("id")` consulta una vez, cachea para siempre |
| `Utils` | Funciones puras: `safeTrim`, `normalizeText`, `formatDate`, `formatTime`, `currentHour` |
| `TaskStore` | Capa de persistencia aislada. `load()` → `Task[]`, `save(tasks)` → persiste. En Fase 3, solo este módulo cambia |
| `TaskService` | Lógica de negocio sin DOM: `add`, `updateText`, `setCompleted`, `remove`, `insertAt`, `completeAll`, `clearCompleted`, `updateTask`, `reorder`, `computeStats`, `getVisible` |
| `UIState` | Objeto mutable con estado de UI: `categoryFilter`, `editingTaskId`, `lastAddedTaskId`, `doneExpanded`, `searchDebounceTimer` |
| `Theme` | `load()` detecta sistema o localStorage, `apply(theme)`, `toggle()` |
| `Location` | Geolocalización IP: `ip-api.com` (primario, 5s timeout) → `ipapi.co` (fallback). Cache en `sessionStorage` |
| `Search` | Lógica del buscador del header: `getQuery()`, `clear()`, `focus()`, `updateHints()` |
| `Greeting` | Saludo contextual cuando hay tareas. Varía por hora y % completado |
| `Welcome` | Pantalla de onboarding cuando no hay tareas. Oculta secciones de tareas y pills |
| `Progress` | Actualiza anillo SVG hero + texto de progreso + fecha |
| `Sidebar` | `build()` genera filtros una vez, `update()` sincroniza ring, barras, stats, fecha/hora/ubicación |
| `DragDrop` | 6 combinaciones cross-section + reorder within-section |
| `UndoToast` | Toast de 4s con barra de progreso y restauración en posición original |
| `TaskRenderer` | Construcción DOM de tarjetas: `createItem()`, `renderList()`, `_buildLeft/_buildRight`, `_animateIn` |
| `Animations` | `complete(li, id)` y `delete(li, id)`: animan y luego ejecutan la acción |
| `ListActions` | Handler delegado de clicks: `complete`, `restore`, `delete`, `edit`, `edit-save`, `edit-cancel` |
| `Keyboard` | Atajos centralizados: `Ctrl+K`, `Ctrl+Shift+C`, `Ctrl+Shift+X`, `Esc`, `Enter` |
| `App` | Orquestador: `init()` bootstrapea, `commit()` persiste+renderiza, `render()` re-renderiza toda la UI, `_bindEvents()` conecta todos los listeners |

#### Preparación para Fase 3 (backend)

La migración a API REST requiere cambiar **solo `TaskStore`**:

```js
// Fase 2 (actual):
const TaskStore = {
  load() { return JSON.parse(localStorage.getItem(key)); },
  save(tasks) { localStorage.setItem(key, JSON.stringify(tasks)); },
};

// Fase 3 (backend):
const TaskStore = {
  async load() { return (await fetch("/api/tasks")).json(); },
  async save(tasks) { await fetch("/api/tasks", { method: "PUT", body: JSON.stringify(tasks) }); },
};
```

`TaskService`, `App`, y todos los módulos de UI no necesitan cambios. La interfaz `load()` / `save()` es el contrato.

---

### Funcionalidades

#### Tareas
- Añadir con categoría (6) y prioridad (3). Submit con `Enter`, hint `↵` visual
- Validación: vacío, >300 chars, duplicados (normalización case-insensitive + espacios)
- Editar inline: `Editar` → input → `Enter`/`Guardar` o `Esc`/`Cancelar`
- Completar/restaurar con animación fade+slide (220ms)
- Borrar con animación fade+scale + undo-toast 4s con barra de progreso
- Completar todas (`Ctrl+Shift+C` o botón)
- Vaciar completadas (`Ctrl+Shift+X` o botón)

#### Organización
- 3 secciones: "Ahora" (Alta), "Pendiente" (Media/Baja), "Hecho" (colapsado)
- Drag & drop completo (6 combinaciones cross-section + reorder):
  - Ahora ↔ Pendiente: cambia prioridad
  - Pendiente/Ahora → Hecho: marca completada
  - Hecho → Ahora: restaura como Alta
  - Hecho → Pendiente: restaura con prioridad original
- Filtros por categoría: pills (mobile) + sidebar vertical con dots (xl)
- Búsqueda en header: siempre visible, hint `⌘K`, debounce 150ms

#### Atajos de teclado
| Atajo | Acción |
|---|---|
| `Ctrl+K` / `⌘K` | Enfocar búsqueda |
| `Ctrl+Shift+C` | Completar todas las pendientes |
| `Ctrl+Shift+X` | Vaciar completadas |
| `Esc` | Limpiar búsqueda / cancelar edición / desenfocar |
| `Enter` | Añadir tarea / confirmar edición |

#### Layout
- **Mobile/tablet** (<1280px): columna única, hero con anillo, pills en grid, secciones
- **Desktop** (≥1280px): grid `[240px_1fr_240px]`, sidebars sticky, hero y pills ocultos

#### Sidebar izquierdo (xl)
- Anillo mini de progreso + label "N/M completadas"
- Barras de categoría con colores
- Fecha, hora, ubicación (separados)
- Panel de atajos de teclado (5 atajos)

#### Sidebar derecho (xl)
- Filtros de categoría con dots de color
- Botones: "Completar todas", "Vaciar completadas"
- Resumen: total, pendientes, completadas

#### Saludos contextuales
- **Con tareas** (greeting-section): título + subtítulo arriba del todo, varía por hora y progreso
- **Sin tareas** (welcome-section): icono SVG + saludo + 3 mini-cards de onboarding

---

### Diseño

#### Paleta (60-30-10)

**Claro:** stone-50 / white (60%) → stone-700 / stone-400 (30%) → amber-400/500 (10%)

**Oscuro:** neutral-950 / neutral-900 (60%) → neutral-100..500 (30%) → amber solo en anillo y stripe (10%)

#### Colores de categoría
| Categoría | Color | Hex |
|---|---|---|
| Trabajo | Naranja quemado | `#c2410c` |
| Personal | Azul medio | `#2563eb` |
| Estudio | Violeta | `#7c3aed` |
| Proyectos | Teal | `#0d9488` |
| Salud | Rosa intenso | `#db2777` |
| Gestiones | Stone neutro | `#78716c` |

---

### Estilos custom (`input.css`)

Dentro de `@layer base`:
- `.ring-widget` / `.ring-widget-sm` — discos circulares elevados para SVG rings
- `.priority-high` — franja amber izquierda en tarjetas de prioridad Alta
- `.category-bar` / `.category-bar-fill` — barras de progreso por categoría en sidebar
- `.sidebar-filter-btn` + estados hover/active/dark — botones de filtro del sidebar
- `.enter-hint` / `.enter-hint-kbd` — hint ↵ dentro del input de tarea
- `.font-mono-ui` — utilidad DM Mono para contadores
- `.task-actions` — hover-only en desktop, siempre visible en touch (`@media (hover: none)`)
- `.undo-toast` / `.undo-toast-action` / `.undo-toast-progress` — toast fixed con animación spring
- `[data-section].drag-over` — outline dashed para feedback de drag & drop

---

### Persistencia

| Key | Storage | Contenido |
|---|---|---|
| `taskflow_tasks_v12` | `localStorage` | Array JSON de tareas |
| `taskflow_theme_v12` | `localStorage` | `"light"` o `"dark"` |
| `taskflow_location` | `sessionStorage` | `"Rotterdam, Netherlands"` (cache de geolocalización) |

#### Estructura de una tarea
```json
{
  "id": "uuid",
  "text": "Revisar PR del backend",
  "category": "Trabajo",
  "priority": "Alta",
  "completed": false,
  "createdAt": 1711000000000,
  "completedAt": null
}
```

---

### Requisitos

- Node.js ≥ 20

### Comandos

```bash
npm install           # Instalar dependencias
npm run dev:css       # Watch mode (desarrollo)
npm run build:css     # Build minificado (producción)
```

---

### Estructura del proyecto

```
├── index.html              # Layout: header, sidebars, main, footer, undo-toast
├── app.js                  # 17 módulos: Store, Service, UI modules, App orchestrator
├── input.css               # Tailwind entry + custom styles (@layer base)
├── tailwind.config.js      # darkMode: "class"
├── package.json            # Scripts: dev:css, build:css
├── css/
│   └── output.css          # Generado por Tailwind (en .gitignore)
├── docs/
│   ├── design/
│   │   └── wireframe-taskflow.svg
│   └── ai/
│       ├── reflection.md
│       ├── experiments.md
│       ├── cursor-workflow.md
│       ├── prompt-engineering.md
│       └── ai-comparison.md
├── server/                 # Backend (Fase 3)
└── backup/                 # Snapshots pre-rediseño
```

---

### Testing manual

| Prueba | Resultado esperado |
|---|---|
| Sin tareas | Welcome state: saludo contextual + mini-cards onboarding |
| Añadir primera tarea | Welcome → greeting + tarea en "Pendiente" |
| Completar tarea | Animación fade+slide → "Hecho" (si expandido) |
| Borrar tarea | Animación fade+scale → undo-toast 4s → "Deshacer" restaura |
| Vaciar todas → añadir nueva | Secciones se restauran correctamente |
| Drag: Pendiente → Ahora | Prioridad cambia a Alta |
| Drag: Ahora → Pendiente | Prioridad cambia a Media |
| Drag: Pendiente → Hecho | Tarea se marca completada, sección se expande |
| Drag: Hecho → Ahora | Restaurada como pendiente con prioridad Alta |
| Drag: Hecho → Pendiente | Restaurada con prioridad original |
| `Ctrl+K` | Focus en búsqueda |
| `Ctrl+Shift+C` | Todas las pendientes se completan |
| `Ctrl+Shift+X` | Todas las completadas se eliminan |
| Pantalla ≥1280px | 3 columnas, hero/pills ocultos, sidebars visibles |
| Pantalla <1280px | Columna única, hero/pills visibles, sidebars ocultos |
| Dark mode | Toggle funciona, persiste, neutro excepto amber en anillo/stripe |
| Geolocalización | Hora + ciudad tras carga (ip-api.com → ipapi.co fallback) |
| Recarga | Tareas + tema persisten desde localStorage |
