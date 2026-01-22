/**
 * Shared type definitions for the Neural Hive agent monitoring system.
 * This is the canonical source for all shared types.
 */
// IPC Channel names
export const IPC_CHANNELS = {
    SPAWN_AGENT: 'agent:spawn',
    KILL_AGENT: 'agent:kill',
    SEND_COMMAND: 'agent:send-command',
    AGENT_UPDATE: 'agent:update',
    // New channels for broadcast and config
    BROADCAST_COMMAND: 'agent:broadcast',
    SET_AGENT_TAGS: 'agent:set-tags',
    GET_AGENT_TAGS: 'agent:get-tags',
    RELOAD_CONFIG: 'config:reload',
};
//# sourceMappingURL=shared.js.map