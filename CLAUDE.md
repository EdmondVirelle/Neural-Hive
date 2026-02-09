# Neural Hive — AI Agent Cluster Command Center

## Project Summary
Electron + Vue 3 + Pinia + TypeScript desktop app that manages multiple AI CLI tools (Claude Code, Gemini, Aider, Codex, OpenCode, Cursor, Copilot) simultaneously through a unified GUI. Uses node-pty for TTY emulation, xterm.js for terminal rendering, regex-based state parsing.

## Current State: v2.0 Complete
- **Repo**: https://github.com/EdmondVirelle/Neural-Hive
- **Tests**: 9 files, 196 tests, all passing (`npm test`)
- **Location**: `C:\Workspace\AI Cluster Command Center`

## Tech Stack
```
Frontend:  Vue 3 + TypeScript + Pinia + Vue Router + Vue I18n (en/zh-TW)
UI:        Tailwind CSS + Shadcn/ui (Glassmorphism dark theme)
Backend:   Electron Main Process + Node.js + node-pty
Terminal:  xterm.js + xterm-addon-fit + xterm-addon-search
Testing:   Vitest 1.6.1
Build:     Vite + electron-builder
```

## Architecture
```
Electron Main Process          │  Vue Renderer
─────────────────────────────  │  ─────────────────────────────
agent-manager.ts (PTY spawn)   │  App.vue (Shell: Sidebar+TopBar+RouterView)
cli-detector.ts (auto-detect)  │  views/ (Dashboard, Settings, Onboarding)
settings-manager.ts (persist)  │  stores/ (agentStore, settingsStore)
broadcast-manager.ts           │  composables/ (useKeyboardShortcuts, useTheme)
health-monitor.ts              │  workers/parser.worker.ts (Web Worker)
output-throttler.ts (100ms)    │  i18n/ (en.ts, zh-TW.ts)
config-loader.ts               │  components/ (AgentCard, FocusMode, SpawnDialog...)
preload.cts (contextBridge)    │
```

## Key Files to Know
- `src/types/shared.ts` — All shared types (AgentType, AgentStatus, CliInfo, AppSettings, IPC channels)
- `electron/agent-manager.ts` — Spawns real CLIs via node-pty, manages lifecycle (pause/resume/kill)
- `src/stores/agentStore.ts` — Central state: agents map, logs, status, logUpdateCounter
- `config/parsers.json` — Regex patterns per CLI for state detection (THINKING/WORKING/ERROR/IDLE)
- `electron/cli-detector.ts` — Probes `where`/`which` + `--version` for 7 CLI tools

## Agent Data Flow
```
User Input → Vue Frontend → IPC → agent-manager.ts → node-pty → CLI Process
CLI stdout → node-pty → output-throttler (100ms batch) → IPC → agentStore → Vue render
                                                        ↘ regex parser → status update
```

## What v2.0 Already Has
- 7 CLI types + Custom, auto-detection at startup
- Dashboard grid with status cards (IDLE/THINKING/WORKING/ERROR)
- Focus Mode (full xterm.js + skills panel + log search)
- Command broadcasting (to all/tagged agents)
- Settings persistence (language, theme, CLI paths, performance)
- Onboarding wizard
- Keyboard shortcuts (Ctrl+N/B/,/1-9/F)
- Dark/Light theme, EN/ZH-TW i18n
- ErrorBoundary, Web Worker parser, breathing animations

## Vitest Mocking Caveat
`vi.mock()` does NOT work for Node built-ins (util, child_process) in transitive imports. Use dependency injection pattern instead — see `cli-detector.ts` exporting `_setExecFileAsync()` test helper.

---

# v3.0 VISION: Killer Features

The goal is to transform Neural Hive from "a pretty tmux" into an **irreplaceable AI orchestration tool** with three killer features:

## Feature 1: Smart Conflict Detection (Priority: P0, Easiest)
**Problem**: Two agents editing the same file simultaneously → merge conflicts, lost work.

**Design**:
- Parse CLI output for file operations: `Reading file X`, `Writing to X`, `Edit file X`
- Maintain a global `FileRegistry: Map<filePath, { agentId, operation, timestamp }>`
- When Agent B tries to write a file locked by Agent A → auto-pause Agent B
- Show conflict notification in UI with options: Wait / Cancel B / Force Continue
- Release lock when agent moves to next file or goes IDLE

**Implementation Notes**:
- Extend `config/parsers.json` with `file_read` and `file_write` regex patterns per CLI
- New module: `electron/conflict-detector.ts`
- New IPC channel for conflict events
- UI: conflict badge on AgentCard, conflict resolution dialog

## Feature 2: Agent Pipeline / Auto-Coordination (Priority: P1)
**Problem**: Manual copy-paste workflow between agents. A finishes → you manually tell B to continue.

**Design**:
- Pipeline definition: ordered list of `{ agentId, prompt, waitFor?: agentId[], injectContext?: boolean }`
- When upstream agent transitions to IDLE (without ERROR) → auto-trigger downstream
- Optionally inject upstream's last N lines of output into downstream's prompt as context
- Pipeline status visualization in UI (Kanban-like)

**Implementation Notes**:
- New module: `electron/pipeline-manager.ts`
- New store: `src/stores/pipelineStore.ts`
- New view: `src/views/PipelineView.vue` (visual pipeline editor)
- Success detection: IDLE + no ERROR in last 5 lines of output
- Pipeline templates for common workflows (e.g., "implement → review → test")

## Feature 3: Task Decomposition Engine (Priority: P2, Hardest)
**Problem**: User has a big goal ("refactor auth system") but must manually split into subtasks.

**Design**:
- Use one agent as "Commander" — send it a meta-prompt asking to decompose the goal
- Parse Commander's output into structured subtask list
- Auto-spawn worker agents for each subtask with proper context
- Commander monitors progress and can reassign/adjust

**Implementation Notes**:
- This is essentially "AI orchestrating AI" — a basic version is feasible
- New module: `electron/task-engine.ts`
- Meta-prompt template that outputs structured JSON-like subtask lists
- Start simple: user confirms the decomposition before auto-spawning
- Advanced: Commander agent reviews worker outputs and decides next steps

## Suggested Implementation Order
```
1. Conflict Detection (standalone, immediate value)
2. Pipeline (builds on state detection + conflict awareness)
3. Task Decomposition (builds on pipeline infrastructure)
```
