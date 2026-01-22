# 🐝 Neural Hive User Manual

> **AI Agent Orchestrator** — v1.0.0

---

## 📋 Table of Contents

1. [Introduction](#introduction)
2. [Installation & Setup](#installation--setup)
3. [Core Features](#core-features)
4. [Advanced Operations](#advanced-operations)
5. [Configuration](#configuration)
6. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is Neural Hive?

**Neural Hive** is a desktop application designed for developers to manage multiple AI CLI tools (such as Claude Code, Gemini CLI, Aider) simultaneously.

Think of it as a "Command Center" that consolidates all your AI assistant terminal windows into a single, unified interface. You can have one agent writing frontend code, another fixing bugs, and a third writing documentation, all while monitoring their thinking processes and statuses via a visual dashboard.

### Why use it?

- **Centralized Management**: No more getting lost in dozens of terminal windows.
- **Visual Status**: Instantly see who is `THINKING`, `WORKING` (executing tools), or in an `ERROR` state.
- **Batch Control**: Send commands like "git status" to all agents at once.
- **Context Awareness**: Always know the working directory (CWD) of each agent.

---

## Installation & Setup

### System Requirements

- **Node.js**: v18.0.0 or higher
- **OS**: Windows, macOS, or Linux

### Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-org/neural-hive.git
   cd neural-hive
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Launch the Application**

   **Development Mode** (Recommended, supports hot-reload):
   ```bash
   # Open two terminal tabs/windows:
   npm run dev          # Starts the frontend dev server
   npm run dev:electron # Starts the Electron main process
   ```

   **Production Mode** (Build and run):
   ```bash
   npm run build
   npm run build:electron
   # Run the executable found in dist/ win-unpacked (or equivalent for your OS)
   ```

---

## Core Features

### 1. Dashboard

Upon launching, you are greeted by the main dashboard. This grid view displays all active agents as cards.

- **Status Bar**: Shows the current Neural Hive version (v1.0.0) and the count of active agents at the top.
- **Grid View**: Automatically arranges agent cards for optimal visibility.

### 2. Spawning Agents

Click the **[+ New Agent]** button in the top right corner:

1. **Select Type**: Choose from `Claude`, `Gemini`, `Custom`, etc.
2. **Name (Optional)**: Give your agent a meaningful name (e.g., "Frontend Refactor") to easily identify it.
3. **Select Directory**: Specify the Current Working Directory (CWD) for the agent.
4. Click **Spawn**.

### 3. Agent Cards

Each card provides the following information:

- **Header**: Agent Name and Type.
- **Status Indicators**:
  - 🟡 **THINKING**: AI is processing or analyzing.
  - 🟢 **WORKING**: AI is using a tool (reading, writing, searching).
  - 🔵 **IDLE**: Waiting for user input.
  - 🔴 **ERROR**: An error or exception occurred.
  - 🟣 **PAUSED**: Input is temporarily suspended.
- **Terminal Preview**: Shows the last few lines of output.
- **Footer**: Displays the current working directory path with a folder icon.

### 4. Focus Mode

**Click on any card** to enter full-screen Focus Mode.

- **Full Terminal**: Provides a complete xterm.js experience with scrolling, copy, and paste support.
- **Interaction**: Directly interact with the CLI (e.g., confirming `y/n` prompts).
- **Side Panel**: (Future Feature) Displays Chain of Thought and tool usage history.

---

## Advanced Operations

### Pause & Resume

Using the controls in the top-right of each card:
- ⏸️ **Pause**: Temporarily locks input for the agent to prevent accidental commands.
- ▶️ **Resume**: Unlocks the agent for interaction.
- ❌ **Kill**: Completely terminates the agent process.

### Command Broadcasting

Want to update the git status for all agents at once?

1. Open the broadcast panel (via UI button).
2. Enter your command (e.g., `git status`).
3. Select targets (All agents or specific tags).
4. Click Send.

---

## Configuration

Neural Hive uses `config/parsers.json` to define how it parses output from different AI tools.

### Custom Parsing Rules

You can edit `config/parsers.json` to support new CLI tools or adjust existing rules:

```json
{
  "parsers": {
    "claude": {
      "name": "Claude Code",
      "command": "claude",
      "patterns": {
        "thinking": "Thinking|Analyzing",  // Keywords triggering THINKING state
        "tool_use": "Reading|Writing",     // Keywords triggering WORKING state
        "error": "Error|Exception"         // Keywords triggering ERROR state
      }
    }
  }
}
```

Note: A restart is usually required for configuration changes to take effect.

---

## Troubleshooting

### Q: Agent fails to spawn?
- Ensure the corresponding CLI tool (e.g., `claude`, `gemini`) is installed and available in your system's `PATH`.
- Verify that the selected working directory exists.

### Q: Status stuck on IDLE?
- Check the regular expressions in `parsers.json`. CLI tools sometimes update their output format, which might break the matching rules.

### Q: Garbled text (Mojibake)?
- Neural Hive defaults to UTF-8 encoding. Ensure your CLI tool and system terminal environment variables are set to use UTF-8.

---

**Neural Hive Team**  
*Empowering your AI workflow.*
