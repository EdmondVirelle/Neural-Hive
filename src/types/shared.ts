/**
 * Shared type definitions for the Neural Hive agent monitoring system.
 * This is the canonical source for all shared types.
 */

// Agent status enumeration
export type AgentStatus = 'IDLE' | 'THINKING' | 'WORKING' | 'ERROR' | 'WAITING_USER' | 'PAUSED' | 'STALLED';

// Resource usage for a single agent
export interface ResourceUsage {
  cpu: number;      // Percentage 0-100
  memory: number;   // Bytes
  pid: number;
  timestamp: number;
}

// Batch resource update payload (Main -> Renderer)
export interface ResourceUpdatePayload {
  timestamp: number;
  resources: Record<string, ResourceUsage>;  // agentId -> usage
}

// Agent type (CLI tool)
export type AgentType = 'claude' | 'gemini' | 'aider' | 'custom';

// Log entry for agent output
export interface LogEntry {
  timestamp: number;
  content: string;
  type: 'stdout' | 'stderr' | 'system' | 'stdin';
}

// Agent session state (used by store)
export interface AgentSession {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  cwd: string;
  logs: LogEntry[];
  currentActivity?: string;
  createdAt: number;
  tags?: string[];
  resourceUsage?: ResourceUsage;  // CPU/Memory monitoring (AGENT-02)
}

// IPC payload for incoming logs from Main Process
export interface LogPayload {
  agentId: string;
  content: string;
  type: 'stdout' | 'stderr' | 'system';
}

// IPC Channel names
export const IPC_CHANNELS = {
  SPAWN_AGENT: 'agent:spawn',
  KILL_AGENT: 'agent:kill',
  SEND_COMMAND: 'agent:send-command',
  AGENT_UPDATE: 'agent:update',
  RESIZE_TERMINAL: 'agent:resize',
  // New channels for broadcast and config
  BROADCAST_COMMAND: 'agent:broadcast',
  SET_AGENT_TAGS: 'agent:set-tags',
  GET_AGENT_TAGS: 'agent:get-tags',
  RELOAD_CONFIG: 'config:reload',
  // Resource monitoring (AGENT-02)
  RESOURCE_UPDATE: 'agent:resource-update',
  // Pause/Resume (FR-01-03)
  PAUSE_AGENT: 'agent:pause',
  RESUME_AGENT: 'agent:resume',
  // Taskbar notification (AGENT-03)
  UPDATE_ERROR_COUNT: 'app:update-error-count',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

// IPC payload for spawning a new agent
export interface SpawnAgentPayload {
  type: AgentType;
  cwd: string;
  name?: string;
}

export interface SpawnAgentResult {
  success: boolean;
  agentId?: string;
  error?: string;
}

export interface SendCommandResult {
  success: boolean;
  error?: string;
}

export interface KillAgentResult {
  success: boolean;
  error?: string;
}

// Pause/Resume result types (FR-01-03)
export interface PauseAgentResult {
  success: boolean;
  error?: 'AGENT_NOT_FOUND' | 'ALREADY_PAUSED' | string;
}

export interface ResumeAgentResult {
  success: boolean;
  error?: 'AGENT_NOT_FOUND' | 'NOT_PAUSED' | string;
}

// Payload for agent updates from Main -> Renderer
export interface AgentUpdatePayload {
  agentId: string;
  data: string;
  type?: 'stdout' | 'stderr' | 'system';
}

// Broadcast command payload (FR-04)
export interface BroadcastPayload {
  /** Target tags (empty = all agents) */
  tags?: string[];
  /** Command template with optional placeholders */
  template: string;
  /** Variables to inject, mapped to each agent by index */
  variables?: Record<string, string[]>;
}

// Broadcast result
export interface BroadcastResult {
  success: boolean;
  sentTo: string[];
  errors?: Record<string, string>;
}

// Preload API exposed to renderer
export interface ElectronAPI {
  spawnAgent: (payload: SpawnAgentPayload) => Promise<SpawnAgentResult>;
  resizeTerminal: (agentId: string, cols: number, rows: number) => Promise<{ success: boolean; error?: string }>;
  sendCommand: (agentId: string, command: string) => Promise<SendCommandResult>;
  killAgent: (agentId: string) => Promise<KillAgentResult>;
  onAgentLog: (callback: (payload: LogPayload) => void) => () => void;
  onAgentStatusChange: (callback: (agentId: string, status: AgentStatus) => void) => () => void;
  onUpdate: (callback: (payload: AgentUpdatePayload) => void) => () => void;
  // Broadcast API
  broadcastCommand: (payload: BroadcastPayload) => Promise<BroadcastResult>;
  setAgentTags: (agentId: string, tags: string[]) => Promise<{ success: boolean }>;
  getAgentTags: (agentId: string) => Promise<string[]>;
  reloadConfig: () => Promise<{ success: boolean }>;
  // Dialog API
  selectFolder: () => Promise<{ canceled: boolean; path?: string }>;
  // Resource monitoring (AGENT-02)
  onResourceUpdate: (callback: (payload: ResourceUpdatePayload) => void) => () => void;
  // Pause/Resume API (FR-01-03)
  pauseAgent: (agentId: string) => Promise<PauseAgentResult>;
  resumeAgent: (agentId: string) => Promise<ResumeAgentResult>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
