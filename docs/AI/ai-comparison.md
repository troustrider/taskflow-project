
# Comparativa entre asistentes de IA

Comparativa entre ChatGPT y Claude en tres tipos de tareas:
explicación de conceptos técnicos, detección de bugs y generación
de código a partir de descripciones en lenguaje natural.

---

## 1. Explicación de conceptos técnicos

### Prompt utilizado
> "En el contexto de programación, explica los siguientes tres
> conceptos técnicos de forma rigurosa: closures, event loop y DOM"

### ChatGPT
Explicación completa, bien estructurada y didáctica. Usó tablas
resumen, esquemas visuales en texto y conectó los tres conceptos
entre sí al final. Omitió la definición formal de DOM en la
primera respuesta, pero la completó correctamente al indicárselo.

### Claude
Explicación igualmente correcta pero con mayor profundidad
técnica en algunos aspectos: detalló reflow/repaint, layout
thrashing y la diferencia entre colecciones vivas y estáticas
en el DOM. También omitió la definición formal de DOM
inicialmente y la completó al indicárselo.

### Conclusión
Ambos modelos explicaron los conceptos con precisión. ChatGPT
fue más didáctico y estructurado; Claude fue más profundo
técnicamente. Ambos cometieron el mismo error inicial y
ambos lo corrigieron sin problema.

---

## 2. Detección de bugs

### Prompt utilizado
> "Revisa los 3 fragmentos de código de JavaScript para detectar
> bugs y explicar por qué no funciona"

### Bugs presentes en las funciones
- **Función 1:** acceso a propiedad sobre valor `null`
- **Función 2:** concatenación de string en lugar de suma numérica
- **Función 3:** bucle infinito por no actualizar la variable
  de control del `while`

### ChatGPT
Detectó los tres bugs correctamente. Identificó el error,
explicó el motivo técnico y propuso la corrección en cada caso.

### Claude
Detectó los tres bugs correctamente con el mismo nivel de
precisión y detalle que ChatGPT.

### Conclusión
En detección de bugs ambos modelos rindieron igual. No hubo
diferencia significativa en calidad ni precisión.

---

## 3. Generación de código a partir de descripción en lenguaje natural

### Prompts utilizados
> "Quiero implementar una función en JavaScript que capture
> cuando presione un botón y me permita editar permanentemente
> la información de una tarea"

> "Quiero implementar un filtro por prioridad para las tareas"

> "Quiero implementar una ordenación de tareas por fecha"

### ChatGPT
Generó código genérico no adaptado al proyecto. Para el filtro
y la ordenación generó funciones pensadas para ejecutarse en
consola, no para manipular el DOM de una aplicación web.
Funcional en abstracto pero no integrable directamente en
TaskFlow.

### Claude
Generó código adaptado directamente a la estructura de TaskFlow
gracias al acceso al repositorio como contexto. 
Las funciones encajaban con el código existente, eran más concisas y
comprensibles.

### Conclusión
La diferencia principal fue el **contexto**. Con el mismo prompt,
Claude generó código específico para el proyecto, mientras que ChatGPT generó
soluciones genéricas de menor utilidad práctica.

---

## Conclusión general

El contexto es el factor más determinante en la calidad de las
respuestas de una IA aplicada al desarrollo. Ambos modelos son
capaces de explicar conceptos y detectar bugs con precisión
similar. La diferencia aparece cuando se trata de generar código
útil para un proyecto real: sin contexto, la IA genera soluciones
genéricas que requieren adaptación manual.
