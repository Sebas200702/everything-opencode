---
name: ci-cd-pipelines
description: Usar cuando la tarea involucra diseñar, editar o depurar pipelines de CI/CD (multi-stage, cache, artefactos, secretos, estrategias de deploy) de forma agnóstica a proveedor — GitHub Actions y GitLab CI mencionados explícitamente.
---

# Pipelines CI/CD

## When to Use

Activa esta skill cuando el trabajo toque automatización de integración y despliegue: crear
o refactorar pipelines, dividir stages de build/test/deploy, configurar caching, persistir
artefactos entre jobs, inyectar secretos de forma segura, o elegir una estrategia de
deployment (rollout, canary, blue/green). Aplica a GitHub Actions (`.github/workflows/`) y a
GitLab CI (`.gitlab-ci.yml`); el diseño del pipeline es independiente del runner.

## Workflow

1. **Leer el pipeline actual y el repo.** Localiza los archivos de CI con `glob`
   (`glob "**/.github/workflows/*.yml"`, `glob "**/.gitlab-ci.yml"`), léelos con `read` y
   cruza con los scripts reales del proyecto. Un pipeline que invoca comandos inexistentes
   en el repo es humo.
2. **Definir el flujo en fases.** Separa stages reales: instalación de dependencias → lint →
   tests → build → deploy. Paraleliza test/lint/build y deja que cada stage falle con su
   causa identificable sin bloquear a los demás.
3. **Fijar versiones de herramientas.** Pinea runtimes y herramientas (Node, Python, etc.)
   en imágenes de runner o setup. Nunca la última versión implícita: builds irreproducibles
   de la noche a la mañana.
4. **Cachear dependencias.** Aprovecha el cache del proveedor con el lockfile como clave
   (`hashFiles('**/lockfile')` en Actions, `cache:key` en GitLab). Cache correcta = CI mucho
   más rápido.
5. **Pasar artefactos entre stages.** El artefacto de build (binario, bundle, imágenes) se
   sube en un job y se descarga en deploy. Nunca reconstruyas en el stage de deploy:
   compila una vez, despliega muchas.
6. **Gestionar secretos.** Guarda credenciales en el almacén secreto del proveedor, máscara
   en los logs y pásalas solo donde se necesitan. Prohibido literales en el YAML o variables
   versionadas con credenciales.
7. **Elegir estrategia de deploy según el servicio.** Rollout (reemplazo incremental,
   predeterminada) para stateless; blue/green cuando el rollback debe ser instantáneo por
   routing; canary para liberar porcentaje de tráfico con métricas. El pipeline dispara el
   mecanismo; la plataforma aplica la estrategia.
8. **Proteger ramas y entornos.** Gatilla por rama (prod para `main`, preview para PRs) con
   reglas de protección y aprobación humana en entornos productivos cuando el proyecto lo
   requiera.
9. **Verificar sin romper nada.** Antes de tocar un pipeline activo, valida los comandos
   localmente o en un branch de prueba y documenta el cambio de comportamiento en el mismo
   PR que toca el pipeline.

## Checklist

- [ ] Stages separados: install → quality → test → build → deploy
- [ ] Versiones de runtimes y herramientas pinneadas
- [ ] Cache de dependencias con clave basada en lockfile
- [ ] Artefactos subidos una sola vez y reutilizados en deploy
- [ ] Secretos referenciados desde el almacén del proveedor, nunca literales
- [ ] Tests y validaciones ejecutadas antes del deploy
- [ ] Estrategia de deploy explícita (rollout/canary/blue-green) según el servicio
- [ ] Entornos de prod protegidos (aprobación o reglas de rama si aplica)
- [ ] Pipeline corre completo sobre cambios reales (no solo comentarios)

## Common Pitfalls / Anti-patterns

- **Un solo job monolítico**: fallar en deploy oculta el fallo del test de hace 20 minutos.
  Fases separadas con logs acotados.
- **Sin cache**: cada push reinstala todo; en monorepos grandes el CI se vuelve insoportable.
  Habilita cache basada en lockfile.
- **Secretos en logs o variables**: una credencial en el argumento de un comando se expone en
  el historial del job. Menor privilegio y máscara siempre.
- **Reconstruir en deploy**: binarios distintos según el stage = artefacto no probado.
  Compila una vez y despliega ese artefacto.
- **Estrategia elegida por moda**: canary sin métricas ni rollback automático es más riesgo
  que rollout clásico. La estrategia la dicta el servicio, no la tendencia.
- **Gatillos sin contexto**: correr toda la matriz de tests en cada push suele ser
  desperdicio; filtra por rutas afectadas cuando el pipeline lo soporta.
- **Copiar fragmentos ajenos sin adaptar rutas**: scripts de ejemplo o rutas hardcodeadas
  que no existen en el repo. Valida cada comando contra el árbol de archivos.