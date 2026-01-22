# 🐝 Neural Hive - 專案開發指南 (Project Context)

## 1. 專案概述
**Neural Hive** 是一個基於 Electron 的桌面應用程式，旨在同時管理多個 AI 程式設計助手（如 Claude Code, Gemini CLI, Aider 等）。它解決了多視窗管理的混亂問題，提供統一的介面來監控狀態、發送指令及檢視輸出 [1, 2]。

## 2. 技術堆疊 (Tech Stack)
在此專案中編寫程式碼時，請遵循以下技術規範 [3, 4]：

*   **核心框架**: Electron (Main Process)
*   **前端框架**: Vue 3 + TypeScript (Renderer Process)
*   **語言**: TypeScript (全專案強制使用)
*   **狀態管理**: Pinia
*   **樣式**: Tailwind CSS + Shadcn/ui
*   **終端機模擬**: node-pty (後端 TTY 模擬) + xterm.js (前端呈現)
*   **建置工具**: Vite (支援 Hot-reloading)
*   **測試框架**: Vitest

## 3. 系統架構 (Architecture)
專案採用標準的 Electron 架構，分離核心邏輯與 UI [3]：

*   **Main Process (`electron/`)**: 處理 Node.js 邏輯、與 OS 互動、管理 `node-pty` 終端機進程。
*   **Renderer Process (`src/`)**: 負責 UI 渲染，透過 IPC (Inter-Process Communication) 與主進程通訊。
*   **IPC Bridge (`electron/preload.ts`)**: 作為安全橋樑，僅暴露必要的 API 給前端。

## 4. 目錄結構關鍵 (Directory Structure) [4]
*   `electron/`: 主進程程式碼
    *   `main.ts`: 應用程式入口點
    *   `config-loader.ts`: 負責讀取 `parsers.json`
    *   `broadcast-manager.ts`: 處理指令廣播
    *   `output-throttler.ts`: 輸出節流控制 (100ms)
*   `src/`: 前端 Vue 應用
    *   `components/`: UI 元件 (`AgentCard.vue`, `TerminalView.vue` 等)
    *   `stores/`: Pinia 狀態 (`agentStore.ts`)
    *   `utils/`: 工具函式 (`parser.ts` 用於 Regex 解析)
*   `config/`: 設定檔
    *   `parsers.json`: 定義 AI CLI 工具的 Regex 解析規則

## 5. 開發指南與最佳實踐 (Development Guidelines)

### A. 新增 AI Agent 支援
若需新增對新 CLI 工具的支援，**不需要修改核心程式碼**，請依照以下步驟 [5]：
1.  修改 `config/parsers.json`，新增該工具的 Regex 規則 (包含 `thinking`, `tool_use`, `error` 模式) [6]。
2.  更新 `src/types/shared.ts` 中的 `AgentType` 定義。
3.  更新 `src/stores/agentStore.ts` 中的 `generateName` 邏輯。

### B. IPC 通訊實作
新增功能涉及前後端溝通時，必須遵循以下流程 [7]：
1.  在 `src/types/shared.ts` 定義新的 Channel 名稱。
2.  在 `electron/main.ts` 實作對應的 `ipcMain.handle` 或 `ipcMain.on`。
3.  在 `electron/preload.ts` 將 API 暴露給 `window.electronAPI`。
4.  在前端 Vue 元件中透過 `window.electronAPI.xxx()` 呼叫。

### C. 狀態解析 (Status Parsing)
*   核心邏輯位於 `src/utils/parser.ts` 與 `electron/config-loader.ts`。
*   系統應自動識別 `THINKING`, `WORKING`, `ERROR`, `IDLE`, `WAITING_USER` 等狀態 [8]。
*   實作新解析邏輯時，需確保不阻塞 UI 渲染 (利用 `output-throttler.ts`) [9]。

## 6. 安全規範 (Security)
所有程式碼變更必須遵守 Electron 安全模型 [10]：
*   **Sandbox**: `true`
*   **Context Isolation**: `true`
*   **Node Integration**: `false` (前端禁止直接使用 Node API)
*   禁止在 Renderer Process 中寫死敏感資訊。

## 7. 測試 (Testing)
*   執行測試指令: `npm test` [5]。
*   主要測試覆蓋範圍: `parser.ts`, `agentStore.ts`, `broadcast-manager.ts`。修改這些模組時必須確保測試通過。

---
*此檔案由 Gemini 生成，旨在協助理解 Neural Hive 專案結構與開發規範。*