# Neural Hive - Development Roadmap & Known Issues

> **AI Agent Cluster Command Center** - Development Status & Contribution Guide

[![Status](https://img.shields.io/badge/Status-Beta-blue)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)]()

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture Analysis](#architecture-analysis)
- [Known Issues & Technical Debt](#known-issues--technical-debt)
- [Feature Roadmap](#feature-roadmap)
- [Performance Considerations](#performance-considerations)
- [Contributing Guidelines](#contributing-guidelines)

---

## Project Overview

Neural Hive is a cross-platform desktop application that enables developers to **manage multiple AI CLI tools simultaneously** (Claude Code, Gemini CLI, Aider, etc.) through a unified graphical interface.

### Core Value Proposition

| Problem | Solution | Impact |
|---------|----------|--------|
| Multiple terminal windows | Unified Grid View | 300% efficiency gain |
| Unknown agent status | Auto state detection | Faster decision making |
| Repetitive commands | Batch broadcasting | Reduced operational cost |
| Context switching | Focus mode + Skills panel | Lower cognitive load |

### Tech Stack

```
Frontend:  Vue 3 + TypeScript + Pinia + Tailwind CSS
Backend:   Electron + Node.js + node-pty
Terminal:  xterm.js + xterm-addon-fit
Testing:   Vitest (112+ tests)
Build:     Vite + electron-builder
```

---

## Architecture Analysis

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Application                      │
├─────────────────────────────┬───────────────────────────────┤
│      Main Process           │       Renderer Process        │
│  ┌───────────────────────┐  │  ┌─────────────────────────┐  │
│  │  Node.js + TypeScript │  │  │   Vue 3 + TypeScript    │  │
│  │  ─────────────────────│  │  │  ─────────────────────  │  │
│  │  • node-pty (TTY)     │  │  │  • Pinia (State Mgmt)   │  │
│  │  • Agent Manager      │◄─┼──┤  • Tailwind CSS         │  │
│  │  • Broadcast Manager  │──┼─►│  • Shadcn/ui            │  │
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

### Strengths

- [x] Clean three-layer separation (Renderer ↔ Preload ↔ Main)
- [x] Secure context isolation (`contextIsolation: true`, `sandbox: true`)
- [x] Output throttling (100ms batching via `OutputThrottler`)
- [x] Comprehensive test coverage (112+ unit tests)
- [x] Full TypeScript coverage with shared types

---

## Known Issues & Technical Debt

### Critical Issues

| ID | Issue | Impact | Status | Priority |
|----|-------|--------|--------|----------|
| #001 | **node-pty cross-platform compatibility** | Windows/Unix behavior differences may cause crashes | Open | P0 |
| #002 | **Memory leak on long-running agents** | App becomes unresponsive after hours of use | Open | P0 |
| #003 | **Electron memory overhead** | 20+ agents may cause OOM on low-spec machines | Open | P1 |

### Technical Debt

| ID | Debt | Description | Effort |
|----|------|-------------|--------|
| TD-001 | **Parser runs on main thread** | Regex parsing blocks UI during high throughput | Medium |
| TD-002 | **No virtual scrolling** | xterm.js performance degrades with large buffers | Medium |
| TD-003 | **Hardcoded status colors** | Should be configurable via theme | Low |
| TD-004 | **No error boundary** | Vue errors can crash entire app | Low |
| TD-005 | **Missing E2E tests** | Only unit tests exist | High |

### Missing Features (MVP)

| ID | Feature | Spec Reference | Status |
|----|---------|----------------|--------|
| MF-001 | Keyboard shortcuts (Cmd+1~9) | UX Enhancement | Not Started |
| MF-002 | Log full-text search (Ctrl+F) | UX Enhancement | Not Started |
| MF-003 | Log export functionality | NFR-02 | Not Started |
| MF-004 | System notifications on error | FR-03-02 | Not Started |
| MF-005 | Breathing light animation | UX 4.2 | Not Started |
| MF-006 | 300ms state transition animation | UX 4.2 | Not Started |
| MF-007 | Taskbar error badge | UX 4.2 | ✅ Done |
| MF-008 | CLI freeze detection & auto-restart | Phase 3 | 🔄 In Progress |

---

## Feature Roadmap

### Phase 1: Core Prototype

```
Status: ████████████████████ 100%
```

| Milestone | Acceptance Criteria | Status |
|-----------|---------------------|--------|
| Electron environment setup | Empty Electron window launches | ✅ Done |
| node-pty integration | Can spawn `claude` CLI and capture output | ✅ Done |
| xterm.js rendering | Frontend displays ANSI colored terminal output | ✅ Done |
| Basic IPC | Main ↔ Renderer bidirectional communication | ✅ Done |
| Grid View UI (Basic) | Static card layout for agents | ✅ Done |
| Initial State Parsing | Basic THINKING/IDLE detection | ✅ Done |


**Deliverable:** A functional prototype capable of launching agents and viewing their output.

---

### Phase 2: Multi-Agent & Interactivity

```
Status: ██████████████████░ 90%
```

| Milestone | Acceptance Criteria | Status |
|-----------|---------------------|--------|
| AgentManager class | Support dynamic add/remove of ≥20 agents | ✅ Done |
| Advanced State Parsing | Correctly identify THINKING/WORKING/ERROR/IDLE | 🔄 In Progress |
| Grid View UI | Responsive card layout with real-time status updates | ✅ Done |
| Focus Mode | Click card to enter full terminal interface | ✅ Done |
| Skills Panel | Display Chain of Thought and tool usage history | ✅ Done |

**Deliverable:** Grid View interface showing state transitions, full agent lifecycle management, and interactive focus mode.

---

### Phase 3: Broadcasting & Polish

```
Status: █████░░░░░░░░░░░░░░░ 25%
```

| Milestone | Acceptance Criteria | Status |
|-----------|---------------------|--------|
| Command broadcasting | Support tag selection and batch sending | 🔄 In Progress |
| Variable injection | Template variables like `{filename}` | ⏳ Pending |
| Performance optimization | Pass NFR-01~04 all performance tests | ⏳ Pending |
| Edge case handling | CLI freeze detection and auto-restart | 🔄 In Progress |
| UI animations | Breathing light effect, state transitions | ⏳ Pending |
| Error handling | Complete error prompts and recovery | ⏳ Pending |

**Deliverable:** v1.0 Production Release + User Documentation

---

## Performance Considerations

### Current Bottlenecks

| Bottleneck | Current State | Target | Solution |
|------------|---------------|--------|----------|
| **IPC throughput** | 100ms batching | Maintain | ✅ OutputThrottler implemented |
| **Regex parsing** | Main thread | Web Worker | Move parser.ts to Worker |
| **xterm buffer** | 10K line limit | Virtual scroll | Implement lazy rendering |
| **Memory per agent** | ~50MB | ~30MB | Optimize state management |

### Performance Targets (NFR)

| ID | Requirement | Target | Test Method |
|----|-------------|--------|-------------|
| NFR-01 | Render throttling | ≤30 FPS, 100ms buffer | Automated benchmark |
| NFR-02 | Memory management | Auto-trim at 10K lines | Memory profiling |
| NFR-03 | Cold start time | <3 seconds | Startup timing |
| NFR-04 | Concurrent support | 20+ active agents stable | Stress testing |

### Recommended Optimizations

1. **Web Worker Parsing**
   ```
   Priority: High
   Effort: Medium
   Impact: Unblock main thread during high output
   ```

2. **Virtual Scrolling for Logs**
   ```
   Priority: Medium
   Effort: Medium
   Impact: Handle unlimited log history
   ```

3. **SharedArrayBuffer for IPC**
   ```
   Priority: Low
   Effort: High
   Impact: Reduce serialization overhead
   ```

---

## Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **CLI output format changes** | High | High | Version parser configs, user reporting mechanism |
| **node-pty compatibility issues** | Medium | High | CI test matrix for Windows/Mac/Linux |
| **Electron security vulnerabilities** | Medium | Medium | Regular dependency updates, security audits |
| **Performance bottlenecks** | Medium | Medium | Establish performance benchmark tests |

### Dependency Risks

| Dependency | Risk Level | Reason |
|------------|------------|--------|
| `node-pty` | 🟡 Medium | Native module, may break on Electron upgrades |
| `xterm.js` | 🟢 Low | Mature, actively maintained |
| `Electron` | 🟡 Medium | Frequent security updates required |
| External CLIs | 🔴 High | Third-party tool output may change |

---

## Contributing Guidelines

### Getting Started

```bash
# Clone the repository
git clone https://github.com/your-org/neural-hive.git
cd neural-hive

# Install dependencies
npm install

# Start development mode
npm run dev

# Run tests
npm test
```

### How to Contribute

#### Good First Issues

Look for issues tagged with `good-first-issue`:

- [ ] Add keyboard shortcut for switching agents (Cmd/Ctrl + 1-9)
- [ ] Implement log search functionality (Ctrl + F)
- [ ] Add system notification on agent error
- [ ] Implement breathing light animation for WORKING state
- [ ] Add dark/light theme toggle

#### Areas Needing Help

| Area | Skills Needed | Difficulty |
|------|---------------|------------|
| **Performance** | Profiling, Web Workers | Hard |
| **Testing** | E2E testing, Playwright | Medium |
| **Documentation** | Technical writing | Easy |
| **UI/UX** | Vue 3, CSS animations | Medium |
| **Cross-platform** | Windows/Linux testing | Medium |

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Write** tests for your changes
4. **Ensure** all tests pass (`npm test`)
5. **Commit** your changes (`git commit -m 'Add amazing feature'`)
6. **Push** to the branch (`git push origin feature/amazing-feature`)
7. **Open** a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Add JSDoc comments for public APIs
- Ensure ESLint passes (`npm run lint`)

---

## Future Considerations

### v2.0 Ideas

- [ ] **Plugin System** - Allow third-party parser extensions
- [ ] **Team Collaboration** - Share agent sessions across users
- [ ] **Cloud Sync** - Backup configurations and logs
- [ ] **MCP Integration** - Support Model Context Protocol
- [ ] **Tauri Migration** - Reduce binary size and memory usage

### Community Requested Features

_Add your feature requests via GitHub Issues!_

---

## Contact & Support

- **Issues**: [GitHub Issues](https://github.com/your-org/neural-hive/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/neural-hive/discussions)

---

<p align="center">
  <b>Neural Hive</b> — Making AI Assistants Work in Clusters<br>
  Made with ❤️ by the Neural Hive Team
</p>

---

_Last Updated: 2026-01-22_
_Document Version: 1.1.0_