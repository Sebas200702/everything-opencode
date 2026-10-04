---
name: docker-containers
description: Usar cuando la tarea involucra crear o editar Dockerfiles, optimizar imágenes, redactar .dockerignore, construir y ejecutar containers, orquestar servicios con compose, o depurar fallos de build/arranque de containers.
---

# Docker & Containers

## When to Use

Activa esta skill cuando el trabajo toque imágenes Docker: escribir o refactorizar un
Dockerfile (multi-stage, capas, cache), reducir tamaño de imagen, configurar `.dockerignore`,
levantar el stack local con compose, resolver `docker build` o `docker run` que fallan, o
investigar por qué un container no arranca o no responde. También cuando haya que revisar
seguridad de imágenes (usuario no root, imágenes base mínimas, escaneo de vulnerabilidades).

## Workflow

1. **Leer el estado actual.** Con `read` abre el Dockerfile y archivos relacionados
   (`.dockerignore`, `compose.yaml`, scripts de entrypoint). Usa `grep` en el repo para
   localizar referencias a imágenes, puertos y variables de entorno.
2. **Escoger la imagen base correcta.** Prefiere variantes slim/alpine/distroless según el
   runtime (p. ej. Node, Python, Go). Evita `:latest` en producción: fija un tag o digest.
3. **Aplicar multi-stage.** Separa build y runtime: la etapa de build instala deps y compila;
   la etapa final copia solo lo necesario (`COPY --from=build ...`). Esto reduce el tamaño
   final y elimina herramientas de build del artefacto desplegado.
4. **Ordenar capas por frecuencia de cambio.** Copia primero manifests de dependencias
   (lockfiles, requirements), instala, y SOLO después copia el código fuente. Así el cache de
   capas sobrevive entre builds mientras no cambien las deps.
5. **Redactar `.dockerignore`.** Excluye `node_modules`, `.git`, carpetas de build/test y
   archivos `.env*`. Un `.dockerignore` ausente infla el contexto y puede filtrar secretos.
6. **Ejecutar y verificar.** Construye con `docker build`, arranca con `docker compose up` y
   valida con `docker compose logs -f` / `docker compose exec <servicio> sh` que responde.
7. **Depurar en orden.** Si un container no arranca: primero logs, luego inspección en vivo,
   después entrypoint, permisos y variables de entorno. Para un build que falla, mira la línea
   del error y qué capa cambió respecto al último éxito.
8. **Endurecer la imagen.** Añade `USER <no-root>`, ejecuta el proceso como PID 1 sin shells
   innecesarios, y documenta el escaneo de vulnerabilidades (scanner del registry o `trivy`).
9. **Verificar sin romper nada.** Antes de cambiar el Dockerfile, confirma el contrato:
   puertos expuestos, variables requeridas y directorio de trabajo se mantienen o se
   actualizan a la vez en compose y documentación.

## Checklist

- [ ] Imagen base fijada (tag o digest concreto, nunca `:latest` en prod)
- [ ] Dockerfile multi-stage: build separado del runtime
- [ ] Capas ordenadas: deps primero, código al final (cache efectivo)
- [ ] `.dockerignore` presente y excluye secretos, `node_modules` y `.git`
- [ ] No hay secretos quemados (env por secret/.env, nunca literales)
- [ ] Proceso corre con usuario no root
- [ ] Puertos y envs consistentes entre Dockerfile, compose y documentación
- [ ] `docker compose up` arranca y el healthcheck responde
- [ ] Tamaño de imagen razonable (verificado con `docker images` / inspect)

## Common Pitfalls / Anti-patterns

- **Imagen gigante por una sola etapa**: toolchains de build coladas en producción.
  Multi-stage lo resuelve.
- **Cache invalidado en cada commit**: copiar el código antes de instalar deps fuerza
  reinstalación siempre. Ordena las capas.
- **`COPY . .` sin `.dockerignore`**: contexto de build lento y posibles secretos dentro
  de la imagen.
- **Tags movedizos (`:latest`)**: builds no reproducibles. Fija versiones y, donde importe,
  digests.
- **Root como usuario de runtime**: riesgo de escalada ante una vulnerabilidad. Añade `USER`.
- **Servidores de desarrollo en producción**: comandos tipo dev no son para desplegar; usa
  el arranque real de producción (binario compilado o servidor del framework) y deja los
  scripts de dev solo en entornos locales.
- **Entrypoints que silencian errores**: `sh -c` que enmascara fallos o pipes que ocultan
  exit codes. Deja propagar el código de salida real del proceso.
- **Editar el Dockerfile sin tocar compose**: puertos, envs o volúmenes desincronizados
  rompen el arranque del stack. Cambia ambos juntos.