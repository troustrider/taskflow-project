# Experimentos con IA en programación

Ocho experimentos donde resolví problemas primero pensando
la lógica yo solo y luego con ayuda de IA. Comparo tiempo,
calidad del código y comprensión del problema.

Los tres primeros son problemas generales de programación.
Los cinco últimos son tareas directamente del proyecto TaskFlow.

---

## Experimento 1: Invertir un string sin métodos nativos

### Sin IA
Mi idea: recorrer el string de atrás hacia delante con un
bucle for e ir concatenando cada carácter en un string nuevo.

```javascript
function invertir(texto) {
  let resultado = "";
  for (let i = texto.length - 1; i >= 0; i--) {
    resultado += texto[i];
  }
  return resultado;
}
```

Funcionó a la primera. Es un problema que puedo resolver
porque la lógica es directa y el bucle for lo controlo.

### Con IA
Le pedí lo mismo a Claude. Generó una solución con
`split('').reverse().join('')` — más corta pero usa
métodos nativos (que yo quería evitar). Cuando le puse
la restricción, generó algo parecido a lo mío pero
usando `reduceRight`, que no conocía.

### Comparación
- **Tiempo:** Sin IA tardé unos 5 minutos. Con IA, 30 segundos.
- **Calidad:** Ambas soluciones funcionan. La mía es más
  fácil de entender para alguien que empieza.
- **Comprensión:** Es de los pocos problemas donde siento
  que entiendo la solución igual de bien con o sin IA.

---

## Experimento 2: Encontrar el elemento más frecuente de un array

### Sin IA
Mi idea: usar un objeto como contador. Recorrer el array,
y por cada elemento sumar 1 en el objeto. Luego recorrer
el objeto para encontrar el que tiene el valor más alto.

Llegué a escribir la parte del contador pero me atranqué
comparando los valores del objeto para encontrar el máximo.
No sabría cómo iterar sobre las claves de un objeto de
forma limpia.

### Con IA
Claude generó una solución con `reduce` para contar y
`Object.entries` para encontrar el máximo. Compacta y
elegante, pero tuve que leer la documentación de
`Object.entries` para entenderla.

### Comparación
- **Tiempo:** Sin IA tardé 15 minutos y no terminé. Con IA,
  1 minuto.
- **Calidad:** La solución de la IA es claramente mejor.
  Más concisa y sin variables intermedias innecesarias.
- **Comprensión:** Después de leer el código de la IA y
  buscar qué hace `Object.entries`, ahora sí lo entiendo.
  Pero no lo habría escrito solo.

---

## Experimento 3: Comprobar si una palabra es palíndromo

### Sin IA
Mi idea: invertir la palabra (como en el experimento 1)
y comparar con la original. Si son iguales, es palíndromo.
También pensé en convertir todo a minúsculas para que
"Ana" funcione.

```javascript
function esPalindromo(palabra) {
  const limpia = palabra.toLowerCase();
  const invertida = limpia.split('').reverse().join('');
  return limpia === invertida;
}
```

Lo implementé completo. Aquí usé `split/reverse/join` porque
ya lo había visto en el experimento anterior con la IA.

### Con IA
Claude añadió además la eliminación de espacios y caracteres
especiales con una regex, para que funcione con frases como
"Anita lava la tina". Mi versión solo funcionaba con palabras
sueltas.

### Comparación
- **Tiempo:** Sin IA, 5 minutos. Con IA, 30 segundos.
- **Calidad:** La IA contempló casos que yo no consideré
  (frases con espacios, acentos). Más robusta.
- **Comprensión:** Entiendo la lógica base perfectamente.
  La regex para limpiar caracteres especiales la tendría
  que buscar, pero el concepto está claro.

---

## Experimento 4: Validaciones del formulario (TaskFlow)

### Sin IA
La lógica que hubiera seguido:
- Validar que el texto no esté vacío (ya existía)
- Limitar la longitud máxima del texto
- Comprobar que no exista ya una tarea con el mismo texto

No sabría implementarlo solo. Entiendo la lógica pero
no sabría escribir la comparación de duplicados ni
mostrar el mensaje de error con `setCustomValidity`.

### Con IA
Cursor generó la validación completa: límite de 300
caracteres, detección de duplicados con `normalizeTaskText`
(que convierte a minúsculas y colapsa espacios), y mensajes
de error nativos del navegador.

### Comparación
- **Tiempo:** Solo hubiera tardado mucho más, probablemente
  sin llegar a una solución completa.
- **Calidad:** El código generado es más robusto de lo que
  hubiera hecho yo, especialmente la normalización del texto.
- **Comprensión:** Entiendo lo que hace cada parte, pero
  no hubiera sabido implementarlo solo.

---

## Experimento 5: Mensajes de empty state (TaskFlow)

### Sin IA
La lógica que hubiera seguido:
- Cuando el array de tareas esté vacío, mostrar un mensaje
- El mensaje debería cambiar dependiendo de si hay búsqueda
  activa o no

