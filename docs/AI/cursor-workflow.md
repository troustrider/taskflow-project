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
