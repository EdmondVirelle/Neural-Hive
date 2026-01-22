/**
 * Neural Hive - Resource Monitor
 *
 * Monitors CPU and memory usage for active agents:
 * - 2-second polling interval (configurable)
 * - Batch IPC updates to renderer (avoids N+1 problem)
 * - Automatic cleanup on agent exit
 * - Graceful error handling for dead PIDs
 */

import pidusage from 'pidusage';
import type { BrowserWindow } from 'electron';
import { IPC_CHANNELS, ResourceUpdatePayload, ResourceUsage } from '../src/types/shared.js';

// Default polling interval: 2 seconds
const DEFAULT_INTERVAL_MS = 2000;

export class ResourceMonitor {
  private intervalId: NodeJS.Timeout | null = null;
  private trackedPids: Map<string, number> = new Map(); // agentId -> pid
  private mainWindow: BrowserWindow | null = null;
  private intervalMs: number;

  constructor(intervalMs: number = DEFAULT_INTERVAL_MS) {
    this.intervalMs = intervalMs;
  }

  /**
   * Set the main window reference for IPC communication
   */
  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  /**
   * Start tracking a new agent's PID
   */
  track(agentId: string, pid: number): void {
    this.trackedPids.set(agentId, pid);

    // Auto-start monitoring if this is the first agent
    if (this.trackedPids.size === 1 && !this.intervalId) {
      this.start();
    }
  }

  /**
   * Stop tracking an agent (called when agent is killed)
   */
  untrack(agentId: string): void {
    this.trackedPids.delete(agentId);

    // Auto-stop monitoring if no agents left (optional optimization)
    if (this.trackedPids.size === 0 && this.intervalId) {
      this.stop();
    }
  }

  /**
   * Start the monitoring interval
   */
  start(): void {
    if (this.intervalId) {
      return; // Prevent duplicate intervals
    }

    this.intervalId = setInterval(() => {
      this.collectAndBroadcast();
    }, this.intervalMs);

    console.log(`[ResourceMonitor] Started with ${this.intervalMs}ms interval`);
  }

  /**
   * Stop the monitoring interval
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[ResourceMonitor] Stopped');
    }
  }

  /**
   * Clear all tracked PIDs
   */
  clear(): void {
    this.trackedPids.clear();
    this.stop();
  }

  /**
   * Collect resource usage for all tracked PIDs and broadcast to renderer
   */
  private async collectAndBroadcast(): Promise<void> {
    if (this.trackedPids.size === 0) {
      return;
    }

    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    const resources: Record<string, ResourceUsage> = {};
    const timestamp = Date.now();

    // Collect all PIDs for batch query
    const pidsToQuery: number[] = [];
    const agentIdByPid: Map<number, string> = new Map();

    for (const [agentId, pid] of this.trackedPids) {
      pidsToQuery.push(pid);
      agentIdByPid.set(pid, agentId);
    }

    try {
      // Batch query all PIDs at once (more efficient than individual calls)
      const stats = await pidusage(pidsToQuery);

      for (const [pidStr, stat] of Object.entries(stats)) {
        const pid = parseInt(pidStr, 10);
        const agentId = agentIdByPid.get(pid);

        if (agentId && stat) {
          resources[agentId] = {
            cpu: Math.min(Math.round(stat.cpu * 10) / 10, 100), // Round to 1 decimal, cap at 100%
            memory: Math.round(stat.memory), // Bytes
            pid,
            timestamp,
          };
        }
      }
    } catch (error) {
      // Handle case where some PIDs may have exited
      // pidusage throws if ALL PIDs are invalid, so we fall back to individual queries
      for (const [agentId, pid] of this.trackedPids) {
        try {
          const stat = await pidusage(pid);
          resources[agentId] = {
            cpu: Math.min(Math.round(stat.cpu * 10) / 10, 100),
            memory: Math.round(stat.memory),
            pid,
            timestamp,
          };
        } catch {
          // PID no longer exists - provide zero values
          resources[agentId] = {
            cpu: 0,
            memory: 0,
            pid,
            timestamp,
          };
        }
      }
    }

    // Broadcast batch update to renderer (single IPC call)
    if (Object.keys(resources).length > 0) {
      const payload: ResourceUpdatePayload = {
        timestamp,
        resources,
      };

      this.mainWindow.webContents.send(IPC_CHANNELS.RESOURCE_UPDATE, payload);
    }
  }

  /**
   * Get current tracked agent count (for debugging)
   */
  getTrackedCount(): number {
    return this.trackedPids.size;
  }

  /**
   * Check if monitoring is active
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }
}

// Singleton instance for easy import
let resourceMonitorInstance: ResourceMonitor | null = null;

export function getResourceMonitor(): ResourceMonitor {
  if (!resourceMonitorInstance) {
    resourceMonitorInstance = new ResourceMonitor();
  }
  return resourceMonitorInstance;
}
