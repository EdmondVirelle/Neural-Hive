/**
 * ConfigLoader Tests
 *
 * Tests for electron/config-loader.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigLoader, getConfigLoader } from '../config-loader.js';
import * as fs from 'fs';
import { AgentStatus } from '../../src/types/shared.js';

// Mock fs module
vi.mock('fs', () => ({
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
}));

// Mock path module
vi.mock('path', () => ({
    join: vi.fn((...args: string[]) => args.join('/')),
}));

describe('ConfigLoader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ============================================
    // Loading Configuration
    // ============================================
    describe('loading configuration', () => {
        it('should load defaults when config file not found', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);

            const loader = new ConfigLoader('/fake/path/parsers.json');

            // Should have default parsers
            expect(loader.getAvailableTypes()).toContain('claude');
            expect(loader.getAvailableTypes()).toContain('gemini');
            expect(loader.getAvailableTypes()).toContain('custom');
        });

        it('should load configuration from file', () => {
            const mockConfig = {
                parsers: {
                    test: {
                        name: 'Test Parser',
                        command: 'test',
                        patterns: {
                            thinking: 'TestThinking',
                            error: 'TestError',
                        },
                    },
                },
                stateMapping: {
                    thinking: 'THINKING',
                    error: 'ERROR',
                },
                statusColors: {
                    THINKING: '#ffff00',
                },
            };

            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

            const loader = new ConfigLoader('/fake/path/parsers.json');

            expect(loader.getAvailableTypes()).toContain('test');
            expect(loader.getParser('test')?.name).toBe('Test Parser');
        });

        it('should handle invalid JSON gracefully', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue('invalid json {{{');

            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const loader = new ConfigLoader('/fake/path/parsers.json');

            expect(errorSpy).toHaveBeenCalled();
            // Should fall back to defaults
            expect(loader.getAvailableTypes()).toContain('claude');
        });
    });

    // ============================================
    // Parser Management
    // ============================================
    describe('getParser', () => {
        it('should return parser config by type', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);

            const loader = new ConfigLoader();
            const parser = loader.getParser('claude');

            expect(parser).toBeDefined();
            expect(parser?.name).toBe('Claude Code');
            expect(parser?.command).toBe('claude');
        });

        it('should return undefined for unknown type', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);

            const loader = new ConfigLoader();
            const parser = loader.getParser('unknown');

            expect(parser).toBeUndefined();
        });
    });

    describe('getAvailableTypes', () => {
        it('should return all available parser types', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);

            const loader = new ConfigLoader();
            const types = loader.getAvailableTypes();

            expect(Array.isArray(types)).toBe(true);
            expect(types.length).toBeGreaterThan(0);
        });
    });

    // ============================================
    // State Detection
    // ============================================
    describe('detectState', () => {
        let loader: ConfigLoader;

        beforeEach(() => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            loader = new ConfigLoader();
        });

        it('should detect THINKING state', () => {
            const result = loader.detectState('claude', 'Thinking...');
            expect(result).toBe('THINKING');
        });

        it('should detect WORKING state from tool use', () => {
            const result = loader.detectState('gemini', '[Tool Use]: reading');
            expect(result).toBe('WORKING');
        });

        it('should detect ERROR state', () => {
            const result = loader.detectState('claude', 'Error: Something failed');
            expect(result).toBe('ERROR');
        });

        it('should return null for unknown pattern', () => {
            const result = loader.detectState('claude', 'Hello world');
            expect(result).toBeNull();
        });

        it('should return null for unknown agent type', () => {
            const result = loader.detectState('unknown', 'Thinking...');
            expect(result).toBeNull();
        });

        it('should prioritize error over other states', () => {
            // Error should be detected even if thinking pattern exists
            const result = loader.detectState('claude', 'Error: Thinking failed');
            expect(result).toBe('ERROR');
        });
    });

    // ============================================
    // Skill Extraction
    // ============================================
    describe('extractSkill', () => {
        let loader: ConfigLoader;

        beforeEach(() => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            loader = new ConfigLoader();
        });

        it('should extract skill from tool use pattern', () => {
            const result = loader.extractSkill('gemini', '[Tool Use]: reading_file');
            expect(result).toBeTruthy();
        });

        it('should return null for non-matching output', () => {
            const result = loader.extractSkill('claude', 'Regular output');
            expect(result).toBeNull();
        });

        it('should return null for unknown agent type', () => {
            const result = loader.extractSkill('unknown', '[Tool Use]: something');
            expect(result).toBeNull();
        });
    });

    // ============================================
    // Configuration Reload
    // ============================================
    describe('reload', () => {
        it('should reload configuration from disk', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);

            const loader = new ConfigLoader();

            // Initial load - defaults
            expect(loader.getAvailableTypes()).toContain('claude');

            // Setup mock for reload with new config
            const newConfig = {
                parsers: {
                    newparser: {
                        name: 'New Parser',
                        command: 'new',
                        patterns: {},
                    },
                },
                stateMapping: {},
                statusColors: {},
            };

            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(newConfig));

            loader.reload();

            expect(loader.getAvailableTypes()).toContain('newparser');
        });
    });

    // ============================================
    // Status Colors
    // ============================================
    describe('getStatusColor', () => {
        it('should return color for known status', () => {
            const mockConfig = {
                parsers: {},
                stateMapping: {},
                statusColors: {
                    THINKING: '#ffff00',
                    ERROR: '#ff0000',
                },
            };

            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

            const loader = new ConfigLoader();

            expect(loader.getStatusColor('THINKING')).toBe('#ffff00');
            expect(loader.getStatusColor('ERROR')).toBe('#ff0000');
        });

        it('should return default color for unknown status', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);

            const loader = new ConfigLoader();

            // Should return a fallback gray color
            const color = loader.getStatusColor('UNKNOWN_STATUS' as unknown as AgentStatus);
            expect(color).toBe('#6b7280');
        });
    });

    // ============================================
    // Singleton
    // ============================================
    describe('getConfigLoader', () => {
        it('should return the same instance', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);

            // Note: This test is tricky because the singleton persists across tests
            // In real scenarios, you'd want to reset the singleton between tests
            const loader1 = getConfigLoader();
            const loader2 = getConfigLoader();

            expect(loader1).toBe(loader2);
        });
    });

    // ============================================
    // Regex Compilation
    // ============================================
    describe('regex compilation', () => {
        it('should handle invalid regex patterns gracefully', () => {
            const mockConfig = {
                parsers: {
                    badparser: {
                        name: 'Bad Parser',
                        command: 'bad',
                        patterns: {
                            thinking: '[invalid(regex', // Invalid regex
                        },
                    },
                },
                stateMapping: {},
                statusColors: {},
            };

            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const loader = new ConfigLoader();

            expect(errorSpy).toHaveBeenCalled();
            // Parser should still be created, but with null pattern
            expect(loader.getParser('badparser')).toBeDefined();
        });
    });
});
