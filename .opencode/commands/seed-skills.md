---
description: Copia las skills de este repo a tu proyecto (.opencode/skills) o a tu config global (~/.config/opencode/skills). Uso: /seed-skills [global|project] [filtro de skill]
---

# Seed Skills

Copia las skills de este repo (`.opencode/skills/`) a tu proyecto o a la configuración global de opencode.

## Uso

```
/seed-skills              # Copia todas las skills al proyecto actual (.opencode/skills/)
/seed-skills global       # Copia todas las skills a ~/.config/opencode/skills/
/seed-skills project docker kubernetes   # Solo las skills que coincidan con el filtro
/seed-skills all          # Alias de project
```

## Proceso

1. Determina el destino:
   - `global` → `~/.config/opencode/skills/`
   - `project` (por defecto) → `.opencode/skills/` del proyecto actual
2. Lista las skills disponibles en este repo (`glob` sobre `.opencode/skills/*/SKILL.md`).
3. Si hay filtro, selecciona solo las skills cuyo nombre contenga alguno de los términos ($ARGUMENTS restantes).
4. Copia cada skill (carpeta completa: `SKILL.md` + scripts/recursos si existen) al destino.
5. No sobrescribas si la skill de destino es más reciente que la del repo — pregunta antes de pisar.
6. Muestra un resumen: skills copiadas, saltadas (por conflicto) y propias del destino que no existen en el repo.

## Nota

Las skills nuevas (16) y las de superpowers (15) son las más demandadas para entornos versátiles:
`docker-containers`, `kubernetes`, `ci-cd-pipelines`, `infrastructure-as-code`, `production-debugging`,
`sql-optimization`, `database-migrations`, `python-best-practices`, `go-development`, `rust-development`,
`web-performance`, `accessibility-audit`, `react-native-development`, `api-rest-design`, `oauth-authentication`, `webhook-integrations`.