# Experimentos con IA en programación

Seis experimentos donde resolví problemas primero pensando
la lógica yo solo y luego con ayuda de IA. Comparo tiempo,
calidad del código y comprensión del problema.

Los tres primeros son problemas generales de programación.
Los tres últimos son tareas directamente del proyecto TaskFlow.

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

## Conclusión general

La IA ahorra tiempo en todos los casos, pero su mayor
valor no es la velocidad sino la calidad del código
generado. En los seis experimentos, la solución de la
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
