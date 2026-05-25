![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

# ✅ TaskFlow
> Gestor de tareas con sintaxis rápida y API REST documentada

Aplicación de gestión de tareas con frontend vanilla JavaScript y backend Express. Permite crear tareas con sintaxis rápida, filtrarlas por categoría y proyecto, y sincronizarlas con el servidor vía API REST. Persistencia en memoria. Desplegado en Vercel.

| Despliegue | URL |
|------------|-----|
| Aplicación | [taskflow-project-jet.vercel.app](https://taskflow-project-jet.vercel.app) |
| API Docs | [Swagger UI](https://taskflow-project-jet.vercel.app/api/docs/) |

---

## Características

- Sintaxis rápida para crear tareas: `@fecha #categoría !prioridad /proyecto`
- Filtros por categoría y proyecto
- Drag-and-drop entre secciones (Ahora / Pendiente / Hecho)
- Focus Mode y tema claro/oscuro
- API REST con 6 endpoints documentados en Swagger UI
- Arquitectura por capas: rutas → controladores → servicios

---

## Tecnologías

| Frontend | Uso |
|----------|-----|
| HTML5 | Estructura semántica |
| JavaScript (ES2022+) | Lógica de la aplicación |
| Tailwind CSS v4 | Estilos utility-first compilados |

| Backend | Uso |
|---------|-----|
| Node.js + Express 5 | Servidor HTTP y API REST |
| swagger-jsdoc | Generación de spec OpenAPI desde anotaciones |
| swagger-ui-express | Documentación interactiva en `/api/docs` |

| Auxiliares | Uso |
|------------|-----|
| Vercel | Despliegue frontend estático + backend serverless |
| nodemon | Recarga automática en desarrollo |

---

## Estructura del proyecto

```
taskflow-project/
├── index.html              # Punto de entrada del frontend
├── app.js                  # Lógica completa del frontend
├── input.css               # Fuente de Tailwind CSS
├── src/
│   └── api/
│       └── client.js       # Capa de red (fetch → API REST)
├── api/
│   └── router.js           # Wrapper serverless para Vercel
├── server/
│   ├── README.md           # Documentación detallada del backend
│   └── src/
│       ├── index.js        # Servidor Express + middlewares
│       ├── config/         # Env vars y configuración Swagger
│       ├── routes/         # Mapeo HTTP → controladores
│       ├── controllers/    # Validación y respuestas HTTP
│       └── services/       # Lógica de negocio pura
├── docs/
└── vercel.json
```

---

## Descargar y ejecutar

```bash
git clone https://github.com/troustrider/taskflow-project.git
cd taskflow-project
npm install
cd server && npm install

# Crear .env en server/
echo "PORT=3000" > .env
echo "NODE_ENV=development" >> .env

# Arrancar (desde server/)
npm run dev
```

Abrir `http://localhost:3000`. Frontend + API desde el mismo puerto. Documentación Swagger en `http://localhost:3000/api/docs`.

---

## Desplegar en Vercel

### Frontend

1. Conectar el repositorio en Vercel
2. Build command: `npm run build:css`
3. Output directory: raíz del proyecto

### Backend

1. Vercel expone el backend a través de `api/router.js`
2. Las rutas se redirigen mediante `rewrites` en `vercel.json`
3. Añadir `NODE_ENV=production` en Vercel → Settings → Environment Variables

---

*Desarrollado durante las prácticas en [Corner Estudios](https://www.corner-estudios.com) — Karim Abatouy — 2026*
