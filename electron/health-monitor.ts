/**
 * Health Monitor
 *
 * Detects stalled agents by tracking their last output time.
 * If an agent is in a working/thinking state but hasn't produced output
 * for a configurable duration, it is marked as STALLED.
 *
 * specs: Phase 3, NFR-04
 */
import { AgentStatus } from '../src/types/shared.js';
import * as fs from 'fs';
import * as path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

interface HealthStatus {
    agentId: string;
    lastActivity: number;
    isStalled: boolean;
    stallDuration: number;
}

interface MonitorConfig {
    stallTimeout: number; // ms
    checkInterval: number; // ms
}

export class HealthMonitor {
    private lastActivity: Map<string, number> = new Map();
    private agentStatuses: Map<string, AgentStatus> = new Map();
    private config: MonitorConfig = {
        stallTimeout: 5 * 60 * 1000, // 5 minutes default
        checkInterval: 10000, // 10 seconds default
    };
    private timer: NodeJS.Timeout | null = null;
    private onStallCallback: ((agentId: string, duration: number) => void) | null = null;
    private configDir: string;
    private configPath: string;

    constructor(configDir?: string) {
        this.configDir = configDir || path.join(_dirname, '../../config');
        this.configPath = path.join(this.configDir, 'settings.json');
        this.loadConfig();
    }

    private loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const raw = fs.readFileSync(this.configPath, 'utf-8');
                const settings = JSON.parse(raw);
                if (settings.healthMonitor) {
                    this.config = { ...this.config, ...settings.healthMonitor };
                }
            }
        } catch (error) {
            console.warn(`Failed to load ${this.configPath}, using defaults for HealthMonitor`, error);
        }
    }

    /**
     * Start monitoring loop
     */
    start(onStall: (agentId: string, duration: number) => void) {
        this.onStallCallback = onStall;
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => this.checkHealth(), this.config.checkInterval);
        console.log(`HealthMonitor started (timeout: ${this.config.stallTimeout}ms)`);
    }

    /**
     * Stop monitoring
     */
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    /**
     * Record activity for an agent
     */
    recordActivity(agentId: string, status?: AgentStatus) {
        this.lastActivity.set(agentId, Date.now());
        if (status) {
            this.agentStatuses.set(agentId, status);
        }
    }

    /**
     * Update agent status tracking
     */
    updateStatus(agentId: string, status: AgentStatus) {
        this.agentStatuses.set(agentId, status);
        // If status changes to IDLE or ERROR, we might want to reset the "stall" timer logic basically
        // But simplest is just: if it's not working/thinking, it can't be stalled in the "frozen process" sense usually.
        // However, we only care about stalling if it SHOULD be doing something.
        if (status !== 'WORKING' && status !== 'THINKING') {
            // Reset activity to now so it doesn't look stalled immediately if it switches back
            this.lastActivity.set(agentId, Date.now());
        }
    }

    /**
     * Stop tracking an agent
     */
    untrack(agentId: string) {
        this.lastActivity.delete(agentId);
        this.agentStatuses.delete(agentId);
    }

    /**
     * Check all agents for stall conditions
     */
    private checkHealth() {
        const now = Date.now();
        for (const [agentId, lastActive] of this.lastActivity) {
            const status = this.agentStatuses.get(agentId);

            // Only check for stall if agent is supposed to be active
            if (status === 'WORKING' || status === 'THINKING') {
                const duration = now - lastActive;
                if (duration > this.config.stallTimeout) {
                    // Agent is stalled
                    if (this.onStallCallback) {
                        this.onStallCallback(agentId, duration);
                    }
                }
            }
        }
    }

    /**
     * Manually check a specific agent status
     */
    getHealth(agentId: string): HealthStatus | null {
        if (!this.lastActivity.has(agentId)) return null;

        const lastActivity = this.lastActivity.get(agentId)!;
        const now = Date.now();
        const duration = now - lastActivity;
        const isStalled = duration > this.config.stallTimeout;

        return {
            agentId,
            lastActivity,
            isStalled,
            stallDuration: isStalled ? duration : 0
        };
    }
}
