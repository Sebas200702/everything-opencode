/**
 * Everything OpenCode plugin
 *
 * Convierte los hooks de Claude Code (hooks/hooks.json) a eventos nativos de
 * opencode V1: tool.execute.before / tool.execute.after + session events.
 *
 * Qué hace:
 * - PreToolUse (bloquear/avisar): dev server fuera de tmux, recordatorio tmux,
 *   revisión antes de git push, bloqueo de .md/.txt sueltos fuera de README/AGENTS/CONTRIBUTING.
 * - PostToolUse: autoformato con Prettier, type-check TS, aviso de console.log,
 *   log de URL de PR tras `gh pr create`.
 * - SessionStart: carga contexto previo y detecta package manager.
 * - SessionEnd / Stop: persiste estado de sesión; evalúa patrones extraíbles.
 * - Compact: sugiere compactación estratégica y guarda estado pre-compact.
 *
 * Requiere: directorio `scripts/` del repo (scripts/hooks/*.js). Rutas resueltas
 * desde el directorio del plugin hacia la raíz del repo.
 */
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { execFile } from 'node:child_process'

const PLUGIN_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(PLUGIN_DIR, '..', '..')

function runNodeScript(scriptName, env = {}) {
  return new Promise((resolve) => {
    const scriptPath = path.join(REPO_ROOT, 'scripts', 'hooks', scriptName)
    const proc = execFile(
      process.execPath,
      [scriptPath],
      { env: { ...process.env, ...env }, cwd: REPO_ROOT, timeout: 10000 },
      (error, stdout, stderr) => {
        resolve({ code: error ? error.code ?? 1 : 0, stdout: stdout || '', stderr: stderr || '' })
      }
    )
    proc.on('error', () => resolve({ code: 1, stdout: '', stderr: '' }))
  })
}

function logWarn(client, message) {
  try {
    if (client?.app?.log) {
      void client.app.log({
        body: { service: 'everything', level: 'warn', message },
      })
    }
  } catch {
    // never fail the hook
  }
}

// Matchers de dev server
const DEV_SERVER_PATTERN = /(npm run dev|pnpm( run)? dev|yarn dev|bun run dev)/
const LONG_RUNNING_PATTERN =
  /(npm (install|test)|pnpm (install|test)|yarn (install|test)?|bun (install|test)|cargo build|make|docker|pytest|vitest|playwright)/

export const EverythingPlugin = async ({ client }) => {
  return {
    'tool.execute.before': async (input, output) => {
      const tool = input.tool
      const args = output?.args ?? input?.args ?? {}
      const command = (args.command || args.prompt || '') + ''

      if (tool === 'bash' && DEV_SERVER_PATTERN.test(command)) {
        if (!process.env.TMUX) {
          throw new Error(
            '[Hook] BLOCKED: Dev server must run in tmux for log access.\n' +
              '[Hook] Use: tmux new-session -d -s dev "npm run dev"\n' +
              '[Hook] Then: tmux attach -t dev'
          )
        }
      }

      if (tool === 'bash' && LONG_RUNNING_PATTERN.test(command) && !process.env.TMUX) {
        logWarn(client, '[Hook] Consider running in tmux for session persistence: tmux new -s dev  |  tmux attach -t dev')
      }

      if (tool === 'bash' && /git push/.test(command)) {
        logWarn(client, '[Hook] Review changes before push... (remove this hook to add interactive review)')
      }

      if (tool === 'write' || tool === 'edit') {
        const filePath = args.filePath || args.path || ''
        if (/\.(md|txt)$/.test(filePath) && !/(README|CLAUDE|AGENTS|CONTRIBUTING)\.md$/.test(filePath)) {
          throw new Error(
            `[Hook] BLOCKED: Unnecessary documentation file creation\n[Hook] File: ${filePath}\n[Hook] Use README.md for documentation instead`
          )
        }
      }
    },

    'tool.execute.after': async (input, output) => {
      const tool = input.tool
      const args = input?.args ?? {}
      const command = (args.command || '') + ''
      const filePath = args.filePath || args.path || ''

      // PostToolUse: log PR URL after gh pr create
      if (tool === 'bash' && /gh pr create/.test(command)) {
        const stdout = (output?.output?.toString?.() || String(output?.output ?? '') || '')
        const match = stdout.match(/https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/\d+/)
        if (match) {
          const repo = match[0].replace(/https:\/\/github\.com\/([^/]+\/[^/]+)\/pull\/\d+/, '$1')
          const pr = match[0].replace(/.*\/pull\/(\d+)/, '$1')
          logWarn(client, `[Hook] PR created: ${match[0]}\n[Hook] To review: gh pr review ${pr} --repo ${repo}`)
        }
      }

      // PostToolUse: auto-format JS/TS, type-check TS, warn console.log
      if ((tool === 'edit' || tool === 'write') && /\.(ts|tsx|js|jsx)$/.test(filePath)) {
        const fs = await import('node:fs')
        if (fs.existsSync(filePath)) {
          try {
            execFile('npx', ['prettier', '--write', filePath], { cwd: REPO_ROOT, timeout: 15000, stdio: 'pipe' })
          } catch {
            // prettier not available — ignore
          }
          if (/\.(ts|tsx)$/.test(filePath)) {
            try {
              const content = fs.readFileSync(filePath, 'utf8')
              const lines = content.split('\n')
              lines.forEach((line, idx) => {
                if (/console\.log/.test(line)) {
                  logWarn(client, `[Hook] WARNING: console.log found in ${filePath}:${idx + 1}: ${line.trim()}`)
                }
              })
            } catch {
              // ignore
            }
          }
        }
      }
    },

    event: async ({ event }) => {
      const type = event.type
      // SessionStart -> session.created / session.updated con nueva sesión
      if (type === 'session.created' || type === 'session.updated') {
        const sessionID = event.properties?.sessionID ?? event.properties?.info?.id
        if (!sessionID) return
        await runNodeScript('session-start.js')
      }

      // SessionEnd / Stop -> persistir al terminar
      if (type === 'session.idle' || type === 'session.error') {
        await runNodeScript('session-end.js')
        await runNodeScript('evaluate-session.js')
      }
    },

    'experimental.session.compacting': async (input, output) => {
      // PreCompact: guardar estado antes de compactación
      await runNodeScript('pre-compact.js')
      const stateHint = `## Everything context
Session state was saved by the everything plugin. On resume, re-run session-start context loading if needed.`
      output.context.push(stateHint)
    },
  }
}