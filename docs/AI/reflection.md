# Reflexión sobre IA y programación

Mis conclusiones después de usar herramientas de IA durante
el desarrollo de TaskFlow. Escrito con mis propias palabras.

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

También hay un riesgo de uniformidad. Si todo el mundo
usa la misma IA para generar código, los proyectos
empiezan a parecerse mucho. La IA tiene patrones muy
marcados que se repiten.

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
el resultado es mucho mejor.
