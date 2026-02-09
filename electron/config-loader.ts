/**
 * Configuration Loader
 *
 * Loads and manages parser configurations from config/parsers.json.
 * Compiles regex patterns for efficient state detection.
 *
 * NFR-05: Configuration-driven parsing rules
 */

import * as fs from 'fs';
import * as path from 'path';

import type { AgentStatus } from '../src/types/shared.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

// Pattern types that can be detected
export type PatternType = 'thinking' | 'tool_use' | 'reading' | 'searching' | 'error' | 'waiting';

// Compiled regex patterns for a parser
export interface CompiledPatterns {
    thinking: RegExp | null;
    tool_use: RegExp | null;
    reading: RegExp | null;
    searching: RegExp | null;
    error: RegExp | null;
    waiting: RegExp | null;
}

// Parser configuration after loading
export interface ParserConfig {
    name: string;
    command: string;
    patterns: CompiledPatterns;
}

// State mapping from pattern type to agent status
export type StateMapping = Record<PatternType, AgentStatus>;

// Raw config file structure
interface RawConfig {
    parsers: Record<string, {
        name: string;
        command: string;
        patterns: Record<string, string>;
    }>;
    stateMapping: Record<string, string>;
    statusColors: Record<string, string>;
}

/**
 * Configuration Loader class
 *
 * Provides:
 * - Loading and parsing of config/parsers.json
 * - Regex compilation with error handling
 * - State detection for agent output
 * - Hot reload capability
 */
export class ConfigLoader {
    private parsers: Map<string, ParserConfig> = new Map();
    private stateMapping: StateMapping;
    private statusColors: Map<string, string> = new Map();
    private configPath: string;
    private lastLoadTime: number = 0;

    /**
     * Create a new ConfigLoader
     *
     * @param configPath - Path to parsers.json (default: config/parsers.json)
     */
    constructor(configPath?: string) {
        // In production (dist/electron/electron/config-loader.js), config is at ../../config/parsers.json
        // In development (electron/config-loader.ts), config is at ../config/parsers.json
        // Fix logic for checking packaged app
        const configDir = path.join(_dirname, '../../config');

        this.configPath = configPath || path.join(configDir, 'parsers.json');

        this.stateMapping = {
            thinking: 'THINKING',
            tool_use: 'WORKING',
            reading: 'WORKING',
            searching: 'WORKING',
            error: 'ERROR',
            waiting: 'WAITING_USER',
        };
        this.load();
    }

    /**
     * Load configuration from file
     */
    private load(): void {
        try {
            if (!fs.existsSync(this.configPath)) {
                console.warn(`Config file not found: ${this.configPath}, using defaults`);
                this.loadDefaults();
                return;
            }

            const rawContent = fs.readFileSync(this.configPath, 'utf-8');
            const config: RawConfig = JSON.parse(rawContent);

            // Clear existing
            this.parsers.clear();
            this.statusColors.clear();

            // Load state mapping
            if (config.stateMapping) {
                for (const [pattern, status] of Object.entries(config.stateMapping)) {
                    this.stateMapping[pattern as PatternType] = status as AgentStatus;
                }
            }

            // Load status colors
            if (config.statusColors) {
                for (const [status, color] of Object.entries(config.statusColors)) {
                    this.statusColors.set(status, color);
                }
            }

            // Load and compile parsers
            for (const [key, parserDef] of Object.entries(config.parsers)) {
                const compiledPatterns: CompiledPatterns = {
                    thinking: null,
                    tool_use: null,
                    reading: null,
                    searching: null,
                    error: null,
                    waiting: null,
                };

                // Compile each pattern
                for (const [patternName, patternStr] of Object.entries(parserDef.patterns)) {
                    try {
                        compiledPatterns[patternName as PatternType] = new RegExp(patternStr, 'i');
                    } catch (err) {
                        console.error(`Invalid regex for ${key}.${patternName}: ${patternStr}`, err);
                    }
                }

                this.parsers.set(key, {
                    name: parserDef.name,
                    command: parserDef.command,
                    patterns: compiledPatterns,
                });
            }

            this.lastLoadTime = Date.now();
            console.log(`Loaded ${this.parsers.size} parser configurations`);
        } catch (err) {
            console.error('Failed to load config:', err);
            this.loadDefaults();
        }
    }

