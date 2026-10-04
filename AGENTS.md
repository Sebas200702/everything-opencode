# Everything OpenCode — Reglas de trabajo

> Adaptación de `everything-claude-code` para **opencode V1**. Estas reglas siempre aplican.
> Los agentes viven en `.opencode/agents/`, los commands en `.opencode/commands/`, las skills en `.opencode/skills/`.
> El formato original de Claude Code se conserva como histórico en `docs/claude-code/`.

## Orquestación de agentes

Agentes disponibles en `.opencode/agents/` (invocar con la tool `task`, o `@mencion`):

| Agente | Propósito | Cuándo usarlo |
|--------|-----------|---------------|
| planner | Planificación de implementación | Features complejas, refactoring |
| architect | Diseño de sistemas | Decisiones arquitectónicas |
| tdd-guide | Desarrollo dirigido por tests | Features nuevas, bugs |
| code-reviewer | Revisión de código | Justo después de escribir código |
| security-reviewer | Análisis de seguridad | Antes de commits |
| build-error-resolver | Arreglar errores de build | Cuando compila mal |
| e2e-runner | Testing E2E (Playwright) | Flujos críticos de usuario |
| refactor-cleaner | Limpieza de código muerto | Mantenimiento |
| doc-updater | Documentación y codemaps | Actualizar docs |

Uso inmediato (sin esperar al usuario):
1. Feature compleja → **planner**
2. Código recién escrito/modificado → **code-reviewer**
3. Bug fix o feature nueva → **tdd-guide**
4. Decisión arquitectónica → **architect**

Paralelismo: **siempre** lanza subagentes en paralelo para operaciones independientes.
Análisis multiperspectiva: divide roles (revisor factual, ingeniero senior, experto de seguridad, revisión de consistencia).

## Estilo de código

**Inmutabilidad (CRITICAL):** crea objetos nuevos, nunca mutes:

```javascript
// WRONG: Mutation
function updateUser(user, name) { user.name = name; return user }

// CORRECT: Immutability
function updateUser(user, name) { return { ...user, name } }
```

Organización de archivos: **muchos archivos pequeños** > pocos grandes. 200–400 líneas típico, 800 máx. Alta cohesión, bajo acoplamiento. Organizar por feature/dominio, no por tipo.

Error handling: siempre try/catch con mensajes claros. Validación de entrada con Zod en el borde.

Checklist de calidad antes de terminar:
- [ ] Código legible y bien nombrado
- [ ] Funciones pequeñas (<50 líneas)
- [ ] Archivos enfocados (<800 líneas)
- [ ] Sin anidamiento profundo (>4 niveles)
- [ ] Error handling correcto
- [ ] Sin `console.log`
- [ ] Sin valores hardcodeados
- [ ] Patrones inmutables

## Git workflow

Formato de commit: `<type>: <description>` (`feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`).

Flujo de feature:
1. **Planear** → agente `planner`
2. **TDD** → agente `tdd-guide`: tests primero (RED) → implementar (GREEN) → refactor → 80%+ cobertura
3. **Revisar** → agente `code-reviewer` inmediatamente después de escribir; arregla CRITICAL/HIGH
4. **Commit & push** → Conventional Commits

PRs: analiza el historial completo (`git diff base...HEAD`), resumen comprensivo, test plan con TODOs.

## Sistema de hooks (plugin opencode)

Los hooks viven en `.opencode/plugins/everything.js` (equivalente de `hooks/hooks.json`):

- **tool.execute.before**: bloquea dev server fuera de tmux, recuerda tmux en comandos largos, revisión antes de `git push`, bloquea `.md`/`.txt` sueltos.
- **tool.execute.after**: formatea con Prettier, avisa de `console.log`, loguea URL de PR tras `gh pr create`.
- **event** (session.created/updated/idle): carga contexto previo (`session-start.js`), persiste sesión (`session-end.js`), evalúa patrones extraíbles (`evaluate-session.js`).
- **experimental.session.compacting**: guarda estado pre-compactación (`pre-compact.js`) e inyecta contexto.

Permisos: usa configuración de opencode (`permission` por agente), nunca flags peligrosos. Usa la tool `todowrite`/lista de tareas para pasos multi-etapa.

## Patrones comunes

- **API Response**: `ApiResponse<T> { success, data?, error?, meta? }`
- **Hooks**: `useDebounce`, custom hooks reutilizables
- **Repository**: `findAll / findById / create / update / delete`
- **Skeleton projects**: al implementar algo nuevo, busca skeletons battle-tested y evalúa con agentes en paralelo antes de clonar.

## Rendimiento y contexto

- Modelos: reserva el más capaz para arquitectura/depuración profunda; usa modelos ligeros para trabajo repetitivo.
- Evita el último 20% de la ventana de contexto para refactors grandes; compacta en puntos lógicos.
- Usa `/verify` (command) antes de PRs y `/code-review` tras cada cambio importante.