/**
 * BroadcastManager Tests
 *
 * Tests for electron/broadcast-manager.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BroadcastManager } from '../broadcast-manager.js';

describe('BroadcastManager', () => {
    let manager: BroadcastManager;

    beforeEach(() => {
        manager = new BroadcastManager();
    });

    // ============================================
    // Tag Management
    // ============================================
    describe('setTags / getTags', () => {
        it('should set and get tags for an agent', () => {
            manager.setTags('a1', ['frontend', 'vue']);
            expect(manager.getTags('a1')).toEqual(['frontend', 'vue']);
        });

        it('should return empty array for unknown agent', () => {
            expect(manager.getTags('unknown')).toEqual([]);
        });

        it('should overwrite existing tags', () => {
            manager.setTags('a1', ['old']);
            manager.setTags('a1', ['new']);
            expect(manager.getTags('a1')).toEqual(['new']);
        });
    });

    describe('addTag / removeTag', () => {
        it('should add a tag to existing tags', () => {
            manager.setTags('a1', ['frontend']);
            manager.addTag('a1', 'vue');
            expect(manager.getTags('a1')).toContain('frontend');
            expect(manager.getTags('a1')).toContain('vue');
        });

        it('should create tags set if agent has none', () => {
            manager.addTag('a1', 'new');
            expect(manager.getTags('a1')).toContain('new');
        });

        it('should remove a specific tag', () => {
            manager.setTags('a1', ['frontend', 'backend']);
            manager.removeTag('a1', 'frontend');
            expect(manager.getTags('a1')).not.toContain('frontend');
            expect(manager.getTags('a1')).toContain('backend');
        });

        it('should handle removing non-existent tag gracefully', () => {
            manager.setTags('a1', ['frontend']);
            manager.removeTag('a1', 'nonexistent');
            expect(manager.getTags('a1')).toEqual(['frontend']);
        });
    });

    describe('hasTag', () => {
        it('should return true if agent has tag', () => {
            manager.setTags('a1', ['frontend']);
            expect(manager.hasTag('a1', 'frontend')).toBe(true);
        });

        it('should return false if agent does not have tag', () => {
            manager.setTags('a1', ['frontend']);
            expect(manager.hasTag('a1', 'backend')).toBe(false);
        });

        it('should return false for unknown agent', () => {
            expect(manager.hasTag('unknown', 'any')).toBe(false);
        });
    });

    // ============================================
    // Agent Queries
    // ============================================
    describe('getAgentsByTag', () => {
        it('should return all agents with specific tag', () => {
            manager.setTags('a1', ['frontend']);
            manager.setTags('a2', ['backend']);
            manager.setTags('a3', ['frontend', 'backend']);

            expect(manager.getAgentsByTag('frontend')).toEqual(['a1', 'a3']);
            expect(manager.getAgentsByTag('backend')).toEqual(['a2', 'a3']);
        });

        it('should return empty array for unknown tag', () => {
            manager.setTags('a1', ['frontend']);
            expect(manager.getAgentsByTag('unknown')).toEqual([]);
        });
    });

    describe('getAgentsByAnyTag', () => {
        it('should return agents matching any of the tags', () => {
            manager.setTags('a1', ['frontend']);
            manager.setTags('a2', ['backend']);
            manager.setTags('a3', ['devops']);

            const result = manager.getAgentsByAnyTag(['frontend', 'backend']);

            expect(result).toContain('a1');
            expect(result).toContain('a2');
            expect(result).not.toContain('a3');
        });
    });

    describe('getAllTags', () => {
        it('should return all unique tags sorted', () => {
            manager.setTags('a1', ['frontend', 'vue']);
            manager.setTags('a2', ['backend', 'node']);
            manager.setTags('a3', ['frontend', 'react']);

            const allTags = manager.getAllTags();

            expect(allTags).toEqual(['backend', 'frontend', 'node', 'react', 'vue']);
        });
    });

    describe('getTagCounts', () => {
        it('should count agents per tag', () => {
            manager.setTags('a1', ['frontend']);
            manager.setTags('a2', ['frontend', 'backend']);
            manager.setTags('a3', ['frontend']);

            const counts = manager.getTagCounts();

            expect(counts.get('frontend')).toBe(3);
            expect(counts.get('backend')).toBe(1);
        });
    });

    // ============================================
    // Agent Lifecycle
    // ============================================
    describe('removeAgent', () => {
        it('should remove agent from tracking', () => {
            manager.setTags('a1', ['frontend']);
            manager.removeAgent('a1');
            expect(manager.getTags('a1')).toEqual([]);
        });
    });

    describe('clear', () => {
        it('should clear all agent tags', () => {
            manager.setTags('a1', ['frontend']);
            manager.setTags('a2', ['backend']);

            manager.clear();

            expect(manager.getTags('a1')).toEqual([]);
            expect(manager.getTags('a2')).toEqual([]);
            expect(manager.getAllTags()).toEqual([]);
        });
    });

    // ============================================
    // prepareBroadcast
    // ============================================
    describe('prepareBroadcast', () => {
        it('should broadcast to all agents when no tags specified', () => {
            const result = manager.prepareBroadcast(
                { template: 'Hello' },
                ['a1', 'a2', 'a3']
            );

            expect(result.size).toBe(3);
            expect(result.get('a1')).toBe('Hello');
            expect(result.get('a2')).toBe('Hello');
            expect(result.get('a3')).toBe('Hello');
        });

        it('should broadcast only to tagged agents', () => {
            manager.setTags('a1', ['frontend']);
            manager.setTags('a2', ['backend']);

            const result = manager.prepareBroadcast(
                { tags: ['frontend'], template: 'FE task' },
                ['a1', 'a2']
            );

            expect(result.size).toBe(1);
            expect(result.has('a1')).toBe(true);
            expect(result.has('a2')).toBe(false);
        });

        it('should inject variables into template', () => {
            const result = manager.prepareBroadcast(
                {
                    template: 'Check file {filename}',
                    variables: { filename: ['src/a.ts', 'src/b.ts'] },
                },
                ['a1', 'a2']
            );

            expect(result.get('a1')).toBe('Check file src/a.ts');
            expect(result.get('a2')).toBe('Check file src/b.ts');
        });

        it('should handle multiple variables', () => {
            const result = manager.prepareBroadcast(
                {
                    template: 'Copy {src} to {dest}',
                    variables: {
                        src: ['file1.ts', 'file2.ts'],
                        dest: ['out1.ts', 'out2.ts'],
                    },
                },
                ['a1', 'a2']
            );

            expect(result.get('a1')).toBe('Copy file1.ts to out1.ts');
            expect(result.get('a2')).toBe('Copy file2.ts to out2.ts');
        });

        it('should cycle variables if fewer than agents', () => {
            const result = manager.prepareBroadcast(
                {
                    template: 'Process {file}',
                    variables: { file: ['a.ts', 'b.ts'] },
                },
                ['a1', 'a2', 'a3', 'a4']
            );

            expect(result.get('a1')).toBe('Process a.ts');
            expect(result.get('a2')).toBe('Process b.ts');
            expect(result.get('a3')).toBe('Process a.ts'); // Cycles
            expect(result.get('a4')).toBe('Process b.ts');
        });

        it('should handle empty variable array', () => {
            const result = manager.prepareBroadcast(
                {
                    template: 'Process {file}',
                    variables: { file: [] },
                },
                ['a1']
            );

            expect(result.get('a1')).toBe('Process ');
        });

        it('should combine tags and variables', () => {
            manager.setTags('a1', ['frontend']);
            manager.setTags('a2', ['frontend']);
            manager.setTags('a3', ['backend']);

            const result = manager.prepareBroadcast(
                {
                    tags: ['frontend'],
                    template: 'Build {component}',
                    variables: { component: ['Header', 'Footer'] },
                },
                ['a1', 'a2', 'a3']
            );

            expect(result.size).toBe(2);
            expect(result.get('a1')).toBe('Build Header');
            expect(result.get('a2')).toBe('Build Footer');
            expect(result.has('a3')).toBe(false);
        });

        it('should escape special regex characters in variable names', () => {
            const result = manager.prepareBroadcast(
                {
                    template: 'Use {$special.var}',
                    variables: { '$special.var': ['value'] },
                },
                ['a1']
            );

            expect(result.get('a1')).toBe('Use value');
        });
    });
});
