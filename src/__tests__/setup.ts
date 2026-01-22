/**
 * Test Setup File
 *
 * Configures the test environment before running tests.
 */

import { vi, beforeEach } from 'vitest';

// Mock window.electronAPI for all tests
const mockElectronAPI = {
    spawnAgent: vi.fn().mockResolvedValue({ success: true, agentId: 'mock-id' }),
    sendCommand: vi.fn().mockResolvedValue({ success: true }),
    killAgent: vi.fn().mockResolvedValue({ success: true }),
    onAgentLog: vi.fn().mockReturnValue(() => { }),
    onAgentStatusChange: vi.fn().mockReturnValue(() => { }),
    onUpdate: vi.fn().mockReturnValue(() => { }),
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
