[English](./Specification.md)

# 軟體規格說明書 (Software Requirements Specification)

| 項目 | 內容 |
|------|------|
| **專案名稱** | AI Agent Orchestrator |
| **專案代號** | Neural Hive |
| **版本** | v1.0.0 |
| **日期** | 2026-01-22 |

---

## 目錄

1. [專案概述](#1-專案概述-project-overview)
2. [系統架構](#2-系統架構-system-architecture)
3. [功能需求](#3-功能需求-functional-requirements)
4. [UI/UX 設計規範](#4-uiux-設計規範-uiux-requirements)
5. [非功能需求](#5-非功能需求-non-functional-requirements)
6. [實作階段規劃](#6-實作階段規劃-implementation-roadmap)

---

## 1. 專案概述 (Project Overview)

### 1.1 目標 (Goal)

開發一款**跨平台的桌面應用程式**，旨在解決專業開發者需要同時操作多個 AI CLI 工具（如 Claude Code, Gemini CLI, OpenAI Codex）的痛點。

本系統將作為一個「**圖形化指揮中心**」，允許使用者：
- 並行管理多個 AI 代理（Agent）的生命週期
- 監控其思考與工具使用狀態
- 支援批量指令下達

### 1.2 範圍 (Scope)

**支援對象**：已訂閱 Claude Pro / Gemini Advanced 的使用者，利用其提供的 CLI 工具進行操作（非 API 串接）。

**核心價值**：

| 價值 | 說明 |
|------|------|
| **並行處理** | 同時執行多個 Agent 任務（如：Agent A 寫前端，Agent B 寫後端） |
| **視覺化監控** | 將 CLI 的純文字輸出轉化為狀態儀表板（思考中、執行工具、錯誤） |
| **成本優化** | 利用既有訂閱額度，無需額外 API Token 費用 |

---

## 2. 系統架構 (System Architecture)

### 2.1 技術堆疊 (Tech Stack)

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
│  └───────┬──────────────┘  │  └─────────────────────────┘  │
└─────────┘└───────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │     External CLI Processes    │
              │  ┌─────────┐    ┌──────────┐  │
              │  │ Claude  │    │  Gemini  │  │
              │  └─────────┘    └──────────┘  │
              └───────────────────────────────┘
```

| 層級 | 技術 | 用途 |
|------|------|------|
| Application Shell | Electron | 提供跨平台桌面環境 |
| Backend (Main Process) | Node.js + TypeScript | 核心邏輯處理 |
| Terminal Emulation | node-pty | 核心組件，用於偽裝 TTY |
| IPC Communication | Electron IPC Main/Renderer | 進程間通訊 |
| Frontend (Renderer Process) | Vue 3 + TypeScript | 使用者介面 |
| State Management | Pinia | 管理所有 Agent 的即時狀態 |
| UI Framework | Tailwind CSS + Shadcn/ui | 現代化 UI 組件庫 |
| Terminal Rendering | xterm.js | 用於單點控制時的終端機渲染 |

### 2.2 資料流向 (Data Flow)

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

**流程說明**：

1. **Input**：使用者在 Vue 前端輸入指令 / 點擊按鈕
2. **Process**：Electron Main Process 透過 node-pty 將指令寫入對應的子程序 (stdin)
3. **Execution**：外部 CLI (Claude/Gemini) 執行並產生輸出
4. **Capture**：node-pty 攔截 stdout（含 ANSI 顏色碼）
5. **Parsing**：正則表達式引擎分析輸出流，判斷當前狀態 (Thinking/Tool Use)
6. **Output**：解析後的狀態與原始 Log 透過 IPC 廣播回 Vue 前端進行渲染

---

## 3. 功能需求 (Functional Requirements)

### 3.1 代理人會話管理 (Agent Session Management)

| ID | 功能 | 說明 |
|----|------|------|
| **FR-01-01** | 新增代理人 | 使用者可選擇代理人類型（Claude, Gemini, Custom Script）並指定工作目錄（cwd）來啟動一個新實例 |
| **FR-01-02** | 多重實例 | 系統需支援同時開啟 **N 個（建議上限 20+）** 獨立的 CLI 程序 |
| **FR-01-03** | 生命週期控制 | 支援對個別代理人進行「**暫停**（停止輸入）」、「**重啟**（Kill & Spawn）」與「**銷毀**」操作 |
| **FR-01-04** | 環境隔離 | 每個代理人應運行在獨立的 Process 中，確保記憶體與變數不互相干擾 |

### 3.2 終端機互動與偽裝 (Terminal Interaction & Emulation)

| ID | 功能 | 說明 |
|----|------|------|
| **FR-02-01** | TTY 偽裝 | 必須欺騙 CLI 工具，使其認為運行於標準終端機中，以保留 ANSI 顏色與互動式提示（如 y/n 確認） |
| **FR-02-02** | 互動模式 | 使用者可點擊進入特定 Agent 的「專注模式」，此時應提供完整的 xterm.js 介面，允許直接鍵盤輸入 |

### 3.3 狀態解析與視覺化 (State Parsing & Visualization)

| ID | 功能 | 說明 |
|----|------|------|
| **FR-03-01** | 關鍵字觸發 | 系統需內建針對不同 CLI 的解析規則庫（Regex Ruleset） |
| **FR-03-02** | 狀態映射 | 將解析結果映射為預定義狀態 |
| **FR-03-03** | 技能儀表板 | 在 Grid View 中顯示當前正在執行的操作 |

**FR-03-01 關鍵字觸發 - 解析規則範例**：

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

**FR-03-02 狀態映射**：

| 狀態 | 代碼 | 說明 | 顏色 |
|------|------|------|------|
| 閒置 | `IDLE` | 等待輸入 | 🟢 綠色 |
| 推理中 | `THINKING` | AI 正在思考 | 🟡 黃色 |
| 工作中 | `WORKING` | 執行 Skill/Tool 中 | 🔵 藍色 |
| 錯誤 | `ERROR` | 發生錯誤 | 🔴 紅色 |
| 等待確認 | `WAITING_USER` | 等待使用者確認（如 y/n） | 🟠 橙色 |

**FR-03-03 技能儀表板顯示範例**：

```
┌─────────────────────────────────┐
│  Agent-01                   🟡  │
│  ─────────────────────────────  │
│  🔍 Searching: WPF Bindings     │
│  ─────────────────────────────  │
│  > Analyzing project structure  │
│  > Found 3 relevant files...    │
└─────────────────────────────────┘
```

### 3.4 指令廣播系統 (Command Broadcasting)

| ID | 功能 | 說明 |
|----|------|------|
| **FR-04-01** | 批量指令 | 支援透過「**標籤（Tags）**」或「**全選**」方式，將同一段 Prompt 同時發送給多個 Agent |
| **FR-04-02** | 變數注入 | （選配）支援簡單的變數替換 |

**FR-04-02 變數注入範例**：

```
模板：Check file {filename}
Agent-01: Check file src/main.ts
Agent-02: Check file src/utils.ts
Agent-03: Check file src/config.ts
```

---

## 4. UI/UX 設計規範 (UI/UX Requirements)

### 4.1 介面佈局 (Layout)

#### 監控視圖 (Dashboard Grid)

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

**卡片內容**：
- Agent 名稱與類型標籤
- 當前狀態燈號 (🟢/🟡/🔴)
- 最近 3 行 Log 預覽
- CPU/記憶體佔用（選配）

#### 專注視圖 (Focus Mode)

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

**佈局說明**：
- **左側**：完整 xterm.js 終端機畫面
- **右側**：解析後的「思考鏈 (Chain of Thought)」與「已用 Skills 歷史清單」

### 4.2 使用者體驗 (UX)

| 項目 | 規範 |
|------|------|
| **視覺回饋** | 當 Agent 處於 `WORKING` 狀態時，卡片邊框應有**呼吸燈效果** |
| **錯誤警示** | 若 CLI 輸出 `Error` 或 `Exception`，該卡片應**立即變紅**並在 Taskbar圖示上顯示標記 |
| **狀態轉換** | 狀態變化應有 300ms 的過渡動畫 |
| **響應式佈局** | Grid 應根據視窗大小自動調整欄數（1-4 欄） |

---

## 5. 非功能需求 (Non-Functional Requirements)

### 5.1 效能要求 (Performance)

| ID | 需求 | 規格 |
|----|------|------|
| **NFR-01** | 渲染節流 (Throttling) | 前端 Log 更新頻率不得高於 **30 FPS**，後端需實作 Buffer 機制（每 **100ms** 打包一次數據），防止高併發輸出導致 Electron 卡死 |
| **NFR-02** | 記憶體管理 | 當 Agent 輸出超過 **10,000 行**時，前端 xterm.js 需自動清理舊緩衝區 (Trim Buffer) |
| **NFR-03** | 啟動時間 | 應用程式冷啟動時間應小於 **3 秒** |
| **NFR-04** | 併發支援 | 系統應能穩定運行 **20+ 個**同時活躍的 Agent |

### 5.2 擴充性 (Extensibility)

| ID | 需求 | 規格 |
|----|------|------|
| **NFR-05** | 設定檔驅動 | 解析規則（Regex）應存於 **JSON 設定檔**中，允許使用者不需重新編譯即可新增對其他 CLI 工具的支援 |
| **NFR-06** | 插件架構 | 預留插件介面，未來可支援 AWS CLI、Azure CLI 等 |

**設定檔結構範例** (`config/parsers.json`)：

```json
{
  "parsers": {
    "claude": {
      "name": "Claude Code",
      "command": "claude",
      "patterns": {
        "thinking": "Thinking\\.\.\.",
        "tool_use": "Running (\\w+)\\.\.\.",
        "error": "Error:|Exception:",
        "waiting": "\\[y/n\\]|\\(yes/no\\)"
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

## 6. 實作階段規劃 (Implementation Roadmap)

### Phase 1: 核心原型 (Proof of Concept)

```
目標：驗證技術可行性
週期：Sprint 1-2
```

| 里程碑 | 驗收標準 |
|--------|----------|
| Electron 環境搭建 | 成功啟動空白 Electron 視窗 |
| node-pty 整合 | 能成功啟動 `claude` CLI 並攔截輸出 |
| xterm.js 渲染 | 前端顯示含有 ANSI 顏色的終端輸出 |
| 基礎 IPC | Main ↔ Renderer 雙向通訊正常 |

**產出物**：
- 一個只有單一按鈕「Start Claude」與單一 xterm 視窗的 App

### Phase 2: 多工與解析 (Multi-Agent & Parsing)

```
目標：核心功能完整
週期：Sprint 3-5
```

| 里程碑 | 驗收標準 |
|--------|----------|
| AgentManager 類別 | 支援動態新增/移除 Agent（≥5 個同時） |
| 狀態解析引擎 | 正確識別 THINKING/WORKING/IDLE 狀態 |
| Grid View UI | 響應式卡片佈局，即時更新狀態 |
| 專注模式 | 點擊卡片可進入完整終端介面 |

**產出物**：
- Grid View 介面，能顯示「思考中」與「閒置」狀態切換
- 完整的 Agent 生命週期管理

### Phase 3: 廣播與優化 (Broadcasting & Polish)

```
目標：生產就緒
週期：Sprint 6-8
```

| 里程碑 | 驗收標準 |
|--------|----------|
| 指令廣播 | 支援標籤選擇與批量發送 |
| 效能優化 | 通過 NFR-01~04 所有效能測試 |
| Edge Case 處理 | CLI 卡死偵測與自動重啟 |
| UI 動畫 | 呼吸燈效果、狀態轉換動畫 |
| 錯誤處理 | 完整的錯誤提示與恢復機制 |

**產出物**：
- v1.0 正式版
- 使用者文件

---

## 附錄

### A. 術語表 (Glossary)

| 術語 | 定義 |
|------|------|
| **Agent** | 一個獨立運行的 AI CLI 實例 |
| **TTY** | Teletypewriter，終端機介面 |
| **IPC** | Inter-Process Communication，進程間通訊 |
| **ANSI** | 美國國家標準協會，此處指終端顏色編碼標準 |
| **node-pty** | Node.js 的偽終端機 (pseudo-terminal) 實作 |

### B. 相關文件

- [ ] 技術設計文件 (TDD)
- [ ] API 規格書
- [ ] 測試計畫書
- [ ] 使用者手冊

---

*Document Version: 1.0.0*
*Last Updated: 2026-01-22*
*Author: System Orchestrator*
