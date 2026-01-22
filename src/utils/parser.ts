/**
 * Terminal Output Parser Utility
 *
 * This module provides pure utility functions for parsing raw terminal output
 * into meaningful state. It handles ANSI escape code stripping and state detection
 * for agent monitoring purposes.
 */

import type { AgentStatus } from '../types/shared';

/**
 * Regular expression to match ANSI escape sequences.
 *
 * Pattern breakdown:
 *   \x1b      - ESC character (hex 1B, also written as \u001b or \033)
 *   \[        - Literal '[' character (CSI - Control Sequence Introducer)
 *   [0-9;]*   - Zero or more digits or semicolons (parameters like 31;1 for bold red)
 *   [a-zA-Z]  - Single letter that terminates the sequence (e.g., 'm' for SGR)
 *
 * Common examples this matches:
 *   \x1b[31m     - Red text
 *   \x1b[0m      - Reset formatting
 *   \x1b[1;32m   - Bold green text
 *   \x1b[38;5;82m - 256-color mode
 */
// ANSI_ESCAPE_REGEX removed as it was unused in favor of extended version below


/**
 * Extended ANSI regex that also catches:
 * - OSC (Operating System Command) sequences: \x1b]...\x07 or \x1b]...\x1b\\
 * - Other escape sequences like cursor movement
 *
 * Pattern breakdown:
 *   \x1b\[[0-9;]*[a-zA-Z]     - Standard CSI sequences (colors, cursor, etc.)
 *   |                          - OR
 *   \x1b\][^\x07]*\x07         - OSC sequences ending with BEL (\x07)
 *   |                          - OR
 *   \x1b\][^\x1b]*\x1b\\       - OSC sequences ending with ST (\x1b\\)
 */
// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE_REGEX_EXTENDED = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07]*\x07|\x1b\][^\x1b]*\x1b\\/g;

/**
 * Strips ANSI escape codes from a string, returning pure text.
 *
 * @param input - Raw terminal output string potentially containing ANSI codes
 * @returns Clean string with all ANSI escape sequences removed
 *
 * @example
 * stripAnsi('\x1b[31mError\x1b[0m: Something went wrong')
 * // Returns: 'Error: Something went wrong'
 */
export function stripAnsi(input: string): string {
  return input.replace(ANSI_ESCAPE_REGEX_EXTENDED, '');
}

/**
 * Regular expression patterns for detecting agent states.
 *
 * Each pattern is designed to match common terminal output indicators:
 */
const STATE_PATTERNS: ReadonlyArray<{ pattern: RegExp; status: AgentStatus }> = [
  {
    // Matches "Thinking..." with optional surrounding text
    // Pattern: Word boundary + "Thinking" + optional "..." + word boundary
    // Case-insensitive to catch "THINKING", "thinking", etc.
    pattern: /\bThinking\.{0,3}\b/i,
    status: 'THINKING',
  },
  {
    // Matches "[Tool Use]" - literal bracket notation commonly used in CLI tools
    // Pattern: Escaped brackets around "Tool Use" (case-insensitive)
    pattern: /\[Tool Use\]/i,
    status: 'WORKING',
  },
  {
    // Matches "Running" as a standalone word
    // Pattern: Word boundary ensures we don't match "Overrunning" etc.
    pattern: /\bRunning\b/i,
    status: 'WORKING',
  },
  {
    // Matches "Error:" or "Error!" or "[Error]"
    // This avoids matching "error" when it's just part of a phrase like 'how do I log an error?'
    pattern: /\bError[:!]|\[Error\]/i,
    status: 'ERROR',
  },
  {
    // Matches "Exception" as a standalone word
    // Common in stack traces: "Exception:", "ValueError:", "RuntimeException"
    pattern: /\bException\b/i,
    status: 'ERROR',
  },
  {
    // Matches common terminal error icons like the red cross mark
    pattern: /[✖❌]/,
    status: 'ERROR',
  },
];

/**
 * Detects the agent state from a single log line.
 *
 * The function strips ANSI codes first, then checks against known patterns
 * in priority order (first match wins).
 *
 * @param logLine - A single line of terminal output
 * @returns The detected AgentStatus, or null if no state indicator found
 *
 * @example
 * detectState('\x1b[33mThinking...\x1b[0m')
 * // Returns: 'THINKING'
 *
 * @example
 * detectState('[Tool Use] Reading file...')
 * // Returns: 'WORKING'
 *
 * @example
 * detectState('Processing data')
 * // Returns: null (no state indicator found)
 */
export function detectState(logLine: string): AgentStatus | null {
  // First, strip ANSI codes to analyze pure text content
  const cleanLine = stripAnsi(logLine);

  // Check each pattern in order (priority-based matching)
  for (const { pattern, status } of STATE_PATTERNS) {
    if (pattern.test(cleanLine)) {
      return status;
    }
  }

  // No state indicator found - caller should preserve previous state
  return null;
}

/**
 * Regular expression to extract skill/action from [Tool Use] lines.
 *
 * Pattern breakdown:
 *   \[Tool Use\]  - Literal "[Tool Use]" marker
 *   \s+           - One or more whitespace characters (space, tab)
 *   (.+)          - Capture group: one or more of any character (the skill description)
 *   $             - End of string (ensures we capture to the end)
 *
 * The 'i' flag makes it case-insensitive.
 */
const TOOL_USE_SKILL_REGEX = /\[Tool Use\]\s+(.+)$/i;

/**
 * Extracts the skill/action description from a [Tool Use] log line.
 *
 * @param logLine - A single line of terminal output
 * @returns The extracted skill string, or null if not a [Tool Use] line
 *
 * @example
 * extractSkill('[Tool Use] Searching...')
 * // Returns: 'Searching...'
 *
 * @example
 * extractSkill('[Tool Use] Reading file: package.json')
 * // Returns: 'Reading file: package.json'
 *
 * @example
 * extractSkill('Regular log message')
 * // Returns: null
 */
export function extractSkill(logLine: string): string | null {
  // Strip ANSI codes first for clean extraction
  const cleanLine = stripAnsi(logLine);

  // Attempt to match the [Tool Use] pattern
  const match = cleanLine.match(TOOL_USE_SKILL_REGEX);

  if (match && match[1]) {
    // Return the captured group (skill description), trimmed of extra whitespace
    return match[1].trim();
  }

  return null;
}
