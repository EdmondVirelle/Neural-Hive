[繁體中文](./Specification.zh-TW.md)

# Software Requirements Specification (SRS)

| Item | Content |
|---|---|
| **Project Name** | AI Agent Orchestrator |
| **Project Code** | Neural Hive |
| **Version** | v1.0.0 |
| **Date** | 2026-01-22 |

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Functional Requirements](#3-functional-requirements)
4. [UI/UX Design Requirements](#4-uiux-design-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Implementation Roadmap](#6-implementation-roadmap)

---

## 1. Project Overview

### 1.1 Goal

To develop a **cross-platform desktop application** aimed at solving the pain points for professional developers who need to operate multiple AI CLI tools (like Claude Code, Gemini CLI, OpenAI Codex) simultaneously.

This system will act as a "**graphical command center**," allowing users to:
- Concurrently manage the lifecycle of multiple AI agents.
- Monitor their thinking and tool usage states.
- Support batch command execution.

### 1.2 Scope

**Target Audience**: Users already subscribed to Claude Pro / Gemini Advanced, utilizing their provided CLI tools (not through API integration).

**Core Value**:

| Value | Description |
|---|---|
| **Parallel Processing** | Execute tasks for multiple agents at the same time (e.g., Agent A writes frontend code while Agent B writes backend code). |
| **Visual Monitoring** | Transform plain text CLI output into a status dashboard (Thinking, Executing Tool, Error). |
| **Cost Optimization** | Utilize existing subscription quotas without additional API token costs. |

---

## 2. System Architecture

### 2.1 Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Application                      │
├─────────────────────────────┬───────────────────────────────┤
│      Main Process           │       Renderer Process        │
│  ┌───────────────────────┐  │  ┌─────────────────────────┐  │
│  │  Node.js + TypeScript │  │  │   Vue 3 + TypeScript    │  │
│  │  ─────────────────────│  │  │  ─────────────────────  │  │
│  │  • node-pty (TTY)     │  │  │  • Pinia (State Mgmt)   │  │
│  │  • Process Manager    │◄─┼──┤  • Tailwind CSS         │  │
│  │  • Regex Parser       │──┼─►│  • Shadcn/ui            │  │
│  │  • IPC Handler        │  │  │  • xterm.js (Terminal)  │  │
│  └───────────────────────┘  │  └─────────────────────────┘  │
└─────────────────────────────┴───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │     External CLI Processes    │
              │  ┌─────────┐    ┌──────────┐  │
              │  │ Claude  │    │  Gemini  │  │
              │  └─────────┘    └──────────┘  │
              └───────────────────────────────┘
```

| Layer | Technology | Purpose |
|---|---|---|
| Application Shell | Electron | Provides a cross-platform desktop environment. |
| Backend (Main Process) | Node.js + TypeScript | Handles core logic. |
| Terminal Emulation | node-pty | Core component for emulating a TTY. |
| IPC Communication | Electron IPC Main/Renderer | Inter-process communication. |
| Frontend (Renderer Process) | Vue 3 + TypeScript | User interface. |
| State Management | Pinia | Manages the real-time state of all agents. |
| UI Framework | Tailwind CSS + Shadcn/ui | Modern UI component library. |
| Terminal Rendering | xterm.js | Renders the terminal for single-agent focus mode. |

### 2.2 Data Flow

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐
│  User    │    │   Vue        │    │   Electron   │    │  CLI     │
│  Input   │───►│   Frontend   │───►│   Main       │───►│  Process │
└──────────┘    └──────────────┘    │   Process    │    └────┬─────┘
                                    │              │         │
                      IPC           │  node-pty    │         │
                       │            │              │◄────────┘
                       ▼            │              │    stdout
┌──────────┐    ┌──────────────┐    │   Regex      │    (ANSI)
│  Render  │◄───│   State      │◄───│   Parser     │
│  UI      │    │   Update     │    └──────────────┘
└──────────┘    └──────────────┘
```

**Flow Description**:

1. **Input**: User enters a command or clicks a button in the Vue frontend.
2. **Process**: The Electron Main Process writes the command to the corresponding child process's stdin via node-pty.
3. **Execution**: The external CLI (Claude/Gemini) executes and produces output.
4. **Capture**: node-pty intercepts the stdout stream (including ANSI color codes).
5. **Parsing**: A regex engine analyzes the output stream to determine the current state (Thinking/Tool Use).
6. **Output**: The parsed state and raw logs are broadcast back to the Vue frontend via IPC for rendering.

---

## 3. Functional Requirements

### 3.1 Agent Session Management

| ID | Feature | Description |
|---|---|---|
| **FR-01-01** | Add Agent | User can select an agent type (Claude, Gemini, Custom Script), specify a **Custom Name**, and specify a working directory (cwd) to launch a new instance. |
| **FR-01-02** | Multiple Instances | The system must support opening **N (recommended max 20+)** independent CLI processes simultaneously. |
| **FR-01-03** | Lifecycle Control | Support "Pause" (stop input), "Restart" (Kill & Spawn), and "Destroy" operations for individual agents. |
| **FR-01-04** | Environment Isolation | Each agent should run in an independent process to ensure memory and variables do not interfere with each other. |

### 3.2 Terminal Interaction & Emulation

| ID | Feature | Description |
|---|---|---|
| **FR-02-01** | TTY Emulation | Must deceive the CLI tool into thinking it's running in a standard terminal to preserve ANSI colors and interactive prompts (e.g., y/n confirmation). |
| **FR-02-02** | Interactive Mode | User can click into an agent's "Focus Mode," which should provide a full xterm.js interface allowing direct keyboard input. |

### 3.3 State Parsing & Visualization

| ID | Feature | Description |
|---|---|---|
| **FR-03-01** | Keyword Trigger | The system needs a built-in library of parsing rules (Regex Ruleset) for different CLIs. |
| **FR-03-02** | State Mapping | Map parsing results to predefined states. |
| **FR-03-03** | Skill Dashboard | Display the currently executing operation in the Grid View. |

**FR-03-01 Keyword Trigger - Example Parsing Rules**:

```javascript
// Claude CLI
{
  "thinking": /Thinking\.\.\./,
  "running_command": /Running command\.\.\./,
  "reading_file": /Reading file\.\.\./
}

// Gemini CLI
{
  "tool_use": /\ \[Tool Use\]/,
  "analysis": /Analysis/
}
```

**FR-03-02 State Mapping**:

| State | Code | Description | Color |
|---|---|---|---|
| Idle | `IDLE` | Waiting for input | 🟢 Green |
| Thinking | `THINKING` | AI is processing | 🟡 Yellow |
| Working | `WORKING` | Executing a Skill/Tool | 🔵 Blue |
| Error | `ERROR` | An error occurred | 🔴 Red |
| Waiting for User | `WAITING_USER` | Awaiting user confirmation (e.g., y/n) | 🟠 Orange |

**FR-03-03 Skill Dashboard Display Example**:

```
┌─────────────────────────────────┐
│  Agent-01                   🟡  │
│  ─────────────────────────────  │
│  > Searching: WPF Bindings     │
│  ─────────────────────────────  │
│  > Analyzing project structure  │
│  > Found 3 relevant files...    │
└─────────────────────────────────┘
```

### 3.4 Command Broadcasting System

| ID | Feature | Description |
|---|---|---|
| **FR-04-01** | Batch Commands | Support sending the same prompt to multiple agents simultaneously via "**Tags**" or "**Select All**". |
| **FR-04-02** | Variable Injection | (Optional) Support simple variable substitution. |

**FR-04-02 Variable Injection Example**:

```
Template: Check file {filename}
Agent-01: Check file src/main.ts
Agent-02: Check file src/utils.ts
Agent-03: Check file src/config.ts
```

---

## 4. UI/UX Design Requirements

### 4.1 Interface Layout

#### Dashboard Grid View

```
┌────────────────────────────────────────────────────────────────────┐
│  Neural Hive - AI Agent Orchestrator                    [─][□][×]  │
├────────────────────────────────────────────────────────────────────┤
│  [+ New Agent]  [📢 Broadcast]  [⚙ Settings]           Filter: All │
├──────────────────┬──────────────────┬──────────────────────────────┤
│                  │                  │                              │
│  ┌────────────┐  │  ┌────────────┐  │  ┌────────────┐              │
│  │ Agent-01 🟢│  │  │ Agent-02 🟡│  │  │ Agent-03 🔵│              │
│  │ Claude     │  │  │ Gemini     │  │  │ Claude     │              │
│  │ ──────────│  │  │ ──────────│  │  │ ──────────│              │
│  │ IDLE       │  │  │ THINKING   │  │  │ WORKING    │              │
│  │ ──────────│  │  │ ──────────│  │  │ ──────────│              │
│  │ > Ready    │  │  │ > Analyz.. │  │  │ 🔧 Edit... │              │
│  │ CPU: 2%    │  │  │ CPU: 45%   │  │  │ CPU: 12%   │              │
│  └────────────┘  │  └────────────┘  │  └────────────┘              │
│                  │                  │                              │
├──────────────────┴──────────────────┴──────────────────────────────┤
│  Status: 3 agents active | Memory: 1.2 GB | Uptime: 02:34:12       │
└────────────────────────────────────────────────────────────────────┘
```

**Card Content**:
- Agent name and type tag
- Current status light (🟢/🟡/🔴)
- Preview of the last 3 log lines
- **Current Working Directory (CWD)** (displayed at the bottom)
- CPU/Memory usage (optional)

#### Focus Mode View

```
┌────────────────────────────────────────────────────────────────────┐
│  Agent-02: Gemini                                [Back] [⟲] [×]   │
├─────────────────────────────────┬──────────────────────────────────┤
│                                 │  Chain of Thought                │
│  ┌─────────────────────────────┐│  ────────────────────────────    │
│  │ $ gemini-cli                ││  1. 📖 Reading project files     │
│  │                             ││  2. 🔍 Searching for patterns    │
│  │ > Analyzing codebase...     ││  3. 💭 Formulating response      │
│  │ > Found 12 TypeScript files ││                                  │
│  │ > Checking dependencies...  ││  ────────────────────────────    │
│  │                             ││  Skills Used                     │
│  │ [Thinking...]               ││  ────────────────────────────    │
│  │                             ││  ☑ FileSearch (3 calls)          │
│  │                             ││  ☑ CodeAnalysis (1 call)         │
│  │ _                           ││  ☐ WebFetch (pending)            │
│  └─────────────────────────────┘│                                  │
│  ┌─────────────────────────────┐│                                  │
│  │ Enter command...         [⏎]││                                  │
│  └─────────────────────────────┘│                                  │
└─────────────────────────────────┴──────────────────────────────────┘
```

**Layout Description**:
- **Left Side**: Full xterm.js terminal view.
- **Right Side**: Parsed "Chain of Thought" and "History of Skills Used."

### 4.2 User Experience (UX)

| Item | Specification |
|---|---|
| **Visual Feedback** | When an agent is in the `WORKING` state, its card border should have a **breathing light effect**. |
| **Error Alert** | If the CLI outputs `Error` or `Exception`, the card should **immediately turn red**, and a badge should appear on the taskbar icon. |
| **State Transition** | State changes should have a 300ms transition animation. |
| **Responsive Layout** | The grid should automatically adjust its column count (1-4 columns) based on the window size. |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| ID | Requirement | Specification |
|---|---|---|
| **NFR-01** | Render Throttling | Frontend log update frequency must not exceed **30 FPS**. The backend must implement a buffer mechanism (bundling data every **100ms**) to prevent high-concurrency output from freezing Electron. |
| **NFR-02** | Memory Management | When an agent's output exceeds **10,000 lines**, the frontend xterm.js must automatically trim the old buffer. |
| **NFR-03** | Startup Time | Application cold start time should be less than **3 seconds**. |
| **NFR-04** | Concurrency Support | The system should stably run **20+** simultaneously active agents. |

### 5.2 Extensibility

| ID | Requirement | Specification |
|---|---|---|
| **NFR-05** | Config-Driven | Parsing rules (Regex) should be stored in a **JSON config file**, allowing users to add support for other CLI tools without recompiling. |
| **NFR-06** | Plugin Architecture | Reserve a plugin interface for future support of tools like AWS CLI, Azure CLI, etc. |

**Example Config File Structure** (`config/parsers.json`):

```json
{
  "parsers": {
    "claude": {
      "name": "Claude Code",
      "command": "claude",
      "patterns": {
        "thinking": "Thinking\\\\.\\\\.\\.\\.",
        "tool_use": "Running (\\w+)\\\\.\\\\.\\.\\.",
        "error": "Error:|Exception:",
        "waiting": "\\[y/n\\]|\\(\\(yes/no\\)"
      }
    },
    "gemini": {
      "name": "Gemini CLI",
      "command": "gemini",
      "patterns": {
        "thinking": "\\[Thinking\\]",
        "tool_use": "\\[Tool Use\\]: (\\w+)",
        "error": "ERROR:|FAILED:",
        "waiting": "Confirm\?"
      }
    }
  }
}
```

---

## 6. Implementation Roadmap

### Phase 1: Core Prototype (Proof of Concept)

```
Goal: Validate technical feasibility
Cycle: Sprints 1-2
```

| Milestone | Acceptance Criteria |
|---|---|
| Electron Environment Setup | Successfully launch a blank Electron window. |
| node-pty Integration | Can successfully launch the `claude` CLI and intercept its output. |
| xterm.js Rendering | Frontend displays terminal output with ANSI colors. |
| Basic IPC | Bidirectional communication between Main and Renderer processes works correctly. |

**Deliverable**:
- An app with a single "Start Claude" button and a single xterm window.

### Phase 2: Multi-Agent & Parsing

```
Goal: Complete core functionality
Cycle: Sprints 3-5
```

| Milestone | Acceptance Criteria |
|---|---|
| AgentManager Class | Supports dynamic addition/removal of agents (≥5 simultaneously). |
| State Parsing Engine | Correctly identifies THINKING/WORKING/IDLE states. |
| Grid View UI | Responsive card layout with real-time status updates. |
| Focus Mode | Clicking a card enters the full terminal interface. |

**Deliverable**:
- A Grid View interface that shows state transitions between "Thinking" and "Idle."
- Complete agent lifecycle management.

### Phase 3: Broadcasting & Polish

```
Goal: Production-ready
Cycle: Sprints 6-8
```

| Milestone | Acceptance Criteria |
|---|---|
| Command Broadcasting | Supports tag selection and batch sending. |
| Performance Optimization | Passes all performance tests NFR-01 to NFR-04. |
| Edge Case Handling | Detection and automatic restart for frozen CLI processes. |
| UI Animations | Breathing light effect, state transition animations. |
| Error Handling | Comprehensive error alerts and recovery mechanisms. |

**Deliverable**:
- v1.0 official release
- User documentation

---

## Appendix

### A. Glossary

| Term | Definition |
|---|---|
| **Agent** | An independent, running instance of an AI CLI. |
| **TTY** | Teletypewriter, the terminal interface. |
| **IPC** | Inter-Process Communication. |
| **ANSI** | American National Standards Institute, here referring to terminal color escape codes. |
| **node-pty** | A pseudo-terminal implementation for Node.js. |

### B. Related Documents

- [ ] Technical Design Document (TDD)
- [ ] API Specification
- [ ] Test Plan
- [ ] User Manual

---

*Document Version: 1.0.0*
*Last Updated: 2026-01-22*
*Author: System Orchestrator*
