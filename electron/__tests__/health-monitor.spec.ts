
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HealthMonitor } from '../health-monitor.js';

// Mock fs to avoid reading real config file
vi.mock('fs', () => ({
    existsSync: () => false,
    readFileSync: () => '',
}));

describe('HealthMonitor', () => {
    let monitor: HealthMonitor;

    beforeEach(() => {
        vi.useFakeTimers();
        monitor = new HealthMonitor();
    });

    afterEach(() => {
        monitor.stop();
        vi.useRealTimers();
    });

    it('should track activity correctly', () => {
        monitor.recordActivity('agent-1', 'IDLE');
        const health = monitor.getHealth('agent-1');
        expect(health).not.toBeNull();
        expect(health?.agentId).toBe('agent-1');
        expect(health?.isStalled).toBe(false);
    });

    it('should detect stall when timeout is exceeded', () => {
        const onStall = vi.fn();
        monitor.start(onStall);

        // Set agent to WORKING
        monitor.recordActivity('agent-1', 'WORKING');

        // Advance time by 6 minutes (default timeout is 5 mins)
        vi.advanceTimersByTime(6 * 60 * 1000);

        expect(onStall).toHaveBeenCalledWith('agent-1', expect.any(Number));
    });

    it('should not detect stall if agent is IDLE', () => {
        const onStall = vi.fn();
        monitor.start(onStall);

        // Set agent to IDLE
        monitor.recordActivity('agent-1', 'IDLE');

        // Advance time
        vi.advanceTimersByTime(6 * 60 * 1000);

        expect(onStall).not.toHaveBeenCalled();
    });

    it('should reset activity when updating status from non-working state', () => {
        monitor.recordActivity('agent-1', 'WORKING');

        vi.advanceTimersByTime(4 * 60 * 1000); // 4 mins passed

        // Status changes to IDLE (e.g. paused or finished)
        // Monitor should reset tracking or simply ignore idle agents.
        // In our implementation, updateStatus resets timestamp if not working/thinking.
        monitor.updateStatus('agent-1', 'IDLE');

        const health = monitor.getHealth('agent-1');
        // Duration should be small (resetted)
        expect(health?.stallDuration).toBe(0);
    });
});
