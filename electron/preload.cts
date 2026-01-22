/**
 * Neural Hive - Preload Script
 *
 * Securely exposes Electron IPC to the renderer process.
 */

import { contextBridge, ipcRenderer } from 'electron';
import type {
    ElectronAPI,
    SpawnAgentPayload,
    SpawnAgentResult,
    SendCommandResult,
    KillAgentResult,
    AgentUpdatePayload,
    BroadcastPayload,
    BroadcastResult,
    ResourceUpdatePayload,
    PauseAgentResult,
    ResumeAgentResult,
} from '../src/types/shared.js';

// IPC Channel names (Inline to avoid ESM import issues in sandbox)
const IPC_CHANNELS = {
    SPAWN_AGENT: 'agent:spawn',
    KILL_AGENT: 'agent:kill',
    SEND_COMMAND: 'agent:send-command',
    AGENT_UPDATE: 'agent:update',
    // New channels for broadcast and config
    BROADCAST_COMMAND: 'agent:broadcast',
    SET_AGENT_TAGS: 'agent:set-tags',
    GET_AGENT_TAGS: 'agent:get-tags',
    RELOAD_CONFIG: 'config:reload',
    RESIZE_TERMINAL: 'agent:resize',
    // Resource monitoring (AGENT-02)
    RESOURCE_UPDATE: 'agent:resource-update',
    // Pause/Resume (FR-01-03)
    PAUSE_AGENT: 'agent:pause',
    RESUME_AGENT: 'agent:resume',
} as const;

