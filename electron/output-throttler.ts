/**
 * Output Throttler
 *
 * Buffers and batches PTY output to prevent overwhelming the renderer.
 * Implements NFR-01: Maximum 30 FPS update rate, 100ms buffer interval.
 */

/**
 * Callback function type for flushing buffered data
 */
type FlushCallback = (agentId: string, data: string) => void;

/**
 * OutputThrottler class
 *
 * Collects output data from multiple agents and flushes it periodically
 * to reduce IPC overhead and prevent UI freezing.
 *
 * @example
 * ```typescript
 * const throttler = new OutputThrottler((agentId, data) => {
 *   mainWindow.webContents.send('agent:update', { agentId, data });
 * });
 *
 * // In PTY data handler:
 * ptyProcess.onData((data) => {
 *   throttler.push(agentId, data);
 * });
 *
 * // On cleanup:
 * throttler.stop();
 * ```
 */
export class OutputThrottler {
    /** Buffer storage: agentId -> accumulated output chunks */
    private buffer: Map<string, string[]> = new Map();

    /** Flush interval timer */
    private flushInterval: NodeJS.Timeout | null = null;

    /** Callback invoked with batched data */
    private flushCallback: FlushCallback;

    /** Interval in milliseconds */
    private intervalMs: number;

    /** Whether the throttler is active */
    private isRunning: boolean = false;

    /**
     * Create a new OutputThrottler
     *
     * @param callback - Function called with batched output
     * @param intervalMs - Flush interval in milliseconds (default: 100ms for ~10 FPS)
     */
    constructor(callback: FlushCallback, intervalMs: number = 100) {
        this.flushCallback = callback;
        this.intervalMs = intervalMs;
        this.start();
    }

    /**
     * Start the flush interval
     */
    private start(): void {
        if (this.isRunning) return;

        this.flushInterval = setInterval(() => {
            this.flush();
        }, this.intervalMs);

        this.isRunning = true;
    }

    /**
     * Push data to the buffer for an agent
     *
     * @param agentId - The agent identifier
     * @param data - Raw output string from PTY
     */
    push(agentId: string, data: string): void {
        if (!this.buffer.has(agentId)) {
            this.buffer.set(agentId, []);
        }
        this.buffer.get(agentId)!.push(data);
    }

    /**
     * Flush all buffered data to the callback
     */
    private flush(): void {
        for (const [agentId, chunks] of this.buffer) {
            if (chunks.length > 0) {
                // Concatenate all chunks
                const combinedData = chunks.join('');

                // Clear the buffer for this agent
                this.buffer.set(agentId, []);

                // Invoke callback with combined data
                try {
                    this.flushCallback(agentId, combinedData);
                } catch (err) {
                    console.error(`Error flushing data for agent ${agentId}:`, err);
                }
            }
        }
    }

    /**
     * Force an immediate flush for a specific agent
     *
     * @param agentId - The agent to flush
     */
    flushAgent(agentId: string): void {
        const chunks = this.buffer.get(agentId);
        if (chunks && chunks.length > 0) {
            const combinedData = chunks.join('');
            this.buffer.set(agentId, []);
            try {
                this.flushCallback(agentId, combinedData);
            } catch (err) {
                console.error(`Error flushing data for agent ${agentId}:`, err);
            }
        }
    }

    /**
     * Remove an agent from the buffer
     *
     * @param agentId - The agent to remove
     */
    removeAgent(agentId: string): void {
        this.buffer.delete(agentId);
    }

    /**
     * Stop the throttler and cleanup
     */
    stop(): void {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
        this.isRunning = false;

        // Final flush before stopping
        this.flush();
        this.buffer.clear();
    }

    /**
     * Check if the throttler is running
     */
    get running(): boolean {
        return this.isRunning;
    }

    /**
     * Get current buffer size for an agent
     */
    getBufferSize(agentId: string): number {
        const chunks = this.buffer.get(agentId);
        return chunks ? chunks.reduce((sum, chunk) => sum + chunk.length, 0) : 0;
    }

    /**
     * Get total buffer size across all agents
     */
    getTotalBufferSize(): number {
        let total = 0;
        for (const chunks of this.buffer.values()) {
            total += chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        }
        return total;
    }
}
