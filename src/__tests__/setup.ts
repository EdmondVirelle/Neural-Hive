/**
 * Test Setup File
 *
 * Configures the test environment before running tests.
 */

import { vi, beforeEach } from 'vitest';

// Mock window.electronAPI for all tests
let agentIdCounter = 0;
const mockElectronAPI = {
    spawnAgent: vi.fn().mockImplementation(() => {
        agentIdCounter++;
        return Promise.resolve({ success: true, agentId: `mock-id-${agentIdCounter}` });
    }),
    sendCommand: vi.fn().mockResolvedValue({ success: true }),
    killAgent: vi.fn().mockResolvedValue({ success: true }),
    onAgentLog: vi.fn().mockReturnValue(() => { }),
    onAgentStatusChange: vi.fn().mockReturnValue(() => { }),
    onUpdate: vi.fn().mockReturnValue(() => { }),
    pauseAgent: vi.fn().mockResolvedValue({ success: true }),
    resumeAgent: vi.fn().mockResolvedValue({ success: true }),
    // Phase 2 additions
    detectClis: vi.fn().mockResolvedValue({ clis: [], timestamp: Date.now() }),
    getSettings: vi.fn().mockResolvedValue({
        language: 'en',
        theme: 'dark',
        onboarded: false,
        cliPaths: {},
        performance: { throttleMs: 100, maxScrollback: 10000, maxAgents: 10 },
    }),
    saveSettings: vi.fn().mockResolvedValue({ success: true }),
    onResourceUpdate: vi.fn().mockReturnValue(() => { }),
    setAgentTags: vi.fn().mockResolvedValue({ success: true }),
    resizeTerminal: vi.fn().mockResolvedValue({ success: true }),
};

// Stub window with electronAPI
vi.stubGlobal('window', {
    electronAPI: mockElectronAPI,
});

// Export for use in tests
export { mockElectronAPI };

// Reset mocks before each test
beforeEach(() => {
    vi.clearAllMocks();
});
