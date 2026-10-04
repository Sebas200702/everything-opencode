#!/usr/bin/env -S node
/**
 * Convierte commands de formato Claude Code a formato opencode V1.
 * Claude: frontmatter { description } (opcional) + cuerpo Markdown.
 * opencode: frontmatter { description, agent?, subtask? } + cuerpo que es el template enviado al LLM.
 * Los commands que en Claude invocaban a un subagente (agent) se declaran con `agent` + `subtask: true`
 * para que opencode lance la invocación de subagente igual que hacía Claude.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const SRC = 'docs/claude-code/commands'
const DST = '.opencode/commands'
mkdirSync(DST, { recursive: true })

// Mapeo command -> { description, agent? }
const ROUTES = {
  'build-fix': { description: 'Fix TypeScript and build errors incrementally, one error at a time, verifying each fix', agent: 'build-error-resolver' },
  checkpoint: { description: 'Create, verify, or list workflow checkpoints with git state, tests, and coverage comparison' },
  'code-review': { description: 'Comprehensive security and quality review of uncommitted changes, blocking CRITICAL/HIGH issues', agent: 'code-reviewer' },
  e2e: { description: 'Generate, run, and maintain Playwright end-to-end tests with artifacts and flaky-test detection', agent: 'e2e-runner' },
  eval: { description: 'Manage eval-driven development: define, check, report, or list capability/regression evals' },
  learn: { description: 'Extract reusable patterns from the current session into new skills under .opencode/skills/learned/' },
  orchestrate: { description: 'Run sequential multi-agent workflows (feature, bugfix, refactor, security) with handoff documents' },
  plan: { description: 'Restate requirements, assess risks, and create a step-by-step implementation plan. WAIT for user CONFIRM before touching any code.', agent: 'planner' },
  'refactor-clean': { description: 'Safely identify and remove dead code with test verification (knip/depcheck/ts-prune)', agent: 'refactor-cleaner' },
  'setup-pm': { description: 'Configure your preferred package manager (npm/pnpm/yarn/bun)' },
  tdd: { description: 'Enforce test-driven development: scaffold interfaces, generate tests FIRST, implement minimal code, 80%+ coverage', agent: 'tdd-guide' },
  'test-coverage': { description: 'Analyze test coverage, generate missing tests, and reach 80%+ overall coverage' },
  'update-codemaps': { description: 'Analyze codebase structure and regenerate architecture codemaps (architecture/backend/frontend/data)', agent: 'doc-updater' },
  'update-docs': { description: 'Sync documentation from source-of-truth (package.json scripts and .env.example) into CONTRIB.md and RUNBOOK.md', agent: 'doc-updater' },
  verify: { description: 'Run comprehensive verification: build, types, lint, tests, console.log audit, git status' },
}

// Extrae descripción del frontmatter Claude si existe (para commands no mapeados con ruta custom).
function extractClaudeDescription(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---\n?/)
  if (!m) return null
  const line = m[1].split('\n').find((l) => l.trim().startsWith('description:'))
  if (!line) return null
  return line.slice(line.indexOf(':') + 1).trim().replace(/^"|"$/g, '')
}

// Normaliza el cuerpo: elimina el frontmatter original y el bloque "This command invokes the X agent".
function normalizeBody(content) {
  let body = content.replace(/^---\n[\s\S]*?\n---\n?/, '')
  return body.trim()
}

for (const [name, route] of Object.entries(ROUTES)) {
  const srcPath = join(SRC, `${name}.md`)
  const raw = readFileSync(srcPath, 'utf8')
  const claudeDesc = extractClaudeDescription(raw)
  const description = route.description ?? claudeDesc ?? `${name} command`
  const body = normalizeBody(raw)

  const lines = ['---', `description: ${description}`]
  if (route.agent) {
    lines.push(`agent: ${route.agent}`, 'subtask: true')
  }
  lines.push('---', '', body, '')

  writeFileSync(join(DST, `${name}.md`), lines.join('\n'))
  console.log(`converted ${name}.md${route.agent ? ` (agent: ${route.agent})` : ''}`)
}