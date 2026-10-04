---
name: kubernetes
description: Usar cuando la tarea involucra definir o editar manifests de Kubernetes (deployments, services, ingress, configmaps, secrets, probes), aplicar recursos, ajustar límites de recursos, o depurar un cluster con kubectl.
---

# Kubernetes

## When to Use

Activa esta skill cuando el trabajo implique Kubernetes: escribir o revisar manifests YAML,
crear deployments/services/ingresses, inyectar configuración con ConfigMaps y Secrets,
configurar probes de liveness/readiness, definir requests/limits, o depurar pods en
CrashLoopBackOff, ImagePullBackOff o sin tráfico. También para operaciones de lectura o
inspección del cluster con `kubectl`.

## Workflow

1. **Contexto primero.** Antes de tocar YAML, determina el entorno objetivo:
   `kubectl config current-context` y `--namespace` correcto. Nunca apliques recursos al
   contexto equivocado (el de producción es solo lectura salvo instrucción explícita).
2. **Localizar manifests existentes.** Usa `glob` para encontrar los YAML del repo y `read`
   para entender convenciones. Revisa si hay Helm charts o kustomization antes de editar a mano.
3. **Definir el deployment.** Empieza por la imagen fijada y el arranque real del proceso.
   Incluye `replicas`, `strategy` (RollingUpdate) y labels consistentes: el `selector` debe
   coincidir con `template.metadata.labels`.
4. **Configurar configuración y secretos.** ConfigMaps para valores no sensibles, Secret para
   credenciales (referenciados por `envFrom` o montados como volumen). Valores sensibles
   jamás en el manifest ni en un ConfigMap.
5. **Añadir probes.** `readinessProbe` controla el tráfico y `livenessProbe` decide reinicios.
   Usa `httpGet` con la ruta de health del servicio o `exec` con comandos genéricos. Ajusta
   `initialDelaySeconds` para evitar falsos negativos al arrancar.
6. **Fijar recursos.** Define `requests` (lo que garantiza el scheduler) y `limits` (tope
   duro) en cada contenedor. Sin límites, un pod acapara el nodo; sin requests, la calidad de
   servicio se degrada.
7. **Exponer el servicio.** Service ClusterIP para interno, NodePort/LoadBalancer para
   externo puntual, e Ingress para HTTP externo con host y TLS. Verifica que el selector del
   Service apunte a las labels reales del deployment.
8. **Aplicar con validación.** `kubectl apply --dry-run=client -f <archivo>` primero, luego
   apply y `kubectl rollout status deployment/<nombre>` para confirmar el rollout.
9. **Depurar en orden.** Pod en problema: `kubectl get pods` → `kubectl describe pod`
   → `kubectl logs <pod> --previous`. CrashLoopBackOff: logs del ciclo anterior.
   ImagePullBackOff: imagen/tag correctos, registry accesible y secret de pull correcto.
10. **Limpiar y documentar.** Deja los manifests versionados y confirma el estado con
    `kubectl get all -n <ns>`. No dejes recursos temporales sin anotación de autor.

## Checklist

- [ ] Contexto y namespace correctos para la operación
- [ ] Manifests con selector y labels consistentes entre deployment y service
- [ ] Probes (readiness/liveness) definidas con la ruta de health real
- [ ] `resources.requests` y `resources.limits` en cada contenedor
- [ ] Config fuera de la imagen: ConfigMap/Secret; secretos nunca en YAML
- [ ] Aplicado con `--dry-run=client` y `rollout status` OK
- [ ] Logs inspeccionados cuando hubo errores de arranque
- [ ] Ingress con host/TLS o Service con el tipo que corresponde al tráfico
- [ ] No se mutó el cluster más allá de lo que pide la tarea

## Common Pitfalls / Anti-patterns

- **Aplicar al contexto equivocado**: cambio irreversible en un entorno que no era.
  Verifica contexto y namespace antes de cualquier `apply`.
- **`selector` que no casa con las labels del template**: pods huérfanos, Service sin
  endpoints, rollout que nunca termina.
- **Probes mal calibradas**: readiness exigente deja el pod sin tráfico; liveness agresiva
  provoca reinicios en bucle.
- **Secretos en manifests versionados**: quedan en el historial de git para siempre. Inyecta
  desde Secret o gestor externo.
- **Sin requests/limits**: un pod voraz degrada a los vecinos del nodo y los OOMKill caen
  donde no se esperaba.
- **Imagen `:latest` o tag ausente**: rollouts irreproducibles y cache de nodo engañoso.
  Usa commit sha o tag fijo.
- **Mutación manual sin reflejarla en el manifest**: cambios hechos con `kubectl edit` o
  exec se pierden en el próximo apply y desincronizan. Todo cambio debe pasar por el YAML.
- **Desincronizar Service e Ingress**: rutas y puertos que se actualizan en uno y no en
  otro rompen el tráfico con 502/404.