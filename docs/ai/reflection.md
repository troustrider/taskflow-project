# Reflexión sobre IA y programación

Mis conclusiones después de usar herramientas de IA durante
el desarrollo de TaskFlow. 

---

## En qué tareas la IA me ha ayudado más

Sin duda en la generación de código. Yo vengo de ASIR —
sé de redes, sistemas operativos, administración de
servidores. Pero desarrollo web no es mi terreno natural.
La IA me ha permitido avanzar en cosas que solo con mi
nivel actual me habrían costado muchísimo más tiempo,
o directamente no habría sabido hacer.

Por ejemplo, la refactorización del objeto CLASSES para
centralizar todas las clases Tailwind fue idea de Cursor.
Yo no habría pensado en esa estructura por mi cuenta.
Lo mismo con la normalización de texto para detectar
duplicados: entiendo la lógica, pero no habría llegado
a implementar `normalizeTaskText` con esa limpieza.

También me ha ayudado mucho para documentar. El JSDoc
de las funciones y la tabla del README los generé con
ayuda de IA y luego los revisé. Si hubiera tenido que
escribir toda esa documentación a mano, probablemente
no la habría hecho tan completa.

---

## Casos donde la IA ha fallado o ha generado código incorrecto

El caso más claro fue con ChatGPT cuando le pedí que
generara funciones para el proyecto. Como no tenía el
contexto del repositorio, generó código genérico que
no encajaba con la estructura de TaskFlow. Las funciones
eran correctas en abstracto pero no servían para
integrarlas directamente.

También ha habido momentos donde la IA genera más código
del necesario. Le pides algo simple y te devuelve una
solución sobreingeniería que luego tienes que simplificar.
O añade dependencias que no necesitas.

Otra cosa que he notado: la IA a veces es demasiado
"complaciente". Si le dices que algo está bien, no te
va a cuestionar. No sustituye a alguien que realmente
revise tu código con criterio.

---

## El problema de la uniformidad — rediseño del wireframe

Este fue el aprendizaje más revelador del proyecto. Le
pedí a Claude que diseñara un wireframe para TaskFlow
"como un frontend senior". Lo que generó fue exactamente
el mismo layout que generaría cualquier otra IA: sidebar
izquierdo con categorías, formulario arriba, lista abajo.
Es el diseño por defecto de toda app de tareas que existe.

Cuando le señalé que ese wireframe era genérico y que
ChatGPT o Gemini habrían generado lo mismo, el segundo
intento fue completamente distinto: sin sidebar (filtros
como pills inline), progreso como anillo SVG en vez de
barra, tareas agrupadas por urgencia (Ahora / Pendiente /
Hecho) en vez de por estado (Pendientes / Completadas),
e input tipo command bar centrado.

Esto confirma lo que ya sospechaba: las IAs no diseñan,
promedian. Su primer resultado es siempre el patrón más
frecuente en sus datos de entrenamiento. Si no le pides
explícitamente que sea original, te da algo seguro y
predecible. La originalidad no es el default de la IA —
hay que exigirla.

Implementamos el rediseño completo: nuevo HTML, nuevo JS
(la lógica de negocio se mantuvo, solo cambió el render)
y nuevo wireframe SVG en docs/design. La app ahora tiene
una personalidad propia en vez de parecer un clon de
Todoist con otra paleta de colores.

---

## Teoría cromática y el dark mode

Otro aprendizaje importante fue sobre color. Al principio
asumía que el dark mode era simplemente "invertir los
colores" o "poner todo en negro". La IA tampoco me sacó
de ese error al principio — su primer dark mode usaba
amber (el acento del modo claro) en todas partes sobre
fondo negro, y el resultado era agresivo visualmente.

Cuando le pedí que revisara el dark mode "siguiendo
criterios de teoría cromática", aprendí varias cosas:

1. **El dark mode es una jerarquía de elevación**, no
   un fondo negro plano. El fondo base es el más oscuro,
   las tarjetas un paso más claras, y los elementos
   elevados (como el widget del anillo) otro paso más.
   Esto crea profundidad sin necesitar sombras.

2. **El acento cálido choca con fondos fríos.** La escala
   neutral de Tailwind tiene un subtono azulado. El
   amber es cálido. En modo claro funciona porque stone-50
   ya es cálido. En dark, el contraste de temperatura
   es demasiado fuerte.

3. **La regla del punto focal único.** En dark mode
   profesional, el acento se reserva para un solo
   elemento hero. En TaskFlow es el anillo de progreso.
   Todo lo demás (pills, checks, focus rings, labels)
   pasa a neutro en dark. Esto hace que la mirada vaya
   directamente donde importa.

La lección general: la IA aplica "dark mode genérico"
si no le pides algo específico. Cuando le dices
exactamente qué principios seguir (Material Design,
punto focal único, jerarquía de elevación), el
resultado es radicalmente mejor.

---

## Riesgos de depender demasiado de la IA

El riesgo principal es aceptar código sin entenderlo.
Me pasó al principio: la IA generaba algo, yo veía que
funcionaba y seguía adelante. Pero cuando algo fallaba,
no sabía por dónde empezar a depurar porque no había
entendido realmente qué hacía cada parte.

Otro riesgo es dejar de pensar la lógica por ti mismo.
En los experimentos que hice (documentados en
experiments.md), la diferencia fue clara: cuando intenté
primero la lógica sin IA, aunque no llegué a una
implementación completa, entendí el problema de verdad.
Eso me ayudó a evaluar si lo que la IA generaba después
tenía sentido o no.

Y como demostré con el wireframe y con la paleta de
colores: la uniformidad y la mediocridad son riesgos
reales. Si todo el mundo usa la misma IA sin
cuestionarla, los proyectos empiezan a parecerse
demasiado. El valor diferencial desaparece.

---

## Cuándo prefiero programar sin asistencia

Para cosas que ya entiendo bien y que quiero consolidar,
prefiero hacerlo solo. Por ejemplo, la lógica básica de
añadir y eliminar tareas del array, o los event listeners
del formulario. Eso lo entiendo y me viene bien practicarlo
sin muletas.

También prefiero trabajar sin IA cuando estoy intentando
entender un concepto nuevo. Si le pido a la IA que me lo
explique Y me lo implemente, al final no he aprendido
nada. Pero si primero intento entender la lógica, y luego
uso la IA para validar o mejorar mi implementación,
aprendo mucho más.

En general, la IA es una herramienta muy potente, pero
funciona mejor como un copiloto que como un piloto. Si
le das el control total, avanzas rápido pero no aprendes.
Si la usas para complementar lo que ya estás pensando,
el resultado es mucho mejor. Y si le cuestionas su primer
resultado en vez de aceptarlo, el segundo intento suele
ser significativamente mejor — tanto en diseño como en
código como en color.
