#!/usr/bin/env -S node
/**
 * Convierte agents de formato Claude Code a formato opencode V1.
 * Claude: frontmatter { name, description, tools: "Read, Grep", model }.
 * opencode: frontmatter { description, mode: subagent, permission: { read, edit, bash, grep, glob } }.
 * El nombre del archivo define el id del agente; no se necesita `name`.
 * No se fija `model` para que el subagente herede el del agente primario.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const SRC = 'docs/claude-code/agents'
const DST = '.opencode/agents'
mkdirSync(DST, { recursive: true })

// Mapeo Claude tool -> opencode permission key
const TOOL_TO_PERMISSION = {
  Read: 'read',
  Grep: 'grep',
  Glob: 'glob',
  Write: 'edit',
  Edit: 'edit',
  Bash: 'bash',
  WebFetch: 'webfetch',
  WebSearch: 'websearch',
  Task: 'task',
  TodoWrite: 'todowrite',
}

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---\n?/)
  if (!m) return { frontmatter: {}, body: content }
  const frontmatter = {}
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    frontmatter[key] = value
  }
  return { frontmatter, body: content.slice(m[0].length) }
}

// Sustituciones puntuales del cuerpo para referir herramientas con el nombre opencode.
const BODY_TOOL_MAP = [
  [/`(Read|Write|Edit|Grep|Glob|Bash|WebFetch|Task)`/g, (_, t) => '`' + (TOOL_TO_PERMISSION[t] ?? t.toLowerCase()) + '`'],
  [/\buse (Read|Write|Edit|Grep|Glob|Bash|WebFetch|Task) tool\b/g, (_, t) => 'use the ' + (TOOL_TO_PERMISSION[t] ?? t.toLowerCase()) + ' tool'],
  [/\b(Read|Grep|Glob|Bash) tool\b/g, (_, t) => (TOOL_TO_PERMISSION[t] ?? t.toLowerCase()) + ' tool'],
  [/\bruns? ?(Read|Grep|Glob|Bash)\b/g, (_, t) => 'uses ' + (TOOL_TO_PERMISSION[t] ?? t.toLowerCase())],
  [/\b(git (?:diff|log|status|rev-parse|stash))\b/g, 'bash `$1`'],
]

const files = ['architect', 'planner', 'tdd-guide', 'code-reviewer', 'security-reviewer', 'build-error-resolver', 'e2e-runner', 'refactor-cleaner', 'doc-updater']

for (const name of files) {
  const srcPath = join(SRC, `${name}.md`)
  const raw = readFileSync(srcPath, 'utf8')
  const { frontmatter, body } = parseFrontmatter(raw)

  const tools = (frontmatter.tools || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  const permissions = {}
  for (const tool of tools) {
    const key = TOOL_TO_PERMISSION[tool]
    if (key && !permissions[key]) permissions[key] = 'allow'
  }
  // Agentes solo lectura de diseño/revisión no deberían editar ni correr comandos.
  const readOnly = ['architect', 'code-reviewer'].includes(name)
  if (readOnly) {
    if (!permissions.edit) permissions.edit = 'deny'
    if (!permissions.bash) permissions.bash = 'deny'
  }

  let adaptedBody = body.trim()
  for (const [pattern, repl] of BODY_TOOL_MAP) {
    if (typeof repl === 'string') adaptedBody = adaptedBody.replace(pattern, repl)
    else adaptedBody = adaptedBody.replace(pattern, repl)
  }

  const frontmatterLines = ['---', `description: ${frontmatter.description || `${name} specialist agent`}`, 'mode: subagent']
  const permEntries = Object.entries(permissions)
  if (permEntries.length) {
    frontmatterLines.push('permission:')
    for (const [key, value] of permEntries) frontmatterLines.push(`  ${key}: ${value}`)
  }
  frontmatterLines.push('---')

  const out = frontmatterLines.join('\n') + '\n\n' + adaptedBody + '\n'
  writeFileSync(join(DST, `${name}.md`), out)
  console.log(`converted ${name}.md (permissions: ${JSON.stringify(permissions)})`)
}