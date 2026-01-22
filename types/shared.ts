/**
 * 系統共用型別定義
 * 所有 Agent (Backend/Frontend/Mock) 都必須遵守此合約
 */

// Agent 的運作狀態
export type AgentStatus =
  | 'IDLE'          // 閒置中，等待指令
  | 'THINKING'      // 推理中 (通常伴隨 Spinner)
  | 'WORKING'       // 執行工具中 (如搜尋、讀檔)
  | 'ERROR'         // 發生錯誤
  | 'WAITING_USER'; // 等待使用者輸入 (y/n)

// 單一 Agent 的完整資料結構
export interface AgentSession {
  id: string;             // UUID
  name: string;           // 顯示名稱 (e.g., "Claude-Web-01")
  type: 'MOCK' | 'CLAUDE' | 'GEMINI';
  status: AgentStatus;
  currentSkill?: string;  // 當前正在執行的技能描述 (e.g., "Reading File: main.ts")
  logs: string[];         // 原始 Log 歷史 (包含 ANSI code)
  pid?: number;           // 系統 Process ID
}

// IPC 通訊頻道名稱 (Enum)
export const IPC_CHANNELS = {
  SPAWN_AGENT: 'spawn-agent',     // Renderer -> Main: 請求建立新 Agent
  KILL_AGENT: 'kill-agent',       // Renderer -> Main: 請求刪除 Agent
  SEND_COMMAND: 'send-command',   // Renderer -> Main: 發送文字指令給 Agent
  AGENT_UPDATE: 'agent-update',   // Main -> Renderer: 廣播 Agent 狀態/Log 更新
  AGENT_LIST: 'agent-list',       // Main -> Renderer: 同步完整列表
};

// 用於 IPC 傳輸的 Payload 定義
export interface AgentUpdatePayload {
  agentId: string;
  newData: string; // 新增的 log chunk
}