---
name: sql-optimization
description: Usa esta skill cuando una query o endpoint es lento, necesitas crear índices, depurar N+1, analizar EXPLAIN plans, paginar consultas o eliminar SELECT *. Cubre análisis de queries lentas en PostgreSQL y SQL.
---

# Optimización SQL

Guía para diagnosticar y optimizar consultas lentas en bases de datos relacionales (PostgreSQL, MySQL, SQLite).

## When to Use

- Un endpoint o reporte tarda más de lo esperado y hace queries de base de datos
- Hay un patrón N+1 (una query por fila dentro de un bucle)
- Necesitas decidir si crear un índice y cuál
- Quieres verificar que `JOIN` y la paginación sean eficientes
- Un `EXPLAIN` muestra un `Seq Scan` sobre una tabla grande

## Workflow

1. **Reproduce la lentitud**: ejecuta la query problemática directamente contra la base de datos, mide el tiempo real y anota el plan.
2. **Ubica el código fuente**: usa `grep` para encontrar dónde se ejecuta la query (nombre de la tabla, fragmento del WHERE o el texto del SQL) y `read` el archivo completo para entender la intención.
3. **Genera y analiza el EXPLAIN**: antepone `EXPLAIN (ANALYZE, BUFFERS)` a la query y lee el plan de arriba abajo:
   - `Seq Scan` sobre una tabla grande con filtro → falta índice
   - `Nested Loop` con muchas ejecuciones → se escanean demasiadas filas por iteración
   - `rows=` del plan muy distinto de `(actual=)` → estadísticas desactualizadas (corre `ANALYZE`)
4. **Revisa el patrón de acceso**: si la query se ejecuta en un bucle (`for` sobre filas llamando al repo por cada una), es N+1: replanifica para traer todo en una sola query con `JOIN`/`IN`.
5. **Aplica la corrección**: crea el índice, reescribe la query o cambia la paginación; vuelve a medir con `EXPLAIN` hasta que el plan cambie (índice usado, filas escaneadas ≈ filas devueltas).
6. **Verifica sin regresiones**: corre la query equivalente en el entorno de pruebas, revisa el tiempo y ejecuta el suite del proyecto (`bash` con el runner de tests o lint/check).
7. **Cierra con evidencia**: deja documentado el antes/después (tiempo y plan) y el índice creado vía migración, no a mano.

## Checklist

- [ ] Ejecuté `EXPLAIN (ANALYZE, BUFFERS)` y leí el plan completo, no solo el primer nodo
- [ ] No hay `Seq Scan` sobre tablas grandes con filtros filtrables
- [ ] No hay N+1: cada colección se resuelve con una o pocas queries
- [ ] Evité `SELECT *`: solo columnas que el código realmente consume
- [ ] La paginación usa `LIMIT/OFFSET` con orden estable o *keyset* si la tabla crece mucho
- [ ] Los índices cubren el `WHERE`/`JOIN`/`ORDER BY` reales (creados vía migración)
- [ ] Volví a medir y comparé el tiempo antes/después con evidencia

## Common Pitfalls / Anti-patterns

- **Optimizar sin medir**: sin `EXPLAIN` y medición previa, cada "optimización" es adivinar.
- **Índice de más**: cada índice ralentiza `INSERT`/`UPDATE`; no indexes columnas de baja cardinalidad (booleans, `status` con 2 valores).
- **N+1 silencioso**: un `Promise.all` con queries individuales es tan N+1 como un `for`; localízalo con `grep` buscando llamadas al repo dentro de loops.
- **`SELECT *` como comodín**: trae columnas que nadie usa, rompe índices covering y propaga acoplamiento del schema.
- **`OFFSET` gigante**: paginar la página 10.000 escanea 10.000 filas; usa *keyset pagination* (`WHERE id > $last ORDER BY id LIMIT n`).
- **Agregados en la app**: contar o agrupar filas en código en vez de `COUNT`/`GROUP BY` en SQL.
- **Indexar funciones mal**: `WHERE lower(email) = ?` no usa un índice normal; crea un índice funcional `ON users (lower(email))`.

## Ejemplos

### Crear el índice correcto

```sql
-- Antes: Seq Scan en users (1M filas)
EXPLAIN SELECT * FROM users WHERE org_id = 42 AND active = true;

-- Después: índice compuesto
CREATE INDEX idx_users_org_active ON users (org_id, active) WHERE active;
```

### N+1 → una sola query

```ts
// ❌ una query por usuario, dentro del bucle
for (const user of users) {
  const posts = await repo.findPostsByUser(user.id) // 1 query cada uno
}

// ✅ una sola query total
const rows = await repo.findPostsForUsers(userIds) // WHERE user_id = ANY($1)
```

### Keyset vs offset

```sql
-- ❌ a partir del offset 50.000
SELECT * FROM events ORDER BY id LIMIT 50 OFFSET 50000;

-- ✅ keyset: solo filas posteriores a la última vista
SELECT * FROM events WHERE id > 50050 ORDER BY id LIMIT 50;
```