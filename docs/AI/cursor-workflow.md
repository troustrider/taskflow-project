# Cursor Workflow

Mi experiencia usando Cursor como editor con IA integrada:
atajos de teclado útiles, ejemplos donde mejoró mi código
y diferencias respecto a VS Code.

---

## Qué es Cursor

Es básicamente VS Code pero con IA integrada de serie.
La interfaz es casi idéntica, pero tiene un panel de chat
y herramientas que te permiten interactuar con el código
directamente desde el editor sin necesidad de extensiones.

---

## Atajos de teclado más útiles

| Atajo | Para qué sirve |
|---|---|
| `Tab` | Aceptar sugerencia de autocompletado |
| `Ctrl + K` | Edición inline: modificar código seleccionado |
| `Ctrl + I` | Abrir Composer (cambios multi-archivo) |
| `Ctrl + Shift + L` | Abrir panel de chat con IA |
| `Ctrl + Shift + ↓` | Seleccionar línea hacia abajo |
| `Ctrl + Shift + C` | Copiar ruta del archivo actual |

---

## Dos ejemplos donde Cursor mejoró mi código

### 1. Autocompletado a partir de un comentario

Escribí un comentario describiendo lo que quería:
```javascript
// función que saluda a un usuario por su nombre
```

Cursor sugirió automáticamente esta implementación:
```javascript
function saludar(nombre) {
  return `Hola ${nombre}, bienvenido a TaskFlow`;
}
```

Lo interesante es que mencionó "TaskFlow" porque tenía
el contexto del repositorio. No generó algo genérico,
sino algo adaptado al proyecto.

### 2. Edición inline para añadir JSDoc

Seleccioné la función `getTaskCardClasses`, usé `Ctrl + K`
y le pedí que añadiera un comentario JSDoc. El resultado
fue una explicación técnica clara de qué hace la función,
directamente en el código.

Esto es útil porque mejora la legibilidad del código
sin tener que escribir la documentación manualmente.

---

## Composer: cambios multi-archivo

Composer (`Ctrl + I`) es la herramienta de Cursor para
hacer cambios que afectan a varios archivos a la vez.
A diferencia del chat o la edición inline, Composer
puede leer y modificar múltiples archivos del proyecto
en una sola operación.

### Ejemplo: refactorización del objeto CLASSES

Usé Composer para extraer todas las clases Tailwind
que estaban dispersas por las funciones de `app.js` y
centralizarlas en el objeto `CLASSES`. Composer leyó
`app.js` e `index.html`, identificó las clases repetidas
y generó los cambios en ambos archivos simultáneamente.

Sin Composer habría tenido que ir función por función
copiando y pegando clases, con el riesgo de romper algo.
Con Composer, los cambios fueron coherentes entre archivos.

### Cuándo usar Composer vs chat vs edición inline

- **Edición inline** (`Ctrl + K`): para cambiar una función
  o bloque concreto sin salir del contexto.
- **Chat** (`Ctrl + Shift + L`): para preguntar, explorar
  ideas o pedir explicaciones.
- **Composer** (`Ctrl + I`): para cambios que tocan varios
  archivos o que requieren coherencia global (renombrar,
  refactorizar, migrar).

---

## Model Context Protocol (MCP)

### Qué es MCP

Es un protocolo que permite a la IA conectarse a fuentes de
información externas, como el sistema de archivos local o
un repositorio de GitHub. Sin MCP, la IA solo sabe lo que
le escribes en el chat. Con MCP, puede acceder directamente
a tus archivos y trabajar con el contexto real del proyecto.

---

### Cómo lo configuré

1. Creé el archivo `.cursor/mcp.json` dentro del proyecto
2. Añadí esta configuración:
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "C:\\Users\\Usuario\\Desktop\\FFE Corner Estudios"
      ]
    }
  }
}
```

3. Reinicié Cursor
4. Verifiqué que el servidor `filesystem` aparecía en la
   configuración de MCP de Cursor

---

### Consultas realizadas con MCP

**1. ¿Qué archivos hay en el proyecto?**
Listó todos los archivos del proyecto correctamente.

**2. ¿Hay algún archivo duplicado?**
Respondió que no había archivos duplicados.

**3. ¿Hay funciones sin comentarios JSDoc?**
Detectó varias funciones sin documentar:
`getPriorityClasses`, `getCategoryClasses`,
`getTaskCardClasses`, `getCheckButtonClasses`,
`getDeleteButtonClasses`, `setActiveButtonClasses`,
`createTaskLeft`, `createTaskRight` y `animateAndComplete`.

**4. ¿Cuántas líneas tiene app.js?**
857 líneas.

**5. ¿Hay código duplicado en el proyecto?**
Detectó duplicación en la validación del formulario
(el chequeo de máximo 300 caracteres y tareas duplicadas
estaba repetido en el submit y dentro de `addTask()`),
y clases Tailwind repetidas en `index.html`.

---

### En qué casos es útil MCP en proyectos reales

MCP es especialmente útil en desarrollo y en cualquier
contexto de trabajo en equipo. Permite que la IA tenga
acceso al mismo contexto que todos los miembros del equipo,
sin necesidad de copiarle información manualmente en cada
consulta. Esto mejora la precisión de las respuestas y
ahorra tiempo en tareas de análisis del proyecto.