// Expose protected methods to renderer via contextBridge
const electronAPI: ElectronAPI = {
    /**
     * Spawn a new agent PTY process
     * @param payload - Spawn options (type, cwd, name)
     * @returns Promise with spawn result including the generated agent ID
     */
    spawnAgent: (payload: SpawnAgentPayload): Promise<SpawnAgentResult> => {
        return ipcRenderer.invoke(IPC_CHANNELS.SPAWN_AGENT, payload);
    },

    /**
     * Resize agent PTY process
     * @param agentId - Target agent ID
     * @param cols - Number of columns
     * @param rows - Number of rows
     */
    resizeTerminal: (agentId: string, cols: number, rows: number): Promise<{ success: boolean; error?: string }> => {
        return ipcRenderer.invoke(IPC_CHANNELS.RESIZE_TERMINAL, agentId, cols, rows);
    },

    /**
     * Send a command to an existing agent
     * @param agentId - Target agent ID
     * @param command - Command string to send
     * @returns Promise with send result
     */
    sendCommand: (agentId: string, command: string): Promise<SendCommandResult> => {
        return ipcRenderer.invoke(IPC_CHANNELS.SEND_COMMAND, agentId, command);
    },

    /**
     * Kill an agent PTY process
     * @param agentId - Agent ID to kill
     * @returns Promise with kill result
     */
    killAgent: (agentId: string): Promise<KillAgentResult> => {
        return ipcRenderer.invoke(IPC_CHANNELS.KILL_AGENT, agentId);
    },

    /**
     * Subscribe to agent output updates
     * @param callback - Function called when agent emits data
     * @returns Cleanup function to remove the listener
     */
    onUpdate: (callback: (payload: AgentUpdatePayload) => void): (() => void) => {
        const handler = (
            _event: Electron.IpcRendererEvent,
            payload: AgentUpdatePayload
        ) => {
            callback(payload);
        };

        ipcRenderer.on(IPC_CHANNELS.AGENT_UPDATE, handler);

        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.AGENT_UPDATE, handler);
        };
    },

    /**
     * Subscribe to agent log events (alias for onUpdate)
     */
    onAgentLog: (callback: (payload: { agentId: string; content: string; type: 'stdout' | 'stderr' | 'system' }) => void): (() => void) => {
        const handler = (
            _event: Electron.IpcRendererEvent,
            payload: AgentUpdatePayload
        ) => {
            callback({
                agentId: payload.agentId,
                content: payload.data,
                type: payload.type || 'stdout',
            });
        };

        ipcRenderer.on(IPC_CHANNELS.AGENT_UPDATE, handler);

        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.AGENT_UPDATE, handler);
        };
    },

    /**
     * Subscribe to agent status changes
     */
    onAgentStatusChange: (callback: (agentId: string, status: 'IDLE' | 'THINKING' | 'WORKING' | 'ERROR' | 'WAITING_USER' | 'PAUSED') => void): (() => void) => {
        const handler = (
            _event: Electron.IpcRendererEvent,
            data: { agentId: string; status: 'IDLE' | 'THINKING' | 'WORKING' | 'ERROR' | 'WAITING_USER' | 'PAUSED' }
        ) => {
            callback(data.agentId, data.status);
        };

        ipcRenderer.on('agent:status-change', handler);

        return () => {
            ipcRenderer.removeListener('agent:status-change', handler);
        };
    },

    // ============================================
    // Broadcast API (FR-04)
    // ============================================

    /**
     * Broadcast a command to multiple agents
     * @param payload - Broadcast options (tags, template, variables)
     * @returns Promise with broadcast result
     */
    broadcastCommand: (payload: BroadcastPayload): Promise<BroadcastResult> => {
        return ipcRenderer.invoke(IPC_CHANNELS.BROADCAST_COMMAND, payload);
    },

    /**
     * Set tags for an agent
     * @param agentId - Target agent ID
     * @param tags - Array of tag strings
     */
    setAgentTags: (agentId: string, tags: string[]): Promise<{ success: boolean }> => {
        return ipcRenderer.invoke(IPC_CHANNELS.SET_AGENT_TAGS, agentId, tags);
    },

    /**
     * Get tags for an agent
     * @param agentId - Target agent ID
    /**
     * @returns Array of tags
     */
    getAgentTags: (agentId: string): Promise<string[]> => {
        return ipcRenderer.invoke(IPC_CHANNELS.GET_AGENT_TAGS, agentId);
    },

    /**
     * Reload parser configuration
     */
    reloadConfig: (): Promise<{ success: boolean }> => {
        return ipcRenderer.invoke(IPC_CHANNELS.RELOAD_CONFIG);
    },

    /**
     * Open folder selection dialog
     * @returns Selected folder path or undefined if canceled
     */
    selectFolder: (): Promise<{ canceled: boolean; path?: string }> => {
        return ipcRenderer.invoke('dialog:select-folder');
    },

    // ============================================
    // Resource Monitoring (AGENT-02)
    // ============================================

    /**
     * Subscribe to resource usage updates
     * @param callback - Function called when resource data is updated (every 2 seconds)
     * @returns Cleanup function to remove the listener
     */
    onResourceUpdate: (callback: (payload: ResourceUpdatePayload) => void): (() => void) => {
        const handler = (
            _event: Electron.IpcRendererEvent,
            payload: ResourceUpdatePayload
        ) => {
            callback(payload);
        };

        ipcRenderer.on(IPC_CHANNELS.RESOURCE_UPDATE, handler);

        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.RESOURCE_UPDATE, handler);
        };
    },

    // ============================================
    // Pause/Resume API (FR-01-03)
    // ============================================

    /**
     * Pause an agent - stop accepting input but keep PTY running
     * @param agentId - Agent ID to pause
     * @returns Promise with pause result
     */
    pauseAgent: (agentId: string): Promise<PauseAgentResult> => {
        return ipcRenderer.invoke(IPC_CHANNELS.PAUSE_AGENT, agentId);
    },

    /**
     * Resume a paused agent - restore input capability
     * @param agentId - Agent ID to resume
     * @returns Promise with resume result
     */
    resumeAgent: (agentId: string): Promise<ResumeAgentResult> => {
        return ipcRenderer.invoke(IPC_CHANNELS.RESUME_AGENT, agentId);
    },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
