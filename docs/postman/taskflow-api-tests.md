# Pruebas de integracion con Postman

La documentacion incluye una coleccion real de Postman en `taskflow-api.postman_collection.json` para cubrir los casos principales de la API.

## Como usarla

1. Levanta la app en local con `npm run dev` dentro de `server/`.
2. Abre Postman y usa `Import`.
3. Selecciona `taskflow-api.postman_collection.json`.
4. Verifica que la variable `baseUrl` valga `http://localhost:3000`.
5. Ejecuta la coleccion de arriba abajo para que `POST - Crear tarea (201)` guarde `taskId` y los requests dependientes lo reutilicen.

## Casos cubiertos

| Request | Objetivo | Resultado esperado |
|---|---|---|
| `GET - Listar tareas` | Comprobar lectura base del recurso | `200 OK` |
| `POST - Crear tarea (201)` | Validar alta correcta | `201 Created` |
| `POST - Error 400 sin texto` | Forzar validacion defensiva en controlador | `400 Bad Request` |
| `PATCH - Actualizar tarea (200)` | Validar modificacion parcial | `200 OK` |
| `DELETE - Eliminar tarea (204)` | Validar borrado correcto | `204 No Content` |
| `DELETE - Error 404 ID inexistente` | Forzar `NOT_FOUND` del servicio | `404 Not Found` |
| `POST - Error 500 JSON mal formado` | Comprobar middleware global de errores | `500 Internal Server Error` |

## Que valida automaticamente Postman

- Codigo HTTP esperado en cada request.
- Que el `GET` devuelve un array.
- Que el `POST` correcto devuelve un `id`.
- Que el `PATCH` deja la tarea en `completed: true`.
- Que los errores `400` y `404` incluyen mensajes semanticos.
- Que el `500` expone solo el mensaje generico `Error interno del servidor`.

## Nota para Thunder Client

Se ha elegido Postman porque permite adjuntar una coleccion exportable y reutilizable dentro del propio repositorio. Si prefieres usar Thunder Client, esta misma secuencia de requests se puede recrear sin problema porque las URLs, los bodies y los codigos esperados ya estan documentados aqui.
