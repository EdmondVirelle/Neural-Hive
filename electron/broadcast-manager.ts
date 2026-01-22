/**
 * Broadcast Manager
 *
 * Manages command broadcasting to multiple agents with tag-based filtering
 * and variable injection support.
 *
 * FR-04-01: Batch commands via tags or select all
 * FR-04-02: Variable injection (e.g., {filename})
 */

/**
 * Options for broadcasting commands
 */
export interface BroadcastOptions {
    /** Target tags (empty = all agents) */
    tags?: string[];
    /** Command template with optional placeholders */
    template: string;
    /** Variables to inject, mapped to each agent by index */
    variables?: Record<string, string[]>;
}

/**
 * Result of a broadcast operation
 */
export interface BroadcastResult {
    /** Whether the broadcast was successful overall */
    success: boolean;
    /** Agent IDs that received the command */
    sentTo: string[];
    /** Errors by agent ID */
    errors?: Record<string, string>;
}

/**
 * BroadcastManager class
 *
 * Manages agent tags and prepares broadcast commands with variable substitution.
 *
 * @example
 * ```typescript
 * const manager = new BroadcastManager();
 *
 * // Set tags for agents
 * manager.setTags('agent-1', ['frontend', 'react']);
 * manager.setTags('agent-2', ['backend', 'node']);
 *
 * // Broadcast to frontend agents
 * const commands = manager.prepareBroadcast(
 *   { tags: ['frontend'], template: 'npm run lint' },
 *   ['agent-1', 'agent-2']
 * );
 * // commands = Map { 'agent-1' => 'npm run lint' }
 *
 * // Broadcast with variables
 * const commands2 = manager.prepareBroadcast(
 *   {
 *     template: 'Check file {filename}',
 *     variables: { filename: ['src/a.ts', 'src/b.ts'] }
 *   },
 *   ['agent-1', 'agent-2']
 * );
 * // commands2 = Map { 'agent-1' => 'Check file src/a.ts', 'agent-2' => 'Check file src/b.ts' }
 * ```
 */
export class BroadcastManager {
    /** Agent tags: agentId -> Set of tags */
    private agentTags: Map<string, Set<string>> = new Map();

    /**
     * Set tags for an agent
     *
     * @param agentId - The agent ID
     * @param tags - Array of tag strings
     */
    setTags(agentId: string, tags: string[]): void {
        this.agentTags.set(agentId, new Set(tags));
    }

    /**
     * Add a tag to an agent
     *
     * @param agentId - The agent ID
     * @param tag - Tag to add
     */
    addTag(agentId: string, tag: string): void {
        if (!this.agentTags.has(agentId)) {
            this.agentTags.set(agentId, new Set());
        }
        this.agentTags.get(agentId)!.add(tag);
    }

    /**
     * Remove a tag from an agent
     *
     * @param agentId - The agent ID
     * @param tag - Tag to remove
     */
    removeTag(agentId: string, tag: string): void {
        this.agentTags.get(agentId)?.delete(tag);
    }

    /**
     * Get tags for an agent
     *
     * @param agentId - The agent ID
     * @returns Array of tags (empty if none)
     */
    getTags(agentId: string): string[] {
        const tags = this.agentTags.get(agentId);
        return tags ? Array.from(tags) : [];
    }

    /**
     * Check if an agent has a specific tag
     *
     * @param agentId - The agent ID
     * @param tag - Tag to check
     */
    hasTag(agentId: string, tag: string): boolean {
        return this.agentTags.get(agentId)?.has(tag) ?? false;
    }

    /**
     * Get all agents with a specific tag
     *
     * @param tag - Tag to filter by
     * @returns Array of agent IDs
     */
    getAgentsByTag(tag: string): string[] {
        const result: string[] = [];
        for (const [agentId, tags] of this.agentTags) {
            if (tags.has(tag)) {
                result.push(agentId);
            }
        }
        return result;
    }

    /**
     * Get all agents that have any of the specified tags
     *
     * @param tags - Tags to filter by
     * @returns Array of agent IDs
     */
    getAgentsByAnyTag(tags: string[]): string[] {
        const result = new Set<string>();
        for (const [agentId, agentTagSet] of this.agentTags) {
            for (const tag of tags) {
                if (agentTagSet.has(tag)) {
                    result.add(agentId);
                    break;
                }
            }
        }
        return Array.from(result);
    }

    /**
     * Remove an agent from tracking
     *
     * @param agentId - The agent ID
     */
    removeAgent(agentId: string): void {
        this.agentTags.delete(agentId);
    }

    /**
     * Clear all agent tags
     */
    clear(): void {
        this.agentTags.clear();
    }

    /**
     * Prepare broadcast commands for target agents
     *
     * @param options - Broadcast options (tags, template, variables)
     * @param allAgentIds - List of all available agent IDs
     * @returns Map of agentId -> resolved command string
     */
    prepareBroadcast(
        options: BroadcastOptions,
        allAgentIds: string[]
    ): Map<string, string> {
        const result = new Map<string, string>();

        // Determine target agents
        let targetAgents: string[];

        if (options.tags && options.tags.length > 0) {
            // Filter by tags
            targetAgents = allAgentIds.filter((agentId) => {
                const agentTagSet = this.agentTags.get(agentId);
                if (!agentTagSet) return false;
                return options.tags!.some((tag) => agentTagSet.has(tag));
            });
        } else {
            // All agents
            targetAgents = [...allAgentIds];
        }

        // Prepare commands with variable injection
        targetAgents.forEach((agentId, index) => {
            let command = options.template;

            // Inject variables
            if (options.variables) {
                for (const [varName, values] of Object.entries(options.variables)) {
                    const value = values[index % values.length] || '';
                    // Replace {varName} with value, using a safe regex
                    const placeholder = new RegExp(`\\{${this.escapeRegex(varName)}\\}`, 'g');
                    command = command.replace(placeholder, value);
                }
            }

            result.set(agentId, command);
        });

        return result;
    }

    /**
     * Escape special regex characters in a string
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Get all unique tags across all agents
     */
    getAllTags(): string[] {
        const allTags = new Set<string>();
        for (const tags of this.agentTags.values()) {
            for (const tag of tags) {
                allTags.add(tag);
            }
        }
        return Array.from(allTags).sort();
    }

    /**
     * Get agent count by tag
     */
    getTagCounts(): Map<string, number> {
        const counts = new Map<string, number>();
        for (const tags of this.agentTags.values()) {
            for (const tag of tags) {
                counts.set(tag, (counts.get(tag) || 0) + 1);
            }
        }
        return counts;
    }
}
