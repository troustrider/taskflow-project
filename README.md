# TaskFlow

Aplicacion web de gestion de tareas construida con `vanilla JS` y `Tailwind CSS v4`. El objetivo del proyecto es ofrecer una UI limpia y rapida para organizar tareas por prioridad, categoria, proyecto y fecha limite, manteniendo un despliegue estatico sencillo en Vercel.

## Stack

- Frontend: HTML5, CSS, JavaScript ES2022 (`"use strict"`)
- Estilos: Tailwind CSS v4 mediante `@tailwindcss/cli`
- Persistencia: `localStorage` y `sessionStorage`
- Deploy: Vercel con build CSS via `npm run build:css`

## Puesta en marcha

Requisitos:

- Node.js 20 o superior

Comandos:

```bash
npm install
npm run dev:css
npm run build:css
```

El despliegue actual depende de `css/output.css`, generado a partir de `input.css`.

## Funcionalidades principales

- Alta de tareas con categoria, prioridad, fecha limite y proyecto.
- Parser de entrada rapida con tokens `@fecha`, `#categoria`, `!prioridad` y `/proyecto`.
- Edicion inline del texto principal.
- Panel de detalle inline para fecha, proyecto, categoria, prioridad y notas.
- Agrupacion en tres vistas: `Ahora`, `Pendiente` y `Hecho`.
- Filtros por categoria y proyecto.
- Busqueda con debounce.
- Drag and drop entre listas.
- Undo al borrar tareas.
- Focus mode para recorrer tareas pendientes una a una.
- Tema claro/oscuro persistente.
- Geolocalizacion con cache en sesion para mostrar hora y ciudad.

## Arquitectura de `app.js`

El archivo esta organizado por modulos con responsabilidades separadas:

- `CONFIG`, `CATEGORIES`, paletas y clases: constantes de la app.
- `DOM`: cache de nodos y accesos recurrentes.
- `Utils`: helpers puros de texto, fechas, resaltado y formato.
- `InputParser`: interpreta tokens del input rapido.
- `TaskStore`: capa de persistencia.
- `TaskService`: logica de negocio sin DOM.
- `UIState`: estado de interfaz.
- `Theme`, `Location`, `Search`, `ShortcutHints`, `FormVisualOrder`: modulos de soporte de UI.
- `Greeting`, `Welcome`, `Progress`, `Sidebar`, `FocusMode`, `UndoToast`: modulos de experiencia y contexto.
- `TaskDetail` y `TaskRenderer`: construccion y renderizado del DOM.
- `Animations`, `DragDrop`, `Keyboard`, `ListActions`: interaccion.
- `App`: orquestacion general, listeners, persistencia y render.

Flujo principal:

```text
App.commit() -> TaskService.save() -> App.render()
```

## Persistencia

Claves usadas actualmente:

- `taskflow_tasks_v13`
- `taskflow_theme_v12`
- `taskflow_location`

Forma de una tarea:

```json
{
  "id": "uuid",
  "text": "Revisar PR del backend",
  "category": "Trabajo",
  "priority": "Alta",
  "completed": false,
  "createdAt": 1711000000000,
  "completedAt": null,
  "dueDate": 1711086400000,
  "notes": "Pendiente validar casos borde",
  "project": "Sprint 14"
}
```

## Estructura del proyecto

```text
.
|-- app.js
|-- index.html
|-- input.css
|-- css/
|   `-- output.css
|-- package.json
|-- tailwind.config.js
|-- vercel.json
|-- backup/
|-- docs/
|   |-- ai/
|   `-- design/
|-- server/
`-- tests/
```

Notas:

- `docs/` contiene material historico del bootcamp sobre uso de IA y referencia de proceso; no forma parte del runtime de la app.
- `backup/` guarda snapshots del proyecto.
- `tests/` esta reservado, pero ahora mismo la validacion es manual.

## Validacion manual recomendada

- Crear una tarea simple y comprobar que aparece en `Pendiente`.
- Crear una tarea `!alta` o con fecha de hoy y comprobar que aparece en `Ahora`.
- Usar `@viernes #trabajo /sprint14 !alta` y verificar parser y preview.
- Editar una tarea y validar limites, vacios y duplicados.
- Abrir `Detalles`, cambiar fecha/proyecto/notas y recargar para comprobar persistencia.
- Completar, restaurar y borrar una tarea comprobando animaciones y undo.
- Filtrar por categoria y proyecto, y despues limpiar filtros.
- Probar drag and drop entre `Ahora`, `Pendiente` y `Hecho`.
- Activar focus mode y recorrer varias tareas.
- Cambiar el tema y recargar.
- Ejecutar `npm run build:css` antes de desplegar.

## Deploy

El despliegue esperado sigue siendo el mismo:

- Build: `npm run build:css`
- Hosting estatico: Vercel

No hay dependencias de backend activas para el flujo actual del frontend.
