/**
 * AgentStore Tests
 *
 * Tests for src/stores/agentStore.ts
 * - spawnAgent: Agent creation
 * - sendCommand: Command sending
 * - handleIncomingLog: Log processing and state detection
 * - killAgent: Agent termination
 * - statusCounts: Status aggregation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAgentStore } from '@/stores/agentStore';
import type { AgentSession } from '@/types/shared';

// Helper to create a base agent for testing
function createBaseAgent(
    id: string,
    overrides: Partial<AgentSession> = {}
): AgentSession {
    return {
        id,
        name: `Agent-${id}`,
        type: 'claude',
        status: 'IDLE',
        cwd: '.',
        logs: [],
        createdAt: Date.now(),
        ...overrides,
    };
}

describe('agentStore', () => {
    beforeEach(() => {
        // Create a fresh Pinia instance for each test
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    // ============================================
    // Initial State
    // ============================================
    describe('initial state', () => {
        it('should start with no agents', () => {
            const store = useAgentStore();
            expect(store.agentList).toHaveLength(0);
        });

        it('should have zero counts for all statuses', () => {
            const store = useAgentStore();
            expect(store.statusCounts.IDLE).toBe(0);
            expect(store.statusCounts.THINKING).toBe(0);
            expect(store.statusCounts.WORKING).toBe(0);
            expect(store.statusCounts.ERROR).toBe(0);
            expect(store.statusCounts.WAITING_USER).toBe(0);
            expect(store.statusCounts.PAUSED).toBe(0);  // FR-01-03
        });
    });

    // ============================================
    // spawnAgent Tests
    // ============================================
    describe('spawnAgent', () => {
        it('should create a new agent session', async () => {
            const store = useAgentStore();

            const id = await store.spawnAgent('claude', '/path/to/dir');

            expect(store.agentList).toHaveLength(1);
            expect(store.agentList[0].type).toBe('claude');
            expect(store.agentList[0].status).toBe('IDLE');
            expect(typeof id).toBe('string');
        });

        it('should generate unique IDs for multiple agents', async () => {
            const store = useAgentStore();

            const id1 = await store.spawnAgent('claude');
            const id2 = await store.spawnAgent('gemini');
            const id3 = await store.spawnAgent('custom');

            expect(id1).not.toBe(id2);
            expect(id2).not.toBe(id3);
            expect(store.agentList).toHaveLength(3);
        });

        it('should support different agent types', async () => {
            const store = useAgentStore();

            await store.spawnAgent('claude');
            await store.spawnAgent('gemini');
            await store.spawnAgent('custom');

            const types = store.agentList.map((a) => a.type);
            expect(types).toContain('claude');
            expect(types).toContain('gemini');
            expect(types).toContain('custom');
        });

        it('should use custom name if provided', async () => {
            const store = useAgentStore();

            const id = await store.spawnAgent('claude', '.', 'My Custom Agent');
            const agent = store.getAgent(id);

            expect(agent?.name).toBe('My Custom Agent');
        });
    });

    // ============================================
    // handleIncomingLog Tests
    // ============================================
    describe('handleIncomingLog', () => {
        it('should append log to agent', () => {
            const store = useAgentStore();
            const agent = createBaseAgent('agent-1');
            store.agents.set('agent-1', agent);

            store.handleIncomingLog({
                agentId: 'agent-1',
                content: 'Hello World',
                type: 'stdout',
            });

            expect(store.getAgent('agent-1')?.logs).toHaveLength(1);
            expect(store.getAgent('agent-1')?.logs[0].content).toBe('Hello World');
        });

        it('should detect and update THINKING status from log', () => {
            const store = useAgentStore();
            store.agents.set('agent-1', createBaseAgent('agent-1'));

            store.handleIncomingLog({
                agentId: 'agent-1',
                content: 'Thinking...',
                type: 'stdout',
            });

            expect(store.getAgent('agent-1')?.status).toBe('THINKING');
        });

        it('should detect and update WORKING status from [Tool Use]', () => {
            const store = useAgentStore();
            store.agents.set('agent-1', createBaseAgent('agent-1'));

            store.handleIncomingLog({
                agentId: 'agent-1',
                content: '[Tool Use] Reading file...',
                type: 'stdout',
            });

            expect(store.getAgent('agent-1')?.status).toBe('WORKING');
        });

        it('should detect ERROR status', () => {
            const store = useAgentStore();
            store.agents.set('agent-1', createBaseAgent('agent-1'));

            store.handleIncomingLog({
                agentId: 'agent-1',
                content: 'Error: Something went wrong',
                type: 'stdout',
            });

            expect(store.getAgent('agent-1')?.status).toBe('ERROR');
        });

        it('should extract currentActivity from Tool Use logs', () => {
            const store = useAgentStore();
            store.agents.set('agent-1', createBaseAgent('agent-1'));

            store.handleIncomingLog({
                agentId: 'agent-1',
                content: '[Tool Use] Searching codebase',
                type: 'stdout',
            });

            expect(store.getAgent('agent-1')?.currentActivity).toBe('Searching codebase');
        });

        it('should warn for unknown agent ID', () => {
            const store = useAgentStore();
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

            store.handleIncomingLog({
                agentId: 'unknown-agent',
                content: 'Some log',
                type: 'stdout',
            });

            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('unknown agent')
            );
        });

        it('should trim logs when exceeding MAX_LOGS (10000)', () => {
            const store = useAgentStore();
            const MAX_LOGS = 10000;

            // Create agent with MAX_LOGS entries
            const agent = createBaseAgent('agent-1', {
                logs: Array.from({ length: MAX_LOGS }, (_, i) => ({
                    timestamp: i,
                    content: `Log ${i}`,
                    type: 'stdout' as const,
                })),
            });
            store.agents.set('agent-1', agent);

            // Add one more log
            store.handleIncomingLog({
                agentId: 'agent-1',
                content: 'New log',
                type: 'stdout',
            });

            expect(store.getAgent('agent-1')?.logs.length).toBeLessThanOrEqual(MAX_LOGS);
        });
    });

    // ============================================
    // sendCommand Tests
    // ============================================
    describe('sendCommand', () => {
        it('should add command to logs as stdin type', async () => {
            const store = useAgentStore();
            store.agents.set('agent-1', createBaseAgent('agent-1'));

            await store.sendCommand('agent-1', 'ls -la');

            const logs = store.getAgent('agent-1')?.logs;
            expect(logs).toHaveLength(1);
            expect(logs?.[0].content).toContain('ls -la');
            expect(logs?.[0].type).toBe('stdin');
        });

        it('should not add command for unknown agent', async () => {
            const store = useAgentStore();
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            await store.sendCommand('unknown-agent', 'test');

            expect(errorSpy).toHaveBeenCalled();
        });
    });

    // ============================================
    // killAgent Tests
    // ============================================
    describe('killAgent', () => {
        it('should remove agent from store', async () => {
            const store = useAgentStore();
            store.agents.set('agent-1', createBaseAgent('agent-1'));

            expect(store.agentList).toHaveLength(1);

            await store.killAgent('agent-1');

            expect(store.agentList).toHaveLength(0);
            expect(store.getAgent('agent-1')).toBeUndefined();
        });

        it('should remove paused agent and clean up pause state (FR-01-03)', async () => {
            const store = useAgentStore();
            store.agents.set('agent-1', createBaseAgent('agent-1', { status: 'IDLE' }));

            // Pause the agent first
            await store.pauseAgent('agent-1');
            expect(store.getAgent('agent-1')?.status).toBe('PAUSED');

            // Kill the paused agent
            await store.killAgent('agent-1');

            expect(store.agentList).toHaveLength(0);
            expect(store.getAgent('agent-1')).toBeUndefined();
        });
    });

    // ============================================
    // pauseAgent Tests (FR-01-03)
    // ============================================
    describe('pauseAgent', () => {
        it('should change agent status to PAUSED', async () => {
            const store = useAgentStore();
            store.agents.set('agent-1', createBaseAgent('agent-1', { status: 'IDLE' }));

            const result = await store.pauseAgent('agent-1');

            expect(result).toBe(true);
            expect(store.getAgent('agent-1')?.status).toBe('PAUSED');
        });

        it('should store previous status before pausing', async () => {
            const store = useAgentStore();
            store.agents.set('agent-1', createBaseAgent('agent-1', { status: 'THINKING' }));

            await store.pauseAgent('agent-1');

            expect(store.getAgent('agent-1')?.status).toBe('PAUSED');
        });

        it('should return true if agent is already paused (idempotent)', async () => {
            const store = useAgentStore();
            store.agents.set('agent-1', createBaseAgent('agent-1', { status: 'PAUSED' }));

            const result = await store.pauseAgent('agent-1');

            expect(result).toBe(true);
            expect(store.getAgent('agent-1')?.status).toBe('PAUSED');
        });

        it('should return false for unknown agent', async () => {
            const store = useAgentStore();
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const result = await store.pauseAgent('unknown-agent');

            expect(result).toBe(false);
            expect(errorSpy).toHaveBeenCalled();
        });
    });

    // ============================================
    // resumeAgent Tests (FR-01-03)
    // ============================================
    describe('resumeAgent', () => {
        it('should restore agent to previous status (default IDLE)', async () => {
            const store = useAgentStore();
            store.agents.set('agent-1', createBaseAgent('agent-1', { status: 'IDLE' }));

            // Pause first
            await store.pauseAgent('agent-1');
            expect(store.getAgent('agent-1')?.status).toBe('PAUSED');

            // Resume
            const result = await store.resumeAgent('agent-1');

            expect(result).toBe(true);
            expect(store.getAgent('agent-1')?.status).toBe('IDLE');
        });

        it('should restore agent to THINKING if that was previous status', async () => {
            const store = useAgentStore();
            store.agents.set('agent-1', createBaseAgent('agent-1', { status: 'THINKING' }));

            await store.pauseAgent('agent-1');
            await store.resumeAgent('agent-1');

            expect(store.getAgent('agent-1')?.status).toBe('THINKING');
        });

        it('should return true if agent is not paused (idempotent)', async () => {
            const store = useAgentStore();
            store.agents.set('agent-1', createBaseAgent('agent-1', { status: 'IDLE' }));

            const result = await store.resumeAgent('agent-1');

            expect(result).toBe(true);
            expect(store.getAgent('agent-1')?.status).toBe('IDLE');
        });

        it('should return false for unknown agent', async () => {
            const store = useAgentStore();
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const result = await store.resumeAgent('unknown-agent');

            expect(result).toBe(false);
            expect(errorSpy).toHaveBeenCalled();
        });
    });

    // ============================================
    // isAgentPaused Tests (FR-01-03)
    // ============================================
    describe('isAgentPaused', () => {
        it('should return true for paused agent', () => {
            const store = useAgentStore();
            store.agents.set('agent-1', createBaseAgent('agent-1', { status: 'PAUSED' }));

            expect(store.isAgentPaused('agent-1')).toBe(true);
        });

        it('should return false for non-paused agent', () => {
            const store = useAgentStore();
            store.agents.set('agent-1', createBaseAgent('agent-1', { status: 'IDLE' }));

            expect(store.isAgentPaused('agent-1')).toBe(false);
        });

        it('should return false for unknown agent', () => {
            const store = useAgentStore();

            expect(store.isAgentPaused('unknown')).toBe(false);
        });
    });

    // ============================================
    // handleIncomingLog with PAUSED status (FR-01-03)
    // ============================================
    describe('handleIncomingLog with paused agent', () => {
        it('should not change status when agent is paused', () => {
            const store = useAgentStore();
            store.agents.set('agent-1', createBaseAgent('agent-1', { status: 'PAUSED' }));

            // This would normally change status to THINKING
            store.handleIncomingLog({
                agentId: 'agent-1',
                content: 'Thinking...',
                type: 'stdout',
            });

            // Status should remain PAUSED
            expect(store.getAgent('agent-1')?.status).toBe('PAUSED');
        });

        it('should still append logs when agent is paused', () => {
            const store = useAgentStore();
            store.agents.set('agent-1', createBaseAgent('agent-1', { status: 'PAUSED' }));

            store.handleIncomingLog({
                agentId: 'agent-1',
                content: 'Some output',
                type: 'stdout',
            });

            expect(store.getAgent('agent-1')?.logs).toHaveLength(1);
            expect(store.getAgent('agent-1')?.logs[0].content).toBe('Some output');
        });
    });

    // ============================================
    // statusCounts Tests
    // ============================================
    describe('statusCounts', () => {
        it('should correctly count agents by status', () => {
            const store = useAgentStore();

            store.agents.set('a1', createBaseAgent('a1', { status: 'IDLE' }));
            store.agents.set('a2', createBaseAgent('a2', { status: 'THINKING' }));
            store.agents.set('a3', createBaseAgent('a3', { status: 'THINKING' }));
            store.agents.set('a4', createBaseAgent('a4', { status: 'WORKING' }));
            store.agents.set('a5', createBaseAgent('a5', { status: 'ERROR' }));
            store.agents.set('a6', createBaseAgent('a6', { status: 'PAUSED' }));  // FR-01-03

            expect(store.statusCounts.IDLE).toBe(1);
            expect(store.statusCounts.THINKING).toBe(2);
            expect(store.statusCounts.WORKING).toBe(1);
            expect(store.statusCounts.ERROR).toBe(1);
            expect(store.statusCounts.WAITING_USER).toBe(0);
            expect(store.statusCounts.PAUSED).toBe(1);  // FR-01-03
        });

        it('should update counts when status changes', () => {
            const store = useAgentStore();
            store.agents.set('a1', createBaseAgent('a1', { status: 'IDLE' }));

            expect(store.statusCounts.IDLE).toBe(1);
            expect(store.statusCounts.THINKING).toBe(0);

            store.updateStatus('a1', 'THINKING');

            expect(store.statusCounts.IDLE).toBe(0);
            expect(store.statusCounts.THINKING).toBe(1);
        });
    });

    // ============================================
    // clearLogs Tests
    // ============================================
    describe('clearLogs', () => {
        it('should clear all logs for an agent', () => {
            const store = useAgentStore();
            store.agents.set('agent-1', createBaseAgent('agent-1', {
                logs: [
                    { timestamp: 1, content: 'Log 1', type: 'stdout' },
                    { timestamp: 2, content: 'Log 2', type: 'stdout' },
                ],
            }));

            expect(store.getAgent('agent-1')?.logs).toHaveLength(2);

            store.clearLogs('agent-1');

            expect(store.getAgent('agent-1')?.logs).toHaveLength(0);
        });
    });

    // ============================================
    // getAgent Tests
    // ============================================
    describe('getAgent', () => {
        it('should return agent by ID', () => {
            const store = useAgentStore();
            const agent = createBaseAgent('agent-1', { name: 'Test Agent' });
            store.agents.set('agent-1', agent);

            const result = store.getAgent('agent-1');

            expect(result).toBeDefined();
            expect(result?.name).toBe('Test Agent');
        });

        it('should return undefined for unknown ID', () => {
            const store = useAgentStore();

            const result = store.getAgent('unknown');

            expect(result).toBeUndefined();
        });
    });
});