Esto sí creo que hubiera podido implementarlo solo, aunque
probablemente con menos elegancia.

### Con IA
Usando few-shot prompting, Cursor generó mensajes con el
tono exacto del proyecto. Le di dos ejemplos y generó
tres mensajes nuevos que encajaban perfectamente.

### Comparación
- **Tiempo:** Similar, pero con IA el resultado encajó
  directamente sin tener que ajustar el tono manualmente.
- **Calidad:** Mejor con IA gracias al few-shot. Los mensajes
  son coherentes con los que ya existían.
- **Comprensión:** Este es el experimento donde más control
  tuve, porque la lógica era sencilla y entendí todo.

---

## Experimento 6: Atajo de teclado Esc (TaskFlow)

### Sin IA
La lógica que hubiera seguido:
- Añadir un event listener para la tecla Esc
- Si hay texto en la búsqueda, limpiarlo
- Re-renderizar las tareas

La lógica es clara pero no sabría exactamente cómo
implementar el event listener ni la condición correcta.

### Con IA
Usando restricciones claras (no modificar funciones
existentes, vanilla JS, menos de 10 líneas), Cursor
generó exactamente 7 líneas limpias que no tocaron
nada del código existente.

### Comparación
- **Tiempo:** Con IA fue inmediato. Sin IA hubiera tardado
  bastante en dar con la sintaxis correcta.
- **Calidad:** El código es más limpio de lo que hubiera
  hecho yo, especialmente la validación de si hay texto
  antes de actuar.
- **Comprensión:** Entiendo perfectamente lo que hace
  cada línea, aunque no hubiera sabido escribirlo solo.

---

## Experimento 7: Rediseño completo del wireframe y la UI (TaskFlow)

Este fue el experimento más interesante de todos porque
no fue sobre código, sino sobre diseño. Le pedí a Claude
que diseñara un wireframe desde cero para TaskFlow como lo
haría un frontend senior. Lo que generó al principio fue
exactamente el mismo layout genérico que generan todas las
IAs: sidebar izquierdo, formulario arriba, lista abajo.

### El problema de la uniformidad

Le señalé que ese wireframe era idéntico al que generaría
ChatGPT, Gemini o cualquier otro LLM. Es el "promedio
estadístico" de todas las apps de productividad que han
visto en sus datos de entrenamiento: Todoist, Notion,
TickTick. No había una sola decisión de diseño original.

### La iteración

Cuando le pedí que rompiera ese molde, el resultado fue
radicalmente distinto:

- **Sin sidebar.** Los filtros de categoría pasaron a ser
  pills inline horizontales. El sidebar ocupaba un 30% del
  ancho de pantalla para mostrar 6 botones y unos contadores.
  No aportaba valor suficiente para el espacio que consumía.

- **Progreso como anillo, no como barra.** Una barra de
  progreso se lee en 1-2 segundos. Un anillo con un número
  dentro se lee en 0.1 segundos. Es lo primero que ves al
  abrir la app.

- **Agrupado por urgencia, no por estado.** En vez del
  split "pendientes / completadas", las tareas se organizan
  en "Ahora" (alta prioridad), "Después" (media/baja) y
  "Hecho" (colapsado por defecto). El flujo visual va de
  arriba (lo urgente) a abajo (lo resuelto).

- **Input como command bar.** El formulario dejó de ser una
  sección separada con título y pasó a ser un input centrado
  tipo command bar, siempre visible. Menos ceremonia, más
  acción directa.

### Implementación

Después del rediseño del wireframe, Claude reescribió
`index.html`, `app.js` e `input.css` para implementar
el nuevo layout. La lógica de negocio (validaciones,
localStorage, edición inline, drag & drop, atajos de
teclado) se mantuvo intacta — solo cambió el render
y la estructura del DOM.

El cambio más significativo en el JS fue la función
`getVisibleTasks()`, que antes devolvía `{ pending,
completed }` y ahora devuelve `{ now, next, done }`.
La agrupación por urgencia se hace filtrando por
prioridad: "Alta" va a "Ahora", el resto a "Después".

### Lo que aprendí

1. Las IAs tienen patrones muy marcados. Si no les
   cuestionas el resultado, te dan el diseño más seguro
   y predecible. La uniformidad es un riesgo real.

