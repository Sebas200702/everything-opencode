# Everything OpenCode

**La colección completa de configs de Claude Code, adaptada y mejorada para [OpenCode](https://opencode.ai).**

Fork de [WorldFlowAI/everything-claude-code](https://github.com/WorldFlowAI/everything-claude-code) convertido a formato nativo de **opencode V1** — agents, commands, skills, plugin de hooks y servidores MCP listos para usar en entornos de desarrollo versátiles.

---

## Qué es esto

El repo original (del ganador de un hackathon de Anthropic) contiene configs probadas en producción durante 10+ meses. Esta adaptación:

| Cambio | Detalle |
|---|---|
| **Agents** | `agents/*.md` (formato Claude) → `.opencode/agents/*.md` con `mode: subagent` + `permission`, listos para la tool `task` / `@mencion` |
| **Commands** | `commands/*.md` → `.opencode/commands/*.md`. Los que invocaban agentes ahora declaran `agent:` + `subtask: true` |
| **Skills** | `skills/` → `.opencode/skills/<name>/SKILL.md` (detección nativa del `skill` tool) — **+15 skills de [Superpowers](https://github.com/obra/superpowers) + 16 nuevas** |
| **Hooks** | `hooks/hooks.json` (Claude) → `.opencode/plugins/everything.js` (plugin con `tool.execute.before/after`, `event`, `experimental.session.compacting`) |
| **Rules** | `rules/*.md` → `AGENTS.md` consolidado en la raíz |
| **MCP** | `mcp-configs/mcp-servers.json` → `opencode.json` (sección `mcp`, formato opencode) |
| **Original** | El formato Claude Code original vive intacto en `docs/claude-code/` como histórico |

---

## Instalación

### Opción 1: Clonar y usar como proyecto de config

```bash
git clone https://github.com/Sebas200702/everything-claude-code.git
cd everything-claude-code
code .   # o abre la carpeta en tu editor; opencode detecta .opencode/ automáticamente
```

### Opción 2: Copiar a tu proyecto

```bash
# Agents, commands y skills
cp -r .opencode/agents/*    /tu/proyecto/.opencode/agents/
cp -r .opencode/commands/*  /tu/proyecto/.opencode/commands/
cp -r .opencode/skills/*    /tu/proyecto/.opencode/skills/

# Plugin de hooks
cp -r .opencode/plugins/    /tu/proyecto/.opencode/plugins/
cp -r scripts/              /tu/proyecto/scripts/   # solo si quieres los hooks que llaman scripts

# Rules y MCP
cp AGENTS.md    /tu/proyecto/
# fusiona la sección "mcp" de opencode.json con tu opencode.json
```

> **Importante**: los hooks invocan scripts de `scripts/hooks/*.js` desde la raíz del repo. Si copias el plugin, copia también `scripts/`.

### Opción 3: Solo skills (lo más portable)

```bash
cp -r .opencode/skills/*  ~/.config/opencode/skills/
```

---

## Qué hay dentro

```
.
├── .opencode/
│   ├── agents/            # 9 subagentes especializados (mode: subagent)
│   ├── commands/          # 16 commands slash (/tdd, /plan, /code-review, ...)
│   ├── skills/            # 42 skills: 11 originales + 15 superpowers + 16 nuevas
│   └── plugins/           # everything.js — hooks convertidos a plugin opencode
├── opencode.json          # config opencode: MCPs, instructions, $schema
├── AGENTS.md              # rules consolidadas (estilo, git, orquestación, hooks)
├── scripts/               # utilidades cross-platform Node.js (hooks, package-manager)
├── tests/                 # suite de tests (node tests/run-all.js)
└── docs/claude-code/      # histórico íntegro del formato Claude Code original
```

## Agents

Subagentes en `.opencode/agents/` — invocables con la tool `task` o `@<nombre>`:

| Agente | Propósito | Permisos |
|---|---|---|
| `planner` | Planificación de implementación | read/grep/glob |
| `architect` | Diseño de sistemas | read-only |
| `tdd-guide` | TDD, tests primero, 80%+ cobertura | read/edit/bash/grep |
| `code-reviewer` | Revisión de calidad y seguridad | read-only (+bash para git diff) |
| `security-reviewer` | Vulnerabilidades, OWASP, secretos | read/edit/bash/grep/glob |
| `build-error-resolver` | Arreglar build/TS rápido | read/edit/bash/grep/glob |
| `e2e-runner` | E2E con Playwright | read/edit/bash/grep/glob |
| `refactor-cleaner` | Limpieza de código muerto | read/edit/bash/grep/glob |
| `doc-updater` | Documentación y codemaps | read/edit/bash/grep/glob |

## Commands

`/tdd` · `/plan` · `/e2e` · `/code-review` · `/build-fix` · `/refactor-clean` · `/update-docs` · `/update-codemaps` · `/verify` · `/checkpoint` · `/eval` · `/learn` · `/orchestrate` · `/test-coverage` · `/setup-pm` · `/seed-skills` *(los de agente usan `subtask: true`)*

## Skills (42)

**Originales (11):** `backend-patterns` · `frontend-patterns` · `coding-standards` · `tdd-workflow` · `security-review` · `verification-loop` · `eval-harness` · `strategic-compact` · `continuous-learning` · `project-guidelines-example` · `clickhouse-io`

**Superpowers (15):** `brainstorming` · `writing-plans` · `executing-plans` · `subagent-driven-development` · `test-driven-development` · `systematic-debugging` · `verification-before-completion` · `requesting-code-review` · `receiving-code-review` · `using-git-worktrees` · `finishing-a-development-branch` · `dispatching-parallel-agents` · `writing-skills` · `using-superpowers` · `diagnosing-superpowers`

**Nuevas (16) — para entornos de desarrollo versátiles:**

| Categoría | Skills |
|---|---|
| DevOps / Infra | `docker-containers` · `kubernetes` · `ci-cd-pipelines` · `infrastructure-as-code` · `production-debugging` |
| Databases | `sql-optimization` · `database-migrations` |
| Lenguajes | `python-best-practices` · `go-development` · `rust-development` |
| Frontend / Mobile | `web-performance` · `accessibility-audit` · `react-native-development` |
| API / Integraciones | `api-rest-design` · `oauth-authentication` · `webhook-integrations` |

## Hooks → Plugin

Los hooks de Claude Code (`PreToolUse`, `PostToolUse`, `SessionStart`, `Stop`, `PreCompact`) se convirtieron en `.opencode/plugins/everything.js`:

- **`tool.execute.before`** — bloquea dev servers fuera de tmux, recuerda tmux en comandos largos, revisa antes de `git push`, bloquea `.md`/`.txt` sueltos.
- **`tool.execute.after`** — formatea con Prettier, avisa de `console.log`, loguea URL de PR tras `gh pr create`.
- **`event`** — carga contexto previo y detecta package manager (`session-start.js`), persiste sesión y evalúa patrones (`session-end.js` / `evaluate-session.js`).
- **`experimental.session.compacting`** — guarda estado pre-compactación e inyecta contexto.

## MCP Servers

En `opencode.json` (`mcp`). Activa solo los que uses (`"enabled": true`) y reemplaza los placeholders `YOUR_*_HERE`. **Regla: menos de 10 MCP habilitados** para no comer la ventana de contexto.

Disponibles: `context7` · `github` · `firecrawl` · `supabase` · `memory` · `sequential-thinking` · `vercel` · `railway` · `cloudflare-docs` · `cloudflare-workers-builds` · `cloudflare-workers-bindings` · `cloudflare-observability` · `clickhouse` · `magic`

## 📓 Histórico Claude Code

El formato original (`.claude-plugin/`, `hooks.json`, agents/rules en formato Claude, MCP clásico) se conserva íntegro en **`docs/claude-code/`** como referencia. Para usarlo con Claude Code, sigue el [README original del upstream](https://github.com/WorldFlowAI/everything-claude-code).

## Tests

```bash
node tests/run-all.js
```

Cubre utilidades cross-platform, detección de package manager y el plugin de hooks.

## Superpowers

Las 15 skills de [obra/superpowers](https://github.com/obra/superpowers) están integradas y funcionan con el `skill` tool nativo de opencode. El flujo completo (brainstorming → planes → subagent-driven development → TDD → code review) está disponible invocando las skills, con la orquestación documentada en `AGENTS.md`.

## Contributing

¿Quieres aportar? Ver `CONTRIBUTING.md`. Se aceptan skills nuevas, mejoras de plugin y configs de MCP.

## License

MIT — úsalo, modifícalo, contribuye de vuelta.