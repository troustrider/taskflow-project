# Uso de servidores MCP en TaskFlow

## ¿Qué es MCP?

MCP (Model Context Protocol) es un protocolo abierto creado por Anthropic que permite a los modelos de IA (como Claude o GPT) comunicarse con herramientas externas de forma estandarizada. Funciona con una arquitectura cliente-servidor:

- **Cliente MCP**: el editor o aplicación de IA (Cursor, Claude Desktop, VS Code...)
- **Servidor MCP**: un programa que expone funcionalidades (acceso a archivos, búsqueda web, bases de datos...)

Sin MCP, cada integración de IA necesitaría su propio conector personalizado. Con MCP, cualquier herramienta que implemente el protocolo puede conectarse a cualquier cliente compatible.

---

## Servidores MCP usados en este proyecto

### 1. Filesystem (servidor principal)

- **Qué hace**: Permite al modelo de IA leer, escribir, editar y navegar archivos del sistema de archivos local.
- **Cliente**: Cursor IDE
- **Coste**: Gratuito, sin API key
- **Uso en el proyecto**: Todo el desarrollo de TaskFlow se realizó con Cursor conectado al servidor Filesystem. Esto permitió que el asistente de IA pudiera leer directamente `index.html`, `app.js`, `input.css` y el resto de archivos del proyecto para hacer ediciones, revisiones de código y refactorizaciones.

**Operaciones típicas realizadas a través de Filesystem MCP:**

- Lectura de archivos para análisis de código (`read_file`, `read_multiple_files`)
- Edición de código en `app.js` e `index.html` (`edit_file`)
- Navegación de la estructura del proyecto (`list_directory`, `directory_tree`)
- Creación de nuevos archivos de documentación (`write_file`)

### 2. Web Search MCP (segundo servidor — bonus)

- **Qué hace**: Permite al modelo de IA realizar búsquedas web en tiempo real usando múltiples motores (Bing, Brave, DuckDuckGo) sin necesidad de API key.
- **Repositorio**: [github.com/mrkrsl/web-search-mcp](https://github.com/mrkrsl/web-search-mcp)
- **Cliente**: Cursor IDE
- **Coste**: Gratuito, sin API key, 100% local
- **Uso en el proyecto**: Se conectó como segundo servidor MCP para que el asistente pudiera buscar documentación técnica, ejemplos de implementación y buenas prácticas durante el desarrollo sin salir de Cursor.

> **Nota**: Inicialmente se evaluó Brave Search API como segundo servidor, pero desde febrero de 2026 Brave eliminó su plan gratuito y ahora requiere tarjeta de crédito. Se optó por Web Search MCP como alternativa gratuita.

**Herramientas que expone este servidor:**

| Herramienta | Descripción |
|-------------|-------------|
| `full-web-search` | Búsqueda completa con extracción del contenido de las páginas |
| `quick-web-search` | Búsqueda rápida que devuelve solo snippets (sin visitar las páginas) |
| `extract-page-content` | Extrae el contenido completo de una URL específica |

**Ejemplos de uso en el proyecto:**

- Buscar documentación de la API nativa de Drag and Drop del navegador
- Consultar sintaxis de Tailwind CSS v4
- Verificar compatibilidad de `crypto.randomUUID()` entre navegadores

---

## Configuración

Ambos servidores se configuran en `.cursor/mcp.json` en la raíz del proyecto. Esta es la configuración real usada:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@anthropic/mcp-filesystem",
        "C:\\Users\\Usuario\\OneDrive\\Desktop\\FFE Corner Estudios"
      ]
    },
    "web-search": {
      "command": "node",
      "args": ["C:\\Users\\Usuario\\OneDrive\\Desktop\\FFE Corner Estudios\\web-search-mcp\\dist\\index.js"],
      "env": {
        "BROWSER_HEADLESS": "true",
        "MAX_BROWSERS": "2"
      }
    }
  }
}
```

### Instalación del servidor Web Search MCP

Se clonó el repositorio dentro del propio proyecto (la carpeta `web-search-mcp/` está excluida del repo vía `.gitignore`):

```bash
cd "C:\Users\Usuario\OneDrive\Desktop\FFE Corner Estudios"
git clone https://github.com/mrkrsl/web-search-mcp.git
cd web-search-mcp
npm install
npm run build
```

Tras esto se reinició Cursor y ambos servidores aparecieron activos en Settings → MCP.

---

## Comparativa: trabajar con y sin servidores MCP

| Aspecto | Sin MCP | Con MCP |
|---------|---------|---------|
| Compartir código | Copiar/pegar manualmente en el chat | El modelo lee los archivos directamente |
| Aplicar cambios | Copiar la respuesta y pegarla en el editor | El modelo edita el archivo in situ |
| Contexto del proyecto | Solo lo que pegues en el prompt | Acceso a toda la estructura de archivos |
| Buscar documentación | Abrir el navegador, buscar, volver al chat | El modelo busca desde el propio editor |
| Riesgo de errores | Alto (copiar mal, pegar en sitio equivocado) | Bajo (ediciones precisas con diff) |

---

## Conclusiones

- MCP reduce significativamente la fricción al trabajar con IA en proyectos reales.
- El servidor Filesystem es prácticamente imprescindible para cualquier proyecto de desarrollo con Cursor.
- Web Search MCP como segundo servidor aporta capacidad de búsqueda web sin coste, sin API key y sin romper el flujo de trabajo.
- La configuración es sencilla (un archivo JSON) y los servidores se instalan con npm/npx.

---

## Nota sobre GitHub Copilot

No se realizó la comparativa Copilot vs Cursor porque no se dispone de acceso a GitHub Education. El enunciado del bonus condiciona esta parte a tener dicho acceso.
