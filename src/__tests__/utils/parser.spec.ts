/**
 * Parser Utility Tests
 *
 * Tests for src/utils/parser.ts
 * - stripAnsi: ANSI escape code removal
 * - detectState: Agent state detection
 * - extractSkill: Tool/skill extraction
 */

import { describe, it, expect } from 'vitest';
import { stripAnsi, detectState, extractSkill } from '@/utils/parser';

describe('parser.ts', () => {
    // ============================================
    // stripAnsi Tests
    // ============================================
    describe('stripAnsi', () => {
        it('should remove basic ANSI color codes', () => {
            const input = '\x1b[31mError\x1b[0m: Something went wrong';
            expect(stripAnsi(input)).toBe('Error: Something went wrong');
        });

        it('should remove bold ANSI codes', () => {
            const input = '\x1b[1mBold Text\x1b[0m';
            expect(stripAnsi(input)).toBe('Bold Text');
        });

        it('should handle multiple ANSI codes in sequence', () => {
            const input = '\x1b[1m\x1b[32mSuccess\x1b[0m\x1b[0m';
            expect(stripAnsi(input)).toBe('Success');
        });

        it('should remove 256-color ANSI codes', () => {
            const input = '\x1b[38;5;82mColored\x1b[0m';
            expect(stripAnsi(input)).toBe('Colored');
        });

        it('should return empty string for empty input', () => {
            expect(stripAnsi('')).toBe('');
        });

        it('should preserve text without ANSI codes', () => {
            const plain = 'No colors here at all';
            expect(stripAnsi(plain)).toBe(plain);
        });

        it('should handle multiline strings', () => {
            const input = '\x1b[31mLine 1\x1b[0m\n\x1b[32mLine 2\x1b[0m';
            expect(stripAnsi(input)).toBe('Line 1\nLine 2');
        });

        it('should remove cursor movement codes', () => {
            const input = '\x1b[2J\x1b[HHello';
            expect(stripAnsi(input)).toBe('Hello');
        });
    });

    // ============================================
    // detectState Tests
    // ============================================
    describe('detectState', () => {
        // THINKING state
        describe('THINKING detection', () => {
            it('should detect "Thinking..." pattern', () => {
                expect(detectState('Thinking...')).toBe('THINKING');
            });

            it('should detect thinking with ANSI codes', () => {
                expect(detectState('\x1b[33mThinking...\x1b[0m')).toBe('THINKING');
            });

            it('should be case-insensitive', () => {
                expect(detectState('THINKING...')).toBe('THINKING');
                expect(detectState('thinking...')).toBe('THINKING');
            });

            it('should detect thinking without dots', () => {
                expect(detectState('Thinking')).toBe('THINKING');
            });
        });

        // WORKING state
        describe('WORKING detection', () => {
            it('should detect [Tool Use] pattern', () => {
                expect(detectState('[Tool Use] Reading file...')).toBe('WORKING');
            });

            it('should detect Running pattern', () => {
                expect(detectState('Running command...')).toBe('WORKING');
            });

            it('should be case-insensitive for Tool Use', () => {
                expect(detectState('[tool use] something')).toBe('WORKING');
                expect(detectState('[TOOL USE] something')).toBe('WORKING');
            });
        });

        // ERROR state
        describe('ERROR detection', () => {
            it('should detect "Error:" pattern', () => {
                expect(detectState('Error: File not found')).toBe('ERROR');
            });

            it('should detect "Error!" pattern', () => {
                expect(detectState('Critical Error!')).toBe('ERROR');
            });

            it('should detect "[Error]" pattern', () => {
                expect(detectState('[Error] something failed')).toBe('ERROR');
            });

            it('should detect "Exception:" pattern', () => {
                expect(detectState('Exception: NullPointer')).toBe('ERROR');
            });

            it('should detect terminal cross mark icons', () => {
                expect(detectState('✖ Failed to connect')).toBe('ERROR');
                expect(detectState('❌ Process crashed')).toBe('ERROR');
            });

            it('should NOT detect standalone "error" in sentences (avoid false positives)', () => {
                // This is the specific fix for Claude Code's suggestion text
                expect(detectState('Try "how do I log an error?"')).toBeNull();
                expect(detectState('There was an error in the logic')).toBeNull();
            });
        });

        // No match
        describe('No match cases', () => {
            it('should return null for regular log messages', () => {
                expect(detectState('Processing data')).toBeNull();
            });

            it('should return null for empty string', () => {
                expect(detectState('')).toBeNull();
            });

            it('should return null for whitespace only', () => {
                expect(detectState('   ')).toBeNull();
            });

            it('should return null for numbers only', () => {
                expect(detectState('12345')).toBeNull();
            });
        });

        // Edge cases
        describe('Edge cases', () => {
            it('should not match partial words', () => {
                // "Rethinking" should not match "thinking" due to word boundary
                expect(detectState('Rethinking strategy')).toBeNull();
            });

            it('should handle special characters', () => {
                expect(detectState('>>> Thinking... <<<')).toBe('THINKING');
            });
        });
    });

    // ============================================
    // extractSkill Tests
    // ============================================
    describe('extractSkill', () => {
        it('should extract skill from [Tool Use] line', () => {
            expect(extractSkill('[Tool Use] Searching...')).toBe('Searching...');
        });

        it('should extract full description', () => {
            expect(extractSkill('[Tool Use] Reading file: package.json'))
                .toBe('Reading file: package.json');
        });

        it('should handle ANSI codes', () => {
            expect(extractSkill('\x1b[36m[Tool Use]\x1b[0m Reading...'))
                .toBe('Reading...');
        });

        it('should return null for non-Tool Use lines', () => {
            expect(extractSkill('Regular message')).toBeNull();
            expect(extractSkill('Thinking...')).toBeNull();
        });

        it('should return null for empty string', () => {
            expect(extractSkill('')).toBeNull();
        });

        it('should handle [Tool Use] without content', () => {
            const result = extractSkill('[Tool Use]');
            expect(result).toBeNull();
        });

        it('should trim whitespace from extracted skill', () => {
            expect(extractSkill('[Tool Use]   Spaces around   '))
                .toBe('Spaces around');
        });
    });
});
