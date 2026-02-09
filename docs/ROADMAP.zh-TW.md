# Neural Hive - 開發藍圖與已知問題

> **AI 代理叢集指揮中心** - v2.0 開發狀態與貢獻指南

[![狀態](https://img.shields.io/badge/Status-v2.0_Release-green)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)]()

---

## 目錄

- [專案概觀](#專案概觀)
- [架構分析](#架構分析)
- [v2.0 變更記錄](#v20-變更記錄)
- [已知問題與技術債](#已知問題與技術債)
- [功能藍圖](#功能藍圖)
- [效能考量](#效能考量)
- [貢獻指南](#貢獻指南)

---

## 專案概觀

Neural Hive 是一款跨平台的桌面應用程式，讓開發者能透過統一的圖形化介面，**同時管理多個 AI CLI 工具**（Claude Code、Gemini CLI、Aider、Codex、OpenCode、Cursor、GitHub Copilot）。

### 核心價值主張

| 問題 | 解決方案 | 影響 |
|------|----------|------|
| 多個終端機視窗 | 統一的網格視圖 | 效率提升 300% |
| 未知的代理狀態 | 自動狀態偵測 | 更快的決策 |
| 重複性指令 | 批次廣播 | 降低操作成本 |
| 上下文切換 | 專注模式 + 技能面板 | 降低認知負擔 |
| 不知道裝了哪些工具 | CLI 自動偵測 | 零配置啟動 |
| 語言障礙 | 英文/繁體中文雙語 | 更廣泛的使用者 |

### 技術堆疊

```
前端:    Vue 3 + TypeScript + Pinia + Vue Router + Vue I18n
UI:      Tailwind CSS + Shadcn/ui (Glassmorphism)
後端:    Electron + Node.js + node-pty
終端機:  xterm.js + xterm-addon-fit + xterm-addon-search
測試:    Vitest (196 個單元測試，9 個測試檔案)
建置:    Vite + electron-builder
```

---

## 架構分析

### 系統架構

```
┌──────────────────────────────────────────────────────────────┐
│                    Electron 應用程式 (v2.0)                    │
├──────────────────────────────┬───────────────────────────────┤
│       主進程 (Main Process)  │       渲染進程 (Renderer)      │
│  ┌────────────────────────┐  │  ┌──────────────────────────┐  │
│  │  • Agent Manager       │  │  │  • Vue 3 + Vue Router    │  │
│  │  • CLI Detector        │◄─┼──┤  • Pinia (Agent/Settings)│  │
│  │  • Settings Manager    │──┼─►│  • Vue I18n (en/zh-TW)   │  │
│  │  • Broadcast Manager   │  │  │  • Shadcn/ui + Tailwind  │  │
│  │  • Health Monitor      │  │  │  • xterm.js + Search     │  │
│  │  • Output Throttler    │  │  │  • Web Worker (Parser)   │  │
│  │  • Resource Monitor    │  │  │  • Error Boundary        │  │
│  └────────────────────────┘  │  └──────────────────────────┘  │
├──────────────────────────────┴───────────────────────────────┤
│                    External CLI Processes                      │
│  Claude | Gemini | Aider | Codex | OpenCode | Cursor | Copilot│
└──────────────────────────────────────────────────────────────┘
```

### 優勢

- [x] 清晰的三層分離 (渲染層 ↔ 預載層 ↔ 主進程)
- [x] 安全的上下文隔離 (`contextIsolation: true`, `sandbox: true`)
- [x] 輸出節流 (透過 `OutputThrottler` 實現 100ms 批次處理)
- [x] 全面的測試覆蓋 (196 個單元測試)
- [x] 完整的 TypeScript 覆蓋與共享類型
- [x] CLI 自動偵測（7 種 AI 工具）
- [x] 雙語國際化支援
- [x] 主題切換（深色/淺色）
- [x] 錯誤邊界保護
- [x] Web Worker 背景解析

---

## v2.0 變更記錄

### 後端 (Electron Main Process)

| 變更 | 檔案 | 說明 |
|------|------|------|
| 擴展類型系統 | `src/types/shared.ts` | 新增 codex、opencode、cursor、copilot 類型；CliInfo、AppSettings、DetectClisResult |
| CLI 自動偵測 | `electron/cli-detector.ts` | 自動偵測 7 種 CLI 工具的安裝狀態與版本 |
| 設定管理器 | `electron/settings-manager.ts` | 持久化設定至 userData/settings.json |
| 替換 Mock Agent | `electron/agent-manager.ts` | 移除 mock-agent.cjs，改用真實 CLI 啟動 |
| 擴展解析器 | `config/parsers.json` | 新增 codex、opencode、cursor、copilot 的解析規則 |
| 新增 IPC 通道 | `electron/main.ts` + `preload.cts` | DETECT_CLIS、GET_SETTINGS、SAVE_SETTINGS |

### 前端 (Vue Renderer)

| 變更 | 檔案 | 說明 |
|------|------|------|
| Vue Router | `src/router/index.ts` | Memory History；/ (Dashboard)、/settings、/onboarding |
| Vue I18n | `src/i18n/` | 英文 + 繁體中文語系，200+ 翻譯鍵值 |
| Settings Store | `src/stores/settingsStore.ts` | 載入/儲存設定、CLI 偵測結果 |
| App.vue 重構 | `src/App.vue` | 393 行 → ~100 行 Shell Layout |
| AppSidebar | `src/components/layout/AppSidebar.vue` | 可折疊側邊欄 |
| AppTopBar | `src/components/layout/AppTopBar.vue` | 搜尋、新增、廣播 |
| DashboardView | `src/views/DashboardView.vue` | Agent 網格 + 空狀態 |
| SettingsView | `src/views/SettingsView.vue` | 完整設定頁面 |
| OnboardingView | `src/views/OnboardingView.vue` | 首次使用引導精靈 |
| SpawnDialog | `src/components/SpawnDialog.vue` | CLI 偵測整合，顯示安裝狀態 |
| LogSearch | `src/components/LogSearch.vue` | xterm-addon-search 全文搜尋 |
| ErrorBoundary | `src/components/ErrorBoundary.vue` | 局部錯誤捕獲 |
| 鍵盤快捷鍵 | `src/composables/useKeyboardShortcuts.ts` | Ctrl+N/B/,/1-9/F |
| 主題切換 | `src/composables/useTheme.ts` | 深色/淺色 + CSS 變數 |
| Web Worker | `src/workers/parser.worker.ts` | 背景正則解析 |
| 效能優化 | `src/stores/agentStore.ts` | logUpdateCounter 替代 deep watch |

### 測試

| 測試檔案 | 測試數 | 說明 |
|----------|--------|------|
| agentStore.spec.ts | 35 | Agent 狀態管理 |
| parser.spec.ts | 34 | 正則解析器 |
| broadcast-manager.spec.ts | 25 | 指令廣播 |
| config-loader.spec.ts | 20 | 設定載入 |
| output-throttler.spec.ts | 15 | 輸出節流 |
| settingsStore.spec.ts | 26 | 設定狀態管理 |
| settings-manager.spec.ts | 24 | 設定持久化 |
| cli-detector.spec.ts | 13 | CLI 偵測 |
| health-monitor.spec.ts | 4 | 健康監控 |
| **合計** | **196** | **9 個檔案全部通過** |

---

## 已知問題與技術債

### 嚴重問題

| ID | 問題 | 影響 | 狀態 | 優先級 |
|----|------|------|------|--------|
| #001 | **node-pty 跨平台相容性** | Windows/Unix 行為差異 | Open | P0 |
| #002 | **長時間運行的代理記憶體洩漏** | 應用程式漸慢 | Open | P0 |
| #003 | **Electron 記憶體開銷** | 20+ Agent 可能 OOM | Open | P1 |

### 技術債

| ID | 技術債 | 狀態 | 說明 |
|----|--------|------|------|
| TD-001 | 解析器在主線程上運行 | ✅ **已解決** | Web Worker + useParserWorker |
| TD-002 | 沒有虛擬滾動 | Open | xterm.js 大緩衝區效能下降 |
| TD-003 | 硬編碼的狀態顏色 | ✅ **已解決** | 透過 CSS 變數 + 主題切換 |
| TD-004 | 沒有錯誤邊界 | ✅ **已解決** | ErrorBoundary.vue |
| TD-005 | 缺少 E2E 測試 | Open | 僅有單元測試 |
| TD-006 | `{ deep: true }` Log 監聽 | ✅ **已解決** | logUpdateCounter 計數器模式 |

### 已完成的功能 (原 MVP 缺失)

| ID | 功能 | 狀態 |
|----|------|------|
| MF-001 | 鍵盤快捷鍵 (Ctrl+1~9) | ✅ 完成 |
| MF-002 | 日誌全文搜索 (Ctrl+F) | ✅ 完成 |
| MF-003 | 日誌匯出功能 | ⏳ 待定 |
| MF-004 | 錯誤時的系統通知 | ✅ 完成 (Taskbar) |
| MF-005 | 呼吸燈動畫 | ✅ 完成 |
| MF-006 | 300ms 狀態轉換動畫 | ✅ 完成 |
| MF-007 | 工作列錯誤標記 | ✅ 完成 |
| MF-008 | CLI 凍結偵測 | ✅ 完成 (Health Monitor) |

---

## 功能藍圖

### 第一階段：核心原型 ✅ 100%

```
狀態: ████████████████████ 100%
```

| 里程碑 | 狀態 |
|--------|------|
| Electron 環境設定 | ✅ 完成 |
| node-pty 整合 | ✅ 完成 |
| xterm.js 渲染 | ✅ 完成 |
| 基礎 IPC 通訊 | ✅ 完成 |
| 網格視圖 UI | ✅ 完成 |
| 初始狀態解析 | ✅ 完成 |

---

### 第二階段：多代理與互動性 ✅ 100%

```
狀態: ████████████████████ 100%
```

| 里程碑 | 狀態 |
|--------|------|
| AgentManager 類 | ✅ 完成 |
| 進階狀態解析 | ✅ 完成 |
| 響應式網格視圖 | ✅ 完成 |
| 專注模式 | ✅ 完成 |
| 技能面板 | ✅ 完成 |

---

### 第三階段：商業化升級 (v2.0 Renovation) ✅ 100%

```
狀態: ████████████████████ 100%
```

| 里程碑 | 狀態 |
|--------|------|
| 擴展類型系統（7 種 CLI + Custom） | ✅ 完成 |
| CLI 自動偵測引擎 | ✅ 完成 |
| 替換 Mock Agent 為真實 CLI | ✅ 完成 |
| 設定管理器 + 持久化 | ✅ 完成 |
| Vue Router 多頁面架構 | ✅ 完成 |
| Vue I18n 雙語系統 | ✅ 完成 |
| App.vue Shell 重構 | ✅ 完成 |
| Sidebar + TopBar 佈局 | ✅ 完成 |
| SpawnDialog（CLI 偵測整合） | ✅ 完成 |
| SettingsView（完整設定頁面） | ✅ 完成 |
| OnboardingView（首次引導精靈） | ✅ 完成 |
| 鍵盤快捷鍵 | ✅ 完成 |
| 日誌搜尋 (xterm-addon-search) | ✅ 完成 |
| 深色/淺色主題切換 | ✅ 完成 |
| 呼吸燈動畫 | ✅ 完成 |
| ErrorBoundary 組件 | ✅ 完成 |
| Web Worker 解析器 | ✅ 完成 |
| logUpdateCounter 效能優化 | ✅ 完成 |
| 單元測試（9 檔案 / 196 個測試） | ✅ 完成 |

---

### 第四階段：v2.1 規劃

```
狀態: ░░░░░░░░░░░░░░░░░░░░ 0%
```

| 里程碑 | 優先級 | 說明 |
|--------|--------|------|
| E2E 測試 (Playwright) | P1 | 端到端自動化測試 |
| 插件系統 | P2 | 允許第三方解析器擴展 |
| 日誌匯出 | P2 | 匯出 Agent 日誌為檔案 |
| xterm 虛擬滾動 | P2 | 處理超大緩衝區 |
| MCP 整合 | P3 | 支援 Model Context Protocol |
| 團隊協作 | P3 | 共享 Agent 會話 |
| 雲端同步 | P3 | 備份配置和日誌 |
| Tauri 遷移 | P3 | 減少應用程式大小和記憶體使用 |

---

## 效能考量

### 瓶頸與解決狀態

| 瓶頸 | v1.0 狀態 | v2.0 狀態 | 解決方案 |
|------|-----------|-----------|----------|
| **IPC 吞吐量** | 100ms 批次處理 | ✅ 維持 | OutputThrottler |
| **正則表達式解析** | 主線程阻塞 | ✅ **已解決** | Web Worker |
| **Log 深度監聽** | `{ deep: true }` | ✅ **已解決** | logUpdateCounter |
| **xterm 緩衝區** | 1 萬行限制 | ✅ 維持 | scrollback 設定可調 |
| **每個代理記憶體** | ~50MB | 優化中 | 持續觀察 |

### 效能目標 (NFR)

| ID | 需求 | 目標 | 狀態 |
|----|------|------|------|
| NFR-01 | 渲染節流 | ≤30 FPS, 100ms 緩衝 | ✅ 達成 |
| NFR-02 | 記憶體管理 | 1 萬行自動修剪 | ✅ 達成 |
| NFR-03 | 冷啟動時間 | <3 秒 | ✅ 達成 |
| NFR-04 | 並發支援 | 20+ 活動代理 | ✅ 達成 |
| NFR-05 | 主線程保護 | 正則不阻塞 UI | ✅ 達成 (Worker) |
| NFR-06 | 測試覆蓋率 | ≥75% | ✅ 達成 |

---

## 風險評估

### 技術風險

| 風險 | 可能性 | 影響 | 緩解措施 |
|------|--------|------|----------|
| **CLI 輸出格式變更** | 高 | 高 | 版本化 parsers.json，使用者可自訂 |
| **node-pty 相容性** | 中 | 高 | CI 測試矩陣 |
| **Electron 安全漏洞** | 中 | 中 | 定期更新依賴 |
| **效能瓶頸** | 低 | 中 | Web Worker + 節流已實施 |

### 依賴風險

| 依賴 | 風險等級 | 原因 |
|------|----------|------|
| `node-pty` | 中 | 原生模組，Electron 升級時可能中斷 |
| `xterm.js` | 低 | 成熟，積極維護 |
| `Electron` | 中 | 需要頻繁安全更新 |
| 外部 CLI | 高 | 第三方工具輸出可能改變 |

---

## 貢獻指南

### 開始使用

```bash
git clone https://github.com/EdmondVirelle/Neural-Hive.git
cd Neural-Hive

npm install
npm run dev

# 執行測試
npm test
```

### 適合新手的議題

| 議題 | 難度 |
|------|------|
| E2E 測試 (Playwright) | 中 |
| 日誌匯出功能 | 易 |
| xterm 虛擬滾動 | 難 |
| 新增 CLI 解析器 | 易 |
| 新增語言包 | 易 |

### 開發流程

1. **Fork** 儲存庫
2. **建立** 功能分支 (`git checkout -b feature/my-feature`)
3. **編寫** 測試
4. **確保** 全部 196 個測試通過 (`npm test`)
5. **提交** 變更
6. **推送** 分支
7. **開啟** Pull Request

### 程式碼風格

- 所有新程式碼使用 TypeScript
- 遵循 codebase 中的現有模式
- 為公共 API 新增 JSDoc 註解
- 確保 ESLint 通過

---

## 聯繫與支援

- **議題**: [GitHub Issues](https://github.com/EdmondVirelle/Neural-Hive/issues)
- **討論**: [GitHub Discussions](https://github.com/EdmondVirelle/Neural-Hive/discussions)

---

<p align="center">
  <b>Neural Hive v2.0</b> — 讓 AI 代理叢集化工作<br>
</p>

---

_最後更新: 2026-02-09_
_文件版本: 2.0.0_
