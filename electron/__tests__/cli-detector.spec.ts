/**
 * Unit tests for cli-detector.ts
 *
 * Uses the exported _setExecFileAsync helper to inject a mock function,
 * since vitest cannot mock Node built-in modules (util, child_process)
 * for transitively imported modules.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AgentType, AppSettings } from '../../src/types/shared';
import {
    detectInstalledClis,
    clearCliCache,
    getCliDefinitions,
    _setExecFileAsync,
    _restoreExecFileAsync,
} from '../cli-detector';

const WHICH_CMD = process.platform === 'win32' ? 'where' : 'which';

const mockExecFileAsync = vi.fn();

function setupExecMock(
    handler: (cmd: string, args: string[], opts?: any) => { stdout: string; stderr: string }
) {
    mockExecFileAsync.mockImplementation(
        async (cmd: string, args: string[], opts?: any) => handler(cmd, args, opts)
    );
}

function setupExecMockWithErrors(
    handler: (cmd: string, args: string[], opts?: any) => { stdout: string; stderr: string } | Error
) {
    mockExecFileAsync.mockImplementation(
        async (cmd: string, args: string[], opts?: any) => {
            const result = handler(cmd, args, opts);
            if (result instanceof Error) throw result;
            return result;
        }
    );
}

describe('cli-detector', () => {
    beforeEach(() => {
        mockExecFileAsync.mockReset();
        _setExecFileAsync(mockExecFileAsync as any);
        clearCliCache();
    });

    afterEach(() => {
        _restoreExecFileAsync();
        clearCliCache();
    });

    describe('detectInstalledClis', () => {
        it('should detect installed CLIs with version information', async () => {
            setupExecMock((cmd, args) => {
                if (cmd === WHICH_CMD) {
                    return { stdout: `/usr/local/bin/${args[0]}\n`, stderr: '' };
                }
                if (cmd.includes('claude') || args[0]?.includes('claude')) {
                    return { stdout: 'claude version 1.2.3\n', stderr: '' };
                }
                return { stdout: 'version 1.0.0\n', stderr: '' };
            });

            const result = await detectInstalledClis();

            expect(result).toHaveProperty('clis');
            expect(result).toHaveProperty('timestamp');
            expect(result.clis.length).toBeGreaterThan(0);

            const claudeCli = result.clis.find((cli: any) => cli.type === 'claude');
            expect(claudeCli).toBeDefined();
            expect(claudeCli?.installed).toBe(true);
            expect(claudeCli?.version).toBe('1.2.3');
            expect(claudeCli?.path).toBeDefined();
        });

        it('should mark CLIs as not installed when command is not found', async () => {
            setupExecMockWithErrors(() => new Error('Command not found'));

            const result = await detectInstalledClis();

            expect(result.clis.length).toBeGreaterThan(0);
            result.clis.forEach((cli: any) => {
                expect(cli.installed).toBe(false);
                expect(cli.version).toBeUndefined();
                expect(cli.path).toBeUndefined();
            });
        });

        it('should mark CLI as installed even without parseable version', async () => {
            setupExecMockWithErrors((cmd, args) => {
                if (cmd === WHICH_CMD) {
                    return { stdout: `/usr/local/bin/${args[0]}\n`, stderr: '' };
                }
                return { stdout: 'No version info\n', stderr: '' };
            });

            const result = await detectInstalledClis();

            const claudeCli = result.clis.find((cli: any) => cli.type === 'claude');
            expect(claudeCli?.installed).toBe(true);
            expect(claudeCli?.version).toBeUndefined();
            expect(claudeCli?.path).toBeDefined();
        });

        it('should return cached results on second call', async () => {
            setupExecMock((cmd, args) => {
                if (cmd === WHICH_CMD) {
                    return { stdout: `/usr/local/bin/${args[0]}\n`, stderr: '' };
                }
                return { stdout: 'version 1.0.0\n', stderr: '' };
            });

            const result1 = await detectInstalledClis();
            const callCount1 = mockExecFileAsync.mock.calls.length;

            const result2 = await detectInstalledClis();
            const callCount2 = mockExecFileAsync.mock.calls.length;

            expect(result1).toBe(result2);
            expect(callCount1).toBe(callCount2);
        });

        it('should bypass cache with forceRefresh', async () => {
            setupExecMock((cmd, args) => {
                if (cmd === WHICH_CMD) {
                    return { stdout: `/usr/local/bin/${args[0]}\n`, stderr: '' };
                }
                return { stdout: 'version 1.0.0\n', stderr: '' };
            });

            const result1 = await detectInstalledClis();
            const timestamp1 = result1.timestamp;

            await new Promise(resolve => setTimeout(resolve, 10));

            const result2 = await detectInstalledClis(null, true);
            const timestamp2 = result2.timestamp;

            expect(result1).not.toBe(result2);
            expect(timestamp2).toBeGreaterThan(timestamp1!);
        });

        it('should handle timeout errors gracefully', async () => {
            setupExecMockWithErrors(() => new Error('Timeout'));

            const result = await detectInstalledClis();

            result.clis.forEach((cli: any) => {
                expect(cli.installed).toBe(false);
            });
        });

        it('should use custom CLI paths from settings', async () => {
            const customPath = '/custom/path/to/claude';
            const settings = { cliPaths: { claude: customPath } } as AppSettings;

            setupExecMock((cmd, args) => {
                if (cmd === WHICH_CMD) {
                    return { stdout: `${args[0]}\n`, stderr: '' };
                }
                return { stdout: 'version 1.2.3\n', stderr: '' };
            });

            const result = await detectInstalledClis(settings);

            const claudeCli = result.clis.find((cli: any) => cli.type === 'claude');
            expect(claudeCli?.path).toBe(customPath);
        });

        it('should parse version from combined stdout+stderr', async () => {
            setupExecMock((cmd, args) => {
                if (cmd === WHICH_CMD) {
                    return { stdout: `/usr/local/bin/${args[0]}\n`, stderr: '' };
                }
                return { stdout: '', stderr: 'version 3.2.1\n' };
            });

            const result = await detectInstalledClis();

            const claudeCli = result.clis.find((cli: any) => cli.type === 'claude');
            expect(claudeCli?.installed).toBe(true);
            expect(claudeCli?.version).toBe('3.2.1');
        });

        it('should detect GitHub Copilot via gh command', async () => {
            setupExecMockWithErrors((cmd, args) => {
                if (cmd === WHICH_CMD) {
                    if (args[0] === 'gh') {
                        return { stdout: '/usr/local/bin/gh\n', stderr: '' };
                    }
                    return new Error('not found');
                }
                if (args.includes('copilot')) {
                    return { stdout: 'gh copilot version 1.0.1\n', stderr: '' };
                }
                return { stdout: 'version 1.0.0\n', stderr: '' };
            });

            const result = await detectInstalledClis();

            const copilotCli = result.clis.find((cli: any) => cli.type === 'copilot');
            expect(copilotCli?.installed).toBe(true);
            expect(copilotCli?.version).toBe('1.0.1');
        });

        it('should detect all defined CLI types', async () => {
            setupExecMock((cmd, args) => {
                if (cmd === WHICH_CMD) {
                    return { stdout: `/usr/local/bin/${args[0]}\n`, stderr: '' };
                }
                return { stdout: 'version 1.0.0\n', stderr: '' };
            });

            const result = await detectInstalledClis();

            const expectedTypes: AgentType[] = ['claude', 'gemini', 'aider', 'codex', 'opencode', 'cursor', 'copilot'];
            expectedTypes.forEach(type => {
                const cli = result.clis.find((c: any) => c.type === type);
                expect(cli).toBeDefined();
                expect(cli?.name).toBeDefined();
            });
        });
    });

    describe('clearCliCache', () => {
        it('should clear cache and force re-detection', async () => {
            setupExecMock((cmd, args) => {
                if (cmd === WHICH_CMD) {
                    return { stdout: `/usr/local/bin/${args[0]}\n`, stderr: '' };
                }
                return { stdout: 'version 1.0.0\n', stderr: '' };
            });

            await detectInstalledClis();
            const callCount1 = mockExecFileAsync.mock.calls.length;

            await detectInstalledClis();
            const callCount2 = mockExecFileAsync.mock.calls.length;
            expect(callCount1).toBe(callCount2);

            clearCliCache();

            await detectInstalledClis();
            const callCount3 = mockExecFileAsync.mock.calls.length;
            expect(callCount3).toBeGreaterThan(callCount2);
        });
    });

    describe('getCliDefinitions', () => {
        it('should return all CLI definitions', () => {
            const definitions = getCliDefinitions();

            expect(Array.isArray(definitions)).toBe(true);
            expect(definitions.length).toBeGreaterThan(0);

            definitions.forEach((def: any) => {
                expect(def).toHaveProperty('type');
                expect(def).toHaveProperty('name');
                expect(def).toHaveProperty('command');
            });
        });

        it('should include all expected CLI types', () => {
            const definitions = getCliDefinitions();
            const expectedTypes: AgentType[] = ['claude', 'gemini', 'aider', 'codex', 'opencode', 'cursor', 'copilot'];

            expectedTypes.forEach(type => {
                const def = definitions.find((d: any) => d.type === type);
                expect(def).toBeDefined();
            });
        });
    });
});
