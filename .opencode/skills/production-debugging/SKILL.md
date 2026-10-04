---
name: production-debugging
description: Usar cuando la tarea involucra depurar un incidente o anomalía en producción sin romperla: leer logs estructurados y traces, replicar el fallo en staging, priorizar rollback antes que parches a ciegas, usar feature flags, y evitar mutar el entorno productivo.
---

# Debug en Producción

## When to Use

Activa esta skill cuando se investigue un problema en producción: errores de usuarios, picos
de latencia, fallos intermitentes o sospechas de regresión tras un deploy. También cuando
haya que decidir entre corregir en caliente o hacer rollback, cuando se quiera añadir
observabilidad (logs estructurados, traces, APM), o cuando un fallo solo ocurra en el
entorno real y no en local/staging.

## Workflow

1. **Contener antes de diagnosticar.** Si el incidente afecta a usuarios, lo primero es
   reducir el impacto: rollback del último deploy sospechoso, apagar la feature por flag o
   limitar tráfico. Un incidente no se arregla con prisas en caliente; se contiene y luego
   se diagnostica con calma.
2. **Recopilar evidencia, no hipótesis.** Localiza logs estructurados y métricas del
   servicio: `grep` en archivos de log locales y la plataforma de observabilidad (APM,
   tracing distribuido). Apunta `timestamp`, `trace_id`/`request_id`, `status_code` y
   mensaje de error. Sin evidencia reproducible no hay fix.
3. **Reconstruir la petición fallida.** Con el `trace_id` sigue la cadena completa: gateway →
   servicio → base de datos → dependencias externas. Identifica dónde se corta: timeout,
   error de conexión, error de negocio.
4. **Replicar en staging, no en prod.** Reproduce el fallo en staging con la misma versión,
   variables y datos de prueba. Si depende de datos de prod, usa un dump anonimizado o un
   script de seed: nunca manipules la base productiva.
5. **Aislar la causa raíz.** Reduce el espacio: ¿cambió la versión desplegada? ¿Una
   configuración, un secreto rotado, un dato esquemático? Compara el último deploy bueno vs
   el malo (`git log`, diff de config) y divide entre infraestructura, código y datos.
6. **Arreglar con seguridad.** Escribe el fix en el código, cúbrelo con tests que reproduzcan
   el fallo (`read`/`edit` sobre los archivos afectados y el test que falla antes de
   arreglar), y despliega por el canal normal con observabilidad encendida. No edites
   archivos ni comandos directamente en el servidor de producción.
7. **Validar impacto y dejar trazabilidad.** Tras el deploy, confirma con métricas/logs que
   el error desapareció y no hay regresiones. Documenta el incidente: causa raíz, timeline,
   fix y las guardas que impiden la repetición (alerta, test, contrato).

## Checklist

- [ ] Impacto contenido antes de diagnosticar (rollback o feature flag si hace falta)
- [ ] Evidencia recopilada: logs estructurados, trace_id, métricas del periodo del fallo
- [ ] Fallo replicado en staging con datos de prueba, sin tocar datos productivos
- [ ] Causa raíz aislada (deploy / config / datos / infra) con diff entre versiones
- [ ] Fix con test que reproduce el fallo; desplegado por el canal normal
- [ ] Producción no mutada: sin comandos manuales ni ediciones directas en el entorno real
- [ ] Observabilidad verificada (logs/traces confirman la mejora)
- [ ] Incidente documentado con causa raíz, timeline y guardas preventivas

## Common Pitfalls / Anti-patterns

- **Parchar en caliente sin contener**: editar config o código directamente en el nodo
  productivo. El cambio muere con el próximo deploy y nadie lo documenta. Contener, arreglar
  en el repo y desplegar.
- **Diagnosticar sin datos**: mirar el código a ojo ignorando logs y métricas. Un fallo de
  datos o de config puede pasar desapercibido ante código "correcto"; la evidencia decide.
- **Mutar la base de producción para "probar"**: consultas o updates manuales durante el
  incidente agravan el daño y contaminan datos. Todo se ensaya en staging.
- **Olvidar el rollback como primer recurso**: un fix improbable de última hora es peor que
  volver a la versión conocida y debuggear después. Rollback primero si el deploy es el
  sospechoso.
- **Desplegar sin guardas**: si la causa raíz no está confirmada y no hay alertas ni tests
  que cubran el caso, el mismo fallo volverá. Cierra siempre con prevención.
- **Logs sin contexto**: mensajes sueltos sin `trace_id` ni `request_id` hacen imposible
  correlacionar. Logs estructurados con contexto en cada línea.
- **Sobreactuar al síntoma**: el error visible puede ser un efecto colateral (cache, CDN,
  dependencia), no la causa. Sigue la petición completa antes de tocar lo que salta a la
  vista.