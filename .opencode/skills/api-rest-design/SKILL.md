---
name: api-rest-design
description: Usa esta skill al diseñar o revisar endpoints REST: recursos, verbos HTTP, status codes, versionado, paginación, filtros, errores consistentes y contratos OpenAPI.
---

# Diseño de APIs REST

Diseño de APIs REST consistentes, versionadas y autocontenidas para equipos que comparten el contrato.

## When to Use

- Vas a crear un endpoint nuevo o una colección de endpoints de un recurso
- Hay endpoints que reciben acciones como verbos (`POST /users/activate`) y hay que decidir
- Necesitas estandarizar errores, paginación o filtros entre endpoints
- Hay que publicar o documentar el contrato de la API (OpenAPI)
- Se plantea cambiar un campo o el comportamiento de un endpoint existente

## Workflow

1. **Identifica el recurso**: nombra el sustantivo en plural (`/users`, `/projects`). Si una acción no encaja en un recurso, suele ser un recurso propio o un endpoint de acción explícito.
2. **Mapea verbos a operaciones**: `GET` lee (sin efectos), `POST` crea o dispara una acción, `PUT` reemplaza, `PATCH` actualiza parcial, `DELETE` elimina. Respeta la semántica HTTP.
3. **Define status codes explícitos**: `200`/`201` (+ `Location`), `204`, `400` input inválido, `401` no autenticado, `403` autenticado sin permiso, `404`, `409` conflicto de estado, `422` validación de negocio, `429` rate limit, `500`.
4. **Normaliza errores**: un solo shape de error (`{ error: { code, message, details? } }`); `code` estable para que el cliente no tenga que parsear el `message`.
5. **Versiona el contrato**: versiona en la URL (`/api/v1/...`) si puede haber breaking changes entre despliegues; el campo deprecado se anuncia con header `Deprecation`.
6. **Paginación y filtros consistentes**: parámetros de query fijos (`page`/`pageSize` o `limit`/`offset`), respuesta con metadata (`{ items, total, page, pageSize }`). Filtros como query params tipados.
7. **Documenta con OpenAPI**: escribe o actualiza el contrato en paralelo al código; en el repo usa `glob` para localizar las specs existentes y `read` para seguir su estilo antes de `edit`.
8. **Protege el endpoint**: verifica autenticación y autorización por recurso en la ruta o el servicio antes de delegar; agrega cors/rate-limit si aplica.
9. **Prueba el contrato**: corre tests de las rutas (éxito + cada error documentado) y valida que respuestas y códigos coincidan con el spec.

## Checklist

- [ ] La URL es un sustantivo plural, no un verbo (`POST /users` y no `POST /createUser`)
- [ ] Los verbos usan la semántica HTTP correcta y devuelven el status code esperado
- [ ] Errores con shape único, código estable y `details` serializable
- [ ] Paginación, filtros y sorting documentados y consistentes entre endpoints
- [ ] Versionado decidido y visible (URL o header)
- [ ] OpenAPI actualizado y sincronizado con la implementación
- [ ] Autenticación y autorización por recurso en la ruta o el servicio
- [ ] `PATCH` acepta parciales; `PUT` es idempotente; `DELETE` idempotente (200/204/404)

## Common Pitfalls / Anti-patterns

- **Verbos en la URL**: `POST /users/activate` casi siempre es `PATCH /users/:id { "status": "active" }`.
- **Status codes mal usados**: `200` para todo (rompe monitoreo y clientes); `400` para cosas que son `404`/`403`/`409`.
- **Errores sin shape**: cada endpoint devolviendo `{ message }`, `{ error }`, `{ error_message }` distinto obliga a parsers ad-hoc en cada cliente.
- **Formatos inconsistentes**: fija ISO-8601 con zona horaria (UTC) e IDs opacos estables en toda la API.
- **Cambios breaking sin versionar**: renombrar un campo sin deprecación rompe clientes móviles en producción; versiona o haz *additive-first*.
- **`GET` con efectos**: un GET que muta estado rompe cachés y crawlers.
- **Paginación infinita**: sin `pageSize` máximo el cliente puede pedir 1M de filas.
- **Ignorar el header `Location`**: al crear (`201`), el cliente necesita saber dónde está el recurso.

## Ejemplos

### Diseño de endpoints

```http
GET    /api/v1/projects?status=active&page=1&pageSize=25   → 200 { items, total, page, pageSize }
POST   /api/v1/projects                                     → 201 + Location: /api/v1/projects/42
GET    /api/v1/projects/42                                  → 200
PATCH  /api/v1/projects/42                                  → 200
DELETE /api/v1/projects/42                                  → 204
```

### Error consistente

```json
{
  "error": {
    "code": "validation_failed",
    "message": "El campo 'email' no es un correo válido",
    "details": [{ "field": "email", "issue": "invalid_format" }]
  }
}
```

### Resumen de status codes

| Caso | Código |
|---|---|
| Recurso creado | `201` + `Location` |
| Input inválido | `400` |
| Sin autenticación | `401` |
| Sin permiso (autenticado) | `403` |
| Recurso inexistente | `404` |
| Conflicto de estado (ej: duplicado) | `409` |
| Validación de negocio | `422` |
| Deprecado | `410` |