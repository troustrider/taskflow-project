# Prompt Engineering

Prompts útiles que he usado durante el desarrollo de TaskFlow,
organizados por técnica, y por qué cada uno funciona bien.

---

## Técnica 1: Definir un rol

### Prompt 1
> "Imagina que eres un desarrollador web senior que ha trabajado
> años en apps como Notion. ¿Qué cambiarías del proyecto TaskFlow?"

**Por qué funciona:** Al darle un rol concreto, la respuesta es
mucho más específica y útil. Sin el rol, la respuesta es genérica.
Con él, te da feedback real de producto.

---

## Técnica 2: Few-shot prompting

### Prompt 2
> "Necesito mensajes de empty state para TaskFlow. El tono es
> amigable y cercano. Ejemplos:
> - Sin tareas pendientes → 'Aún no tienes tareas pendientes.
>   Añade la primera arriba 🙂'
> - Sin tareas completadas → 'Todavía no has completado ninguna tarea.'
> Ahora genera mensajes para: sin resultados de búsqueda, sin tareas
> de categoría Trabajo, y sin tareas de alta prioridad."

**Por qué funciona:** Los ejemplos le muestran exactamente el tono
y el estilo que quieres. Sin ejemplos, la respuesta es genérica y
no encaja con el proyecto. Con ejemplos, se ciñe al patrón y
evita alucinaciones.

---

## Técnica 3: Razonamiento paso a paso

### Prompt 3
> "Añade drag and drop para ordenar manualmente, inbox, archivado
> y estados más ricos que solo 'completed'. Explícame tu razonamiento
> paso a paso antes de darme la respuesta."

**Por qué funciona:** En vez de lanzarse a generar código, la IA
primero analiza el problema y hace preguntas sobre decisiones de
producto. Así evitas implementar algo que luego no encaja con
lo que querías.

---

## Técnica 4: Restricciones claras

### Prompt 4
> "Añade un atajo de teclado. Restricciones: no modifiques funciones
> existentes, usa solo vanilla JS sin librerías externas, y mantén
> menos de 10 líneas de código nuevo."

**Por qué funciona:** Sin restricciones, la IA tiende a generar
soluciones más complejas de lo necesario. Con restricciones claras,
el resultado fue 7 líneas limpias que no tocaron nada del código
existente.

---

## Otros prompts útiles

### Prompt 5
> "Revisa este archivo y dime qué partes son candidatas a
> refactorizar y por qué."

**Por qué funciona:** Con MCP y acceso al archivo completo, la IA
detecta patrones problemáticos que serían muy difíciles de ver
manualmente en un archivo de 857 líneas.

### Prompt 6
> "En el contexto de programación, explica los siguientes tres
> conceptos técnicos de forma rigurosa: closures, event loop y DOM."

**Por qué funciona:** Especificar "rigurosa" y "en el contexto de
programación" evita explicaciones superficiales. Sin esas palabras,
la respuesta puede ser demasiado básica.

### Prompt 7
> "Revisa los 3 fragmentos de código de JavaScript enmarcados
> entre '[]' para detectar bugs y explicar por qué no funciona."

**Por qué funciona:** Los delimitadores '[]' le dicen exactamente
qué analizar. Pedir también la explicación del porqué obliga a un
análisis más profundo que solo señalar el error.

### Prompt 8
> "Quiero implementar una función en JavaScript que capture cuando
> presione un botón y me permita editar permanentemente la
> información de una tarea."

**Por qué funciona:** Describir la funcionalidad desde la perspectiva
del usuario, no de la implementación, da más contexto a la IA y
el resultado encaja mejor con lo que necesitas.

### Prompt 9
> "Añade un comentario JSDoc a esta función."

**Por qué funciona:** Prompt corto y directo usado con edición inline.
La precisión del prompt más el contexto del código seleccionado
genera documentación exacta para esa función concreta.

### Prompt 10
> "¿Qué archivos hay en mi proyecto?"

**Por qué funciona:** Sin MCP este prompt no tiene valor. Con MCP
permite consultar el proyecto directamente desde el editor sin
copiar nada manualmente.
