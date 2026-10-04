---
name: database-migrations
description: Usa esta skill al crear, editar o aplicar migraciones de esquema en bases compartidas. Cubre migraciones backward-compatible, expand-and-contract, backfills, rollback y esquema en equipos.
---

# Migraciones de Base de Datos

Cómo evolucionar el esquema de una base de datos compartida sin romper a los usuarios ni a los despliegues en curso.

## When to Use

- Vas a agregar, renombrar o eliminar una columna, tabla o índice
- Necesitas transformar datos existentes (backfill) al agregar una columna
- Estás a punto de editar una migración que ya se aplicó en otro entorno
- El equipo corre migraciones automáticas en el deploy
- Hay una versión anterior del código aún en producción (despliegue en curso)

## Workflow

1. **Lee el estado actual**: revisa el schema vigente (`read` los archivos de esquema/entidades) y el historial de migraciones en el repo; no arranques sin saber qué está aplicado.
2. **Elige la estrategia**: define si el cambio es *aditivo* (nueva columna/tabla — seguro) o *breaking* (renombrar, cambiar tipo, eliminar). Para breaking usa **expand-and-contract**.
3. **Escribe la migración**: cada migración es forward-only; genera una por cambio de schema (en Drizzle: `bun db:generate`; en otros stacks, SQL versionado con timestamp).
4. **Separa los backfills**: si la columna nueva debe poblarse, escribe el backfill como paso aparte e idempotente dentro de la misma migración o como script propio, nunca mezclado en el mismo `CREATE`/`ALTER` (y siempre por lotes en tablas grandes).
5. **Revisa backward-compat**: confirma que el código viejo sigue funcionando contra el schema nuevo: la app nueva escribe la columna, la vieja la ignora; los reads no la exigen.
6. **Prueba el ciclo completo**: aplica la migración en una base limpia (`bun db:migrate` o equivalente) y en una base con datos reales parecidos, verificando el backfill.
7. **Rollback solo en dev**: si algo falla antes del merge, revierte localmente; una vez aplicada en producción nunca se edita ni borra: se corrige con una migración nueva.
8. **Completa el contrato**: deja el esquema, la migración y el código consumidor en el mismo PR; verifica con el check del proyecto (`bash` + linter/build) y el runner de tests.

## Checklist

- [ ] La migración es aditiva o sigue expand-and-contract (nada breaking en un solo paso)
- [ ] No edité ni borré migraciones ya aplicadas en otro entorno
- [ ] El backfill es idempotente y está separado del cambio de schema
- [ ] El código viejo convive con el schema nuevo (read/write compatibles)
- [ ] Probé en base limpia y en una con datos reales
- [ ] El rollback queda documentado para dev, no para producción

## Common Pitfalls / Anti-patterns

- **Editar una migración aplicada**: en producción rompe el checksum/estado registrado; se corrige con una migración nueva.
- **Renombrar en un paso**: `ALTER TABLE ... RENAME` rompe el deploy en curso (la app vieja aún lee el nombre anterior). Haz 3 fases: columna nueva → backfill + dual-write → drop de la vieja.
- **Backfill dentro del ALTER**: un `ADD COLUMN NOT NULL DEFAULT` con población en la misma sentencia puede bloquear tablas grandes (PostgreSQL ≤ 11); usa `ADD COLUMN` nullable, backfill por lotes y luego `SET NOT NULL`.
- **`NOT NULL` sin DEFAULT ni backfill**: la inserción falla con la app que aún no escribe el campo.
- **Migraciones no deterministas**: generar valores con `random()` o `now()` en la migración da resultados distintos por entorno.
- **Depender del orden implícito**: nombra los archivos con versión/timestamp y aplica en orden; nunca asumas que "corre solo al crear la tabla".
- **Olvidar índices de FK**: al crear una tabla con claves foráneas, indexa las columnas de FK si se van a filtrar por ellas.

## Ejemplos

### Expand-and-contract en 3 fases

```sql
-- Fase 1 (aditiva): crear columna nueva nullable
ALTER TABLE users ADD COLUMN display_name text;

-- Fase 2 (backfill): poblar desde la columna vieja, por lotes
UPDATE users SET display_name = username WHERE display_name IS NULL;

-- Fase 3 (limpieza, semanas después): retirar la vieja
ALTER TABLE users DROP COLUMN username;
```

### Backfill idempotente: puede correr N veces sin duplicar

```sql
UPDATE users SET team_id = CASE
  WHEN email LIKE '%@fundacion.org' THEN (SELECT id FROM teams WHERE slug = 'staff')
  ELSE NULL
END
WHERE team_id IS NULL;
```