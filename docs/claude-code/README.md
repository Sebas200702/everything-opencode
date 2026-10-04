# Histórico — Formato Claude Code original

Esta carpeta conserva **íntegro** el formato original de `everything-claude-code` (para Claude Code), trasladado aquí durante la adaptación a OpenCode.

| Carpeta | Contenido original |
|---|---|
| `agents/` | 9 subagentes en formato Claude Code (`name`, `tools`, `model`) |
| `commands/` | 16 commands slash en formato Claude Code |
| `skills/` | 11 skills (formato Claude Code, la mayoría ya compatibles con opencode) |
| `rules/` | 7 reglas siempre-presentes (estilo, git, testing, seguridad, performance, hooks, agents) |
| `hooks/` | `hooks.json` (PreToolUse/PostToolUse/Stop/SessionStart/PreCompact/PreCompact) + scripts shell |
| `contexts/` | Contextos dinámicos de sistema (`dev`, `review`, `research`) |
| `mcp-configs/` | Servidores MCP en formato `mcpServers` de `~/.claude.json` |
| `.claude-plugin/` | Manifiestos de plugin y marketplace de Claude Code |
| `.claude/` | Config de package manager (`.claude/package-manager.json`) |
| `examples/` | Ejemplos de CLAUDE.md, configs y sesiones |
| `plugins/` | README del sistema de plugins de Claude Code |

## Estado vivo (ratón)

El formato activo de este repo ahora vive en la raíz:

- `.opencode/agents/` — agentes (conversión a `mode: subagent` + `permission`)
- `.opencode/commands/` — commands (con `agent:` + `subtask: true` donde aplica)
- `.opencode/skills/` — 42 skills (originales + superpowers + nuevas)
- `.opencode/plugins/everything.js` — hooks convertidos a plugin opencode
- `AGENTS.md` — reglas consolidadas
- `opencode.json` — config + MCP en formato opencode

> No edites el contenido de esta carpeta como si fuera la fuente viva. Es una cápsula de referencia del formato Claude Code original. Para contribuir, edita la estructura `.opencode/` de la raíz.