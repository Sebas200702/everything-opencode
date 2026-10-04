# Contributing to Everything OpenCode

Gracias por querer contribuir. El repo es un recurso comunitario para usuarios de **OpenCode** (adaptado de Everything Claude Code).

## Qué buscamos

### Agents
Nuevos subagentes en `.opencode/agents/`:
- Revisores por lenguaje (Python, Go, Rust)
- Expertos de frameworks (Django, Rails, Laravel, Spring)
- Especialistas DevOps (Kubernetes, Terraform, CI/CD)
- Expertos de dominio (ML pipelines, data engineering, mobile)

### Skills
Definiciones de workflow y conocimiento de dominio en `.opencode/skills/<name>/SKILL.md`:
- Buenas prácticas por lenguaje
- Patrones de frameworks
- Estrategias de testing
- Guías de arquitectura
- Conocimiento de dominio específico

### Commands
Commands slash en `.opencode/commands/`:
- Deployment, testing, documentación, generación de código

### Plugin / Hooks
Automatizaciones útiles en `.opencode/plugins/`:
- Hooks de linting/formateo
- Chequeos de seguridad
- Hook de validación
- Hooks de notificación

### Reglas
Pautas siempre-presentes (editar `AGENTS.md`):
- Seguridad, estilo de código, testing, convenciones de naming

### MCP
Configuraciones MCP nuevas o mejoradas en `opencode.json` (`mcp`):
- Integraciones de base de datos, cloud providers, monitoreo, comunicación

---

## Cómo contribuir

### 1. Fork y clone

```bash
git clone https://github.com/YOUR_USERNAME/everything-claude-code.git
cd everything-claude-code
```

### 2. Crea una rama

```bash
git checkout -b add-python-reviewer
```

### 3. Añade tu contribución en el directorio correcto

- `.opencode/agents/` — subagentes
- `.opencode/skills/<name>/SKILL.md` — skills (carpeta por skill, nombre = `name` del frontmatter)
- `.opencode/commands/` — commands slash
- `AGENTS.md` — reglas
- `.opencode/plugins/` — hooks/plugin
- `opencode.json` (`mcp`) — servidores MCP

### 4. Sigue el formato

**Agent** (el nombre del archivo define el id; `name` NO va en el frontmatter):

```markdown
---
description: Qué hace y cuándo usarlo
mode: subagent
permission:
  read: allow
  edit: deny
  bash: deny
---

Instrucciones aquí...
```

**Skill** (frontmatter obligatorio para que la detecte opencode):

```markdown
---
name: python-reviewer
description: Cuándo usar esta skill
---

# Skill Name

## When to Use

...

## Workflow

...

## Checklist

- [ ] ...

## Common Pitfalls / Anti-patterns

...
```

Reglas de `name`: minúsculas con guiones (`^[a-z0-9]+(-[a-z0-9]+)*$`), debe coincidir con la carpeta.

**Command**:

```markdown
---
description: Descripción breve
agent: python-reviewer   # opcional: invoca subagente
subtask: true            # opcional: fuerza invocación de subagente
---

Instrucciones detalladas...
```

### 5. Testea tu contribución

```bash
node tests/run-all.js
```

Si tocas el plugin de hooks, verifica que `.opencode/plugins/everything.js` siga cargando:
`node --input-type=module -e "import('./.opencode/plugins/everything.js')"`.

### 6. Envía un PR

```bash
git add .
git commit -m "feat: add Python code reviewer agent"
git push origin add-python-reviewer
```

---

## Pautas

### Do
- Configs enfocados y modulares
- Descripciones claras
- Testear antes de enviar
- Seguir los patrones existentes
- Documentar dependencias

### Don't
- Datos sensibles (API keys, tokens, paths)
- Configs demasiado complejas o de nicho
- Configs sin testear
- Duplicar funcionalidad existente
- Configs que dependan de servicios pagos sin alternativa

---

## Naming

- Minúsculas con guiones: `python-reviewer.md`
- Descriptivo: `tdd-workflow.md`, no `workflow.md`
- El nombre de la skill/agente coincide con el nombre de archivo/carpeta

---

## Dudas

Abre un issue en GitHub o pregunta en el repo original en X: [@affaanmustafa](https://x.com/affaanmustafa)

---

Gracias por contribuir. Construyamos un gran recurso.