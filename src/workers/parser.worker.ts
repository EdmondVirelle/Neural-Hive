/**
 * Parser Web Worker
 *
 * Offloads state detection and skill extraction from the renderer main thread.
 * Receives agent output data and posts back parsed results.
 */

import type { AgentStatus } from '../types/shared'

// ANSI escape regex
// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE_REGEX = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07]*\x07|\x1b\][^\x1b]*\x1b\\/g

function stripAnsi(input: string): string {
  return input.replace(ANSI_ESCAPE_REGEX, '')
}

// State detection patterns
const STATE_PATTERNS: ReadonlyArray<{ pattern: RegExp; status: AgentStatus }> = [
  { pattern: /\bThinking\.{0,3}\b/i, status: 'THINKING' },
  { pattern: /\[Tool Use\]/i, status: 'WORKING' },
  { pattern: /\bRunning\b/i, status: 'WORKING' },
  { pattern: /\bError[:!]|\[Error\]/i, status: 'ERROR' },
  { pattern: /\bException\b/i, status: 'ERROR' },
  { pattern: /[✖❌]/, status: 'ERROR' },
]

// Skill extraction regex
const TOOL_USE_SKILL_REGEX = /\[Tool Use\]\s+(.+)$/i

function detectState(logLine: string): AgentStatus | null {
  const cleanLine = stripAnsi(logLine)
  for (const { pattern, status } of STATE_PATTERNS) {
    if (pattern.test(cleanLine)) {
      return status
    }
  }
  return null
}

function extractSkill(logLine: string): string | null {
  const cleanLine = stripAnsi(logLine)
  const match = cleanLine.match(TOOL_USE_SKILL_REGEX)
  return match?.[1]?.trim() ?? null
}

// Message handler
interface WorkerInput {
  agentId: string
  content: string
}

interface WorkerOutput {
  agentId: string
  status: AgentStatus | null
  skill: string | null
}

self.onmessage = (event: MessageEvent<WorkerInput>) => {
  const { agentId, content } = event.data
  const status = detectState(content)
  const skill = extractSkill(content)

  const result: WorkerOutput = { agentId, status, skill }
  self.postMessage(result)
}