2. Pero cuando les das una restricción creativa clara
   ("rómpeme el molde", "no hagas lo que haría cualquier
   LLM"), pueden generar soluciones mejores que el primer
   intento. La clave es saber que el primer resultado
   probablemente es el más genérico.

3. El rediseño no fue solo visual. Cambiar la estructura
   obligó a repensar cómo se agrupan las tareas, qué
   información es prioritaria y cómo se comporta la app
   en móvil. Esas son decisiones de producto, no de CSS.

4. La lógica de negocio sobrevivió al rediseño porque
   estaba bien separada del render. Eso es mérito de la
   arquitectura: `commitTasksAndRender()` como punto
   único de entrada hizo que solo tuviera que cambiar
   la parte de presentación sin tocar las validaciones,
   el localStorage ni los event handlers.

---

## Experimento 8: Teoría cromática y auditoría de dark mode (TaskFlow)

Este experimento fue sobre color, no sobre código. Le pedí
a Claude que revisara a fondo el dark mode de TaskFlow
aplicando criterios reales de teoría del color y estándares
de modo oscuro (Material Design, Apple HIG).

### El problema inicial

El dark mode usaba amber (el color de acento del modo
claro) de forma indiscriminada: pills activas con fondo
amber, checks con borde amber, focus rings con amber,
labels de sección en amber. Sobre el fondo negro neutro
(neutral-950), cada elemento amber se sentía como una
cerilla encendida en una habitación oscura. Había
demasiados puntos calientes compitiendo por atención.

### Lo que aprendí sobre dark mode

1. **Dark mode no es "todo negro".** Es una jerarquía de
   elevación con superficies de luminosidad progresiva:
   el fondo base es el más oscuro (neutral-950), las
   tarjetas un paso más claro (neutral-900), y elementos
   elevados como el ring-widget otro paso más (neutral-800).
   Esto crea profundidad sin sombras.

2. **El acento cálido choca con fondos fríos.** La escala
   `neutral` de Tailwind tiene un subtono ligeramente
   azulado. El amber-500 (#f59e0b) tiene una temperatura
   cromática opuesta. En modo claro funciona porque
   stone-50 ya es cálido. En dark, el contraste de
   temperatura es agresivo.

3. **La regla del punto focal único.** En dark mode
   profesional, el color de acento se reserva para un
   solo elemento hero — en nuestro caso, el anillo de
   progreso SVG. Todo lo demás es neutro. Esto hace que
   la mirada vaya directamente al anillo.

### Los cambios aplicados

- **Anillo SVG**: mantiene `amber-500` — es el único
  hero visual en ambos temas.
- **Franja de prioridad alta**: mantiene `amber-500` —
  es funcional (marca urgencia), no decorativa.
- **Pills activas**: de `amber-500/50 + amber-900/30 +
  amber-400` a `neutral-600 + neutral-800 + neutral-200`.
  Completamente neutras.
- **Check completado**: de `amber-500/50 + amber-900/30 +
  amber-400` a `neutral-600 + neutral-800 + neutral-300`.
- **Focus rings**: todos unificados a `neutral-600`.
- **Label "AHORA"**: de `amber-500` a `neutral-300`. En
  light mantiene `amber-600`.
- **Ring widget**: fondo subido a `#262626` (neutral-800)
  para separarse de las tarjetas (neutral-900).
- **Drag-over outline**: de amber a gris neutro en dark.

### Accesibilidad móvil

También se revisó que el dark mode funcionara en móvil.
Las acciones de tarea (Editar, Borrar) que se ocultaban
con hover no funcionaban en dispositivos táctiles. Se
añadió `@media (hover: none)` para forzar su visibilidad
en touch. Esto no es solo dark mode — afecta a ambos
temas, pero se detectó durante la auditoría.

### Lo que aprendí

La IA no aplica automáticamente buenas prácticas de
color. En las primeras iteraciones, Claude repetía
amber en dark mode porque es lo que ve en la mayoría
de los diseños de su dataset. Cuando le pedí que aplicara
la regla del punto focal único y la jerarquía de
elevación de Material Design, el resultado mejoró
drásticamente.

La lección: si le dices a la IA "ponme modo oscuro",
te da dark-mode-genérico. Si le dices "aplica la
jerarquía de elevación de Material Design y limita
el acento a un solo punto focal", te da algo profesional.
La especificidad del prompt determina la calidad del
resultado.

---

## Conclusión general

La IA ahorra tiempo en todos los casos, pero su mayor
valor no es la velocidad sino la calidad del código
generado. En los ocho experimentos, la solución de la
IA fue más robusta de lo que hubiera hecho yo solo.

Lo más importante: intentar la lógica primero sin IA
me ayudó a entender el problema de verdad. Sin ese paso
previo, hubiera aceptado el código sin saber realmente
qué estaba haciendo.

Los problemas generales (1-3) me sirvieron para ver que
hay cosas que sí puedo resolver solo, y otras donde me
faltan herramientas (como `Object.entries` o regex). Los
del proyecto (4-6) confirmaron que la IA es especialmente
útil cuando hay un contexto concreto y restricciones claras.
El experimento 7 demostró que el mayor riesgo de la IA no
es que falle, sino que te dé algo mediocre que parece
correcto y que aceptes sin cuestionar. El experimento 8
mostró que la especificidad del prompt es lo que marca
la diferencia entre un resultado genérico y uno profesional.
