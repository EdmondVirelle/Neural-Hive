import { BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as pty from 'node-pty';
import { randomUUID } from 'crypto';
import type { IPty } from 'node-pty';
import {
    IPC_CHANNELS,
    SpawnAgentResult,
    KillAgentResult,
    SendCommandResult,
    AgentUpdatePayload,
    BroadcastPayload,
    BroadcastResult,
    PauseAgentResult,
    ResumeAgentResult,
    AgentStatus,
} from '../src/types/shared.js';

import { OutputThrottler } from './output-throttler.js';
import { BroadcastManager } from './broadcast-manager.js';
import { ConfigLoader } from './config-loader.js';
import { ResourceMonitor } from './resource-monitor.js';
import { HealthMonitor } from './health-monitor.js';

interface AgentMetadata {
    id: string;
    type: string;
    pid: number;
    createdAt: number;
    cwd: string;
}

export class AgentManager {
    private ptyProcesses = new Map<string, IPty>();
    private agentMetadata = new Map<string, AgentMetadata>();
    private pausedAgents = new Map<string, AgentStatus>();
    private pausedOutputBuffers = new Map<string, string>(); // Buffer for output during pause
    private mainWindow: BrowserWindow | null = null;
    private outputThrottler: OutputThrottler;

    constructor(
        private configLoader: ConfigLoader,
        private broadcastManager: BroadcastManager,
        private resourceMonitor: ResourceMonitor,
        private healthMonitor: HealthMonitor,
        private dirname: string
    ) {
        // Initialize output throttler with 100ms interval (NFR-01)
        this.outputThrottler = new OutputThrottler((agentId: string, data: string) => {
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                const payload: AgentUpdatePayload = {
                    agentId,
                    data,
                };
                this.mainWindow.webContents.send(IPC_CHANNELS.AGENT_UPDATE, payload);
            }
        }, 100);

        // Initialize health monitor callback
        this.healthMonitor.start((agentId, duration) => {
            console.log(`Agent ${agentId} stalled for ${duration}ms`);
            // Notify renderer
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('agent:status-change', {
                    agentId,
                    status: 'STALLED',
                });
            }
        });
    }

    setMainWindow(window: BrowserWindow | null) {
        this.mainWindow = window;
    }

    async spawnAgent(options?: { type?: string; cwd?: string }): Promise<SpawnAgentResult> {
        const agentId = randomUUID();
        const agentType = options?.type || 'custom';
        const cwd = options?.cwd || process.cwd();

        try {
            const parserConfig = this.configLoader.getParser(agentType);
            const command = parserConfig?.command || 'node';

            // Robust script path detection (supports both dev and prod builds)
            const scriptLocations = [
                path.join(this.dirname, '../scripts/mock-agent.cjs'),       // Root /scripts/
                path.join(this.dirname, '../../scripts/mock-agent.cjs'),    // dist/electron/scripts/
                path.join(this.dirname, '../../../scripts/mock-agent.cjs'), // dist/electron/electron/scripts/
                path.join(process.cwd(), 'scripts/mock-agent.cjs'),        // Current working directory
                path.join(this.dirname, '../scripts/mock-agent.js'),        // Fallback to .js
            ];

            let scriptPath = '';
            for (const loc of scriptLocations) {
                if (fs.existsSync(loc)) {
                    scriptPath = loc;
                    break;
                }
            }

            if (!scriptPath) {
                console.error('Failed to locate mock-agent.js in any of:', scriptLocations);
                return { success: false, error: 'Internal Error: Could not locate agent script' };
            }

            let executable = command;
            let args = command === 'node' ? [scriptPath] : [];

            if (process.platform === 'win32') {
                if (command === 'node') {
                    executable = 'node.exe';
                } else {
                    executable = 'cmd.exe';
                    args = ['/c', command, ...args];
                }
            }

            const ptyProcess = pty.spawn(executable, args, {
                name: 'xterm-256color',
                cols: 120,
                rows: 30,
                cwd,
                env: process.env as Record<string, string>,
            });

            this.ptyProcesses.set(agentId, ptyProcess);
            this.agentMetadata.set(agentId, {
                id: agentId,
                type: agentType,
                pid: ptyProcess.pid,
                createdAt: Date.now(),
                cwd,
            });

            this.resourceMonitor.track(agentId, ptyProcess.pid);
            this.healthMonitor.recordActivity(agentId, 'IDLE');

            ptyProcess.onData((data: string) => {
                if (!this.ptyProcesses.has(agentId)) return;

                // If agent is paused, buffer the output instead of sending to UI
                if (this.pausedAgents.has(agentId)) {
                    const currentBuffer = this.pausedOutputBuffers.get(agentId) || '';
                    this.pausedOutputBuffers.set(agentId, currentBuffer + data);
                    return;
                }

                this.outputThrottler.push(agentId, data);
                this.healthMonitor.recordActivity(agentId);
            });

            ptyProcess.onExit(({ exitCode }) => {
                console.log(`Agent ${agentId} exited with code ${exitCode}`);
                this.outputThrottler.flushAgent(agentId);
                this.outputThrottler.removeAgent(agentId);
                this.resourceMonitor.untrack(agentId);
                this.healthMonitor.untrack(agentId);
                this.ptyProcesses.delete(agentId);
                this.agentMetadata.delete(agentId);
                this.broadcastManager.removeAgent(agentId);
                this.pausedAgents.delete(agentId);
                this.pausedOutputBuffers.delete(agentId);

                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                    this.mainWindow.webContents.send('agent:exit', {
                        agentId,
                        exitCode,
                    });
                }
            });

            return { success: true, agentId };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return { success: false, error: errorMessage };
        }
    }

    async resizeTerminal(agentId: string, cols: number, rows: number): Promise<{ success: boolean; error?: string }> {
        const ptyProcess = this.ptyProcesses.get(agentId);
        if (!ptyProcess) return { success: false, error: `Agent ${agentId} not found` };

        try {
            ptyProcess.resize(cols, rows);
            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return { success: false, error: errorMessage };
        }
    }

    async sendCommand(agentId: string, command: string): Promise<SendCommandResult> {
        if (this.pausedAgents.has(agentId)) return { success: false, error: 'Agent is paused' };

        const ptyProcess = this.ptyProcesses.get(agentId);
        if (!ptyProcess) return { success: false, error: `Agent ${agentId} not found` };

        try {
            ptyProcess.write(command);
            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return { success: false, error: errorMessage };
        }
    }

    async killAgent(agentId: string): Promise<KillAgentResult> {
        const ptyProcess = this.ptyProcesses.get(agentId);
        if (!ptyProcess) return { success: false, error: `Agent ${agentId} not found` };

        try {
            ptyProcess.kill();
            this.cleanupAgent(agentId);
            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return { success: false, error: errorMessage };
        }
    }

    private cleanupAgent(agentId: string) {
        this.outputThrottler.removeAgent(agentId);
        this.resourceMonitor.untrack(agentId);
        this.healthMonitor.untrack(agentId);
        this.pausedAgents.delete(agentId);
        this.ptyProcesses.delete(agentId);
        this.agentMetadata.delete(agentId);
        this.broadcastManager.removeAgent(agentId);
        this.pausedOutputBuffers.delete(agentId);
    }

    async pauseAgent(agentId: string): Promise<PauseAgentResult> {
        const ptyProcess = this.ptyProcesses.get(agentId);
        if (!ptyProcess) return { success: false, error: 'AGENT_NOT_FOUND' };

        if (this.pausedAgents.has(agentId)) return { success: true };

        this.pausedAgents.set(agentId, 'IDLE');

        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('agent:status-change', {
                agentId,
                status: 'PAUSED',
            });
        }

        this.healthMonitor.updateStatus(agentId, 'PAUSED');
        return { success: true };
    }

    async resumeAgent(agentId: string): Promise<ResumeAgentResult> {
        if (!this.ptyProcesses.has(agentId)) return { success: false, error: 'AGENT_NOT_FOUND' };
        if (!this.pausedAgents.has(agentId)) return { success: true };

        const previousStatus = this.pausedAgents.get(agentId) || 'IDLE';
        this.pausedAgents.delete(agentId);

        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('agent:status-change', {
                agentId,
                status: previousStatus,
            });
        }

        this.healthMonitor.updateStatus(agentId, 'WORKING');
        this.healthMonitor.recordActivity(agentId);

        // Flush buffered output
        const bufferedOutput = this.pausedOutputBuffers.get(agentId);
        if (bufferedOutput) {
            this.outputThrottler.push(agentId, bufferedOutput);
            this.pausedOutputBuffers.delete(agentId);
        }

        return { success: true };
    }

    async broadcastCommand(payload: BroadcastPayload): Promise<BroadcastResult> {
        const allAgentIds = Array.from(this.ptyProcesses.keys());
        const commands = this.broadcastManager.prepareBroadcast(payload, allAgentIds);

        const sentTo: string[] = [];
        const errors: Record<string, string> = {};

        for (const [agentId, command] of commands) {
            if (this.pausedAgents.has(agentId)) {
                errors[agentId] = 'Agent is paused';
                continue;
            }

            const ptyProcess = this.ptyProcesses.get(agentId);
            if (ptyProcess) {
                try {
                    ptyProcess.write(command + '\r');
                    sentTo.push(agentId);
                } catch (error) {
                    errors[agentId] = error instanceof Error ? error.message : 'Unknown error';
                }
            } else {
                errors[agentId] = 'Agent not found';
            }
        }

        return {
            success: Object.keys(errors).length === 0,
            sentTo,
            errors: Object.keys(errors).length > 0 ? errors : undefined,
        };
    }

    setTags(agentId: string, tags: string[]): boolean {
        this.broadcastManager.setTags(agentId, tags);
        return true;
    }

    getTags(agentId: string): string[] {
        return this.broadcastManager.getTags(agentId);
    }

    stop() {
        this.outputThrottler.stop();
        for (const [, ptyProcess] of this.ptyProcesses) {
            try { ptyProcess.kill(); } catch (e) { /* ignore */ }
        }
        this.ptyProcesses.clear();
        this.agentMetadata.clear();
        this.pausedAgents.clear();
        this.pausedOutputBuffers.clear();
    }

    isValidAgentId(id: unknown): id is string {
        return (
            typeof id === 'string' &&
            id.length > 0 &&
            id.length <= 64 &&
            /^[a-zA-Z0-9_-]+$/.test(id)
        );
    }

    isValidTags(tags: unknown): tags is string[] {
        return (
            Array.isArray(tags) &&
            tags.length <= 50 &&
            tags.every(
                (tag) =>
                    typeof tag === 'string' &&
                    tag.length > 0 &&
                    tag.length <= 32 &&
                    /^[a-zA-Z0-9_-]+$/.test(tag)
            )
        );
    }
}
