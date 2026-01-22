/**
 * OutputThrottler Tests
 *
 * Tests for electron/output-throttler.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OutputThrottler } from '../output-throttler.js';

describe('OutputThrottler', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // ============================================
    // Basic Functionality
    // ============================================
    describe('basic functionality', () => {
        it('should batch multiple outputs within interval', () => {
            const callback = vi.fn();
            const throttler = new OutputThrottler(callback, 100);

            throttler.push('agent-1', 'Line 1\n');
            throttler.push('agent-1', 'Line 2\n');
            throttler.push('agent-1', 'Line 3\n');

            // Not yet flushed
            expect(callback).not.toHaveBeenCalled();

            // Advance time by 100ms
            vi.advanceTimersByTime(100);

            // Should be called once with combined output
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith('agent-1', 'Line 1\nLine 2\nLine 3\n');

            throttler.stop();
        });

        it('should handle multiple agents separately', () => {
            const callback = vi.fn();
            const throttler = new OutputThrottler(callback, 100);

            throttler.push('agent-1', 'A1 data');
            throttler.push('agent-2', 'A2 data');

            vi.advanceTimersByTime(100);

            expect(callback).toHaveBeenCalledWith('agent-1', 'A1 data');
            expect(callback).toHaveBeenCalledWith('agent-2', 'A2 data');

            throttler.stop();
        });

        it('should not call callback if no data buffered', () => {
            const callback = vi.fn();
            const throttler = new OutputThrottler(callback, 100);

            vi.advanceTimersByTime(100);

            expect(callback).not.toHaveBeenCalled();

            throttler.stop();
        });
    });

    // ============================================
    // Interval Behavior
    // ============================================
    describe('interval behavior', () => {
        it('should flush at specified interval', () => {
            const callback = vi.fn();
            const throttler = new OutputThrottler(callback, 50);

            throttler.push('agent-1', 'data');

            vi.advanceTimersByTime(25);
            expect(callback).not.toHaveBeenCalled();

            vi.advanceTimersByTime(25);
            expect(callback).toHaveBeenCalledTimes(1);

            throttler.stop();
        });

        it('should continue flushing periodically', () => {
            const callback = vi.fn();
            const throttler = new OutputThrottler(callback, 100);

            throttler.push('agent-1', 'batch 1');
            vi.advanceTimersByTime(100);

            throttler.push('agent-1', 'batch 2');
            vi.advanceTimersByTime(100);

            throttler.push('agent-1', 'batch 3');
            vi.advanceTimersByTime(100);

            expect(callback).toHaveBeenCalledTimes(3);

            throttler.stop();
        });
    });

    // ============================================
    // Stop Behavior
    // ============================================
    describe('stop behavior', () => {
        it('should stop interval when stopped', () => {
            const callback = vi.fn();
            const throttler = new OutputThrottler(callback, 100);

            throttler.push('agent-1', 'data');
            throttler.stop();

            vi.advanceTimersByTime(200);

            // Should have been called once during stop (final flush)
            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('should set running to false after stop', () => {
            const callback = vi.fn();
            const throttler = new OutputThrottler(callback, 100);

            expect(throttler.running).toBe(true);

            throttler.stop();

            expect(throttler.running).toBe(false);
        });

        it('should clear buffer after stop', () => {
            const callback = vi.fn();
            const throttler = new OutputThrottler(callback, 100);

            throttler.push('agent-1', 'data');
            throttler.stop();

            expect(throttler.getBufferSize('agent-1')).toBe(0);
        });
    });

    // ============================================
    // Buffer Management
    // ============================================
    describe('buffer management', () => {
        it('should track buffer size per agent', () => {
            const callback = vi.fn();
            const throttler = new OutputThrottler(callback, 100);

            throttler.push('agent-1', '12345');
            throttler.push('agent-1', '67890');

            expect(throttler.getBufferSize('agent-1')).toBe(10);

            throttler.stop();
        });

        it('should return 0 for unknown agent', () => {
            const callback = vi.fn();
            const throttler = new OutputThrottler(callback, 100);

            expect(throttler.getBufferSize('unknown')).toBe(0);

            throttler.stop();
        });

        it('should track total buffer size', () => {
            const callback = vi.fn();
            const throttler = new OutputThrottler(callback, 100);

            throttler.push('agent-1', '12345');
            throttler.push('agent-2', '123');

            expect(throttler.getTotalBufferSize()).toBe(8);

            throttler.stop();
        });

        it('should remove agent from buffer', () => {
            const callback = vi.fn();
            const throttler = new OutputThrottler(callback, 100);

            throttler.push('agent-1', 'data');
            throttler.removeAgent('agent-1');

            vi.advanceTimersByTime(100);

            // Should not call callback for removed agent
            expect(callback).not.toHaveBeenCalled();

            throttler.stop();
        });
    });

    // ============================================
    // Force Flush
    // ============================================
    describe('flushAgent', () => {
        it('should immediately flush specific agent', () => {
            const callback = vi.fn();
            const throttler = new OutputThrottler(callback, 100);

            throttler.push('agent-1', 'urgent');
            throttler.push('agent-2', 'can wait');

            throttler.flushAgent('agent-1');

            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith('agent-1', 'urgent');

            throttler.stop();
        });

        it('should clear buffer after force flush', () => {
            const callback = vi.fn();
            const throttler = new OutputThrottler(callback, 100);

            throttler.push('agent-1', 'data');
            throttler.flushAgent('agent-1');

            expect(throttler.getBufferSize('agent-1')).toBe(0);

            throttler.stop();
        });
    });

    // ============================================
    // Error Handling
    // ============================================
    describe('error handling', () => {
        it('should handle callback errors gracefully', () => {
            const callback = vi.fn().mockImplementation(() => {
                throw new Error('Callback failed');
            });
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const throttler = new OutputThrottler(callback, 100);

            throttler.push('agent-1', 'data');
            vi.advanceTimersByTime(100);

            expect(errorSpy).toHaveBeenCalled();

            throttler.stop();
        });
    });
});
