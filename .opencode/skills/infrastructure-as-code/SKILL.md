---
name: infrastructure-as-code
description: Usar cuando la tarea involucra infraestructura definida como código: módulos de Terraform/OpenTofu, gestión de state, flujo plan/apply, detección de drift, múltiples entornos, o cuando aparezca Pulumi (mencionado brevemente).
---

# Infrastructure as Code (Terraform / OpenTofu / Pulumi)

## When to Use

Activa esta skill cuando el trabajo implique infraestructura declarativa: escribir o revisar
módulos de Terraform/OpenTofu, organizar `state` y `backend`, ejecutar el ciclo plan/apply de
forma segura, investigar `drift` entre el estado y la realidad de la nube, configurar
múltiples entornos (dev/staging/prod), o leer o migrar código de Pulumi. Aplica a cualquier
proveedor (AWS, GCP, Azure, Vercel, Supabase, etc.).

## Workflow

1. **Entender el estado actual.** Localiza los archivos de IaC con `glob` (`glob "**/*.tf"`,
   `glob "**/*.ts"` para Pulumi) y `read` los módulos y el backend configurado. Determina
   dónde vive el state: local o remoto (S3, GCS, Azurerm, Terraform Cloud). Nunca actúes sin
   saber si es remoto y compartido.
2. **Leer antes de tocar.** Antes de editar recursos existentes, identifica qué recurso
   cambia y su definición actual. Consulta `terraform state list` o `pulumi stack export`
   para emparejar recursos con la configuración.
3. **Estructurar por módulos y entornos.** Separa recursos por responsabilidad (red, cómputo,
   datos) en módulos reutilizables con variables y outputs tipados. Usa un workspace o
   carpeta por entorno y evita duplicar bloques enteros.
4. **Modelar el state de forma segura.** State remoto con locking para equipos y versionado
   del bucket habilitado. Nunca guardes el state local en git: contiene secretos. En Pulumi
   el state también vive en el backend elegido con la misma disciplina.
5. **Ejecutar plan antes de apply.** Siempre `plan` primero y revisa la salida línea a línea:
   destrucciones, referencias que cambian, valores sensibles. Un plan que destruye datos es
   la señal de parada.
6. **Aplicar con alcance mínimo.** Aplica por workspace/stack completo (usa `-target` solo
   en emergencias) y verifica después con `terraform show` o `state list`.
7. **Detectar y remediar drift.** Compara el estado con la realidad del proveedor (`plan`
   muestra el diff; `pulumi preview`/`refresh` igual). Si un recurso se modificó fuera del
   código, decide: reimportar el recurso o absorber el cambio en el código. Nunca corrijas
   a mano en la consola por encima del código.
8. **Documentar y verificar.** Documenta en el repo el backend, los entornos y cómo ejecutar
   plan/apply. Si tocas código de Pulumi, respeta su modelo de stacks y su flujo
   preview/up; no lo conviertas a Terraform en la misma tarea salvo que se pida.

## Checklist

- [ ] State identificado: remoto con locking y versionado si hay equipo
- [ ] Módulos reutilizables con variables validadas y outputs explícitos
- [ ] Un workspace/carpeta por entorno, sin copiar/pegar bloques entre entornos
- [ ] `plan` ejecutado y revisado línea por línea antes de aplicar
- [ ] Sin destrucciones no deseadas en el plan (datos, recursos críticos)
- [ ] Apply limitado al entorno/módulo objetivo, con verificación posterior
- [ ] Drift detectado y resuelto en el código (reimportar o absorber), sin bypass manual
- [ ] Secretos fuera del state local y fuera del repo
- [ ] Documentación de backend y entornos actualizada en el repo

## Common Pitfalls / Anti-patterns

- **State local en un solo dev**: dos personas aplicando se pisan el estado y generan
  recursos huérfanos. Remoto con locking desde el día uno, incluso en side projects.
- **Secretos en el state**: contraseñas y claves quedan en texto plano en el state file y
  en sus backups. Refiere a gestores de secretos en lugar de incrustarlos.
- **Aplicar sin revisar el plan**: caro y destructivo. El plan es el contrato; leer cada
  línea es parte del flujo.
- **Drift apagado a golpe de consola**: alterar la nube por fuera del código rompe el modelo
  declarativo y el siguiente `apply` reescribe o destruye. Toda corrección pasa por el código.
- **Enviar state o claves a git**: el historial es para siempre. Añade el state y los
  archivos de credenciales a los ignores del VCS.
- **Módulos acoplados a un solo entorno**: variables hardcodeadas que impiden reutilizar para
  staging. Parametriza todo lo que difiere entre entornos.
- **Pulumi tratado como Terraform**: comparten objetivo, pero stacks, recursos y el flujo
  preview/up difieren. Respeta el modelo del proyecto antes de mezclar herramientas.