    /**
     * Load default configuration when file is missing
     */
    private loadDefaults(): void {
        // Claude default
        this.parsers.set('claude', {
            name: 'Claude Code',
            command: 'claude',
            patterns: {
                thinking: /Thinking\.\.\./i,
                tool_use: /Running (\w+)\.\.\./i,
                reading: /Reading file\.\.\./i,
                searching: /Searching\.\.\./i,
                error: /Error:|Exception:/i,
                waiting: /\[y\/n\]|\(yes\/no\)/i,
            },
        });

        // Gemini default
        this.parsers.set('gemini', {
            name: 'Gemini CLI',
            command: 'gemini',
            patterns: {
                thinking: /\[Thinking\]/i,
                tool_use: /\[Tool Use\]: (\w+)/i,
                reading: /Reading:/i,
                searching: /Searching:/i,
                error: /ERROR:|FAILED:/i,
                waiting: /Confirm\?|\[Y\/n\]/i,
            },
        });

        // Aider default
        this.parsers.set('aider', {
            name: 'Aider',
            command: 'aider',
            patterns: {
                thinking: />\s*Thinking/i,
                tool_use: /Running (\w+)/i,
                reading: /Reading/i,
                searching: /Searching/i,
                error: /Error:|Exception:/i,
                waiting: /\?\s*$/i,
            },
        });

        // Codex default
        this.parsers.set('codex', {
            name: 'Codex CLI',
            command: 'codex',
            patterns: {
                thinking: /Thinking\.\.\./i,
                tool_use: /Running (\w+)\.\.\./i,
                reading: /Reading file/i,
                searching: /Searching/i,
                error: /Error:|Exception:|FAILED/i,
                waiting: /\[y\/n\]|\(yes\/no\)/i,
            },
        });

        // OpenCode default
        this.parsers.set('opencode', {
            name: 'OpenCode',
            command: 'opencode',
            patterns: {
                thinking: /Thinking|Planning/i,
                tool_use: /Running (\w+)|Executing/i,
                reading: /Reading/i,
                searching: /Searching|Grep/i,
                error: /Error:|Exception:/i,
                waiting: /\?\s*$|Confirm/i,
            },
        });

        // Cursor default
        this.parsers.set('cursor', {
            name: 'Cursor',
            command: 'cursor',
            patterns: {
                thinking: /Thinking\.\.\./i,
                tool_use: /Running (\w+)/i,
                reading: /Reading|Read\(/i,
                searching: /Searching|Search\(/i,
                error: /Error:|Exception:|Failed/i,
                waiting: /\?\s*$|Accept\?|\[y\/n\]/i,
            },
        });

        // GitHub Copilot default
        this.parsers.set('copilot', {
            name: 'GitHub Copilot',
            command: 'gh copilot',
            patterns: {
                thinking: /Thinking|Processing/i,
                tool_use: /Running (\w+)|Executing/i,
                reading: /Reading/i,
                searching: /Searching/i,
                error: /Error:|Exception:|FAILED/i,
                waiting: /\?\s*$|\[y\/n\]/i,
            },
        });

        // Custom default
        this.parsers.set('custom', {
            name: 'Custom Script',
            command: 'node',
            patterns: {
                thinking: /Thinking\.\.\./i,
                tool_use: /\[Tool Use\]/i,
                reading: /Reading/i,
                searching: /Searching/i,
                error: /Error:|Exception:/i,
                waiting: /\?\s*$/i,
            },
        });
    }

    /**
     * Get parser configuration by agent type
     */
    getParser(agentType: string): ParserConfig | undefined {
        return this.parsers.get(agentType);
    }

    /**
     * Get all available parser types
     */
    getAvailableTypes(): string[] {
        return Array.from(this.parsers.keys());
    }

    /**
     * Detect agent state from output line
     *
     * @param agentType - Type of agent (claude, gemini, custom)
     * @param output - Raw output line from agent
     * @returns Detected status or null if no match
     */
    detectState(agentType: string, output: string): AgentStatus | null {
        const parser = this.parsers.get(agentType);
        if (!parser) return null;

        // Check patterns in priority order
        const patternOrder: PatternType[] = ['error', 'waiting', 'thinking', 'tool_use', 'reading', 'searching'];

        for (const patternType of patternOrder) {
            const regex = parser.patterns[patternType];
            if (regex && regex.test(output)) {
                return this.stateMapping[patternType];
            }
        }

        return null;
    }

    /**
     * Extract skill/tool name from output
     */
    extractSkill(agentType: string, output: string): string | null {
        const parser = this.parsers.get(agentType);
        if (!parser) return null;

        const toolUsePattern = parser.patterns.tool_use;
        if (!toolUsePattern) return null;

        const match = output.match(toolUsePattern);
        return match ? match[1] || match[0] : null;
    }

    /**
     * Reload configuration from disk
     */
    reload(): void {
        this.load();
    }

    /**
     * Get status color
     */
    getStatusColor(status: AgentStatus): string {
        return this.statusColors.get(status) || '#6b7280';
    }
}

// Singleton instance
let instance: ConfigLoader | null = null;

/**
 * Get or create the ConfigLoader singleton
 */
export function getConfigLoader(): ConfigLoader {
    if (!instance) {
        instance = new ConfigLoader();
    }
    return instance;
}
