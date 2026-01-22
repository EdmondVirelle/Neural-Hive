/**
 * Shared type definitions for the Neural Hive agent monitoring system.
 * This is the canonical source for all shared types.
 */
export type AgentStatus = 'IDLE' | 'THINKING' | 'WORKING' | 'ERROR' | 'WAITING_USER';
export type AgentType = 'claude' | 'gemini' | 'aider' | 'custom';
export interface LogEntry {
    timestamp: number;
    content: string;
    type: 'stdout' | 'stderr' | 'system' | 'stdin';
}
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
}
export interface LogPayload {
    agentId: string;
    content: string;
    type: 'stdout' | 'stderr' | 'system';
}
export declare const IPC_CHANNELS: {
    readonly SPAWN_AGENT: "agent:spawn";
    readonly KILL_AGENT: "agent:kill";
    readonly SEND_COMMAND: "agent:send-command";
    readonly AGENT_UPDATE: "agent:update";
    readonly BROADCAST_COMMAND: "agent:broadcast";
    readonly SET_AGENT_TAGS: "agent:set-tags";
    readonly GET_AGENT_TAGS: "agent:get-tags";
    readonly RELOAD_CONFIG: "config:reload";
};
export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
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
export interface AgentUpdatePayload {
    agentId: string;
    data: string;
    type?: 'stdout' | 'stderr' | 'system';
}
export interface BroadcastPayload {
    /** Target tags (empty = all agents) */
    tags?: string[];
    /** Command template with optional placeholders */
    template: string;
    /** Variables to inject, mapped to each agent by index */
    variables?: Record<string, string[]>;
}
export interface BroadcastResult {
    success: boolean;
    sentTo: string[];
    errors?: Record<string, string>;
}
export interface ElectronAPI {
    spawnAgent: (payload: SpawnAgentPayload) => Promise<SpawnAgentResult>;
    sendCommand: (agentId: string, command: string) => Promise<SendCommandResult>;
    killAgent: (agentId: string) => Promise<KillAgentResult>;
    onAgentLog: (callback: (payload: LogPayload) => void) => () => void;
    onAgentStatusChange: (callback: (agentId: string, status: AgentStatus) => void) => () => void;
    onUpdate: (callback: (payload: AgentUpdatePayload) => void) => () => void;
    broadcastCommand: (payload: BroadcastPayload) => Promise<BroadcastResult>;
    setAgentTags: (agentId: string, tags: string[]) => Promise<{
        success: boolean;
    }>;
    getAgentTags: (agentId: string) => Promise<string[]>;
    reloadConfig: () => Promise<{
        success: boolean;
    }>;
}
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
//# sourceMappingURL=shared.d.ts.map