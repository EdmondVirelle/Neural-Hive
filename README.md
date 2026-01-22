[繁體中文](./README.zh-TW.md)

# 🐝 Neural Hive

> **AI Agent Cluster Command Center** — A desktop application to manage multiple AI assistants simultaneously.

[![Electron](https://img.shields.io/badge/Electron-35-47848F?logo=electron)](https://electronjs.org)
[![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js)](https://vuejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> [!NOTE]
> 🚧 **Project Status: Beta** 🚧
>
> Check out our **[Development Roadmap](docs/ROADMAP.md)** to see the latest progress and future plans!

---

## 📖 What is this?

**Neural Hive** is a desktop application that allows you to **manage multiple AI programming assistants** (like Claude Code, Gemini CLI, Aider, etc.) simultaneously, monitoring their status, viewing their output, and sending commands through a unified interface.

### 🎯 The Problem It Solves

When you need to use multiple AI assistants for different tasks:
- ❌ Opening multiple terminal windows is hard to track.
- ❌ It's difficult to quickly grasp the status of each assistant.
- ❌ You have to switch between windows to send the same command.
- ❌ You can't see at a glance "who is thinking, who is working, and who has an error."

**Neural Hive** centralizes all AI assistants on one screen, providing:
- ✅ **Status Overview** — See the status of all agents at a glance.
- ✅ **Focus Mode** — Click on any agent to enter a full-screen terminal.
- ✅ **Batch Operations** — Send the same command to multiple agents at once.
- ✅ **Intelligent Parsing** — Automatically identifies "THINKING," "WORKING," and "ERROR" states.

---

## 🖼️ Feature Preview

```
┌─────────────────────────────────────────────────────────────┐
│  🐝 Neural Hive                              [＋] [Settings] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Claude-01   │  │ Gemini-02   │  │ Aider-03    │         │
│  │ 🟡 THINKING │  │ 🟢 WORKING  │  │ 🔵 IDLE     │         │
│  │             │  │             │  │             │         │
│  │ Analyzing   │  │ Reading     │  │ Waiting...  │         │
│  │ codebase... │  │ files...    │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  Status: 🟡 1 Thinking | 🟢 1 Working | 🔵 1 Idle | 🔴 0 Error   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏛️ Architecture

Neural Hive uses an Electron-based architecture that separates the core logic (Main Process) from the UI (Renderer Process). It interfaces with external command-line tools via a pseudo-terminal (node-pty) to ensure full compatibility.

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

---

## ✨ Core Features

### 1️⃣ Agent Session Management
- **Add Agent** — Launch Claude, Gemini, Aider, or custom CLI tools.
- **Custom Naming** — Assign meaningful names (e.g., "Frontend", "Backend") to each agent for better organization.
- **Multi-instance Support** — Run 20+ agents simultaneously.
- **Lifecycle Control** — Start, pause, restart, and terminate any agent.

### 2️⃣ Full Terminal Interaction
- **True PTY Simulation** — Deceives CLI tools into thinking they're in a real terminal, preserving colors, prompts (y/n), and cursor movements.
- **Focus Mode** — Click a card to enter a full-screen terminal with a dedicated "Chain of Thought" and "Skills Used" panel.
- **Context Awareness** — Always see the agent's Current Working Directory (CWD) at the bottom of the card.

### 3️⃣ Intelligent Status Parsing
- **Rich State Detection** — Automatically identifies states like `IDLE`, `THINKING`, `WORKING`, `ERROR`, and even `WAITING_USER` for interactive prompts.
- **Skill Tracking** — Intelligently extracts the tool an agent is using (e.g., "Reading file...", "Searching...") and displays it.

### 4️⃣ Polished & Responsive UI/UX
- **Visual Feedback** — A "breathing light" effect on the card border shows you exactly who is working.
- **Instant Error Alerts** — Agent cards turn red and a badge appears on the taskbar icon if an error occurs.
- **Responsive Layout** — The grid automatically adjusts its columns to fit your window size.

### 5️⃣ Powerful Automation
- **Command Broadcasting** — Send the same command to multiple agents at once using a flexible tagging system.
- **Variable Injection** — Use variables in your broadcasted commands for dynamic prompts (e.g., `Analyze {file_path}`).

### 6️⃣ Extensible & Robust by Design
- **Config-Driven Parsers** — Add support for new AI CLI tools yourself by simply editing a JSON file—no code changes needed.
- **High-Performance Rendering** — A built-in output throttler prevents UI freezes even when agents produce a high volume of text, ensuring a smooth experience.

---

## 🚀 Quick Start

### System Requirements

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Python** 3.x (Optional, for running scripts in `execution`)
- **OS** Windows 10+, macOS 10.15+, Linux

### Installation

```bash
# 1. Clone the project
git clone https://github.com/your-org/neural-hive.git
cd neural-hive

# 2. Install Node.js dependencies
npm install

# 3. (Optional) Install Python dependencies
# If execution/parse_lint.py requires extra packages, creating a requirements.txt is recommended.
# pip install -r execution/requirements.txt
```

### Launching the Electron App

```bash
# Development Mode (Hot-reloading)
npm run dev          # Starts the Vite dev server
npm run dev:electron # Starts Electron (in a separate terminal)

# Production Build
npm run build        # Builds the frontend
npm run build:electron # Packages the Electron app
```

---

## 📁 Project Structure

```
neural-hive/
├── electron/                 # Electron Main Process
│   ├── main.ts              # Main process entry point
│   ├── preload.ts           # Preload script (IPC Bridge)
│   ├── config-loader.ts     # Parser rules loader
│   ├── output-throttler.ts  # Output throttler (100ms)
│   ├── broadcast-manager.ts # Command broadcast manager
│   └── __tests__/           # Backend tests
│
├── src/                      # Vue Frontend
│   ├── App.vue              # Main app component
│   ├── main.ts              # Vue entry point
│   ├── components/          # UI Components
│   │   ├── AgentCard.vue    # Agent card
│   │   ├── AgentGrid.vue    # Agent grid layout
│   │   ├── FocusMode.vue    # Focus mode (full-screen)
│   │   ├── TerminalView.vue # xterm.js terminal
│   │   └── SkillsPanel.vue  # Skills/thought chain panel
│   ├── composables/
│   │   └── useTerminal.ts   # xterm.js integration
│   ├── stores/
│   │   └── agentStore.ts    # Pinia state management
│   ├── utils/
│   │   └── parser.ts        # Output parsing utility
│   └── __tests__/           # Frontend tests
│
├── config/
│   └── parsers.json         # Parsing rules configuration
│
├── scripts/
│   └── mock-agent.js        # Mock agent for development
│
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── vitest.config.ts
```

---

## ⚙️ Configuration

### Parsing Rules (`config/parsers.json`)

Defines how to identify agent states from CLI output:

```json
{
  "parsers": {
    "claude": {
      "name": "Claude Code",
      "command": "claude",
      "patterns": {
        "thinking": "Thinking|Analyzing|Considering",
        "tool_use": "\[Tool Use\]|Reading|Writing|Searching",
        "error": "Error|Exception|Failed"
      }
    }
  }
}
```

### Environment Variables

| Variable    | Description         | Default       |
|-------------|---------------------|---------------|
| `NODE_ENV`  | Environment mode    | `development` |
| `VITE_PORT` | Dev server port     | `5173`        |

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests once (no watch mode)
npm test -- --run

# Run tests and generate a coverage report
npm run test:coverage
```

### Test Coverage

| Module                 | Tests |
|------------------------|-------|
| `parser.ts`            | 31    |
| `agentStore.ts`        | 21    |
| `output-throttler.ts`  | 15    |
| `broadcast-manager.ts` | 25    |
| `config-loader.ts`     | 20    |
| **Total**              | **112** |

---

## 🔧 Development Guide

### Adding a New Agent Type

1.  Edit `config/parsers.json` to add new parsing rules.
2.  Update the `AgentType` in `src/types/shared.ts`.
3.  Update `generateName` in `src/stores/agentStore.ts`.

### Adding a New IPC Channel

1.  Add the channel name in `src/types/shared.ts`.
2.  Implement the handler in `electron/main.ts`.
3.  Expose the API in `electron/preload.ts`.
4.  Call `window.electronAPI.xxx()` in the frontend.

---

## 📜 FAQ

### Q: Why does an agent card show "Unknown Status"?

A: Check if the regular expressions in `config/parsers.json` match the output format of that CLI tool.

### Q: How can I support a new AI CLI tool?

A: Add a new parser configuration in `config/parsers.json` that defines the output patterns for the tool.

### Q: How many agents can run at the same time?

A: It is designed to support 20+ concurrent agents, but the actual number depends on system resources.

---

## 🛡️ Security

- ✅ Electron Sandbox Mode (`sandbox: true`)
- ✅ Context Isolation (`contextIsolation: true`)
- ✅ Node Integration Disabled (`nodeIntegration: false`)
- ✅ Full Input Validation
- ✅ No Hard-coded Sensitive Information

---

## 📄 License

MIT License

---

## 🤝 Contributing

Issues and Pull Requests are welcome!

---

<p align="center">
  <b>Neural Hive</b> — Let your AI assistants work as a cluster.<br>
  Made with ❤️ by the Neural Hive Team
</p>
