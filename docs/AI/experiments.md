# Experimentos con IA en programación

Tres experimentos donde resolví problemas primero pensando
la lógica yo solo y luego con ayuda de IA. Comparo tiempo,
calidad del código y comprensión del problema.

---

## Experimento 1: Validaciones del formulario

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

## Experimento 2: Mensajes de empty state

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

## Experimento 3: Atajo de teclado Esc

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

## Conclusión general

La IA ahorra tiempo en todos los casos, pero su mayor
valor no es la velocidad sino la calidad del código
generado. En los tres experimentos, la solución de la
IA fue más robusta de lo que hubiera hecho yo solo.

Lo más importante: intentar la lógica primero sin IA
me ayudó a entender el problema de verdad. Sin ese paso
previo, hubiera aceptado el código sin saber realmente
qué estaba haciendo.
